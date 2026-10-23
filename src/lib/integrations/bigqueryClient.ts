import { ImpactMetrics } from '../types';

export interface BigQuerySchema {
  datasetId: string;
  tables: Array<{
    name: string;
    description: string;
    schemaFields: Array<{ name: string; type: string; mode: string }>;
  }>;
}

export const RESCUEGRID_BIGQUERY_SCHEMA: BigQuerySchema = {
  datasetId: 'rescuegrid_analytics_v1',
  tables: [
    {
      name: 'verified_deliveries',
      description: 'Scale-verified delivery records and landfill diversion telemetry',
      schemaFields: [
        { name: 'delivery_id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'donation_id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'donor_org_id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'recipient_org_id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'verified_weight_kg', type: 'FLOAT', mode: 'REQUIRED' },
        { name: 'estimated_weight_kg', type: 'FLOAT', mode: 'REQUIRED' },
        { name: 'discrepancy_kg', type: 'FLOAT', mode: 'REQUIRED' },
        { name: 'food_category', type: 'STRING', mode: 'REQUIRED' },
        { name: 'co2_avoided_kg', type: 'FLOAT', mode: 'REQUIRED' },
        { name: 'meals_rescued', type: 'INTEGER', mode: 'REQUIRED' },
        { name: 'delivered_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
      ],
    },
    {
      name: 'workflow_recovery_events',
      description: 'Audit telemetry on decline and automatic alternative recovery cycles',
      schemaFields: [
        { name: 'event_id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'assignment_id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'decline_reason', type: 'STRING', mode: 'REQUIRED' },
        { name: 'recovery_success', type: 'BOOLEAN', mode: 'REQUIRED' },
        { name: 'alternative_recipient_id', type: 'STRING', mode: 'NULLABLE' },
        { name: 'recovery_latency_sec', type: 'FLOAT', mode: 'REQUIRED' },
        { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
      ],
    },
  ],
};

export class BigQueryAnalyticsService {
  /**
   * Generates a streamable analytics payload for BigQuery ingestion
   */
  static generateBigQueryExportPayload(metrics: ImpactMetrics) {
    return {
      exportTimestamp: new Date().toISOString(),
      dataset: RESCUEGRID_BIGQUERY_SCHEMA.datasetId,
      metricsSnapshot: {
        total_eligible_donations: metrics.totalEligibleDonations,
        verified_delivered_kg: metrics.verifiedDeliveredKg,
        estimated_donated_kg: metrics.estimatedDonatedKg,
        discrepancy_rate_percent: metrics.discrepancyRatePercent,
        meals_delivered_count: metrics.mealsDeliveredCount,
        co2_emissions_prevented_kg: metrics.co2EmissionsPreventedKg,
        redistribution_success_rate: metrics.redistributionSuccessRate,
        average_assignment_minutes: metrics.averageAssignmentMinutes,
        failed_and_recovered_count: metrics.failedAndRecoveredCount,
      },
      exportStatus: 'READY_FOR_BIGQUERY_STREAMING_INSERT',
    };
  }
}
