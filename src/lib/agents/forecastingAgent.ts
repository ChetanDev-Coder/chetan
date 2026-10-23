import { SurplusForecast, Organization } from '../types';
import { GeminiService } from '../integrations/geminiClient';
import { dbRepository } from '../db/storageAdapter';

export class ForecastingAgent {
  /**
   * Generates a structured food surplus forecast for a donor organization
   */
  static async generateForecast(params: {
    donorOrg: Organization;
    dayOfWeek: string;
    mealSlot: 'LUNCH' | 'DINNER' | 'BUFFET_CLOSURE' | 'EVENT_EXTRA';
    expectedHeadcount?: number;
    isHolidayOrEvent: boolean;
  }): Promise<SurplusForecast> {
    // 1. Gather historical baseline from repository
    const historicalDonations = dbRepository.listDonations({ donorOrgId: params.donorOrg.id });
    const historicalSampleSize = historicalDonations.length;

    // Calculate historical average kg
    let historicalAverageKg = 45.0; // Default baseline if historical data is limited
    if (historicalSampleSize > 0) {
      const totalKg = historicalDonations.reduce((sum, d) => sum + d.estimatedKg, 0);
      historicalAverageKg = Number((totalKg / historicalSampleSize).toFixed(1));
    }

    // 2. Run Gemini reasoning or deterministic baseline
    const forecastResult = await GeminiService.forecastSurplus({
      donorOrgName: params.donorOrg.name,
      dayOfWeek: params.dayOfWeek,
      mealSlot: params.mealSlot,
      expectedHeadcount: params.expectedHeadcount,
      isHolidayOrEvent: params.isHolidayOrEvent,
      historicalAverageKg,
      historicalSampleSize,
    });

    const forecast: SurplusForecast = {
      id: `fc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      donorOrgId: params.donorOrg.id,
      donorOrgName: params.donorOrg.name,
      dayOfWeek: params.dayOfWeek,
      mealTimeSlot: params.mealSlot,
      predictedSurplusKg: forecastResult.predictedSurplusKg,
      uncertaintyRangeKg: forecastResult.uncertaintyRangeKg,
      confidenceScore: forecastResult.confidenceScore,
      keyFactors: forecastResult.keyFactors,
      deterministicBaselineKg: forecastResult.deterministicBaselineKg,
      isAiGenerated: forecastResult.isAiGenerated,
      modelVersion: forecastResult.modelVersion,
      historicalSampleSize,
      createdAt: new Date().toISOString(),
    };

    // Save forecast
    dbRepository.saveForecast(forecast);

    // Audit log
    dbRepository.addAuditLog({
      actorId: 'SYSTEM_AGENT',
      actorRole: 'SYSTEM_AGENT',
      action: 'SURPLUS_FORECAST_GENERATED',
      resourceType: 'DONATION',
      resourceId: forecast.id,
      outcome: 'SUCCESS',
      details: {
        predictedKg: forecast.predictedSurplusKg,
        confidence: forecast.confidenceScore,
        isAiGenerated: forecast.isAiGenerated,
      },
    });

    return forecast;
  }
}
