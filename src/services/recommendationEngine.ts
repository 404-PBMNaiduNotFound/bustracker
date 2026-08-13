import {
  Stop,
  Route,
  RouteStopOrder,
  TransferConnection,
  ActiveJourney,
  ArrivalObservation,
  DiscoveredPath,
  CrowdLevel,
  ETAStatusType,
  PriorityTag,
} from "../types";
import { discoverGraphPaths } from "./graphRouteEngine";
import { calculateSegmentTravelTimeFromObservations } from "./etaEngine";
import {
  getNextScheduledTripForRoute,
  getRouteSpecificTravelTime,
  parseTimeToMinutes,
  formatMinutesToTimeString,
} from "./scheduleService";
import { getTrafficAdjustment } from "./trafficService";
import { isJourneyFresh } from "./crowdService";

/**
 * Multi-Tier Data Priority Recommendation Engine with Stop-Based Last-Mile Alternatives:
 * PRIORITY 1: Real student GPS observations (5+ active students -> LIVE 🟢)
 * PRIORITY 2: Recent student observations (<5 active students -> RECENT 🔵)
 * PRIORITY 3: Traffic-adjusted timetable (TRAFFIC-ADJUSTED 🟡)
 * PRIORITY 4: Seed timetable schedule (SCHEDULED 🕐 - when 0 student signals exist)
 * PRIORITY 5: Sparse signals (1-4 students -> LIMITED DATA 🟠)
 * PRIORITY 6: No evidence & no upcoming trips (NO LIVE DATA ⚫)
 */
export function generateAllRouteRecommendations(
  boardingStopId: string,
  routes: Route[],
  stops: Stop[],
  routeStops: RouteStopOrder[],
  transferConnections: TransferConnection[],
  activeJourneys: ActiveJourney[] = [],
  observations: ArrivalObservation[] = [],
  targetCollegeTime: string = "08:45 AM",
  currentTime: Date = new Date(),
  isRealMode: boolean = true
): DiscoveredPath[] {
  // 1. Discover candidate paths from Firestore graph
  const discoveredPaths = discoverGraphPaths({
    boardingStopId,
    destinationStopId: "duvvada",
    routes,
    stops,
    routeStops,
    transferConnections,
    maxTransfers: 2,
  });

  const currentMinutesFromMidnight = currentTime.getHours() * 60 + currentTime.getMinutes();
  const targetMinutes = parseTimeToMinutes(targetCollegeTime);

  // Filter fresh active journeys (< 2 mins old) and enforce Real vs Demo mode isolation
  const freshJourneys = activeJourneys.filter(
    (j) =>
      j.journeyStatus === "IN_TRANSIT" &&
      isJourneyFresh(j.lastUpdated || j.lastLocationAt || "") &&
      (isRealMode ? !j.isDemo : !!j.isDemo)
  );

  // 2. Process each candidate path against multi-tier data priority
  const enrichedPaths = discoveredPaths.map((path) => {
    const primaryRouteId = path.segments[0].routeId;

    // Check active student count for path routes
    const pathRouteIds = new Set(path.segments.map((s) => s.routeId));
    const activeStudentsForPath = freshJourneys.filter((j) => pathRouteIds.has(j.routeId));
    const activeStudentCount = activeStudentsForPath.length;

    // Crowd Level
    let crowdLevel: CrowdLevel | "NO DATA" = "NO DATA";
    if (activeStudentCount >= 20) crowdLevel = "VERY HIGH";
    else if (activeStudentCount >= 12) crowdLevel = "HIGH";
    else if (activeStudentCount >= 5) crowdLevel = "MEDIUM";
    else if (activeStudentCount >= 1) crowdLevel = "LOW";

    let priorityTag: PriorityTag = "NO LIVE DATA";
    let liveStatus: "LIVE" | "RECENT" | "TRAFFIC-ADJUSTED" | "SCHEDULED" | "LIMITED DATA" | "NO LIVE DATA" = "NO LIVE DATA";
    let duvvadaEtaStr = "ETA unavailable";
    let collegeEtaStr = "ETA unavailable";
    let totalMinutesToCollege: number | null = null;
    let departureFromBoardingTimeStr: string | undefined = undefined;
    let waitingMinutes: number | undefined = undefined;
    let etaStatus: ETAStatusType = "ETA_UNAVAILABLE";
    let confidence: "HIGH" | "MEDIUM" | "LOW" = "LOW";
    let statusText: "ON TIME" | "SLIGHT DELAY" | "LIKELY LATE" | "ETA UNAVAILABLE" = "ON TIME";

    // Check for segment observations
    let totalObsSeconds = 0;
    let missingObsSegments = 0;
    let totalObsCount = 0;

    path.segments.forEach((seg) => {
      const segRes = calculateSegmentTravelTimeFromObservations(seg.routeId, seg.fromStopId, seg.toStopId, observations);
      totalObsCount += segRes.observationCount;
      if (segRes.travelTimeSeconds === null) missingObsSegments++;
      else totalObsSeconds += segRes.travelTimeSeconds;
    });

    const hasObservationData = missingObsSegments === 0 && totalObsCount > 0;
    const scheduledTripMatch = getNextScheduledTripForRoute(primaryRouteId, boardingStopId, currentMinutesFromMidnight, "duvvada");

    // TIER 1: Real Student GPS Telemetry (>= 5 active students)
    if (activeStudentCount >= 5) {
      priorityTag = "LIVE";
      liveStatus = "LIVE";
      confidence = "HIGH";
      etaStatus = "ETA_AVAILABLE";

      const routeTravelMin = getRouteSpecificTravelTime(primaryRouteId, boardingStopId);
      const travelSec = hasObservationData ? totalObsSeconds : routeTravelMin * 60;
      const collegeArrivalMin = currentMinutesFromMidnight + Math.round((travelSec + 360) / 60);

      totalMinutesToCollege = Math.round((travelSec + 360) / 60);
      duvvadaEtaStr = formatMinutesToTimeString(currentMinutesFromMidnight + Math.round(travelSec / 60));
      collegeEtaStr = formatMinutesToTimeString(collegeArrivalMin);

      statusText = collegeArrivalMin <= targetMinutes ? "ON TIME" : "LIKELY LATE";
    }
    // TIER 2: Recent Student-Derived Segment Observations
    else if (hasObservationData && activeStudentCount < 5) {
      priorityTag = "RECENT";
      liveStatus = "RECENT";
      confidence = "MEDIUM";
      etaStatus = "ETA_LIMITED";

      const travelSec = totalObsSeconds;
      const collegeArrivalMin = currentMinutesFromMidnight + Math.round((travelSec + 360) / 60);

      totalMinutesToCollege = Math.round((travelSec + 360) / 60);
      duvvadaEtaStr = formatMinutesToTimeString(currentMinutesFromMidnight + Math.round(travelSec / 60));
      collegeEtaStr = formatMinutesToTimeString(collegeArrivalMin);

      statusText = collegeArrivalMin <= targetMinutes ? "ON TIME" : "LIKELY LATE";
    }
    // TIER 3 / TIER 4 / TIER 5 / TIER 6: Timetable Schedule & Dynamic Estimate Integration
    else {
      const trafficRes = getTrafficAdjustment(boardingStopId, "duvvada", currentTime);
      const isTrafficAdjusted = trafficRes.source === "traffic_api" && trafficRes.delayMinutes > 0;

      if (activeStudentCount >= 1 && activeStudentCount < 5) {
        priorityTag = "LIMITED DATA";
        liveStatus = "LIMITED DATA";
        confidence = "LOW";
      } else if (isTrafficAdjusted) {
        priorityTag = "TRAFFIC-ADJUSTED";
        liveStatus = "TRAFFIC-ADJUSTED";
        confidence = "MEDIUM";
      } else {
        priorityTag = "SCHEDULED";
        liveStatus = "SCHEDULED";
        confidence = "MEDIUM";
      }

      etaStatus = "SCHEDULED_ESTIMATE";

      if (scheduledTripMatch) {
        departureFromBoardingTimeStr = scheduledTripMatch.departureFromBoardingTime;
        waitingMinutes = scheduledTripMatch.waitingMinutes;

        const totalTravelMin = scheduledTripMatch.waitingMinutes + scheduledTripMatch.boardingToDuvvadaTravelMinutes;
        const collegeArrivalMin = scheduledTripMatch.collegeArrivalMinutes + trafficRes.delayMinutes;

        totalMinutesToCollege = totalTravelMin + 6 + trafficRes.delayMinutes;
        duvvadaEtaStr = scheduledTripMatch.duvvadaArrivalTime;
        collegeEtaStr = formatMinutesToTimeString(collegeArrivalMin);

        statusText = collegeArrivalMin <= targetMinutes ? "ON TIME" : "LIKELY LATE";
      } else {
        // Dynamic fallback
        const depMin = currentMinutesFromMidnight + 10;
        const duvvadaMin = depMin + 22;
        const collegeMin = duvvadaMin + 6;

        departureFromBoardingTimeStr = formatMinutesToTimeString(depMin);
        waitingMinutes = 10;
        totalMinutesToCollege = 38;
        duvvadaEtaStr = formatMinutesToTimeString(duvvadaMin);
        collegeEtaStr = formatMinutesToTimeString(collegeMin);

        statusText = collegeMin <= targetMinutes ? "ON TIME" : "LIKELY LATE";
      }
    }

    let rankingScore = 100;
    if ((statusText as string) === "LIKELY LATE") rankingScore -= 50;
    if ((statusText as string) === "ETA UNAVAILABLE") rankingScore -= 30;

    rankingScore -= path.transfersCount * 18;
    if (liveStatus === "LIVE") rankingScore += 25;
    if (liveStatus === "SCHEDULED") rankingScore += 15;
    if (waitingMinutes !== undefined) rankingScore -= Math.min(25, Math.round(waitingMinutes * 0.5));

    return {
      ...path,
      departureFromBoardingTime: departureFromBoardingTimeStr,
      waitingMinutes,
      predictedDuvvadaArrival: duvvadaEtaStr,
      predictedCollegeArrival: collegeEtaStr,
      totalMinutesToCollege,
      activeStudentCount,
      crowdLevel,
      confidence,
      status: statusText,
      etaStatus,
      liveStatus,
      priorityTag,
      scheduledStatusText: priorityTag === "SCHEDULED" ? "SCHEDULED ESTIMATE" : undefined,
      rankingScore,
    } as DiscoveredPath;
  });

  // 3. Add Explicit Stop-Based Last-Mile Alternatives (e.g. Kurmannapalem -> Rajiv Nagar -> College)
  if (boardingStopId === "kurmannapalem" || boardingStopId === "duvvada") {
    // OPTION B: Kurmannapalem -> Rajiv Nagar (Bus 10 mins) -> College (Walk 15 mins)
    const rajivNagarCollegeArrivalMin = currentMinutesFromMidnight + 25;
    const rajivNagarPath: DiscoveredPath = {
      pathId: "path_kurmannapalem_rajiv_nagar_college",
      type: "LAST_MILE",
      transfersCount: 1,
      segments: [
        {
          routeId: "FEEDER_BUS",
          routeName: "Feeder Bus",
          fromStopId: "kurmannapalem",
          toStopId: "rajiv_nagar",
          fromStopName: "Kurmannapalem",
          toStopName: "Rajiv Nagar",
          fromSequence: 1,
          toSequence: 2,
        },
      ],
      transfers: [],
      lastMileStopName: "Rajiv Nagar",
      lastMileMode: "walk",
      lastMileMinutes: 15,
      summaryDetail: "🚌 Bus to Rajiv Nagar (10m) 🚶 Walk to College (15m)",
      departureFromBoardingTime: formatMinutesToTimeString(currentMinutesFromMidnight + 2),
      waitingMinutes: 2,
      predictedDuvvadaArrival: formatMinutesToTimeString(currentMinutesFromMidnight + 10),
      predictedCollegeArrival: formatMinutesToTimeString(rajivNagarCollegeArrivalMin),
      totalMinutesToCollege: 25,
      activeStudentCount: 0,
      crowdLevel: "LOW",
      confidence: "MEDIUM",
      status: rajivNagarCollegeArrivalMin <= targetMinutes ? "ON TIME" : "SLIGHT DELAY",
      etaStatus: "SCHEDULED_ESTIMATE",
      liveStatus: "SCHEDULED",
      priorityTag: "SCHEDULED",
      scheduledStatusText: "LAST-MILE OPTION",
      rankingScore: 82,
      pathSummary: "Kurmannapalem → Rajiv Nagar → College",
      boardingStopName: "Kurmannapalem",
      badgeTag: "Last-Mile Alternative",
      isRecommended: false,
    };

    // OPTION C: Duvvada Station -> College Gate (Walk/Auto 6 mins)
    if (boardingStopId === "duvvada") {
      const duvvadaCollegeArrivalMin = currentMinutesFromMidnight + 6;
      const duvvadaPath: DiscoveredPath = {
        pathId: "path_duvvada_direct_college_walk",
        type: "LAST_MILE",
        transfersCount: 0,
        segments: [],
        transfers: [],
        lastMileStopName: "Duvvada Station",
        lastMileMode: "walk",
        lastMileMinutes: 6,
        summaryDetail: "🚶 Walk / 🛺 Auto from Duvvada Station to College Gate (6m)",
        departureFromBoardingTime: formatMinutesToTimeString(currentMinutesFromMidnight),
        waitingMinutes: 0,
        predictedDuvvadaArrival: formatMinutesToTimeString(currentMinutesFromMidnight),
        predictedCollegeArrival: formatMinutesToTimeString(duvvadaCollegeArrivalMin),
        totalMinutesToCollege: 6,
        activeStudentCount: 0,
        crowdLevel: "LOW",
        confidence: "HIGH",
        status: duvvadaCollegeArrivalMin <= targetMinutes ? "ON TIME" : "SLIGHT DELAY",
        etaStatus: "SCHEDULED_ESTIMATE",
        liveStatus: "SCHEDULED",
        priorityTag: "SCHEDULED",
        scheduledStatusText: "DUVVADA OPTION",
        rankingScore: 95,
        pathSummary: "Duvvada Station → College (Walk/Auto)",
        boardingStopName: "Duvvada",
        badgeTag: "Direct Last Mile",
        isRecommended: true,
      };
      enrichedPaths.push(duvvadaPath);
    } else {
      enrichedPaths.push(rajivNagarPath);
    }
  }

  // 4. Sort candidate paths by rankingScore descending
  enrichedPaths.sort((a, b) => b.rankingScore - a.rankingScore);

  // 5. Mark top-ranked path as recommended
  if (enrichedPaths.length > 0) {
    enrichedPaths.forEach((p) => (p.isRecommended = false));
    enrichedPaths[0].isRecommended = true;
  }

  return enrichedPaths;
}
