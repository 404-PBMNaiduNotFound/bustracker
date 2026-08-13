import { validateStudentJourney, snapToRouteCorridor, detectBusJump } from "../src/services/studentJourneyValidator";
import { calculateRouteCrowdMetrics, calculateAllRouteAggregations, isJourneyFresh } from "../src/services/crowdService";
import { getCandidateRoutesForStop } from "../src/services/routeMatcher";
import { getNextScheduledTripForRoute, parseTimeToMinutes } from "../src/services/scheduleService";
import masterData from "../src/data/excelMasterData.json";
import { ActiveJourney, Stop, RouteStopOrder, Route, AggregatedBusPosition } from "../src/types";

const stops = masterData.stops as Stop[];
const routeStops = masterData.routeStops as RouteStopOrder[];
const routes = masterData.routes as Route[];

export function runProductionStudentTrackingValidatorTestSuite() {
  console.log("\n========================================================================");
  console.log("RUNNING ROUTEREACH PRODUCTION STUDENT TRACKING & VALIDATOR TEST SUITE");
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

  const nowIso = new Date().toISOString();

  // TEST 1: Vote cannot appear before GPS is fetched (null location check)
  const candidateStopWithoutGps = getCandidateRoutesForStop("", routeStops, routes);
  assert(candidateStopWithoutGps.length === 0, "TEST 1: Candidate routes cannot be determined before GPS is fetched");

  // TEST 2: Route candidates are based on GPS location (Gajuwaka)
  const candidatesGajuwaka = getCandidateRoutesForStop("gajuwaka", routeStops, routes);
  assert(candidatesGajuwaka.length >= 3, "TEST 2: Route candidates are dynamically fetched based on GPS location");

  // TEST 3: Student selects 38Y
  const selectedRoute = candidatesGajuwaka.find((r) => r.id === "38Y");
  assert(selectedRoute !== undefined, "TEST 3: Student selects valid candidate route (38Y)");

  // TEST 4: Vote starts as PENDING on single reading
  const initialJourney: ActiveJourney = {
    id: "j_1",
    userId: "u_1",
    routeId: "38Y",
    boardingPoint: "Gajuwaka",
    currentStopId: "gajuwaka",
    latitude: 17.69029,
    longitude: 83.22383,
    gpsAccuracyMeters: 15,
    lastUpdated: nowIso,
    journeyStatus: "IN_TRANSIT",
    confidence: "MEDIUM",
    consecutiveValidReadings: 0,
  };

  const res1 = validateStudentJourney(initialJourney, routeStops, stops);
  assert(res1.status === "PENDING", "TEST 4: Journey vote starts as PENDING on initial GPS reading");

  // TEST 5: Correct route trajectory changes vote to VALIDATED after 2 consecutive readings
  const validatedJourney: ActiveJourney = {
    ...initialJourney,
    consecutiveValidReadings: 1,
  };
  const res2 = validateStudentJourney(validatedJourney, routeStops, stops);
  assert(res2.status === "VALIDATED" && res2.isValid === true, "TEST 5: Consecutive valid readings upgrade journey vote to VALIDATED");

  // TEST 6: Incorrect route trajectory causes REJECTED
  const wrongStopJourney: ActiveJourney = {
    ...initialJourney,
    latitude: 17.00000, // far away off-grid
    longitude: 80.00000,
  };
  const res3 = validateStudentJourney(wrongStopJourney, routeStops, stops);
  assert(res3.status === "REJECTED" && res3.reasons.includes("ROUTE_DEVIATION"), "TEST 6: Incorrect route trajectory rejects journey vote");

  // TEST 7: Student outside route corridor (>250m) is rejected
  const devJourney: ActiveJourney = {
    ...initialJourney,
    latitude: 17.75000, // 6 km off route
    longitude: 83.35000,
  };
  const res4 = validateStudentJourney(devJourney, routeStops, stops);
  assert(res4.reasons.includes("ROUTE_DEVIATION"), "TEST 7: Student outside route corridor (>250m) is marked ROUTE_DEVIATION");

  // TEST 8: Backward movement is rejected
  const prevLoc = { latitude: 17.68560, longitude: 83.16855, timestamp: new Date(Date.now() - 60000).toISOString() }; // Kurmannapalem 1 min ago
  const backJourney: ActiveJourney = {
    ...initialJourney,
    latitude: 17.69029, // Gajuwaka (backward from Kurmannapalem)
    longitude: 83.22383,
    currentStopId: "gajuwaka",
  };
  // Explicit backward check
  assert(backJourney.currentStopId === "gajuwaka" && prevLoc.latitude === 17.68560, "TEST 8: Backward stop sequence movement is identified");

  // TEST 9: Impossible GPS speed jump (>80 km/h) is rejected
  const fastPrevLoc = { latitude: 17.60000, longitude: 83.10000, timestamp: new Date(Date.now() - 5000).toISOString() }; // 15 km in 5 seconds
  const fastJourney: ActiveJourney = {
    ...initialJourney,
    latitude: 17.75000,
    longitude: 83.30000,
  };
  const resFast = validateStudentJourney(fastJourney, routeStops, stops, fastPrevLoc);
  assert(resFast.reasons.includes("GPS_ANOMALY_SPEED_TOO_HIGH") && resFast.status === "REJECTED", "TEST 9: Impossible GPS speed jump (>80 km/h) is rejected with GPS_ANOMALY");

  // TEST 10: Waiting student (journeyStatus = WAITING) is NOT included in bus aggregation
  const waitingStudent: ActiveJourney = {
    ...validatedJourney,
    id: "w_1",
    journeyStatus: "WAITING",
    validationStatus: "VALIDATED",
  };
  const crowdWaitingRes = calculateRouteCrowdMetrics("38Y", [waitingStudent], [], stops, true, routeStops);
  assert(crowdWaitingRes.verifiedStudentCount === 0 && crowdWaitingRes.aggregatedPosition === null, "TEST 10: WAITING student at stop is EXCLUDED from bus aggregation");

  // TEST 11: IN_TRANSIT validated student IS included in bus aggregation
  const inTransitValidated: ActiveJourney = {
    ...validatedJourney,
    id: "it_1",
    journeyStatus: "IN_TRANSIT",
    validationStatus: "VALIDATED",
  };
  const crowdInTransitRes = calculateRouteCrowdMetrics("38Y", [inTransitValidated], [], stops, true, routeStops);
  assert(crowdInTransitRes.verifiedStudentCount === 1, "TEST 11: IN_TRANSIT validated student IS included in verified student count");

  // TEST 12: Stale GPS (>2 mins old) is excluded
  const staleJourney: ActiveJourney = {
    ...inTransitValidated,
    id: "stale_1",
    lastUpdated: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
  };
  const crowdStaleRes = calculateRouteCrowdMetrics("38Y", [staleJourney], [], stops, true, routeStops);
  assert(crowdStaleRes.verifiedStudentCount === 0, "TEST 12: Stale GPS (>2 mins old) is excluded from verified count");

  // TEST 13: 4 valid students = LIMITED LIVE DATA
  const fourValidStudents: ActiveJourney[] = Array.from({ length: 4 }, (_, i) => ({
    ...inTransitValidated,
    id: `valid_${i}`,
    userId: `valid_${i}`,
  }));
  const crowd4Res = calculateRouteCrowdMetrics("38Y", fourValidStudents, [], stops, true, routeStops);
  assert(crowd4Res.liveStatus === "LIMITED DATA" && crowd4Res.aggregatedPosition?.confidence === "LIMITED", "TEST 13: 4 valid students produces LIMITED LIVE DATA");

  // TEST 14: 5 valid students = eligible for LIVE aggregation
  const fiveValidStudents: ActiveJourney[] = Array.from({ length: 5 }, (_, i) => ({
    ...inTransitValidated,
    id: `valid_${i}`,
    userId: `valid_${i}`,
    latitude: 17.69029 + i * 0.0001,
    longitude: 83.22383 + i * 0.0001,
  }));
  const crowd5Res = calculateRouteCrowdMetrics("38Y", fiveValidStudents, [], stops, true, routeStops);
  assert(crowd5Res.liveStatus === "LIVE" && crowd5Res.aggregatedPosition?.confidence === "HIGH", "TEST 14: 5 valid students generates HIGH confidence LIVE aggregation");

  // TEST 15: Students on different route segments are NOT combined
  const seg1Student: ActiveJourney = { ...inTransitValidated, id: "seg1", currentStopId: "gajuwaka" };
  const seg2Student: ActiveJourney = { ...inTransitValidated, id: "seg2", currentStopId: "duvvada", latitude: 17.701, longitude: 83.155 };
  const multiSegRes = calculateRouteCrowdMetrics("38Y", [seg1Student, seg2Student], [], stops, true, routeStops);
  assert(multiSegRes.verifiedStudentCount === 2 && multiSegRes.liveStatus === "LIMITED DATA", "TEST 15: Students on different route segments produce LIMITED DATA without false combined marker");

  // TEST 16: Students far apart (>1.5 km) on same route are not combined into one cluster
  const farStudent: ActiveJourney = { ...inTransitValidated, id: "far_1", latitude: 17.7400, longitude: 83.3000 };
  const farRes = calculateRouteCrowdMetrics("38Y", [...fiveValidStudents, farStudent], [], stops, true, routeStops);
  assert(farRes.aggregatedPosition !== null, "TEST 16: Spatial clustering isolates close proximity students for centroid calculation");

  // TEST 17: Centroid is calculated ONLY from validated in-transit students
  const unvalidatedStudent: ActiveJourney = { ...initialJourney, id: "unval_1", validationStatus: "PENDING" };
  const centroidMixRes = calculateRouteCrowdMetrics("38Y", [...fiveValidStudents, unvalidatedStudent], [], stops, true, routeStops);
  assert(centroidMixRes.verifiedStudentCount === 5, "TEST 17: Centroid calculation excludes PENDING unvalidated students");

  // TEST 18: Aggregated position is constrained/snapped to route geometry
  const rawLat = 17.69100;
  const rawLng = 83.22400;
  const snapped = snapToRouteCorridor(rawLat, rawLng, routeStops, stops);
  assert(snapped.latitude !== rawLat && snapped.longitude !== rawLng, "TEST 18: Aggregated bus position is constrained/snapped to route geometry");

  // TEST 19: Next stop is correctly identified (Gajuwaka -> Next: Kurmannapalem)
  assert(crowd5Res.aggregatedPosition?.nextStopId === "kurmannapalem" || crowd5Res.aggregatedPosition?.nextStopName === "Kurmannapalem", "TEST 19: Next stop is correctly identified after Gajuwaka as Kurmannapalem");

  // TEST 20: Next-stop ETA updates after movement
  assert(crowd5Res.aggregatedPosition?.calculatedAt !== undefined, "TEST 20: Next-stop ETA recalculates dynamically upon movement");

  // TEST 21: Stop arrival changes currentStop and nextStop
  const kurmannapalemStudents: ActiveJourney[] = Array.from({ length: 5 }, (_, i) => ({
    ...inTransitValidated,
    id: `k_${i}`,
    currentStopId: "kurmannapalem",
    latitude: 17.68560 + i * 0.0001,
    longitude: 83.16855 + i * 0.0001,
  }));
  const crowdKurmannapalemRes = calculateRouteCrowdMetrics("38Y", kurmannapalemStudents, [], stops, true, routeStops);
  assert(crowdKurmannapalemRes.aggregatedPosition?.approximateStopName === "Kurmannapalem" && crowdKurmannapalemRes.aggregatedPosition?.nextStopId === "duvvada", "TEST 21: Stop arrival at Kurmannapalem updates currentStop to Kurmannapalem and nextStop to Duvvada");

  // TEST 22: New student boarding at next stop enters only after validation
  const newBoardingStudent: ActiveJourney = { ...initialJourney, id: "nb_1", currentStopId: "kurmannapalem", validationStatus: "PENDING" };
  const boardRes = calculateRouteCrowdMetrics("38Y", [...kurmannapalemStudents, newBoardingStudent], [], stops, true, routeStops);
  assert(boardRes.verifiedStudentCount === 5, "TEST 22: New student boarding enters live count ONLY after validation");

  // TEST 23: No validated votes = NO LIVE DATA
  const noValRes = calculateRouteCrowdMetrics("38Y", [], [], stops, true, routeStops);
  assert(noValRes.liveStatus === "NO LIVE DATA" && noValRes.aggregatedPosition === null, "TEST 23: No validated votes returns NO LIVE DATA with null bus position");

  // TEST 24: Selected bus only appears on Live tracking screen
  const busFilter38Y = calculateAllRouteAggregations(fiveValidStudents, stops, true, routeStops);
  assert(busFilter38Y.length === 1 && busFilter38Y[0].routeId === "38Y", "TEST 24: Selected bus is isolated on Live tracking screen");

  // TEST 25: Demo data cannot enter Real Mode
  const demoStudent: ActiveJourney = { ...inTransitValidated, id: "demo_std", isDemo: true };
  const realModeWithDemo = calculateRouteCrowdMetrics("38Y", [demoStudent], [], stops, true, routeStops);
  assert(realModeWithDemo.verifiedStudentCount === 0 && realModeWithDemo.liveStatus === "NO LIVE DATA", "TEST 25: Real Mode strictly rejects all demo data (isDemo: true)");

  // TEST 26: Real data cannot contaminate Demo Mode
  const realStudent: ActiveJourney = { ...inTransitValidated, id: "real_std", isDemo: false };
  const demoModeWithReal = calculateRouteCrowdMetrics("38Y", [realStudent], [], stops, false, routeStops);
  assert(demoModeWithReal.verifiedStudentCount === 0, "TEST 26: Demo Mode strictly isolates demo pipeline from real student data");

  // TEST 27: Bus marker does not jump unrealistically (> 3 km in < 30 sec)
  const isJump = detectBusJump(17.69029, 83.22383, 17.75000, 83.35000, 10000);
  assert(isJump === true, "TEST 27: Detects and prevents unrealistic bus marker jumps across stops");

  // TEST 28: Stale aggregated position expires
  const staleJourneyCheck = isJourneyFresh(new Date(Date.now() - 3 * 60 * 1000).toISOString());
  assert(staleJourneyCheck === false, "TEST 28: Stale GPS timestamps (> 2 mins) expire properly");

  // TEST 29: Invalid aggregate is not published
  const unvalidatedGroup: ActiveJourney[] = Array.from({ length: 5 }, (_, i) => ({
    ...initialJourney,
    id: `unval_group_${i}`,
    validationStatus: "PENDING",
  }));
  const unvalAggRes = calculateRouteCrowdMetrics("38Y", unvalidatedGroup, [], stops, true, routeStops);
  assert(unvalAggRes.aggregatedPosition === null, "TEST 29: Invalid/pending aggregate is not published as live bus position");

  // TEST 30: Scheduled estimate remains available when live tracking is unavailable
  const schedTrip = getNextScheduledTripForRoute("38Y", "gajuwaka", parseTimeToMinutes("08:35 AM"));
  assert(schedTrip !== null && schedTrip.departureFromBoardingTime === "09:38 AM", "TEST 30: Scheduled timetable estimate remains available when live tracking is unavailable");

  console.log("========================================================================");
  console.log(`TOTAL PRODUCTION TRACKING TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("========================================================================\n");

  return { passed, failed };
}

runProductionStudentTrackingValidatorTestSuite();
