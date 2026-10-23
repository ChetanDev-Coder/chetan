import { GoogleGenAI } from '@google/genai';

export interface GeminiConfigStatus {
  isConfigured: boolean;
  model: string;
  provider: string;
}

export function getGeminiConfigStatus(): GeminiConfigStatus {
  const apiKey = process.env.GEMINI_API_KEY;
  return {
    isConfigured: Boolean(apiKey && apiKey.length > 5 && !apiKey.includes('placeholder')),
    model: 'gemini-2.5-flash',
    provider: 'Google Cloud Gemini API',
  };
}

export class GeminiService {
  private static getClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.length < 5 || apiKey.includes('placeholder')) {
      return null;
    }
    return new GoogleGenAI({ apiKey });
  }

  /**
   * Evaluates and scores matching candidates with structured AI reasoning
   */
  static async rankCandidatesWithAi(params: {
    donation: {
      foodName: string;
      category: string;
      quantity: number;
      unit: string;
      estimatedKg: number;
      preparedAt: string;
      availableUntil: string;
      storageRequirement: string;
      allergens: string[];
      dietaryTags: string[];
    };
    candidates: Array<{
      id: string;
      name: string;
      type: string;
      capacityKg: number;
      currentLoadKg: number;
      distanceKm: number;
      estimatedTransitMins: number;
      rating: number;
    }>;
  }): Promise<{
    rankedResults: Array<{
      recipientId: string;
      score: number;
      reasons: string[];
      scoreBreakdown: {
        distanceScore: number;
        capacityScore: number;
        urgencyScore: number;
        reliabilityScore: number;
        priorityNeedScore: number;
      };
    }>;
    isAiGenerated: boolean;
    modelVersion: string;
  }> {
    const client = this.getClient();

    if (!client) {
      // Deterministic fallback ranking engine
      return this.deterministicRankingFallback(params);
    }

    try {
      const prompt = `
You are the AI Matching Engine for RescueGrid AI, an agentic food rescue platform.
Analyze this surplus food donation and score each pre-filtered candidate recipient organization.

DONATION SPECIFICATIONS:
- Food: ${params.donation.foodName} (${params.donation.category})
- Quantity: ${params.donation.quantity} ${params.donation.unit} (~${params.donation.estimatedKg} kg)
- Storage Req: ${params.donation.storageRequirement}
- Available Until: ${params.donation.availableUntil}
- Allergens: ${params.donation.allergens.join(', ') || 'None'}
- Dietary: ${params.donation.dietaryTags.join(', ') || 'Standard'}

FEASIBLE CANDIDATES (Deterministic safety & capacity filters already verified):
${JSON.stringify(params.candidates, null, 2)}

INSTRUCTIONS:
1. Score each candidate from 0 to 100 based on:
   - Distance & transit time (closer is better, especially for hot/perishable foods)
   - Remaining capacity (capacityKg - currentLoadKg vs donation weight)
   - Urgency & operational alignment
   - Historical reliability rating
   - Mission priority (community kitchens and emergency shelters serving immediate walk-ins have high priority need)
2. Provide a breakdown of scores (each 0-100) for distanceScore, capacityScore, urgencyScore, reliabilityScore, priorityNeedScore.
3. Provide 2-3 concise, factual bullet explanations in 'reasons'.

Return strictly valid JSON matching this schema:
{
  "rankedResults": [
    {
      "recipientId": "string",
      "score": number,
      "reasons": ["string"],
      "scoreBreakdown": {
        "distanceScore": number,
        "capacityScore": number,
        "urgencyScore": number,
        "reliabilityScore": number,
        "priorityNeedScore": number
      }
    }
  ]
}
`;

      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2, // Low temperature for consistent decision support
        },
      });

      const text = response.text?.trim() || '';
      const parsed = JSON.parse(text);

      if (Array.isArray(parsed.rankedResults) && parsed.rankedResults.length > 0) {
        return {
          rankedResults: parsed.rankedResults,
          isAiGenerated: true,
          modelVersion: 'gemini-2.5-flash-structured-matching',
        };
      }
      return this.deterministicRankingFallback(params);
    } catch (err) {
      console.warn('Gemini API call failed or timed out. Gracefully falling back to deterministic ranker.', err);
      return this.deterministicRankingFallback(params);
    }
  }

  /**
   * Deterministic matching fallback when Gemini API key is missing or offline
   */
  static deterministicRankingFallback(params: {
    donation: {
      foodName: string;
      category: string;
      estimatedKg: number;
    };
    candidates: Array<{
      id: string;
      name: string;
      type: string;
      capacityKg: number;
      currentLoadKg: number;
      distanceKm: number;
      estimatedTransitMins: number;
      rating: number;
    }>;
  }) {
    const rankedResults = params.candidates.map(candidate => {
      // 1. Distance score (25% weight): 0 km = 100, 20 km = 20
      const distanceScore = Math.max(10, Math.round(100 - candidate.distanceKm * 4));

      // 2. Capacity score (25% weight): available margin vs donation weight
      const availableCapacity = candidate.capacityKg - candidate.currentLoadKg;
      const capacityRatio = availableCapacity / (params.donation.estimatedKg || 1);
      const capacityScore = Math.min(100, Math.round(Math.min(capacityRatio, 2) * 50));

      // 3. Urgency score (20% weight): quicker transit = higher urgency score
      const urgencyScore = Math.max(20, Math.round(100 - candidate.estimatedTransitMins * 1.5));

      // 4. Reliability score (15% weight): 5-star rating mapped to 0-100
      const reliabilityScore = Math.round((candidate.rating / 5) * 100);

      // 5. Priority need score (15% weight)
      let priorityNeedScore = 75;
      if (candidate.type === 'COMMUNITY_KITCHEN' || candidate.type === 'SHELTER') {
        priorityNeedScore = 95;
      } else if (candidate.type === 'STUDENT_PANTRY') {
        priorityNeedScore = 88;
      } else if (candidate.type === 'FOOD_BANK') {
        priorityNeedScore = 80;
      }

      // Weighted total
      const totalScore = Math.round(
        distanceScore * 0.25 +
        capacityScore * 0.25 +
        urgencyScore * 0.20 +
        reliabilityScore * 0.15 +
        priorityNeedScore * 0.15
      );

      const reasons = [
        `${candidate.distanceKm.toFixed(1)} km transit distance (~${candidate.estimatedTransitMins} mins travel time)`,
        `Available capacity of ${availableCapacity} kg accommodates ${params.donation.estimatedKg} kg donation`,
        `High historical reliability rating of ${candidate.rating.toFixed(2)}/5.00 with verified handover record`,
      ];

      return {
        recipientId: candidate.id,
        score: totalScore,
        reasons,
        scoreBreakdown: {
          distanceScore,
          capacityScore,
          urgencyScore,
          reliabilityScore,
          priorityNeedScore,
        },
      };
    });

    // Sort descending by score
    rankedResults.sort((a, b) => b.score - a.score);

    return {
      rankedResults,
      isAiGenerated: false,
      modelVersion: 'deterministic-heuristic-v1-fallback',
    };
  }

  /**
   * Forecasts surplus food based on historical trends + contextual factors
   */
  static async forecastSurplus(params: {
    donorOrgName: string;
    dayOfWeek: string;
    mealSlot: string;
    expectedHeadcount?: number;
    isHolidayOrEvent: boolean;
    historicalAverageKg: number;
    historicalSampleSize: number;
  }) {
    const client = this.getClient();

    if (!client) {
      return this.deterministicForecastFallback(params);
    }

    try {
      const prompt = `
You are the Surplus Forecasting Agent for RescueGrid AI.
Generate a structured forecast of potential food surplus for:
- Facility: ${params.donorOrgName}
- Day: ${params.dayOfWeek}
- Meal Slot: ${params.mealSlot}
- Expected Headcount: ${params.expectedHeadcount || 'Typical baseline'}
- Holiday/Special Event: ${params.isHolidayOrEvent ? 'Yes' : 'No'}
- Historical Average: ${params.historicalAverageKg} kg (Sample size: ${params.historicalSampleSize} events)

INSTRUCTIONS:
1. Estimate predicted surplus kg based on institutional catering patterns (e.g., student meal drop-offs on Fridays, banquet buffer margins).
2. Provide a realistic uncertainty range [minKg, maxKg].
3. Provide confidence score (0.0 to 1.0).
4. Provide 3 key predictive factors explaining the projection.

Return strictly valid JSON:
{
  "predictedSurplusKg": number,
  "uncertaintyRangeKg": [number, number],
  "confidenceScore": number,
  "keyFactors": ["string", "string", "string"]
}
`;

      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });

      const text = response.text?.trim() || '';
      const parsed = JSON.parse(text);

      if (parsed.predictedSurplusKg) {
        return {
          ...parsed,
          deterministicBaselineKg: params.historicalAverageKg,
          isAiGenerated: true,
          modelVersion: 'gemini-2.5-flash-surplus-forecaster',
        };
      }
      return this.deterministicForecastFallback(params);
    } catch (err) {
      console.warn('Gemini forecast API error. Using deterministic forecast fallback.', err);
      return this.deterministicForecastFallback(params);
    }
  }

  static deterministicForecastFallback(params: {
    dayOfWeek: string;
    mealSlot: string;
    isHolidayOrEvent: boolean;
    historicalAverageKg: number;
    historicalSampleSize: number;
  }) {
    let multiplier = 1.0;
    const factors: string[] = [];

    if (params.dayOfWeek === 'FRIDAY' || params.dayOfWeek === 'SATURDAY') {
      multiplier *= 1.18;
      factors.push('Weekend shift increases buffet surplus variability (+18%)');
    }
    if (params.mealSlot === 'BUFFET_CLOSURE' || params.mealSlot === 'DINNER') {
      multiplier *= 1.12;
      factors.push('Late evening service yields higher unserved hot-tray buffer (+12%)');
    }
    if (params.isHolidayOrEvent) {
      multiplier *= 1.25;
      factors.push('Special event attendance buffer applied (+25%)');
    }

    if (factors.length === 0) {
      factors.push('Standard midweek institutional dining utilization baseline');
    }

    const predicted = Number((params.historicalAverageKg * multiplier).toFixed(1));
    const minRange = Number((predicted * 0.82).toFixed(1));
    const maxRange = Number((predicted * 1.22).toFixed(1));

    return {
      predictedSurplusKg: predicted,
      uncertaintyRangeKg: [minRange, maxRange] as [number, number],
      confidenceScore: params.historicalSampleSize > 30 ? 0.91 : 0.74,
      keyFactors: factors,
      deterministicBaselineKg: params.historicalAverageKg,
      isAiGenerated: false,
      modelVersion: 'deterministic-time-series-baseline-v1',
    };
  }
}
