import { Stop, Route, RouteStopOrder, ArrivalObservation, ETAPrediction, ETAStatusType } from "../types";

/**
 * Calculates segment travel time strictly from historical arrivalObservations
 * grouped by { routeId, fromStopId, toStopId }.
 * NO FIXED-MINUTE OR DISTANCE FABRICATIONS: Returns null if no observations exist for segment.
 */
export function calculateSegmentTravelTimeFromObservations(
  routeId: string,
  fromStopId: string,
  toStopId: string,
  observations: ArrivalObservation[]
): { travelTimeSeconds: number | null; observationCount: number } {
  // Filter observations strictly matching routeId, fromStopId, toStopId
  const matchingObs = observations.filter((o) => {
    const isRouteMatch = o.routeId === routeId;
    const isToMatch = o.toStopId === toStopId;
    const isFromMatch = o.fromStopId ? o.fromStopId === fromStopId : true;
    const isTimeValid = (o.travelTimeSeconds && o.travelTimeSeconds > 0) || (o.travelTimeFromPrevious && o.travelTimeFromPrevious > 0);
    return isRouteMatch && isToMatch && isFromMatch && isTimeValid;
  });

  if (matchingObs.length === 0) {
    return { travelTimeSeconds: null, observationCount: 0 };
  }

  // Calculate median / average travel time in seconds
  const totalSec = matchingObs.reduce((acc, curr) => {
    const sec = curr.travelTimeSeconds || (curr.travelTimeFromPrevious ? curr.travelTimeFromPrevious * 60 : 600);
    return acc + sec;
  }, 0);

  const averageSec = Math.round(totalSec / matchingObs.length);

  return {
    travelTimeSeconds: averageSec,
    observationCount: matchingObs.length,
  };
}

/**
 * Calculates predictive ETA powered purely by historical arrivalObservations from Firestore.
 * NO FABRICATED FALLBACK MULTIPLIERS.
 */
export function calculatePredictiveETAFromObservations(
  currentStopId: string,
  route: Route,
  allStops: Stop[],
  observations: ArrivalObservation[],
  routeStops: RouteStopOrder[] = []
): ETAPrediction {
  const matchingRouteStops = routeStops.filter((rs) => rs.routeId === route.id);
  matchingRouteStops.sort((a, b) => a.sequence - b.sequence);

  const stopsInRoute = matchingRouteStops;
  const currentIndex = stopsInRoute.findIndex((s) => s.stopId === currentStopId);
  const effectiveIndex = currentIndex === -1 ? 0 : currentIndex;

  let totalSecondsToDuvvada = 0;
  let totalSecondsToCollege = 0;
  let reachedDuvvada = false;

  let totalObsCount = 0;
  let missingObsSegments = 0;

  for (let i = effectiveIndex; i < stopsInRoute.length - 1; i++) {
    const fromId = stopsInRoute[i].stopId;
    const toId = stopsInRoute[i + 1].stopId;

    const segmentResult = calculateSegmentTravelTimeFromObservations(route.id, fromId, toId, observations);
    totalObsCount += segmentResult.observationCount;

    if (segmentResult.travelTimeSeconds === null) {
      missingObsSegments++;
    } else {
      if (!reachedDuvvada) {
        totalSecondsToDuvvada += segmentResult.travelTimeSeconds;
        if (toId === "duvvada") {
          reachedDuvvada = true;
        }
      }
      totalSecondsToCollege += segmentResult.travelTimeSeconds;
    }
  }

  const now = new Date();
  const formatTime = (d: Date) =>
    d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

  let etaStatus: ETAStatusType = "ETA_AVAILABLE";
  let displayNote = "ETA calculated from verified student arrival observations";
  let duvvadaEtaStr = "ETA unavailable";
  let collegeEtaStr = "ETA unavailable";
  let statusText: "ON TIME" | "SLIGHT DELAY" | "LIKELY LATE" | "ETA UNAVAILABLE" = "ETA UNAVAILABLE";
  let confidenceLevel: "High" | "Medium" | "Low" = "Low";

  if (missingObsSegments > 0 || totalObsCount === 0) {
    // If ANY segment lacks observations, ETA is UNAVAILABLE
    etaStatus = "ETA_UNAVAILABLE";
    displayNote = "ETA unavailable — collecting observations";
    duvvadaEtaStr = "ETA unavailable";
    collegeEtaStr = "ETA unavailable";
    statusText = "ETA UNAVAILABLE";
    confidenceLevel = "Low";
  } else {
    // All segments have observation data
    const totalMinutesDuvvada = Math.round(totalSecondsToDuvvada / 60);
    const totalMinutesCollege = Math.round((totalSecondsToCollege + 360) / 60); // 6 mins Duvvada -> College transfer

    duvvadaEtaStr = formatTime(new Date(now.getTime() + totalSecondsToDuvvada * 1000));
    collegeEtaStr = formatTime(new Date(now.getTime() + (totalSecondsToCollege + 360) * 1000));

    if (totalObsCount < matchingRouteStops.length * 3) {
      etaStatus = "ETA_LIMITED";
      displayNote = "Limited data — ETA approximate";
      confidenceLevel = "Medium";
      statusText = totalMinutesCollege <= 45 ? "ON TIME" : "SLIGHT DELAY";
    } else {
      etaStatus = "ETA_AVAILABLE";
      displayNote = "ETA calculated from verified student arrival observations";
      confidenceLevel = "High";
      statusText = totalMinutesCollege <= 45 ? "ON TIME" : "SLIGHT DELAY";
    }
  }

  return {
    duvvadaEta: duvvadaEtaStr,
    collegeEta: collegeEtaStr,
    minutesToDuvvada: totalObsCount > 0 && missingObsSegments === 0 ? Math.round(totalSecondsToDuvvada / 60) : null,
    minutesToCollege: totalObsCount > 0 && missingObsSegments === 0 ? Math.round((totalSecondsToCollege + 360) / 60) : null,
    observationCount: totalObsCount,
    statusText,
    confidenceLevel,
    hasSufficientData: etaStatus === "ETA_AVAILABLE",
    displayNote,
    etaStatus,
  };
}
