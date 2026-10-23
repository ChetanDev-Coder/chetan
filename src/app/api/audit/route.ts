import { NextResponse } from 'next/server';
import { dbRepository } from '@/lib/db';
import { Security } from '@/lib/utils/security';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const workflowId = searchParams.get('workflowId') || undefined;

    const auditLogs = dbRepository.listAuditLogs(limit);
    const workflowEvents = dbRepository.listWorkflowEvents(workflowId, limit);

    return NextResponse.json({
      success: true,
      auditLogs,
      workflowEvents,
    });
  } catch (err) {
    return Security.errorResponse(err, 500);
  }
}
