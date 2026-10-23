import { NextResponse } from 'next/server';
import { VerificationImpactAgent } from '@/lib/agents/verificationImpactAgent';
import { BigQueryAnalyticsService, RESCUEGRID_BIGQUERY_SCHEMA } from '@/lib/integrations/bigqueryClient';
import { Security } from '@/lib/utils/security';

export async function GET() {
  try {
    const metrics = VerificationImpactAgent.getMetrics();
    const bigQueryExport = BigQueryAnalyticsService.generateBigQueryExportPayload(metrics);

    return NextResponse.json({
      success: true,
      metrics,
      bigQuery: {
        schema: RESCUEGRID_BIGQUERY_SCHEMA,
        sampleExportPayload: bigQueryExport,
      },
    });
  } catch (err) {
    return Security.errorResponse(err, 500);
  }
}
