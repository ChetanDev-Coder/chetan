import { ImpactMetrics, Assignment, DonationItem } from '../types';

export const IMPACT_CONSTANTS = {
  KG_PER_MEAL: 0.42, // EPA / ReFED standard portion
  CO2_KG_PER_FOOD_KG: 2.5, // EPA WARM model for diverted organic waste
  WATER_LITERS_PER_KG: 140, // Estimated virtual water footprint saved per kg mixed meals
};

export class ImpactCalculator {
  /**
   * Calculate verified vs estimated metrics from current database state
   */
  static calculate(donations: DonationItem[], assignments: Assignment[]): ImpactMetrics {
    const totalEligibleDonations = donations.length;
    
    // Sum estimated initial weight of all eligible donations
    const estimatedDonatedKg = donations.reduce((acc, d) => acc + (d.estimatedKg || 0), 0);

    // Filter delivered assignments with verified weights
    const deliveredAssignments = assignments.filter(a => a.status === 'DELIVERED');
    
    // Build O(1) hash map index for instantaneous donation lookup
    const donationMap = new Map<string, DonationItem>(
      donations.map(d => [d.id, d])
    );

    // Single-pass O(A) aggregation of verified delivered weights & discrepancy
    let verifiedDeliveredKg = 0;
    let totalInitialForDelivered = 0;
    let totalMinutes = 0;
    let timedCount = 0;

    for (let i = 0; i < deliveredAssignments.length; i++) {
      const asg = deliveredAssignments[i];
      verifiedDeliveredKg += asg.actualQuantityDeliveredKg || 0;

      const matchDonation = donationMap.get(asg.donationId);
      if (matchDonation) {
        totalInitialForDelivered += matchDonation.estimatedKg;
      }

      if (asg.proposedAt && asg.deliveredAt) {
        const diffMs = Date.parse(asg.deliveredAt) - Date.parse(asg.proposedAt);
        const mins = diffMs / (1000 * 60);
        if (mins > 0 && mins < 10000) {
          totalMinutes += mins;
          timedCount++;
        }
      }
    }

    const discrepancyRatePercent = totalInitialForDelivered > 0
      ? Number((Math.abs(verifiedDeliveredKg - totalInitialForDelivered) / totalInitialForDelivered * 100).toFixed(1))
      : 0;

    // Meals delivered strictly calculated from verified kg
    const mealsDeliveredCount = Math.round(verifiedDeliveredKg / IMPACT_CONSTANTS.KG_PER_MEAL);

    // CO2 avoided strictly calculated from verified kg
    const co2EmissionsPreventedKg = Number((verifiedDeliveredKg * IMPACT_CONSTANTS.CO2_KG_PER_FOOD_KG).toFixed(1));

    // Redistribution success rate
    const totalCompletedOrFailed = assignments.filter(a => ['DELIVERED', 'FAILED', 'DECLINED'].includes(a.status)).length;
    const redistributionSuccessRate = totalCompletedOrFailed > 0
      ? Number(((deliveredAssignments.length / totalCompletedOrFailed) * 100).toFixed(1))
      : 100;

    const averageAssignmentMinutes = timedCount > 0 ? Math.round(totalMinutes / timedCount) : 45;

    // Recovered assignments
    const failedAndRecoveredCount = assignments.filter(a => a.recoveryAttemptCount > 0).length;

    // Active rescues right now
    const activeRescuesNow = assignments.filter(a => ['PROPOSED', 'APPROVED', 'ACCEPTED', 'PICKUP_CONFIRMED'].includes(a.status)).length;

    return {
      totalEligibleDonations,
      verifiedDeliveredKg: Number(verifiedDeliveredKg.toFixed(1)),
      estimatedDonatedKg: Number(estimatedDonatedKg.toFixed(1)),
      discrepancyRatePercent,
      mealsDeliveredCount,
      co2EmissionsPreventedKg,
      redistributionSuccessRate,
      averageAssignmentMinutes,
      failedAndRecoveredCount,
      activeRescuesNow,
      dataSourceLabels: {
        verifiedKg: 'MEASURED',
        mealsCount: 'ESTIMATED_STANDARD',
        co2Offset: 'ESTIMATED_EPA_WARM',
        routesTime: 'MEASURED_OR_SIMULATED',
      },
    };
  }
}
