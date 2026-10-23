import { NextResponse } from 'next/server';
import { WorkflowRecoveryAgent } from '@/lib/agents/workflowRecoveryAgent';
import { Security } from '@/lib/utils/security';
import { TriggerRecoverySchema } from '@/lib/validation/schemas';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assignmentId } = await params;
    const auth = Security.getAuthContext(request);
    Security.assertRole(auth, ['COORDINATOR']);

    const body = await request.json();
    const validated = TriggerRecoverySchema.parse({
      assignmentId,
      actorId: auth.userId,
      reason: body.reason || 'Coordinator triggered manual recovery workflow',
    });

    const recoveryResult = await WorkflowRecoveryAgent.declineAndRecover({
      assignmentId,
      actorId: auth.userId,
      actorRole: auth.role,
      reason: validated.reason,
    });

    return NextResponse.json({
      success: true,
      ...recoveryResult,
    });
  } catch (err) {
    return Security.errorResponse(err, 400);
  }
}
