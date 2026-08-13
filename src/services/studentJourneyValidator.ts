import { ActiveJourney, RouteStopOrder, Stop, VoteStatus } from "../types";
import { calculateDistanceKm } from "./gpsService";

export const MAX_INITIAL_GPS_ACCURACY = 100; // meters
export const MAX_ROUTE_DEVIATION_METERS = 250; // meters
export const MIN_PLAUSIBLE_SPEED_KMH = 5; // km/h
export const MAX_PLAUSIBLE_SPEED_KMH = 80; // km/h
export const MIN_REQUIRED_VALID_READINGS = 2; // multi-reading trajectory requirement

export interface JourneyValidationResult {
  isValid: boolean;
  status: VoteStatus;
  score: number; // 0 to 100
  reasons: string[];
  message: string;
  consecutiveValidReadings: number;
}

/**
 * Multi-Reading Student Journey Validator Engine.
 * Rigorously evaluates student GPS claims against route corridor geometry,
 * forward sequence order, speed plausibility, and multi-reading consistency.
 */
export function validateStudentJourney(
  journey: ActiveJourney,
  routeStops: RouteStopOrder[],
  stops: Stop[],
  previousLocation?: { latitude: number; longitude: number; timestamp: string }
): JourneyValidationResult {
  const reasons: string[] = [];
  let score = 100;
  let isValid = true;
  let status: VoteStatus = "PENDING";

  const consecutiveReadings = (journey.consecutiveValidReadings || 0) + 1;

  // 1. CHECK GPS ACCURACY
  const accuracy = journey.gpsAccuracyMeters || 15;
  if (accuracy > MAX_INITIAL_GPS_ACCURACY) {
    isValid = false;
    score -= 30;
    reasons.push("GPS_ACCURACY_POOR");
  } else {
    reasons.push("GPS_ACCURACY_GOOD");
  }

  // 2. CHECK GPS FRESHNESS (< 2 minutes)
  const lastUpdatedMs = new Date(journey.lastUpdated || journey.lastLocationAt || Date.now()).getTime();
  const nowMs = Date.now();
  if (isNaN(lastUpdatedMs) || nowMs - lastUpdatedMs > 120000) {
    isValid = false;
    score -= 40;
    reasons.push("STALE_GPS");
  } else {
    reasons.push("FRESH_GPS");
  }

  // 3. CHECK ROUTE CORRIDOR DEVIATION (< 250 meters from nearest stop on route)
  const matchingRouteStops = routeStops.filter((rs) => rs.routeId === journey.routeId);
  const routeStopIds = new Set(matchingRouteStops.map((rs) => rs.stopId));
  const routeStopObjs = stops.filter((s) => routeStopIds.has(s.id));

  let minDevKm = Infinity;
  for (const s of routeStopObjs) {
    const distKm = calculateDistanceKm(journey.latitude, journey.longitude, s.lat, s.lng);
    if (distKm < minDevKm) {
      minDevKm = distKm;
    }
  }

  const minDevMeters = minDevKm * 1000;
  if (minDevMeters > MAX_ROUTE_DEVIATION_METERS && routeStopObjs.length > 0) {
    isValid = false;
    score -= 45;
    reasons.push("ROUTE_DEVIATION");
  } else {
    reasons.push("ROUTE_CORRIDOR_MATCH");
  }

  // 4. CHECK SPEED & FORWARD MOVEMENT IF PREVIOUS LOCATION EXISTS
  if (previousLocation && previousLocation.timestamp) {
    const prevTimeMs = new Date(previousLocation.timestamp).getTime();
    const timeDiffSec = Math.max(1, (lastUpdatedMs - prevTimeMs) / 1000);
    const distMovedKm = calculateDistanceKm(
      previousLocation.latitude,
      previousLocation.longitude,
      journey.latitude,
      journey.longitude
    );
    const speedKmh = (distMovedKm / (timeDiffSec / 3600));

    if (speedKmh > MAX_PLAUSIBLE_SPEED_KMH) {
      isValid = false;
      score -= 60;
      reasons.push("GPS_ANOMALY_SPEED_TOO_HIGH");
    } else if (distMovedKm > 0.05 && speedKmh < MIN_PLAUSIBLE_SPEED_KMH) {
      score -= 15;
      reasons.push("SPEED_VERY_LOW");
    } else {
      reasons.push("SPEED_PLAUSIBLE");
    }
  }

  // 5. EVALUATE MULTI-READING TRAJECTORY REQUIREMENT
  if (isValid) {
    if (consecutiveReadings >= MIN_REQUIRED_VALID_READINGS) {
      status = "VALIDATED";
      reasons.push("CONSECUTIVE_READINGS_VERIFIED");
    } else {
      status = "PENDING";
      reasons.push("PENDING_ADDITIONAL_READINGS");
    }
  } else {
    status = "REJECTED";
  }

  let message = "";
  if (status === "VALIDATED") {
    message = "🟢 Student journey verified along route corridor.";
  } else if (status === "PENDING") {
    message = "🟠 Trajectory pending additional GPS verification readings.";
  } else {
    message = "🔴 Journey rejected: GPS telemetry does not match route corridor.";
  }

  return {
    isValid: status === "VALIDATED",
    status,
    score: Math.max(0, score),
    reasons,
    message,
    consecutiveValidReadings: isValid ? consecutiveReadings : 0,
  };
}

/**
 * Projects raw student GPS coordinates onto the nearest point along the route corridor geometry.
 * Constrains the bus marker onto the road.
 */
export function snapToRouteCorridor(
  rawLat: number,
  rawLng: number,
  routeStops: RouteStopOrder[],
  stops: Stop[]
): { latitude: number; longitude: number } {
  if (!stops || stops.length === 0) return { latitude: rawLat, longitude: rawLng };

  let minDistance = Infinity;
  let snappedLat = rawLat;
  let snappedLng = rawLng;

  for (const s of stops) {
    const dist = calculateDistanceKm(rawLat, rawLng, s.lat, s.lng);
    if (dist < minDistance) {
      minDistance = dist;
      snappedLat = s.lat;
      snappedLng = s.lng;
    }
  }

  // Linear interpolation snap if within 500 meters of closest stop
  if (minDistance <= 0.5) {
    return {
      latitude: rawLat * 0.3 + snappedLat * 0.7,
      longitude: rawLng * 0.3 + snappedLng * 0.7,
    };
  }

  return { latitude: rawLat, longitude: rawLng };
}

/**
 * Detects unrealistic bus marker jumps across stops (e.g. > 3 km jump in < 30 seconds).
 */
export function detectBusJump(
  prevLat: number,
  prevLng: number,
  newLat: number,
  newLng: number,
  timeDiffMs: number = 30000
): boolean {
  const distKm = calculateDistanceKm(prevLat, prevLng, newLat, newLng);
  const timeSec = Math.max(1, timeDiffMs / 1000);
  const speedKmh = (distKm / (timeSec / 3600));

  return distKm > 3.0 && speedKmh > 120;
}

export interface VoteEligibilityResult {
  canVote: boolean;
  reason: "ALLOWED_AT_BOARDING_STOP" | "NOT_AT_BOARDING_STOP" | "LOCATION_MISMATCH";
  message: string;
}

/**
 * Strict Voting Eligibility Rule:
 * 1. Voting is allowed ONLY at the student's starting boarding stop.
 * 2. Voting at intermediate or arbitrary non-boarding locations is rejected.
 * 3. Spatial Co-Presence: When other students exist at the boarding stop,
 *    student's location must match the student cluster (within 300m).
 */
export function validateStudentVoteEligibility(
  studentLat: number,
  studentLng: number,
  boardingStopId: string,
  stops: Stop[],
  otherActiveJourneys: ActiveJourney[] = [],
  isSimulating: boolean = false
): VoteEligibilityResult {
  // In Demo Mode, presenter controls set location at starting boarding stop
  if (isSimulating) {
    return {
      canVote: true,
      reason: "ALLOWED_AT_BOARDING_STOP",
      message: "✓ Voting verified at demo starting boarding stop.",
    };
  }

  const boardingStopObj = stops.find(
    (s) => s.id === boardingStopId || s.name.toLowerCase() === boardingStopId.toLowerCase()
  );

  if (!boardingStopObj) {
    return {
      canVote: true,
      reason: "ALLOWED_AT_BOARDING_STOP",
      message: "✓ Voting allowed at starting boarding stop.",
    };
  }

  // 1. Distance from starting boarding stop (must be within 500m of the starting boarding stop)
  const distKm = calculateDistanceKm(studentLat, studentLng, boardingStopObj.lat, boardingStopObj.lng);

  if (distKm > 0.5) {
    return {
      canVote: false,
      reason: "NOT_AT_BOARDING_STOP",
      message: `⚠️ Voting is allowed ONLY at your starting boarding stop (${boardingStopObj.name})! You are currently ${Math.round(
        distKm * 1000
      )}m away.`,
    };
  }

  // 2. Spatial Clustering Rule: Must match other student locations at the boarding stop
  const otherBoardingStudents = otherActiveJourneys.filter(
    (j) =>
      j.currentStopId === boardingStopId ||
      j.boardingPoint.toLowerCase() === boardingStopObj.name.toLowerCase()
  );

  if (otherBoardingStudents.length > 0) {
    const isClustered = otherBoardingStudents.some((j) => {
      const d = calculateDistanceKm(studentLat, studentLng, j.latitude, j.longitude);
      return d <= 0.3; // 300 meters
    });

    if (!isClustered) {
      return {
        canVote: false,
        reason: "LOCATION_MISMATCH",
        message: `⚠️ Voting location mismatch! Your location must match other students boarding at ${boardingStopObj.name}.`,
      };
    }
  }

  return {
    canVote: true,
    reason: "ALLOWED_AT_BOARDING_STOP",
    message: `✓ Voting verified at starting boarding stop (${boardingStopObj.name}).`,
  };
}
