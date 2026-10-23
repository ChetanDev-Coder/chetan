import { GeoLocation, RouteDetail } from '../types';

export interface MapsConfigStatus {
  isConfigured: boolean;
  provider: string;
}

export function getMapsConfigStatus(): MapsConfigStatus {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  return {
    isConfigured: Boolean(apiKey && apiKey.length > 5 && !apiKey.includes('placeholder')),
    provider: 'Google Maps Platform Routes API',
  };
}

export class MapsRoutingService {
  /**
   * Calculates travel distance, estimated duration, and waypoint path
   */
  static async calculateRoute(origin: GeoLocation, destination: GeoLocation): Promise<RouteDetail> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (apiKey && apiKey.length > 5 && !apiKey.includes('placeholder')) {
      try {
        // Call Google Maps Platform Routes API v2
        const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
          },
          body: JSON.stringify({
            origin: {
              location: {
                latLng: {
                  latitude: origin.lat,
                  longitude: origin.lng,
                },
              },
            },
            destination: {
              location: {
                latLng: {
                  latitude: destination.lat,
                  longitude: destination.lng,
                },
              },
            },
            travelMode: 'DRIVE',
            routingPreference: 'TRAFFIC_AWARE',
            computeAlternativeRoutes: false,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const route = data.routes?.[0];
          if (route) {
            const distanceMeters = route.distanceMeters || 5000;
            const distanceKm = Number((distanceMeters / 1000).toFixed(2));
            const durationSec = parseInt(route.duration?.replace('s', '') || '900', 10);
            const durationMinutes = Math.max(1, Math.round(durationSec / 60));

            return {
              origin,
              destination,
              distanceKm,
              durationMinutes,
              estimatedCo2SavedKg: Number((distanceKm * 0.17).toFixed(2)), // Saved via consolidated rescue vs dead-run disposal
              waypoints: this.interpolateWaypoints(origin, destination, 6),
              isRealRoutesApi: true,
              routeSummary: `Via Google Maps Platform Routes API (Traffic-Aware) • ${distanceKm} km`,
              trafficCondition: durationMinutes > distanceKm * 3.5 ? 'HEAVY' : 'MODERATE',
            };
          }
        }
      } catch (err) {
        console.warn('Google Routes API request failed or timed out. Falling back to deterministic route calculation.', err);
      }
    }

    // Deterministic mathematical fallback
    return this.calculateDeterministicRoute(origin, destination);
  }

  /**
   * Deterministic route calculator using Haversine formula + urban circuity coefficient (1.32x)
   */
  static calculateDeterministicRoute(origin: GeoLocation, destination: GeoLocation): RouteDetail {
    const straightLineKm = this.calculateHaversineDistanceKm(origin.lat, origin.lng, destination.lat, destination.lng);
    // Urban road circuity factor: straight-line to road distance multiplier
    const roadCircuityFactor = 1.32;
    const distanceKm = Number((straightLineKm * roadCircuityFactor).toFixed(2));

    // Assume average urban speed of 24 km/h with traffic lights
    const averageSpeedKmH = 24;
    const durationMinutes = Math.max(3, Math.round((distanceKm / averageSpeedKmH) * 60));

    const waypoints = this.interpolateWaypoints(origin, destination, 5);

    return {
      origin,
      destination,
      distanceKm,
      durationMinutes,
      estimatedCo2SavedKg: Number((distanceKm * 0.16).toFixed(2)),
      waypoints,
      isRealRoutesApi: false,
      routeSummary: `Deterministic Road Distance Model (Circuity 1.32x) • ${distanceKm} km`,
      trafficCondition: 'MODERATE',
    };
  }

  /**
   * Standard Haversine formula
   */
  static calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Generates realistic intermediate waypoints for display on map
   */
  private static interpolateWaypoints(
    origin: GeoLocation,
    dest: GeoLocation,
    steps: number
  ): [number, number][] {
    const points: [number, number][] = [[origin.lat, origin.lng]];

    for (let i = 1; i <= steps; i++) {
      const fraction = i / (steps + 1);
      // Add slight jitter for realistic road curvature
      const jitterLat = Math.sin(fraction * Math.PI) * 0.002;
      const jitterLng = Math.cos(fraction * Math.PI) * 0.002;
      const lat = origin.lat + (dest.lat - origin.lat) * fraction + jitterLat;
      const lng = origin.lng + (dest.lng - origin.lng) * fraction + jitterLng;
      points.push([Number(lat.toFixed(5)), Number(lng.toFixed(5))]);
    }

    points.push([dest.lat, dest.lng]);
    return points;
  }
}
