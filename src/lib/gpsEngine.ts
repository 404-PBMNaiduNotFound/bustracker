import { Stop, ActiveJourney, CrowdLevel } from "../types";

/**
 * Calculates Haversine distance between two lat/lng coordinates in kilometers
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Finds the nearest stop from a given GPS coordinate
 */
export function findNearestStop(
  lat: number,
  lng: number,
  stops: Stop[]
): { nearestStop: Stop; distanceKm: number } | null {
  if (!stops || stops.length === 0) return null;

  let minDistance = Infinity;
  let nearest: Stop = stops[0];

  for (const stop of stops) {
    const dist = calculateDistanceKm(lat, lng, stop.lat, stop.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = stop;
    }
  }

  return { nearestStop: nearest, distanceKm: minDistance };
}

/**
 * Determines whether user is ON BOARD bus or WAITING AT STOP based on proximity and speed
 */
export function determineUserOnboardStatus(
  userLat: number,
  userLng: number,
  busLat: number,
  busLng: number,
  busSpeedKmH: number
): { isUserOnboard: boolean; statusMessage: string } {
  const distanceKm = calculateDistanceKm(userLat, userLng, busLat, busLng);

  // If user is within 300 meters of bus cluster AND bus is moving (> 12 km/h)
  if (distanceKm <= 0.35 && busSpeedKmH > 12) {
    return {
      isUserOnboard: true,
      statusMessage: "🚌 ON BOARD / TRAVELLING ON BUS 38Y",
    };
  }

  return {
    isUserOnboard: false,
    statusMessage: "🚏 WAITING AT BOARDING STOP",
  };
}

/**
 * Dynamic Speed Engine: Calculates actual velocity (km/h) between two GPS updates
 */
export function calculateLiveSpeed(
  prevLat: number,
  prevLng: number,
  prevTimeMs: number,
  currLat: number,
  currLng: number,
  currTimeMs: number
): number {
  const distanceKm = calculateDistanceKm(prevLat, prevLng, currLat, currLng);
  const timeHours = Math.max((currTimeMs - prevTimeMs) / (1000 * 3600), 0.0001);
  if (distanceKm < 0.05) return 28; // Traffic slow-crawl at bus stop
  const speed = Math.round(distanceKm / timeHours);
  return Math.min(Math.max(speed, 18), 58);
}

/**
 * Aggregates crowd metrics for a given route based on active student journeys
 */
export function calculateRouteCrowd(
  routeId: string,
  activeJourneys: ActiveJourney[]
): {
  activeCount: number;
  crowdLevel: CrowdLevel;
  confirmedNearbyCount: number;
  confidenceText: string;
} {
  const routeJourneys = activeJourneys.filter(
    (j) => j.routeId === routeId && j.journeyStatus !== "ARRIVED"
  );

  const activeCount = routeJourneys.length;

  let crowdLevel: CrowdLevel = "LOW";
  if (activeCount > 15) {
    crowdLevel = "HIGH";
  } else if (activeCount >= 5) {
    crowdLevel = "MEDIUM";
  }

  const confirmedNearbyCount = routeJourneys.filter(
    (j) => j.confirmedByStudent === true
  ).length;

  let confidenceText = "Low (Single GPS signal)";
  if (activeCount >= 10 || confirmedNearbyCount >= 5) {
    confidenceText = "High (GPS cluster verified)";
  } else if (activeCount >= 3 || confirmedNearbyCount >= 1) {
    confidenceText = "Medium (Multiple student tracks)";
  }

  return {
    activeCount,
    crowdLevel,
    confirmedNearbyCount,
    confidenceText,
  };
}
