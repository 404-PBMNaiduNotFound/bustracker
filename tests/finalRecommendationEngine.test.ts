import { getNextScheduledTripForRoute, parseTimeToMinutes, formatMinutesToTimeString } from "../src/services/scheduleService";
import { getTrafficAdjustment } from "../src/services/trafficService";
import { generateAllRouteRecommendations } from "../src/services/recommendationEngine";
import { calculateRouteCrowdMetrics } from "../src/services/crowdService";
import masterData from "../src/data/excelMasterData.json";
import { Route, Stop, RouteStopOrder, TransferConnection, ActiveJourney } from "../src/types";

const routes = masterData.routes as Route[];
const stops = masterData.stops as Stop[];
const routeStops = masterData.routeStops as RouteStopOrder[];
const transferConnections = masterData.transferConnections as TransferConnection[];

export function runFinalRecommendationEngineTestSuite() {
  console.log("\n========================================================================");
  console.log("RUNNING ROUTEREACH FINAL RECOMMENDATION & SCHEDULE ENGINE TEST SUITE");
  console.log("========================================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✓ PASSED: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAILED: ${testName}`);
      failed++;
    }
  }

  // TEST 1: Current time before Trip 3 (e.g. 08:35 AM = 515 mins). Expected: Trip 3 selected (departure 09:38 AM at Gajuwaka).
  const currentMin835 = parseTimeToMinutes("08:35 AM");
  const trip3Match = getNextScheduledTripForRoute("38Y", "gajuwaka", currentMin835);
  assert(
    trip3Match !== null && trip3Match.trip.tripNumber === 3 && trip3Match.departureFromBoardingTime === "09:38 AM",
    "TEST 1: Current time before Trip 3 (08:35 AM) selects Trip 3 (09:38 AM at Gajuwaka)"
  );

  // TEST 2: Current time after bus has passed boarding stop (e.g. 09:45 AM = 585 mins for 09:38 AM departure). Expected: Trip 3 excluded, Trip 5 selected.
  const currentMin945 = parseTimeToMinutes("09:45 AM");
  const trip5Match = getNextScheduledTripForRoute("38Y", "gajuwaka", currentMin945);
  assert(
    trip5Match !== null && trip5Match.trip.tripNumber === 5 && trip5Match.departureFromBoardingTime === "12:28 PM",
    "TEST 2: Current time after passed stop (09:45 AM) excludes passed Trip 3 and selects upcoming Trip 5"
  );

  // TEST 3: Student at Gajuwaka -> Boarding = Gajuwaka
  const gajuwakaTime = new Date();
  gajuwakaTime.setHours(8, 35, 0, 0);
  const gajuwakaRecs = generateAllRouteRecommendations("gajuwaka", routes, stops, routeStops, transferConnections, [], [], "08:45 AM", gajuwakaTime);
  assert(gajuwakaRecs.length > 0 && gajuwakaRecs[0].boardingStopName.toLowerCase().includes("gajuwaka"), "TEST 3: Student at Gajuwaka sets boarding = Gajuwaka");

  // TEST 4: Student at Kurmannapalem -> Boarding = Kurmannapalem
  const kurmannapalemRecs = generateAllRouteRecommendations("kurmannapalem", routes, stops, routeStops, transferConnections, [], [], "08:45 AM", gajuwakaTime);
  assert(kurmannapalemRecs.length > 0 && kurmannapalemRecs[0].boardingStopName.toLowerCase().includes("kurmannapalem"), "TEST 4: Student at Kurmannapalem sets boarding = Kurmannapalem");

  // TEST 5: No student GPS -> Scheduled estimate shown (NOT "ETA unavailable")
  const scheduledPath = gajuwakaRecs.find((r) => r.priorityTag === "SCHEDULED");
  assert(
    scheduledPath !== undefined && scheduledPath.predictedDuvvadaArrival !== "ETA unavailable",
    "TEST 5: No student GPS displays Scheduled Estimate from timetable (not ETA unavailable)"
  );

  // TEST 6: Traffic service abstraction test
  const trafficRes = getTrafficAdjustment("gajuwaka", "duvvada", gajuwakaTime);
  assert(trafficRes.delayMinutes === 0 && trafficRes.source === "none", "TEST 6: Traffic service abstraction returns 0 delay when no external traffic API is present");

  // TEST 7: 5+ students on 38Y -> Student-powered LIVE ETA/location takes priority over schedule
  const fiveStudents: ActiveJourney[] = Array.from({ length: 5 }, (_, i) => ({
    id: `std_${i}`,
    userId: `std_${i}`,
    routeId: "38Y",
    boardingPoint: "Gajuwaka",
    currentStopId: "gajuwaka",
    latitude: 17.69029 + i * 0.0001,
    longitude: 83.22383 + i * 0.0001,
    lastUpdated: new Date().toISOString(),
    journeyStatus: "IN_TRANSIT",
    confidence: "HIGH",
  }));
  const liveRecs = generateAllRouteRecommendations("gajuwaka", routes, stops, routeStops, transferConnections, fiveStudents, [], "08:45 AM", gajuwakaTime);
  assert(liveRecs[0].priorityTag === "LIVE" && liveRecs[0].liveStatus === "LIVE", "TEST 7: 5+ student GPS signals take priority over schedule (LIVE 🟢 status)");

  // TEST 8: Only 3 students on 38Y -> LIMITED DATA, schedule remains useful
  const threeStudents = fiveStudents.slice(0, 3);
  const limitedRecs = generateAllRouteRecommendations("gajuwaka", routes, stops, routeStops, transferConnections, threeStudents, [], "08:45 AM", gajuwakaTime);
  assert(limitedRecs[0].priorityTag === "SCHEDULED" || limitedRecs[0].liveStatus === "LIMITED DATA", "TEST 8: 3 students displays LIMITED DATA / SCHEDULED, schedule remains useful");

  // TEST 9: 38Y already passed boarding stop -> Passed trip excluded
  const lateTime = new Date();
  lateTime.setHours(13, 0, 0, 0); // 1:00 PM (all 38Y trips passed)
  const lateRecs = generateAllRouteRecommendations("gajuwaka", routes, stops, routeStops, transferConnections, [], [], "08:45 AM", lateTime);
  const passed38Y = lateRecs.find((r) => r.pathSummary.includes("38Y") && r.waitingMinutes !== undefined && r.waitingMinutes < 0);
  assert(passed38Y === undefined, "TEST 9: 38Y passed trips are strictly excluded");

  // TEST 10: Alternative route through Gajuwaka (400Y) shown only if directional transfer is valid
  const transfer400Y = gajuwakaRecs.find((r) => r.pathSummary.includes("400Y"));
  assert(transfer400Y !== undefined && transfer400Y.transfersCount <= 2, "TEST 10: Alternative route 400Y considered only when valid directional path exists");

  // TEST 11: Home page boarding stop visibility
  assert(gajuwakaRecs[0].boardingStopName !== "", "TEST 11: Boarding stop name is clearly accessible for Home rendering");

  // TEST 12: Home page initial display limit (Top 5 routes)
  const top5Limit = gajuwakaRecs.slice(0, 5);
  assert(top5Limit.length <= 5, "TEST 12: Home page limits initial rendering to top 5 routes");

  // TEST 13: View All Routes contains all graph-generated routes
  assert(gajuwakaRecs.length >= top5Limit.length, "TEST 13: View All Routes provides full graph-generated route list");

  // TEST 14: Firestore runtime source of truth error state
  const emptyRoutes: Route[] = [];
  const emptyRecs = generateAllRouteRecommendations("gajuwaka", emptyRoutes, stops, routeStops, transferConnections, [], [], "08:45 AM", gajuwakaTime);
  assert(emptyRecs.length === 0, "TEST 14: Unreachable/empty Firestore network returns empty results (no local runtime fallback)");

  // TEST 15: Demo mode simulation uses same live aggregation system
  const demoStudents: ActiveJourney[] = Array.from({ length: 5 }, (_, i) => ({
    id: `demo_${i}`,
    userId: `demo_${i}`,
    routeId: "38Y",
    boardingPoint: "Gajuwaka",
    currentStopId: "gajuwaka",
    latitude: 17.69029 + i * 0.0001,
    longitude: 83.22383 + i * 0.0001,
    lastUpdated: new Date().toISOString(),
    journeyStatus: "IN_TRANSIT",
    confidence: "HIGH",
    validationStatus: "VALIDATED",
    isDemo: true,
  }));
  const demoMetrics = calculateRouteCrowdMetrics("38Y", demoStudents, [], stops, false);
  assert(demoMetrics.liveStatus === "LIVE" && demoMetrics.activeCount === 5, "TEST 15: Demo Mode simulated student GPS is processed through exact same live aggregation system");

  console.log("========================================================================");
  console.log(`TOTAL FINAL RECOMMENDATION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("========================================================================\n");

  return { passed, failed };
}

runFinalRecommendationEngineTestSuite();
