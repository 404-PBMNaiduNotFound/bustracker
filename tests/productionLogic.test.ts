import { getCandidateRoutesForStop, verifyRouteTrajectory } from "../src/services/routeMatcher";
import { createGpsDerivedArrivalObservation } from "../src/services/journeyService";
import { discoverGraphPaths } from "../src/services/graphRouteEngine";
import { calculateSegmentTravelTimeFromObservations, calculatePredictiveETAFromObservations } from "../src/services/etaEngine";
import { calculateRouteCrowdMetrics, MIN_LIVE_STUDENTS } from "../src/services/crowdService";
import { generateAllRouteRecommendations } from "../src/services/recommendationEngine";
import masterData from "../src/data/excelMasterData.json";
import { Route, Stop, RouteStopOrder, TransferConnection, ActiveJourney, ArrivalObservation } from "../src/types";

const routes = masterData.routes as Route[];
const stops = masterData.stops as Stop[];
const routeStops = masterData.routeStops as RouteStopOrder[];
const transferConnections = masterData.transferConnections as TransferConnection[];

export function runProductionLogicTestSuite() {
  console.log("\n========================================================");
  console.log("RUNNING ROUTEREACH PRODUCTION LOGIC COMPLETE TEST SUITE");
  console.log("========================================================");

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

  // TEST 1: Student at Gajuwaka with multiple routes
  const gajuwakaCandidates = getCandidateRoutesForStop("gajuwaka", routeStops, routes);
  assert(gajuwakaCandidates.length >= 3, "TEST 1: Student at Gajuwaka returns multiple candidate routes (not auto-selecting first)");

  // TEST 2: Student selects 38Y - GPS validates forward movement along 38Y
  const forwardVerification = verifyRouteTrajectory("38Y", "gajuwaka", "kurmannapalem", routeStops);
  assert(forwardVerification.isVerified && forwardVerification.status === "VERIFIED", "TEST 2: Forward progression along 38Y verified");

  // TEST 3: Invalid route selection - GPS trajectory conflicts
  const conflictingVerification = verifyRouteTrajectory("38Y", "gajuwaka", "rtc", routeStops);
  assert(!conflictingVerification.isVerified && conflictingVerification.status === "VERIFICATION_REQUIRED", "TEST 3: Trajectory conflict marks verification required");

  // TEST 4: Valid transfer 400Y -> Gajuwaka -> 38Y -> Duvvada accepted when directional transferConnection exists
  const maddilapalemPaths = discoverGraphPaths({
    boardingStopId: "maddilapalem",
    destinationStopId: "duvvada",
    routes,
    stops,
    routeStops,
    transferConnections,
    maxTransfers: 2,
  });

  const validTransfer = maddilapalemPaths.find(
    (p) => p.segments.length === 2 && p.segments[0].routeId === "400Y" && p.segments[1].routeId === "38Y"
  );
  assert(validTransfer !== undefined, "TEST 4: Valid directional transfer 400Y -> Gajuwaka -> 38Y -> Duvvada accepted");

  // TEST 5: Invalid transfer rejected when transferConnection does not exist
  const emptyConnections: TransferConnection[] = [];
  const noTransferPaths = discoverGraphPaths({
    boardingStopId: "maddilapalem",
    destinationStopId: "duvvada",
    routes,
    stops,
    routeStops,
    transferConnections: emptyConnections,
    maxTransfers: 2,
  });

  const rejectedTransfer = noTransferPaths.find((p) => p.type === "TRANSFER");
  assert(rejectedTransfer === undefined, "TEST 5: Transfer rejected when directional transferConnection does not exist");

  // TEST 6: Backward route movement rejected
  const duvvadaPaths = discoverGraphPaths({
    boardingStopId: "duvvada",
    destinationStopId: "duvvada",
    routes,
    stops,
    routeStops,
    transferConnections,
    maxTransfers: 2,
  });
  assert(duvvadaPaths.length === 0, "TEST 6: Backward route sequence travel rejected");

  // TEST 7: No ETA observations displays ETA unavailable
  const emptyObs: ArrivalObservation[] = [];
  const noObsResult = calculatePredictiveETAFromObservations(
    "gajuwaka",
    routes.find((r) => r.id === "38Y")!,
    stops,
    emptyObs,
    routeStops
  );
  assert(noObsResult.etaStatus === "ETA_UNAVAILABLE" && noObsResult.duvvadaEta === "ETA unavailable", "TEST 7: No observations displays ETA unavailable (no invented fallback)");

  // TEST 8: One segment has observations and another does not -> ETA is UNAVAILABLE
  const partialObs: ArrivalObservation[] = [
    {
      id: "obs_1",
      routeId: "38Y",
      fromStopId: "gajuwaka",
      toStopId: "kurmannapalem",
      travelTimeSeconds: 600,
      travelTimeFromPrevious: 10,
      observedAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      source: "student_gps",
      confidence: "HIGH",
    },
    // Missing kurmannapalem -> duvvada observation
  ];

  const partialEtaResult = calculatePredictiveETAFromObservations(
    "gajuwaka",
    routes.find((r) => r.id === "38Y")!,
    stops,
    partialObs,
    routeStops
  );
  assert(partialEtaResult.etaStatus === "ETA_UNAVAILABLE", "TEST 8: Partial segment observations do NOT invent missing segment ETA");

  // TEST 9: Two different route segments use their own distinct travel histories
  const seg1Res = calculateSegmentTravelTimeFromObservations("38Y", "gajuwaka", "kurmannapalem", partialObs);
  const seg2Res = calculateSegmentTravelTimeFromObservations("38Y", "kurmannapalem", "duvvada", partialObs);
  assert(seg1Res.travelTimeSeconds === 600 && seg2Res.travelTimeSeconds === null, "TEST 9: Segments use their own distinct observation histories");

  // TEST 10: One student GPS signal is NOT verified live bus location (LIMITED confidence)
  const singleStudent: ActiveJourney[] = [
    {
      id: "std_1",
      userId: "std_1",
      routeId: "38Y",
      boardingPoint: "Gajuwaka",
      currentStopId: "gajuwaka",
      latitude: 17.69029,
      longitude: 83.22383,
      lastUpdated: new Date().toISOString(),
      journeyStatus: "IN_TRANSIT",
      confidence: "MEDIUM",
      validationStatus: "VALIDATED",
    },
  ];

  const singleMetrics = calculateRouteCrowdMetrics("38Y", singleStudent, [], stops, true);
  assert(singleMetrics.confidence !== "HIGH" && singleMetrics.aggregatedPosition?.confidence === "LIMITED", "TEST 10: 1 student signal is NOT verified live bus location");

  // TEST 11: Five students on same route and close together -> Aggregated live position with HIGH confidence
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
    validationStatus: "VALIDATED",
  }));

  const fiveMetrics = calculateRouteCrowdMetrics("38Y", fiveStudents, [], stops, true);
  assert(fiveMetrics.confidence === "HIGH" && fiveMetrics.aggregatedPosition?.confidence === "HIGH", "TEST 11: 5+ students on same segment generate HIGH confidence aggregated bus location");

  // TEST 12: Five students spread across different routes -> Do NOT combine them
  const nowIso = new Date().toISOString();
  const spreadStudents: ActiveJourney[] = [
    { id: "s1", userId: "s1", routeId: "38Y", boardingPoint: "Gajuwaka", currentStopId: "gajuwaka", latitude: 17.69, longitude: 83.22, lastUpdated: nowIso, journeyStatus: "IN_TRANSIT", confidence: "MEDIUM", validationStatus: "VALIDATED" },
    { id: "s2", userId: "s2", routeId: "400K", boardingPoint: "RTC", currentStopId: "rtc", latitude: 17.72, longitude: 83.30, lastUpdated: nowIso, journeyStatus: "IN_TRANSIT", confidence: "MEDIUM", validationStatus: "VALIDATED" },
    { id: "s3", userId: "s3", routeId: "500", boardingPoint: "NAD", currentStopId: "nad", latitude: 17.73, longitude: 83.23, lastUpdated: nowIso, journeyStatus: "IN_TRANSIT", confidence: "MEDIUM", validationStatus: "VALIDATED" },
    { id: "s4", userId: "s4", routeId: "600", boardingPoint: "Scindia", currentStopId: "scindia", latitude: 17.68, longitude: 83.27, lastUpdated: nowIso, journeyStatus: "IN_TRANSIT", confidence: "MEDIUM", validationStatus: "VALIDATED" },
    { id: "s5", userId: "s5", routeId: "744", boardingPoint: "Parawada", currentStopId: "parawada", latitude: 17.61, longitude: 83.12, lastUpdated: nowIso, journeyStatus: "IN_TRANSIT", confidence: "MEDIUM", validationStatus: "VALIDATED" },
  ];

  const spreadMetrics38Y = calculateRouteCrowdMetrics("38Y", spreadStudents, [], stops, true);
  assert(spreadMetrics38Y.activeCount === 1 && spreadMetrics38Y.confidence !== "HIGH", "TEST 12: Students on different routes are NOT combined");

  // TEST 13: No active students -> Route remains visible as NO LIVE DATA
  const noStudentsRecs = generateAllRouteRecommendations("gajuwaka", routes, stops, routeStops, transferConnections, [], []);
  const noLiveDataRoute = noStudentsRecs.find((r) => r.liveStatus === "NO LIVE DATA");
  assert(noLiveDataRoute !== undefined, "TEST 13: Routes with no active students remain visible as NO LIVE DATA");

  // TEST 14: Firestore runtime source of truth error check
  const emptyRoutes: Route[] = [];
  const emptyGraphRecs = generateAllRouteRecommendations("gajuwaka", emptyRoutes, stops, routeStops, transferConnections, [], []);
  assert(emptyGraphRecs.length === 0, "TEST 14: Unreachable/empty Firestore network returns empty results (no silent local fallbacks)");

  // TEST 15: Demo Mode simulated journeys marked as isDemo
  const demoStudent: ActiveJourney = {
    id: "demo_1",
    userId: "demo_1",
    routeId: "38Y",
    boardingPoint: "Simhachalam",
    currentStopId: "simhachalam",
    latitude: 17.7663,
    longitude: 83.2421,
    lastUpdated: new Date().toISOString(),
    journeyStatus: "IN_TRANSIT",
    confidence: "HIGH",
    isDemo: true,
  };

  const realModeMetrics = calculateRouteCrowdMetrics("38Y", [demoStudent], [], stops, true);
  const demoModeMetrics = calculateRouteCrowdMetrics("38Y", [demoStudent], [], stops, false);
  assert(realModeMetrics.activeCount === 0 && demoModeMetrics.activeCount === 1, "TEST 15: Demo Mode data is clearly separated from Real Mode");

  console.log("========================================================");
  console.log(`TOTAL PRODUCTION LOGIC TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("========================================================\n");

  return { passed, failed };
}

runProductionLogicTestSuite();
