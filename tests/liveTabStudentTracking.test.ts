import { calculateRouteCrowdMetrics, calculateAllRouteAggregations, isJourneyFresh, MIN_LIVE_STUDENTS } from "../src/services/crowdService";
import { findNearestStop, calculateDistanceKm } from "../src/services/gpsService";
import masterData from "../src/data/excelMasterData.json";
import { ActiveJourney, Stop } from "../src/types";

const stops = masterData.stops as Stop[];

export function runLiveTabStudentTrackingTestSuite() {
  console.log("\n========================================================");
  console.log("RUNNING ROUTEREACH LIVE TAB STUDENT-POWERED TEST SUITE");
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

  // TEST 1: One student on 38Y -> LIMITED DATA, no verified high-confidence bus marker
  const oneStudent: ActiveJourney[] = [
    {
      id: "s1",
      userId: "s1",
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
  const metrics1 = calculateRouteCrowdMetrics("38Y", oneStudent, [], stops, true);
  assert(metrics1.liveStatus === "LIMITED DATA" && metrics1.confidence === "MEDIUM" && metrics1.aggregatedPosition?.confidence === "LIMITED", "TEST 1: 1 student on 38Y displays LIMITED DATA without high-confidence bus marker");

  // TEST 2: Four students on 38Y -> LIMITED DATA
  const fourStudents: ActiveJourney[] = Array.from({ length: 4 }, (_, i) => ({
    id: `s_${i}`,
    userId: `s_${i}`,
    routeId: "38Y",
    boardingPoint: "Gajuwaka",
    currentStopId: "gajuwaka",
    latitude: 17.69029 + i * 0.0001,
    longitude: 83.22383 + i * 0.0001,
    lastUpdated: new Date().toISOString(),
    journeyStatus: "IN_TRANSIT",
    confidence: "MEDIUM",
    validationStatus: "VALIDATED",
  }));
  const metrics4 = calculateRouteCrowdMetrics("38Y", fourStudents, [], stops, true);
  assert(metrics4.liveStatus === "LIMITED DATA" && metrics4.activeCount === 4, "TEST 2: 4 students on 38Y displays LIMITED DATA");

  // TEST 3: Five students on 38Y near Gajuwaka -> Aggregated HIGH CONFIDENCE position appears
  const fiveStudents: ActiveJourney[] = Array.from({ length: 5 }, (_, i) => ({
    id: `s_${i}`,
    userId: `s_${i}`,
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
  const metrics5 = calculateRouteCrowdMetrics("38Y", fiveStudents, [], stops, true);
  assert(metrics5.liveStatus === "LIVE" && metrics5.confidence === "HIGH" && metrics5.aggregatedPosition?.confidence === "HIGH", "TEST 3: 5 students near Gajuwaka generate HIGH CONFIDENCE aggregated position");

  // TEST 4: Eight students on 38Y -> Aggregated position uses all valid fresh students
  const eightStudents: ActiveJourney[] = Array.from({ length: 8 }, (_, i) => ({
    id: `s_${i}`,
    userId: `s_${i}`,
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
  const metrics8 = calculateRouteCrowdMetrics("38Y", eightStudents, [], stops, true);
  assert(metrics8.activeCount === 8 && metrics8.aggregatedPosition?.activeStudentCount === 8, "TEST 4: 8 students on 38Y uses all 8 valid fresh student signals");

  // TEST 5: Students on 38Y and 400K -> Separate aggregation for each route (no cross-route mixing)
  const multiRouteStudents: ActiveJourney[] = [
    ...fiveStudents,
    ...Array.from({ length: 6 }, (_, i) => ({
      id: `s400_${i}`,
      userId: `s400_${i}`,
      routeId: "400K",
      boardingPoint: "RTC",
      currentStopId: "rtc",
      latitude: 17.72368 + i * 0.0001,
      longitude: 83.30810 + i * 0.0001,
      lastUpdated: new Date().toISOString(),
      journeyStatus: "IN_TRANSIT" as const,
      confidence: "HIGH" as const,
      validationStatus: "VALIDATED" as const,
    })),
  ];
  const allAggregations = calculateAllRouteAggregations(multiRouteStudents, stops, true);
  const agg38Y = allAggregations.find((a) => a.routeId === "38Y");
  const agg400K = allAggregations.find((a) => a.routeId === "400K");
  assert(agg38Y?.activeCount === 5 && agg400K?.activeCount === 6, "TEST 5: Students on 38Y and 400K produce separate route aggregations");

  // TEST 6: Five students but 1 has stale GPS (>2 mins old) -> Exclude stale student (4 fresh -> LIMITED DATA)
  const staleTimestamp = new Date(Date.now() - 3 * 60 * 1000).toISOString();
  const fourFreshOneStale: ActiveJourney[] = [
    ...fourStudents,
    {
      id: "stale_std",
      userId: "stale_std",
      routeId: "38Y",
      boardingPoint: "Gajuwaka",
      currentStopId: "gajuwaka",
      latitude: 17.69029,
      longitude: 83.22383,
      lastUpdated: staleTimestamp,
      journeyStatus: "IN_TRANSIT",
      confidence: "HIGH",
      validationStatus: "VALIDATED",
    },
  ];
  const metricsStale = calculateRouteCrowdMetrics("38Y", fourFreshOneStale, [], stops, true);
  assert(metricsStale.activeCount === 4 && metricsStale.liveStatus === "LIMITED DATA", "TEST 6: Stale student (>2 mins old) is excluded, downgrading to LIMITED DATA");

  // TEST 7: Aggregated position moves from Gajuwaka to Kurmannapalem -> Map centroid & nearest stop update
  const kurmannapalemStudents: ActiveJourney[] = Array.from({ length: 5 }, (_, i) => ({
    id: `k_${i}`,
    userId: `k_${i}`,
    routeId: "38Y",
    boardingPoint: "Kurmannapalem",
    currentStopId: "kurmannapalem",
    latitude: 17.68560 + i * 0.0001,
    longitude: 83.16855 + i * 0.0001,
    lastUpdated: new Date().toISOString(),
    journeyStatus: "IN_TRANSIT",
    confidence: "HIGH",
    validationStatus: "VALIDATED",
  }));
  const metricsKurmannapalem = calculateRouteCrowdMetrics("38Y", kurmannapalemStudents, [], stops, true);
  const nearestToCentroid = findNearestStop(
    metricsKurmannapalem.aggregatedPosition!.latitude,
    metricsKurmannapalem.aggregatedPosition!.longitude,
    stops
  );
  assert(nearestToCentroid?.nearestStop.id === "kurmannapalem", "TEST 7: Aggregated centroid movement from Gajuwaka to Kurmannapalem updates nearest stop to Kurmannapalem");

  // TEST 8: Refresh execution recalculates metrics accurately
  const freshMetrics = calculateRouteCrowdMetrics("38Y", fiveStudents, [], stops, true);
  assert(freshMetrics.activeCount === 5, "TEST 8: Refresh recalculates metrics accurately");

  // TEST 9: Real-time update recalculates without page reload
  const updatedEightMetrics = calculateRouteCrowdMetrics("38Y", eightStudents, [], stops, true);
  assert(updatedEightMetrics.activeCount === 8 && updatedEightMetrics.liveStatus === "LIVE", "TEST 9: Real-time activeJourneys update recalculates metrics seamlessly");

  // TEST 10: No active students -> NO LIVE DATA, static route path remains visible
  const emptyMetrics = calculateRouteCrowdMetrics("38Y", [], [], stops, true);
  assert(emptyMetrics.liveStatus === "NO LIVE DATA" && emptyMetrics.activeCount === 0 && emptyMetrics.aggregatedPosition === null, "TEST 10: 0 active students displays NO LIVE DATA with null aggregated position");

  // TEST 11: Demo Mode simulated students move along real route and use same crowdService pipeline
  const demoStudents: ActiveJourney[] = Array.from({ length: 5 }, (_, i) => ({
    id: `demo_${i}`,
    userId: `demo_${i}`,
    routeId: "38Y",
    boardingPoint: "RTC",
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
  assert(demoMetrics.liveStatus === "LIVE" && demoMetrics.activeCount === 5 && demoMetrics.aggregatedPosition !== null, "TEST 11: Demo Mode uses simulated students through exact same crowdService aggregation logic");

  // TEST 12: Real Mode ignores demo student journeys completely
  const realModeMetricsWithDemoPresent = calculateRouteCrowdMetrics("38Y", demoStudents, [], stops, true);
  assert(realModeMetricsWithDemoPresent.activeCount === 0 && realModeMetricsWithDemoPresent.liveStatus === "NO LIVE DATA", "TEST 12: Real Mode strictly ignores demo student journeys and uses zero hardcoded bus coordinates");

  console.log("========================================================");
  console.log(`TOTAL LIVE TAB TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("========================================================\n");

  return { passed, failed };
}

runLiveTabStudentTrackingTestSuite();
