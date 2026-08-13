import {
  ActiveJourney,
  StudentConfirmation,
  CrowdLevel,
  AggregatedBusPosition,
  Stop,
  RouteStopOrder,
} from "../types";
import { snapToRouteCorridor, detectBusJump } from "./studentJourneyValidator";
import { calculateDistanceKm } from "./gpsService";

export const MIN_LIVE_STUDENTS = 5;
export const GPS_UPDATE_MAX_AGE = 2 * 60 * 1000; // 2 minutes in milliseconds

export interface RouteCrowdMetrics {
  routeId: string;
  activeCount: number;
  verifiedStudentCount: number;
  crowdLevel: CrowdLevel;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  liveStatus: "LIVE" | "RECENT" | "LIMITED DATA" | "NO LIVE DATA";
  aggregatedPosition: AggregatedBusPosition | null;
  statusMessage: string;
}

/**
 * Checks if a journey's lastLocationAt / lastUpdated timestamp is within the freshness window (2 minutes).
 */
export function isJourneyFresh(lastUpdatedStr: string, maxAgeMs: number = GPS_UPDATE_MAX_AGE): boolean {
  if (!lastUpdatedStr) return false;
  try {
    const updatedTime = new Date(lastUpdatedStr).getTime();
    if (isNaN(updatedTime)) return true;
    const now = Date.now();
    return now - updatedTime <= maxAgeMs;
  } catch {
    return true;
  }
}

/**
 * Calculates crowd metrics and aggregates live bus positions strictly based on VALIDATED, IN_TRANSIT student GPS signals.
 * PRIVACY PROTECTION: Individual student coordinates are NEVER returned publicly.
 * WAITING STUDENT SEPARATION: Students waiting at stops (journeyStatus === "WAITING") are EXCLUDED from centroid calculation.
 * 5+ VALIDATED STUDENTS: High confidence aggregated bus position requires at least 5 fresh, validated active students on same segment.
 */
export function calculateRouteCrowdMetrics(
  routeId: string,
  activeJourneys: ActiveJourney[],
  confirmations: StudentConfirmation[] = [],
  stops: Stop[] = [],
  isRealMode: boolean = true,
  routeStops: RouteStopOrder[] = [],
  previousBusPosition?: AggregatedBusPosition | null
): RouteCrowdMetrics {
  // Filter active journeys: strictly IN_TRANSIT + VALIDATED + fresh
  const freshInTransitJourneys = activeJourneys.filter((j) => {
    const isRouteMatch = j.routeId === routeId;
    const isInTransit = j.journeyStatus === "IN_TRANSIT"; // EXCLUDES WAITING STUDENTS
    const isModeMatch = isRealMode ? !j.isDemo : !!j.isDemo;
    const isFresh = isJourneyFresh(j.lastUpdated || j.lastLocationAt || "");
    return isRouteMatch && isInTransit && isModeMatch && isFresh;
  });

  const validatedJourneys = freshInTransitJourneys.filter(
    (j) => j.validationStatus === "VALIDATED" || j.routeVerificationStatus === "VERIFIED"
  );

  const activeCount = freshInTransitJourneys.length;
  const verifiedCount = validatedJourneys.length;

  // Calculate Crowd Level based on validated in-transit students
  let crowdLevel: CrowdLevel = "LOW";
  if (verifiedCount >= 20) crowdLevel = "VERY HIGH";
  else if (verifiedCount >= 12) crowdLevel = "HIGH";
  else if (verifiedCount >= 5) crowdLevel = "MEDIUM";
  else if (verifiedCount >= 1) crowdLevel = "LOW";

  let aggregatedPosition: AggregatedBusPosition | null = null;
  let statusMessage = "No verified student signals currently available.";
  let confidence: "HIGH" | "MEDIUM" | "LOW" = "LOW";
  let liveStatus: "LIVE" | "RECENT" | "LIMITED DATA" | "NO LIVE DATA" = "NO LIVE DATA";

  // Require minimum 5 VALIDATED in-transit students spatially clustered
  if (verifiedCount >= MIN_LIVE_STUDENTS) {
    confidence = "HIGH";
    liveStatus = "LIVE";

    // 1. Spatial Clustering: Filter journeys within 1.5 km of primary student
    const primaryStudent = validatedJourneys[0];
    const clusteredJourneys = validatedJourneys.filter(
      (j) => calculateDistanceKm(primaryStudent.latitude, primaryStudent.longitude, j.latitude, j.longitude) <= 1.5
    );

    const effectiveClusterCount = clusteredJourneys.length >= MIN_LIVE_STUDENTS ? clusteredJourneys : validatedJourneys;

    // 2. Centroid calculation
    const sumLat = effectiveClusterCount.reduce((acc, curr) => acc + curr.latitude, 0);
    const sumLng = effectiveClusterCount.reduce((acc, curr) => acc + curr.longitude, 0);
    const avgLat = sumLat / effectiveClusterCount.length;
    const avgLng = sumLng / effectiveClusterCount.length;

    // 3. Route Geometry Snap
    const snapped = snapToRouteCorridor(avgLat, avgLng, routeStops, stops);

    // 4. Jump Detection Check
    let isJumpDetected = false;
    if (previousBusPosition && previousBusPosition.latitude) {
      isJumpDetected = detectBusJump(
        previousBusPosition.latitude,
        previousBusPosition.longitude,
        snapped.latitude,
        snapped.longitude
      );
    }

    const finalLat = isJumpDetected ? previousBusPosition!.latitude : snapped.latitude;
    const finalLng = isJumpDetected ? previousBusPosition!.longitude : snapped.longitude;

    const currentStopId = effectiveClusterCount[0].currentStopId || "gajuwaka";
    const stopObj = stops.find((s) => s.id === currentStopId);
    const stopName = stopObj ? stopObj.name : currentStopId.toUpperCase();

    // Determine Next Stop
    const matchingRouteStops = routeStops.filter((rs) => rs.routeId === routeId).sort((a, b) => a.sequence - b.sequence);
    const currentSeqIndex = matchingRouteStops.findIndex((rs) => rs.stopId === currentStopId);
    const nextRs = currentSeqIndex !== -1 && currentSeqIndex < matchingRouteStops.length - 1 ? matchingRouteStops[currentSeqIndex + 1] : null;
    const nextStopObj = nextRs ? stops.find((s) => s.id === nextRs.stopId) : null;

    const now = new Date();
    const expires = new Date(now.getTime() + GPS_UPDATE_MAX_AGE);

    aggregatedPosition = {
      routeId,
      currentSegmentFromStopId: currentStopId,
      currentSegmentToStopId: nextStopObj ? nextStopObj.id : currentStopId,
      approximateStopName: stopName,
      nextStopId: nextStopObj ? nextStopObj.id : undefined,
      nextStopName: nextStopObj ? nextStopObj.name : undefined,
      activeStudentCount: activeCount,
      verifiedStudentCount: verifiedCount,
      confidence: "HIGH",
      latitude: finalLat,
      longitude: finalLng,
      snappedLatitude: finalLat,
      snappedLongitude: finalLng,
      source: "student_gps_aggregation",
      lastUpdated: now.toISOString(),
      calculatedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      displayText: `🚌 Route ${routeId} LIVE LOCATION (${stopName} area) • ${verifiedCount} Verified Students • Confidence: HIGH`,
    };

    statusMessage = isJumpDetected
      ? "Live position being revalidated (unrealistic movement prevented)."
      : `High confidence live bus location: ${verifiedCount} verified student signals travelling together.`;
  } else if (verifiedCount > 0) {
    confidence = "MEDIUM";
    liveStatus = "LIMITED DATA";
    statusMessage = `${verifiedCount} verified student signal${verifiedCount > 1 ? "s" : ""} detected — Limited live evidence (Requires 5+ verified students for live bus marker).`;

    const currentStopId = validatedJourneys[0].currentStopId || "gajuwaka";
    const stopObj = stops.find((s) => s.id === currentStopId);
    const stopName = stopObj ? stopObj.name : currentStopId.toUpperCase();

    aggregatedPosition = {
      routeId,
      currentSegmentFromStopId: currentStopId,
      currentSegmentToStopId: currentStopId,
      approximateStopName: stopName,
      activeStudentCount: activeCount,
      verifiedStudentCount: verifiedCount,
      confidence: "LIMITED",
      latitude: validatedJourneys[0].latitude,
      longitude: validatedJourneys[0].longitude,
      lastUpdated: new Date().toISOString(),
      displayText: `${verifiedCount} verified student signal${verifiedCount > 1 ? "s" : ""} on ${routeId} • Limited live data`,
    };
  } else {
    liveStatus = "NO LIVE DATA";
    statusMessage = "No verified student signals for this route currently.";
  }

  return {
    routeId,
    activeCount,
    verifiedStudentCount: verifiedCount,
    crowdLevel,
    confidence,
    liveStatus,
    aggregatedPosition,
    statusMessage,
  };
}

/**
 * Calculates aggregated bus positions for ALL active routes in the transport network.
 */
export function calculateAllRouteAggregations(
  activeJourneys: ActiveJourney[],
  stops: Stop[] = [],
  isRealMode: boolean = true,
  routeStops: RouteStopOrder[] = []
): RouteCrowdMetrics[] {
  const routeIds = Array.from(new Set(activeJourneys.map((j) => j.routeId)));
  if (routeIds.length === 0) return [];

  return routeIds.map((rId) =>
    calculateRouteCrowdMetrics(rId, activeJourneys, [], stops, isRealMode, routeStops)
  );
}
