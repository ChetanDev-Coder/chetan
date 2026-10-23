import { GeoLocation, RouteDetail, StorageRequirement } from '../types';
import { MapsRoutingService } from '../integrations/mapsClient';

export interface RouteSafetyAssessment {
  route: RouteDetail;
  isSafeForPerishable: boolean;
  maxRecommendedTransitMinutes: number;
  safetyMarginMinutes: number;
  warnings: string[];
}

export class RoutingAgent {
  /**
   * Plans route between donor pickup location and recipient, assessing food safety windows
   */
  static async planRoute(
    origin: GeoLocation,
    destination: GeoLocation,
    storageReq: StorageRequirement
  ): Promise<RouteSafetyAssessment> {
    const route = await MapsRoutingService.calculateRoute(origin, destination);

    // Food safety critical transit windows (HACCP principles)
    let maxRecommendedTransitMinutes = 90; // Default for shelf-stable / ambient
    if (storageReq === 'HOT_HELD_ABOVE_60C') {
      maxRecommendedTransitMinutes = 45; // Must reach destination within 45 mins to prevent temperature drop below 60C
    } else if (storageReq === 'REFRIGERATED_0_4C') {
      maxRecommendedTransitMinutes = 60; // 60 mins in insulated cold tote
    } else if (storageReq === 'FROZEN_BELOW_MINUS_18C') {
      maxRecommendedTransitMinutes = 40; // High risk of thawing
    }

    const safetyMarginMinutes = maxRecommendedTransitMinutes - route.durationMinutes;
    const isSafeForPerishable = safetyMarginMinutes >= 0;

    const warnings: string[] = [];
    if (!isSafeForPerishable) {
      warnings.push(
        `Critical: Estimated transit duration (${route.durationMinutes} mins) exceeds maximum safe window (${maxRecommendedTransitMinutes} mins) for ${storageReq}`
      );
    } else if (safetyMarginMinutes < 15) {
      warnings.push(
        `Warning: Tight transit window (only ${safetyMarginMinutes} mins buffer). High priority dispatch required.`
      );
    }

    return {
      route,
      isSafeForPerishable,
      maxRecommendedTransitMinutes,
      safetyMarginMinutes,
      warnings,
    };
  }
}
