import { NextResponse } from 'next/server';
import { dbRepository } from '@/lib/db';
import { Security } from '@/lib/utils/security';
import { WorkflowEngine } from '@/lib/stateMachine/workflowEngine';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const donation = dbRepository.getDonationById(id);
    if (!donation) {
      return NextResponse.json({ success: false, error: 'Donation not found' }, { status: 404 });
    }

    const recommendations = dbRepository.getRecommendationsForDonation(id);
    const assignment = dbRepository.getAssignmentByDonationId(id);
    const workflowEvents = dbRepository.listWorkflowEvents(id);

    return NextResponse.json({
      success: true,
      donation,
      recommendations,
      assignment,
      workflowEvents,
    });
  } catch (err) {
    return Security.errorResponse(err, 500);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = Security.getAuthContext(request);
    const donation = dbRepository.getDonationById(id);
    if (!donation) {
      return NextResponse.json({ success: false, error: 'Donation not found' }, { status: 404 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'CANCEL') {
      const transition = WorkflowEngine.canTransition(donation.status, 'CANCELLED', auth.role);
      if (!transition.allowed) {
        return NextResponse.json({ success: false, error: transition.reason }, { status: 403 });
      }

      const updated = dbRepository.updateDonation(id, { status: 'CANCELLED' });

      dbRepository.addWorkflowEvent({
        workflowId: id,
        donationId: id,
        eventType: 'DONATION_CANCELLED',
        actorId: auth.userId,
        actorRole: auth.role,
        newStatus: 'CANCELLED',
        reason: body.reason || 'Cancelled by user',
      });

      return NextResponse.json({ success: true, donation: updated });
    }

    return NextResponse.json({ success: false, error: 'Unrecognized action' }, { status: 400 });
  } catch (err) {
    return Security.errorResponse(err, 400);
  }
}
