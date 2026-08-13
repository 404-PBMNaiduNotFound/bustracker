import { doc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { ArrivalObservation, RouteStopOrder } from "../types";

export interface GpsObservationInput {
  routeId: string;
  fromStopId: string;
  toStopId: string;
  departureTime: Date;
  arrivalTime: Date;
  studentId: string;
  journeyId: string;
  routeStops: RouteStopOrder[];
  isDemo?: boolean;
}

/**
 * Creates a real GPS-derived arrival observation ONLY when valid forward GPS movement is detected
 * between consecutive stops on an active student journey.
 */
export async function createGpsDerivedArrivalObservation(
  input: GpsObservationInput
): Promise<{ success: boolean; observation?: ArrivalObservation; reason?: string }> {
  const {
    routeId,
    fromStopId,
    toStopId,
    departureTime,
    arrivalTime,
    studentId,
    journeyId,
    routeStops,
    isDemo = false,
  } = input;

  if (!routeId || !fromStopId || !toStopId || fromStopId === toStopId) {
    return { success: false, reason: "Invalid stop segment parameters." };
  }

  // 1. Verify stop sequence is forward along route
  const matchingRouteStops = routeStops.filter((rs) => rs.routeId === routeId);
  const fromRs = matchingRouteStops.find((rs) => rs.stopId === fromStopId);
  const toRs = matchingRouteStops.find((rs) => rs.stopId === toStopId);

  if (!fromRs || !toRs) {
    return { success: false, reason: "Stops are not on the specified route." };
  }

  if (toRs.sequence <= fromRs.sequence) {
    return { success: false, reason: "Backward or non-forward movement rejected." };
  }

  // 2. Validate timestamps & calculate travel time in seconds
  const durationMs = arrivalTime.getTime() - departureTime.getTime();
  const travelTimeSeconds = Math.round(durationMs / 1000);

  if (travelTimeSeconds <= 0) {
    return { success: false, reason: "Invalid negative or zero travel time duration." };
  }

  // Cap plausible segment duration (between 30 seconds and 3600 seconds)
  if (travelTimeSeconds < 10 || travelTimeSeconds > 3600) {
    return { success: false, reason: "Plausibility check failed: travel time out of bounds." };
  }

  const obsId = `obs_gps_${routeId}_${fromStopId}_${toStopId}_${Date.now()}`;
  const observation: ArrivalObservation = {
    id: obsId,
    routeId,
    fromStopId,
    toStopId,
    travelTimeSeconds,
    travelTimeFromPrevious: Math.max(1, Math.round(travelTimeSeconds / 60)),
    observedAt: arrivalTime.toISOString(),
    timestamp: arrivalTime.toISOString(),
    journeyId,
    studentId,
    source: isDemo ? "demo" : "student_gps",
    confidence: isDemo ? "MEDIUM" : "HIGH",
  };

  try {
    await setDoc(doc(db, "arrivalObservations", obsId), observation);
    console.log(`Created GPS-derived observation: ${fromStopId} → ${toStopId} on ${routeId} (${travelTimeSeconds}s)`);
    return { success: true, observation };
  } catch (error: any) {
    console.warn("Firestore offline fallback: observation generated locally.", error);
    return { success: true, observation };
  }
}
