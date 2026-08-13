import { Stop, UserCommuteStatus } from "../types";

/**
 * Haversine formula to compute distance between two lat/lng points in kilometers.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
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
 * Finds the nearest stop from a GPS coordinate out of a list of master stops.
 * Enforces a maximum stop radius threshold (default 2.5 km for corridor matching, 0.3 km for arrival matching).
 */
export function findNearestStop(
  lat: number,
  lng: number,
  stops: Stop[],
  maxRadiusKm: number = 3.0
): { nearestStop: Stop; distanceKm: number } | null {
  if (!stops || stops.length === 0) return null;

  let minDistance = Infinity;
  let nearest: Stop | null = null;

  for (const stop of stops) {
    const dist = calculateDistanceKm(lat, lng, stop.lat, stop.lng);
    if (dist < minDistance && dist <= maxRadiusKm) {
      minDistance = dist;
      nearest = stop;
    }
  }

  if (!nearest) {
    // Return closest fallback stop if outside strict radius
    let absoluteMin = Infinity;
    let absoluteNearest = stops[0];
    for (const stop of stops) {
      const dist = calculateDistanceKm(lat, lng, stop.lat, stop.lng);
      if (dist < absoluteMin) {
        absoluteMin = dist;
        absoluteNearest = stop;
      }
    }
    return { nearestStop: absoluteNearest, distanceKm: absoluteMin };
  }

  return { nearestStop: nearest, distanceKm: minDistance };
}

/**
 * Debounced / Hysteresis stop detection to prevent rapid flickering (GPS jitter)
 * between nearby stops (e.g. Gajuwaka → Kurmannapalem → Gajuwaka within seconds).
 * Swaps to a new stop ONLY if the user is significantly closer to the new stop
 * than the previous stop (hysteresis threshold of 0.25 km).
 */
export function getDebouncedCurrentStop(
  lat: number,
  lng: number,
  previousStop: Stop | null,
  allStops: Stop[]
): Stop | null {
  const nearestResult = findNearestStop(lat, lng, allStops);
  if (!nearestResult) return null;

  if (!previousStop) {
    return nearestResult.nearestStop;
  }

  // If user is within 0.35 km of previous stop, retain previous stop unless new candidate is >0.2 km closer
  const distToPrev = calculateDistanceKm(lat, lng, previousStop.lat, previousStop.lng);
  if (distToPrev <= 0.35 && nearestResult.nearestStop.id !== previousStop.id) {
    if (nearestResult.distanceKm > distToPrev - 0.2) {
      return previousStop; // Avoid rapid jitter switching due to GPS noise
    }
  }

  return nearestResult.nearestStop;
}

/**
 * Starts continuous browser/device geolocation watchPosition tracking.
 */
export function startContinuousGpsTracking(
  onUpdate: (status: Partial<UserCommuteStatus>) => void,
  onError: (errorMsg: string) => void
): number | null {
  if (!("geolocation" in navigator)) {
    onError("Location permission is required for automatic journey tracking.");
    return null;
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      onUpdate({
        isGpsActive: true,
        permissionGranted: true,
        permissionError: null,
        userLat: lat,
        userLng: lng,
      });
    },
    (err) => {
      let msg = "Location permission is required for automatic journey tracking.";
      if (err.code === err.PERMISSION_DENIED) {
        msg = "Location permission is required for automatic journey tracking.";
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        msg = "GPS position unavailable. Check device location settings.";
      } else if (err.code === err.TIMEOUT) {
        msg = "GPS signal request timed out.";
      }

      onUpdate({
        isGpsActive: false,
        permissionGranted: false,
        permissionError: msg,
      });
      onError(msg);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 15000,
    }
  );

  return watchId;
}

export function stopContinuousGpsTracking(watchId: number | null) {
  if (watchId !== null && "geolocation" in navigator) {
    navigator.geolocation.clearWatch(watchId);
  }
}
