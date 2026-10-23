import { DonationItem, Organization, MatchRecommendation, ConstraintCheckResult } from '../types';
import { GeminiService } from '../integrations/geminiClient';
import { MapsRoutingService } from '../integrations/mapsClient';

export interface EligibilityEvaluation {
  organization: Organization;
  isEligible: boolean;
  distanceKm: number;
  estimatedTransitMins: number;
  constraintResults: ConstraintCheckResult[];
  disqualificationReasons: string[];
}

export class MatchingAgent {
  /**
   * Evaluates deterministic eligibility filters on candidate organizations
   * NOTE: LLM is NEVER allowed to override these hard constraints!
   */
  static evaluateDeterministicEligibility(
    donation: DonationItem,
    candidateOrg: Organization,
    maxRadiusKm = 25
  ): EligibilityEvaluation {
    const constraintResults: ConstraintCheckResult[] = [];
    const disqualificationReasons: string[] = [];

    // Constraint 1: Verification status
    const isVerified = candidateOrg.verifiedStatus === true;
    constraintResults.push({
      constraintName: 'Organization Verification',
      passed: isVerified,
      explanation: isVerified
        ? 'Recipient organization holds verified 501(c)(3) or community kitchen status'
        : 'Organization is unverified; cannot receive public surplus food',
      isHardRule: true,
    });
    if (!isVerified) disqualificationReasons.push('Unverified organization status');

    // Constraint 2: Supported food category
    const supportsCategory = candidateOrg.supportedFoodCategories.includes(donation.category);
    constraintResults.push({
      constraintName: 'Food Category Compatibility',
      passed: supportsCategory,
      explanation: supportsCategory
        ? `Organization handles ${donation.category} safely`
        : `Organization lacks permits or kitchen setup for ${donation.category}`,
      isHardRule: true,
    });
    if (!supportsCategory) disqualificationReasons.push(`Category '${donation.category}' unsupported`);

    // Constraint 3: Storage & temperature capability
    const supportsStorage = candidateOrg.supportedStorage.includes(donation.storageRequirement);
    constraintResults.push({
      constraintName: 'Temperature & Storage Control',
      passed: supportsStorage,
      explanation: supportsStorage
        ? `Facility equipped for storage requirement: ${donation.storageRequirement}`
        : `Facility lacks equipment for: ${donation.storageRequirement}`,
      isHardRule: true,
    });
    if (!supportsStorage) disqualificationReasons.push(`Missing storage equipment for ${donation.storageRequirement}`);

    // Constraint 4: Capacity check
    const availableCapacityKg = candidateOrg.capacityKg - candidateOrg.currentDailyLoadKg;
    const hasCapacity = availableCapacityKg >= donation.estimatedKg;
    constraintResults.push({
      constraintName: 'Intake Capacity',
      passed: hasCapacity,
      explanation: hasCapacity
        ? `Capacity margin (${availableCapacityKg} kg) accommodates donation (${donation.estimatedKg} kg)`
        : `Capacity exceeded: Needs ${donation.estimatedKg} kg but only ${availableCapacityKg} kg available today`,
      isHardRule: true,
    });
    if (!hasCapacity) disqualificationReasons.push(`Insufficient capacity (${availableCapacityKg} kg < ${donation.estimatedKg} kg)`);

    // Constraint 5: Distance radius calculation
    const distanceKm = MapsRoutingService.calculateHaversineDistanceKm(
      donation.pickupLocation.lat,
      donation.pickupLocation.lng,
      candidateOrg.location.lat,
      candidateOrg.location.lng
    );
    const estimatedTransitMins = Math.max(5, Math.round((distanceKm * 1.32 / 24) * 60));

    const isWithinRadius = distanceKm <= maxRadiusKm;
    constraintResults.push({
      constraintName: 'Max Service Radius',
      passed: isWithinRadius,
      explanation: isWithinRadius
        ? `Distance (${distanceKm.toFixed(1)} km) is within max radius (${maxRadiusKm} km)`
        : `Distance (${distanceKm.toFixed(1)} km) exceeds service limit (${maxRadiusKm} km)`,
      isHardRule: true,
    });
    if (!isWithinRadius) disqualificationReasons.push(`Beyond ${maxRadiusKm} km radius limit (${distanceKm.toFixed(1)} km)`);

    // Constraint 6: Safe Transit Window for hot/perishable foods
    let safeWindowPassed = true;
    let safeWindowExplanation = 'Transit duration within safe distribution window';
    if (donation.storageRequirement === 'HOT_HELD_ABOVE_60C' && estimatedTransitMins > 45) {
      safeWindowPassed = false;
      safeWindowExplanation = `Hot food transit duration (~${estimatedTransitMins} mins) exceeds 45-minute critical safety threshold`;
      disqualificationReasons.push('Hot food transit window exceeded');
    }
    constraintResults.push({
      constraintName: 'Food Safety Transit Window',
      passed: safeWindowPassed,
      explanation: safeWindowExplanation,
      isHardRule: true,
    });

    const isEligible = constraintResults.every(c => c.passed);

    return {
      organization: candidateOrg,
      isEligible,
      distanceKm: Number(distanceKm.toFixed(1)),
      estimatedTransitMins,
      constraintResults,
      disqualificationReasons,
    };
  }

  /**
   * Run full matching pipeline: deterministic filter -> Gemini AI ranking -> recommendations
   */
  static async findAndRankMatches(
    donation: DonationItem,
    allOrganizations: Organization[],
    maxRadiusKm = 25,
    forceDeterministicFallback = false
  ): Promise<MatchRecommendation[]> {
    // Only recipient organization types
    const recipientOrgs = allOrganizations.filter(o => o.organizationType !== 'DONOR_BUSINESS');

    // 1. Evaluate deterministic eligibility for every recipient
    const evaluations = recipientOrgs.map(org =>
      this.evaluateDeterministicEligibility(donation, org, maxRadiusKm)
    );

    // Filter strictly to eligible candidates
    const eligibleCandidates = evaluations.filter(e => e.isEligible);

    // Even if no candidates pass all hard rules, create diagnostic disqualification records
    if (eligibleCandidates.length === 0) {
      return evaluations.slice(0, 3).map(e => ({
        id: `rec_disqual_${donation.id}_${e.organization.id}`,
        donationId: donation.id,
        recipientId: e.organization.id,
        recipientName: e.organization.name,
        score: 0,
        scoreBreakdown: {
          distanceScore: 0,
          capacityScore: 0,
          urgencyScore: 0,
          reliabilityScore: 0,
          priorityNeedScore: 0,
        },
        distanceKm: e.distanceKm,
        estimatedTransitMinutes: e.estimatedTransitMins,
        reasons: ['Disqualified by deterministic food-safety / capacity filters.'],
        disqualificationReasons: e.disqualificationReasons,
        constraintResults: e.constraintResults,
        modelVersion: 'deterministic-safety-filter-v1',
        isAiRanked: false,
        createdAt: new Date().toISOString(),
      }));
    }

    // 2. Pass eligible candidates to Gemini (or deterministic fallback)
    const candidatesForRanking = eligibleCandidates.map(e => ({
      id: e.organization.id,
      name: e.organization.name,
      type: e.organization.organizationType,
      capacityKg: e.organization.capacityKg,
      currentLoadKg: e.organization.currentDailyLoadKg,
      distanceKm: e.distanceKm,
      estimatedTransitMins: e.estimatedTransitMins,
      rating: e.organization.rating,
    }));

    let rankingResult;
    if (forceDeterministicFallback) {
      rankingResult = GeminiService.deterministicRankingFallback({
        donation: {
          foodName: donation.foodName,
          category: donation.category,
          estimatedKg: donation.estimatedKg,
        },
        candidates: candidatesForRanking,
      });
    } else {
      rankingResult = await GeminiService.rankCandidatesWithAi({
        donation: {
          foodName: donation.foodName,
          category: donation.category,
          quantity: donation.quantity,
          unit: donation.unit,
          estimatedKg: donation.estimatedKg,
          preparedAt: donation.preparedAt,
          availableUntil: donation.availableUntil,
          storageRequirement: donation.storageRequirement,
          allergens: donation.allergens,
          dietaryTags: donation.dietaryTags,
        },
        candidates: candidatesForRanking,
      });
    }

    // 3. Assemble recommendations with explanations and constraint proofs
    const eligibleMap = new Map<string, EligibilityEvaluation>(
      eligibleCandidates.map(e => [e.organization.id, e])
    );

    const recommendations: MatchRecommendation[] = rankingResult.rankedResults.map(ranked => {
      const evalData = eligibleMap.get(ranked.recipientId) || eligibleCandidates[0];
      return {
        id: `rec_${donation.id}_${ranked.recipientId}`,
        donationId: donation.id,
        recipientId: ranked.recipientId,
        recipientName: evalData.organization.name,
        score: ranked.score,
        scoreBreakdown: ranked.scoreBreakdown,
        distanceKm: evalData.distanceKm,
        estimatedTransitMinutes: evalData.estimatedTransitMins,
        reasons: ranked.reasons,
        constraintResults: evalData.constraintResults,
        modelVersion: rankingResult.modelVersion,
        isAiRanked: rankingResult.isAiGenerated,
        createdAt: new Date().toISOString(),
      };
    });

    // Also append any disqualified organizations for transparent coordinator review
    const disqualified = evaluations
      .filter(e => !e.isEligible)
      .map(e => ({
        id: `rec_disqual_${donation.id}_${e.organization.id}`,
        donationId: donation.id,
        recipientId: e.organization.id,
        recipientName: e.organization.name,
        score: 0,
        scoreBreakdown: {
          distanceScore: 0,
          capacityScore: 0,
          urgencyScore: 0,
          reliabilityScore: 0,
          priorityNeedScore: 0,
        },
        distanceKm: e.distanceKm,
        estimatedTransitMinutes: e.estimatedTransitMins,
        reasons: ['Disqualified by deterministic food-safety / capacity filters.'],
        disqualificationReasons: e.disqualificationReasons,
        constraintResults: e.constraintResults,
        modelVersion: rankingResult.modelVersion,
        isAiRanked: false,
        createdAt: new Date().toISOString(),
      }));

    return [...recommendations, ...disqualified];
  }
}
