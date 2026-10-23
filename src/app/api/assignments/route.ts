import { NextResponse } from 'next/server';
import { dbRepository } from '@/lib/db';
import { WorkflowRecoveryAgent } from '@/lib/agents/workflowRecoveryAgent';
import { ProposeAssignmentSchema } from '@/lib/validation/schemas';
import { Security } from '@/lib/utils/security';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const recipientId = searchParams.get('recipientId') || undefined;
    const volunteerId = searchParams.get('volunteerId') || undefined;

    const assignments = dbRepository.listAssignments({ status, recipientId, volunteerId });

    // Enrich assignments with donation and recipient info for quick display
    const enriched = assignments.map(asg => {
      const donation = dbRepository.getDonationById(asg.donationId);
      const recipient = dbRepository.getOrgById(asg.recipientId);
      return {
        ...asg,
        donation,
        recipient,
      };
    });

    return NextResponse.json({
      success: true,
      count: enriched.length,
      assignments: enriched,
    });
  } catch (err) {
    return Security.errorResponse(err, 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = Security.getAuthContext(request);
    Security.assertRole(auth, ['COORDINATOR', 'DONOR']);

    const body = await request.json();
    const validated = ProposeAssignmentSchema.parse(body);

    const result = WorkflowRecoveryAgent.proposeAssignment({
      donationId: validated.donationId,
      recipientId: validated.recipientId,
      volunteerId: validated.volunteerId,
      actorId: auth.userId,
      actorRole: auth.role,
      idempotencyKey: validated.idempotencyKey,
    });

    return NextResponse.json({
      success: true,
      assignment: result.assignment,
      requiresCoordinatorApproval: result.requiresCoordinatorApproval,
      approvalReason: result.approvalReason,
      isIdempotentReplay: result.isIdempotentReplay,
    }, { status: result.isIdempotentReplay ? 200 : 201 });
  } catch (err) {
    return Security.errorResponse(err, 400);
  }
}
