import { Route, RouteStopOrder, Stop } from "../types";

export interface TrajectoryVerificationResult {
  isVerified: boolean;
  status: "VERIFIED" | "VERIFICATION_REQUIRED";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  message: string;
}

/**
 * Returns all candidate routes serving a given stop.
 * Does NOT automatically pick the first route.
 */
export function getCandidateRoutesForStop(
  stopId: string,
  routeStops: RouteStopOrder[],
  routes: Route[]
): Route[] {
  if (!stopId) return [];
  const servingRouteIds = new Set(
    routeStops.filter((rs) => rs.stopId === stopId).map((rs) => rs.routeId)
  );

  return routes.filter((r) => servingRouteIds.has(r.id));
}

/**
 * Verifies student GPS trajectory against a selected route's stop sequence.
 * Enforces forward progression along the route.
 */
export function verifyRouteTrajectory(
  selectedRouteId: string,
  previousStopId: string | null,
  currentStopId: string,
  routeStops: RouteStopOrder[]
): TrajectoryVerificationResult {
  if (!selectedRouteId || !currentStopId) {
    return {
      isVerified: false,
      status: "VERIFICATION_REQUIRED",
      confidence: "LOW",
      message: "Missing route or current stop information.",
    };
  }

  const matchingRouteStops = routeStops.filter((rs) => rs.routeId === selectedRouteId);
  if (matchingRouteStops.length === 0) {
    return {
      isVerified: false,
      status: "VERIFICATION_REQUIRED",
      confidence: "LOW",
      message: `Selected route ${selectedRouteId} not found in transport network.`,
    };
  }

  const currentRs = matchingRouteStops.find((rs) => rs.stopId === currentStopId);
  if (!currentRs) {
    return {
      isVerified: false,
      status: "VERIFICATION_REQUIRED",
      confidence: "LOW",
      message: `Current stop is not served by selected route ${selectedRouteId}.`,
    };
  }

  if (!previousStopId || previousStopId === currentStopId) {
    return {
      isVerified: true,
      status: "VERIFIED",
      confidence: "HIGH",
      message: `Boarded at ${currentStopId} on route ${selectedRouteId}.`,
    };
  }

  const previousRs = matchingRouteStops.find((rs) => rs.stopId === previousStopId);
  if (!previousRs) {
    return {
      isVerified: false,
      status: "VERIFICATION_REQUIRED",
      confidence: "LOW",
      message: `Previous stop ${previousStopId} is not on route ${selectedRouteId}.`,
    };
  }

  // Check forward progression (currentSequence > previousSequence)
  if (currentRs.sequence > previousRs.sequence) {
    return {
      isVerified: true,
      status: "VERIFIED",
      confidence: "HIGH",
      message: `Valid forward trajectory along route ${selectedRouteId} (${previousStopId} → ${currentStopId}).`,
    };
  } else {
    return {
      isVerified: false,
      status: "VERIFICATION_REQUIRED",
      confidence: "LOW",
      message: `GPS trajectory indicates backward movement (${previousStopId} [seq ${previousRs.sequence}] → ${currentStopId} [seq ${currentRs.sequence}]).`,
    };
  }
}
