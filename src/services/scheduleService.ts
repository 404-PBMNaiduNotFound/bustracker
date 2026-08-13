import masterTripsData from "../data/masterTripsData.json";
import { ScheduledTrip, TripStop } from "../types";

export interface ScheduledTripMatch {
  trip: ScheduledTrip;
  boardingStopName: string;
  departureFromBoardingTime: string;
  departureFromBoardingMinutes: number;
  waitingMinutes: number;
  boardingToDuvvadaTravelMinutes: number;
  duvvadaArrivalMinutes: number;
  duvvadaArrivalTime: string;
  collegeArrivalMinutes: number;
  collegeArrivalTime: string;
  hasUpcomingTrip: boolean;
}

/**
 * Normalizes 12-hour (AM/PM) or 24-hour time strings into integer minutes-from-midnight (0..1439).
 * E.g. "08:50 AM" -> 530, "01:07 PM" -> 787.
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  try {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!match) return 0;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3] ? match[3].toUpperCase() : null;

    if (period) {
      if (period === "PM" && hours < 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;
    }

    return hours * 60 + minutes;
  } catch {
    return 0;
  }
}

/**
 * Formats integer minutes-from-midnight into formatted 12-hour AM/PM string.
 * E.g. 530 -> "08:50 AM", 787 -> "01:07 PM".
 */
export function formatMinutesToTimeString(totalMinutes: number): string {
  let normalized = totalMinutes % (24 * 60);
  if (normalized < 0) normalized += 24 * 60;
  const hours24 = Math.floor(normalized / 60);
  const minutes = Math.floor(normalized % 60);
  const period = hours24 >= 12 ? "PM" : "AM";
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  const formattedHours = hours12.toString().padStart(2, "0");
  const formattedMinutes = minutes.toString().padStart(2, "0");
  return `${formattedHours}:${formattedMinutes} ${period}`;
}

/**
 * Calculates route-specific travel duration from boardingStopId to destinationStopId
 * based on the master route timetables seeded in database.
 * Every bus route has its OWN unique travel duration!
 */
export function getRouteSpecificTravelTime(
  routeId: string,
  boardingStopId: string,
  destinationStopId: string = "duvvada"
): number {
  const masterTrips = masterTripsData.trips as ScheduledTrip[];
  const matchingTrips = masterTrips.filter((t) => t.routeId === routeId);

  if (matchingTrips.length > 0) {
    for (const trip of matchingTrips) {
      const boardingIndex = trip.stops.findIndex((s) => s.stopId === boardingStopId);
      const destIndex = trip.stops.findIndex(
        (s) => s.stopId === destinationStopId || s.stopId.includes("duvvada")
      );

      if (boardingIndex !== -1 && destIndex !== -1 && destIndex > boardingIndex) {
        const boardingDep =
          trip.stops[boardingIndex].timeInMinutes ||
          parseTimeToMinutes(trip.stops[boardingIndex].departureTime);
        const destDep =
          trip.stops[destIndex].timeInMinutes ||
          parseTimeToMinutes(trip.stops[destIndex].departureTime);
        return Math.max(5, destDep - boardingDep);
      }
    }
  }

  // Route-specific fallback based on seeded database route geometry & distance
  if (routeId === "400K") return boardingStopId === "duvvada" ? 0 : 25; // Maddilapalem -> Duvvada takes 80m total
  if (routeId === "500") return boardingStopId === "duvvada" ? 0 : 45; // Anakapalle -> Duvvada takes 45m total
  if (routeId === "6A") return boardingStopId === "duvvada" ? 0 : 55; // Simhachalam -> Duvvada takes 55m total
  if (routeId === "38D") return boardingStopId === "duvvada" ? 0 : 60; // Direct express
  if (routeId === "38Y") return boardingStopId === "duvvada" ? 0 : boardingStopId === "kurmannapalem" ? 12 : 22;

  return boardingStopId === "duvvada" ? 0 : 25;
}

/**
 * Determines the next scheduled trip for a route relative to current time and boarding stop.
 * Uses route-specific database timetables so ETAs vary from route to route.
 */
export function getNextScheduledTripForRoute(
  routeId: string,
  boardingStopId: string,
  currentMinutes: number,
  destinationStopId: string = "duvvada"
): ScheduledTripMatch | null {
  const masterTrips = masterTripsData.trips as ScheduledTrip[];
  const matchingTrips = masterTrips.filter((t) => t.routeId === routeId);

  let bestMatch: ScheduledTripMatch | null = null;
  let minWait = Infinity;

  if (matchingTrips.length > 0) {
    for (const trip of matchingTrips) {
      const boardingIndex = trip.stops.findIndex((s) => s.stopId === boardingStopId);
      if (boardingIndex === -1) continue;

      const boardingStop = trip.stops[boardingIndex];
      const boardingDepMinutes = boardingStop.timeInMinutes || parseTimeToMinutes(boardingStop.departureTime);

      // Check upcoming trip in timetable
      if (boardingDepMinutes > currentMinutes) {
        const waitMinutes = boardingDepMinutes - currentMinutes;

        let destIndex = trip.stops.findIndex((s) => s.stopId === destinationStopId);
        if (destIndex === -1 || destIndex <= boardingIndex) {
          destIndex = trip.stops.length - 1;
        }

        const destStop = trip.stops[destIndex];
        const destArrivalMinutes = destStop.timeInMinutes || parseTimeToMinutes(destStop.departureTime);
        const travelMinutes = Math.max(5, destArrivalMinutes - boardingDepMinutes);
        const collegeArrivalMinutes = destArrivalMinutes + 6;

        if (waitMinutes < minWait) {
          minWait = waitMinutes;
          bestMatch = {
            trip,
            boardingStopName: boardingStop.stopName,
            departureFromBoardingTime: boardingStop.departureTime,
            departureFromBoardingMinutes: boardingDepMinutes,
            waitingMinutes: waitMinutes,
            boardingToDuvvadaTravelMinutes: travelMinutes,
            duvvadaArrivalMinutes: destArrivalMinutes,
            duvvadaArrivalTime: formatMinutesToTimeString(destArrivalMinutes),
            collegeArrivalMinutes,
            collegeArrivalTime: formatMinutesToTimeString(collegeArrivalMinutes),
            hasUpcomingTrip: true,
          };
        }
      }
    }
  }

  // FALLBACK ESTIMATE: Calculate route-specific travel time from master database
  if (!bestMatch) {
    const defaultWaitMin = 10;
    const routeTravelMin = getRouteSpecificTravelTime(routeId, boardingStopId, destinationStopId);
    const boardingDepMinutes = currentMinutes + defaultWaitMin;
    const duvvadaArrivalMinutes = boardingDepMinutes + routeTravelMin;
    const collegeArrivalMinutes = duvvadaArrivalMinutes + 6;

    bestMatch = {
      trip: {
        routeId,
        tripNumber: 99,
        stops: [
          { stopId: boardingStopId, stopName: boardingStopId.toUpperCase(), departureTime: formatMinutesToTimeString(boardingDepMinutes), timeInMinutes: boardingDepMinutes },
          { stopId: destinationStopId, stopName: "Duvvada", departureTime: formatMinutesToTimeString(duvvadaArrivalMinutes), timeInMinutes: duvvadaArrivalMinutes },
        ],
      },
      boardingStopName: boardingStopId.toUpperCase(),
      departureFromBoardingTime: formatMinutesToTimeString(boardingDepMinutes),
      departureFromBoardingMinutes: boardingDepMinutes,
      waitingMinutes: defaultWaitMin,
      boardingToDuvvadaTravelMinutes: routeTravelMin,
      duvvadaArrivalMinutes,
      duvvadaArrivalTime: formatMinutesToTimeString(duvvadaArrivalMinutes),
      collegeArrivalMinutes,
      collegeArrivalTime: formatMinutesToTimeString(collegeArrivalMinutes),
      hasUpcomingTrip: true,
    };
  }

  return bestMatch;
}
