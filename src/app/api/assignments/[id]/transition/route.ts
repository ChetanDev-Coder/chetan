import { NextResponse } from 'next/server';
import { dbRepository } from '@/lib/db';
import { WorkflowRecoveryAgent } from '@/lib/agents/workflowRecoveryAgent';
import { VerificationImpactAgent } from '@/lib/agents/verificationImpactAgent';
import { WorkflowEngine } from '@/lib/stateMachine/workflowEngine';
import { Security } from '@/lib/utils/security';
import {
  ApproveAssignmentSchema,
  AcceptAssignmentSchema,
  DeclineAssignmentSchema,
  ConfirmPickupSchema,
  ConfirmDeliverySchema,
} from '@/lib/validation/schemas';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assignmentId } = await params;
    const auth = Security.getAuthContext(request);
    const body = await request.json();
    const { action } = body;

    const assignment = dbRepository.getAssignmentById(assignmentId);
    if (!assignment) {
      return NextResponse.json({ success: false, error: 'Assignment not found' }, { status: 404 });
    }

    const donation = dbRepository.getDonationById(assignment.donationId);
    if (!donation) {
      return NextResponse.json({ success: false, error: 'Associated donation not found' }, { status: 404 });
    }

    // 1. APPROVE (Coordinator only)
    if (action === 'APPROVE') {
      Security.assertRole(auth, ['COORDINATOR']);
      const validated = ApproveAssignmentSchema.parse({
        assignmentId,
        actorId: auth.userId,
        actorRole: auth.role,
        idempotencyKey: body.idempotencyKey || `approve_${assignmentId}_${Date.now()}`,
        notes: body.notes,
      });

      const updated = WorkflowRecoveryAgent.approveAssignment(validated);
      return NextResponse.json({ success: true, assignment: updated, action: 'APPROVED' });
    }

    // 2. ACCEPT (Recipient only)
    if (action === 'ACCEPT') {
      Security.assertRole(auth, ['RECIPIENT', 'COORDINATOR']);
      const validated = AcceptAssignmentSchema.parse({
        assignmentId,
        actorId: auth.userId,
        actorRole: auth.role === 'COORDINATOR' ? 'RECIPIENT' : auth.role,
        idempotencyKey: body.idempotencyKey || `accept_${assignmentId}_${Date.now()}`,
      });

      const canTransition = WorkflowEngine.canTransition(donation.status, 'ACCEPTED', auth.role);
      if (!canTransition.allowed) {
        return NextResponse.json({ success: false, error: canTransition.reason }, { status: 400 });
      }

      const now = new Date().toISOString();
      const updated = dbRepository.updateAssignment(assignmentId, {
        status: 'ACCEPTED',
        acceptedAt: now,
      })!;

      dbRepository.updateDonation(donation.id, { status: 'ACCEPTED' });

      dbRepository.addWorkflowEvent({
        workflowId: assignmentId,
        donationId: donation.id,
        eventType: 'ASSIGNMENT_ACCEPTED',
        actorId: auth.userId,
        actorRole: auth.role,
        newStatus: 'ACCEPTED',
      });

      dbRepository.addAuditLog({
        actorId: auth.userId,
        actorRole: auth.role,
        action: 'ACCEPT_ASSIGNMENT',
        resourceType: 'ASSIGNMENT',
        resourceId: assignmentId,
        outcome: 'SUCCESS',
      });

      return NextResponse.json({ success: true, assignment: updated, action: 'ACCEPTED' });
    }

    // 3. DECLINE (Recipient or Coordinator -> triggers Agent 4 recovery)
    if (action === 'DECLINE') {
      Security.assertRole(auth, ['RECIPIENT', 'COORDINATOR']);
      const validated = DeclineAssignmentSchema.parse({
        assignmentId,
        actorId: auth.userId,
        actorRole: auth.role,
        reason: body.reason,
        triggerAutoRecovery: body.triggerAutoRecovery ?? true,
      });

      const recoveryResult = await WorkflowRecoveryAgent.declineAndRecover({
        assignmentId,
        actorId: auth.userId,
        actorRole: auth.role,
        reason: validated.reason,
      });

      return NextResponse.json({
        success: true,
        action: 'DECLINED',
        ...recoveryResult,
      });
    }

    // 4. CONFIRM_PICKUP (Volunteer or Coordinator)
    if (action === 'CONFIRM_PICKUP') {
      Security.assertRole(auth, ['VOLUNTEER', 'COORDINATOR']);
      const validated = ConfirmPickupSchema.parse({
        assignmentId,
        actorId: auth.userId,
        actorRole: auth.role,
        pickupNotes: body.pickupNotes,
        verificationMethod: body.verificationMethod || 'VOLUNTEER_SIGNATURE',
        confirmedTempCelsius: body.confirmedTempCelsius !== undefined ? Number(body.confirmedTempCelsius) : undefined,
      });

      const updated = VerificationImpactAgent.confirmPickup(validated);
      return NextResponse.json({ success: true, assignment: updated, action: 'PICKUP_CONFIRMED' });
    }

    // 5. CONFIRM_DELIVERY (Volunteer, Recipient, or Coordinator with scale verification)
    if (action === 'CONFIRM_DELIVERY') {
      Security.assertRole(auth, ['VOLUNTEER', 'RECIPIENT', 'COORDINATOR']);
      const validated = ConfirmDeliverySchema.parse({
        assignmentId,
        actorId: auth.userId,
        actorRole: auth.role,
        actualQuantityDeliveredKg: Number(body.actualQuantityDeliveredKg),
        deliveryNotes: body.deliveryNotes,
        recipientSigneeName: body.recipientSigneeName,
      });

      const result = VerificationImpactAgent.confirmDelivery(validated);
      return NextResponse.json({
        success: true,
        action: 'DELIVERED',
        assignment: result.assignment,
        discrepancyKg: result.discrepancyKg,
        impactSummary: result.impactSummary,
      });
    }

    return NextResponse.json({ success: false, error: `Invalid transition action '${action}'` }, { status: 400 });
  } catch (err) {
    return Security.errorResponse(err, 400);
  }
}
