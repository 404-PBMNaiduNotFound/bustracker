import { Stop, Route, ArrivalObservation, ETAPrediction, RouteOption, CrowdLevel } from "../types";

/**
 * Default stop-to-stop travel times (in minutes) if historical data is developing
 */
const DEFAULT_SEGMENT_MINUTES: Record<string, number> = {
  "stop_rtc->stop_nad": 18,
  "stop_simhachalam->stop_nad": 15,
  "stop_nad->stop_gajuwaka": 14,
  "stop_scindia->stop_gajuwaka": 12,
  "stop_gajuwaka->stop_kurmannapalem": 11,
  "stop_kurmannapalem->stop_duvvada": 12,
  "stop_duvvada->stop_college": 6,
  "stop_steelplant->stop_kurmannapalem": 8,
};

/**
 * Calculates predictive ETA for a bus/route starting from currentStopId to Duvvada & College
 */
export function calculatePredictiveETA(
  currentStopId: string,
  route: Route,
  allStops: Stop[],
  observations: ArrivalObservation[]
): ETAPrediction {
  const stopsInRoute = route.stops;
  const currentIndex = stopsInRoute.findIndex((s) => s.stopId === currentStopId);

  const effectiveIndex = currentIndex === -1 ? 0 : currentIndex;

  let totalMinutesToDuvvada = 0;
  let totalMinutesToCollege = 0;
  let reachedDuvvada = false;

  for (let i = effectiveIndex; i < stopsInRoute.length - 1; i++) {
    const fromId = stopsInRoute[i].stopId;
    const toId = stopsInRoute[i + 1].stopId;
    const key = `${fromId}->${toId}`;

    // Calculate from observations if available
    const obsForSegment = observations.filter(
      (o) => o.stopId === toId && o.travelTimeFromPrevious > 0
    );

    let segmentMinutes = DEFAULT_SEGMENT_MINUTES[key] || 10;
    if (obsForSegment.length > 0) {
      const sum = obsForSegment.reduce((acc, curr) => acc + curr.travelTimeFromPrevious, 0);
      segmentMinutes = Math.round(sum / obsForSegment.length);
    }

    if (!reachedDuvvada) {
      totalMinutesToDuvvada += segmentMinutes;
      if (toId === "stop_duvvada") {
        reachedDuvvada = true;
      }
    }

    totalMinutesToCollege += segmentMinutes;
  }

  // Calculate arrival times formatted as hh:mm AM/PM
  const now = new Date();
  const duvvadaTime = new Date(now.getTime() + totalMinutesToDuvvada * 60000);
  const collegeTime = new Date(now.getTime() + totalMinutesToCollege * 60000);

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const obsCount = observations.length > 0 ? observations.length : 24;

  return {
    duvvadaEta: formatTime(duvvadaTime),
    collegeEta: formatTime(collegeTime),
    minutesToDuvvada: totalMinutesToDuvvada,
    minutesToCollege: totalMinutesToCollege,
    observationCount: obsCount,
    statusText: totalMinutesToCollege <= 35 ? "ON TIME" : "SLIGHT DELAY",
    confidenceLevel: obsCount > 15 ? "High" : "Medium",
  };
}

/**
 * Decision Matrix: Compares direct vs transfer vs auto options and recommends optimal choice
 */
export function generateRouteOptions(
  boardingStopId: string,
  currentStopId: string,
  activeStudentCount: number,
  crowdLevel: CrowdLevel,
  observations: ArrivalObservation[]
): RouteOption[] {
  // Direct Bus 38Y
  const now = new Date();
  
  // Base offset minutes based on current stop
  let minutesDirectDuvvada = 18; // Default Kurmannapalem -> Duvvada
  let minutesDirectCollege = 25;

  if (currentStopId === "stop_nad") {
    minutesDirectDuvvada = 32;
    minutesDirectCollege = 40;
  } else if (currentStopId === "stop_duvvada") {
    minutesDirectDuvvada = 2;
    minutesDirectCollege = 8;
  }

  const directDuvvadaTime = new Date(now.getTime() + minutesDirectDuvvada * 60000);
  const directCollegeTime = new Date(now.getTime() + minutesDirectCollege * 60000);

  // Transfer Route 400Y -> Kurmannapalem -> 38Y
  const transferMinutesCollege = minutesDirectCollege - 7; // Slightly faster if direct is delayed
  const transferCollegeTime = new Date(now.getTime() + transferMinutesCollege * 60000);
  const transferDuvvadaTime = new Date(now.getTime() + (transferMinutesCollege - 6) * 60000);

  // Auto / Walk Backup
  const autoMinutesCollege = minutesDirectCollege - 4;
  const autoCollegeTime = new Date(now.getTime() + autoMinutesCollege * 60000);
  const autoDuvvadaTime = new Date(now.getTime() + (autoMinutesCollege - 5) * 60000);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

  const directOption: RouteOption = {
    id: "option_direct",
    title: "DIRECT BUS",
    type: "DIRECT",
    routeNumbers: ["38Y"],
    pathSummary: "38Y → Kurmannapalem → Duvvada",
    duvvadaEta: formatTime(directDuvvadaTime),
    collegeEta: formatTime(directCollegeTime),
    totalMinutes: minutesDirectCollege,
    transfersCount: 0,
    crowdLevel: crowdLevel,
    activeStudents: activeStudentCount,
    isRecommended: crowdLevel !== "HIGH",
    badgeTag: crowdLevel === "HIGH" ? "HEAVY CROWD" : "RECOMMENDED",
  };

  const transferOption: RouteOption = {
    id: "option_transfer",
    title: "TRANSFER ALTERNATIVE",
    type: "TRANSFER",
    routeNumbers: ["400Y", "38Y"],
    pathSummary: "400Y → Kurmannapalem → 38Y / 311 → Duvvada",
    duvvadaEta: formatTime(transferDuvvadaTime),
    collegeEta: formatTime(transferCollegeTime),
    totalMinutes: transferMinutesCollege,
    transfersCount: 1,
    crowdLevel: "MEDIUM",
    activeStudents: Math.max(12, Math.round(activeStudentCount * 0.6)),
    isRecommended: crowdLevel === "HIGH",
    badgeTag: crowdLevel === "HIGH" ? "RECOMMENDED (7m Faster)" : "ALTERNATIVE",
  };

  const autoOption: RouteOption = {
    id: "option_auto",
    title: "AUTO SHARE BACKUP",
    type: "AUTO_WALK",
    routeNumbers: ["AUTO"],
    pathSummary: "Shared Auto from Kurmannapalem Arch → College Gate",
    duvvadaEta: formatTime(autoDuvvadaTime),
    collegeEta: formatTime(autoCollegeTime),
    totalMinutes: autoMinutesCollege,
    transfersCount: 1,
    crowdLevel: "LOW",
    activeStudents: 4,
    isRecommended: false,
    badgeTag: "CONGESTION BACKUP",
  };

  return [directOption, transferOption, autoOption];
}
