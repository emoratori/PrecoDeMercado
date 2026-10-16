import { Market } from '../types';

/**
 * Calculates distance between two GPS coordinates using the Haversine formula
 * Returns distance in meters.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Format distance cleanly: e.g. "120 m" or "1,4 km"
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters} m`;
  }
  const km = (meters / 1000).toFixed(1).replace('.', ',');
  return `${km} km`;
}

/**
 * Finds the closest market from a list given current coordinates
 */
export function findNearestMarket(
  userLat: number,
  userLng: number,
  markets: Market[]
): { market: Market; distanceMeters: number } | null {
  const marketsWithCoords = markets.filter(
    (m) => typeof m.latitude === 'number' && typeof m.longitude === 'number'
  );

  if (marketsWithCoords.length === 0) return null;

  let nearest: Market = marketsWithCoords[0];
  let minDistance = calculateDistanceMeters(
    userLat,
    userLng,
    nearest.latitude!,
    nearest.longitude!
  );

  for (let i = 1; i < marketsWithCoords.length; i++) {
    const current = marketsWithCoords[i];
    const dist = calculateDistanceMeters(
      userLat,
      userLng,
      current.latitude!,
      current.longitude!
    );
    if (dist < minDistance) {
      minDistance = dist;
      nearest = current;
    }
  }

  return { market: nearest, distanceMeters: minDistance };
}
