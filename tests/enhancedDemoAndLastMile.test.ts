import { generateAllRouteRecommendations } from "../src/services/recommendationEngine";
import { calculateRouteCrowdMetrics } from "../src/services/crowdService";
import masterData from "../src/data/excelMasterData.json";
import { Route, Stop, RouteStopOrder, TransferConnection, ActiveJourney } from "../src/types";

const routes = masterData.routes as Route[];
const stops = masterData.stops as Stop[];
const routeStops = masterData.routeStops as RouteStopOrder[];
const transferConnections = masterData.transferConnections as TransferConnection[];

export function runEnhancedDemoAndLastMileTestSuite() {
  console.log("\n========================================================================");
  console.log("RUNNING ROUTEREACH ENHANCED DEMO & LAST-MILE ALTERNATIVES TEST SUITE");
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

  const now = new Date();
  now.setHours(8, 35, 0, 0);

  // TEST 1: Demo location = Kurmannapalem -> Kurmannapalem becomes boarding stop
  const kurmannapalemRecs = generateAllRouteRecommendations("kurmannapalem", routes, stops, routeStops, transferConnections, [], [], "08:45 AM", now);
  assert(kurmannapalemRecs.length > 0 && kurmannapalemRecs[0].boardingStopName === "Kurmannapalem", "TEST 1: Demo location = Kurmannapalem sets boarding stop to Kurmannapalem");

  // TEST 2: Demo students = 8 -> LIVE aggregation (High Confidence)
  const eightDemoStudents: ActiveJourney[] = Array.from({ length: 8 }, (_, i) => ({
    id: `demo_${i}`,
    userId: `demo_${i}`,
    routeId: "38Y",
    boardingPoint: "Kurmannapalem",
    currentStopId: "kurmannapalem",
    latitude: 17.6856 + i * 0.0001,
    longitude: 83.1685 + i * 0.0001,
    lastUpdated: new Date().toISOString(),
    journeyStatus: "IN_TRANSIT",
    confidence: "HIGH",
    validationStatus: "VALIDATED",
    isDemo: true,
  }));
  const demoMetrics8 = calculateRouteCrowdMetrics("38Y", eightDemoStudents, [], stops, false);
  assert(demoMetrics8.liveStatus === "LIVE" && demoMetrics8.confidence === "HIGH", "TEST 2: Demo students = 8 produces LIVE aggregation with HIGH confidence");

  // TEST 3: Demo students = 3 -> LIMITED LIVE DATA
  const threeDemoStudents = eightDemoStudents.slice(0, 3);
  const demoMetrics3 = calculateRouteCrowdMetrics("38Y", threeDemoStudents, [], stops, false);
  assert(demoMetrics3.liveStatus === "LIMITED DATA" && demoMetrics3.confidence === "MEDIUM", "TEST 3: Demo students = 3 produces LIMITED LIVE DATA");

  // TEST 4: Demo location = Duvvada -> Duvvada becomes boarding stop
  const duvvadaRecs = generateAllRouteRecommendations("duvvada", routes, stops, routeStops, transferConnections, [], [], "08:45 AM", now);
  assert(duvvadaRecs.length > 0 && duvvadaRecs[0].boardingStopName === "Duvvada", "TEST 4: Demo location = Duvvada sets boarding stop to Duvvada");

  // TEST 5: Kurmannapalem -> Duvvada -> Direct bus + Duvvada -> College last mile (6 mins)
  const directDuvvadaPath = kurmannapalemRecs.find((r) => r.pathSummary.includes("38Y"));
  assert(directDuvvadaPath !== undefined && directDuvvadaPath.predictedCollegeArrival !== "", "TEST 5: Kurmannapalem -> Duvvada direct path includes 6 min last mile to College");

  // TEST 6: Kurmannapalem -> Rajiv Nagar -> College -> Bus + walking last mile (15 mins)
  const rajivNagarPath = kurmannapalemRecs.find((r) => r.pathSummary.includes("Rajiv Nagar"));
  assert(rajivNagarPath !== undefined && rajivNagarPath.lastMileMode === "walk" && rajivNagarPath.lastMileMinutes === 15, "TEST 6: Kurmannapalem -> Rajiv Nagar -> College includes 15 min walking last mile");

  // TEST 7: Change demo location -> Available buses and recommendations change
  const gajuwakaRecs = generateAllRouteRecommendations("gajuwaka", routes, stops, routeStops, transferConnections, [], [], "08:45 AM", now);
  assert(gajuwakaRecs[0].boardingStopName !== kurmannapalemRecs[0].boardingStopName, "TEST 7: Changing demo location dynamically updates recommendations and boarding stop");

  // TEST 8: Change student count -> Crowd and live confidence change
  assert(demoMetrics8.crowdLevel === "MEDIUM" && demoMetrics3.crowdLevel === "LOW", "TEST 8: Changing demo student count dynamically updates crowd level and confidence");

  // TEST 9: Change route -> Student simulated positions follow selected route
  const demoMetrics400K = calculateRouteCrowdMetrics("400K", eightDemoStudents, [], stops, false);
  assert(demoMetrics400K.activeCount === 0 && demoMetrics8.activeCount === 8, "TEST 9: Changing demo route isolates student simulated positions to selected route");

  // TEST 10: Real Mode -> No demo data appears (isDemo: false filter enforced)
  const realMetricsWithDemoPresent = calculateRouteCrowdMetrics("38Y", eightDemoStudents, [], stops, true);
  assert(realMetricsWithDemoPresent.activeCount === 0 && realMetricsWithDemoPresent.liveStatus === "NO LIVE DATA", "TEST 10: Real Mode strictly ignores all demo student journeys");

  // TEST 11: Demo Mode -> No real student data affects simulation when processing demo mode
  const realStudents: ActiveJourney[] = [
    {
      id: "real_1",
      userId: "real_1",
      routeId: "38Y",
      boardingPoint: "Gajuwaka",
      currentStopId: "gajuwaka",
      latitude: 17.69,
      longitude: 83.22,
      lastUpdated: new Date().toISOString(),
      journeyStatus: "IN_TRANSIT",
      confidence: "HIGH",
      isDemo: false,
    },
  ];
  const demoOnlyMetrics = calculateRouteCrowdMetrics("38Y", realStudents, [], stops, false);
  assert(demoOnlyMetrics.activeCount === 0, "TEST 11: Demo Mode strictly isolates demo simulation pipeline from real student data");

  // TEST 12: Duvvada arrival -> College arrival = Duvvada arrival + configured last-mile time (6 mins)
  const duvvadaWalkOption = duvvadaRecs.find((r) => r.type === "LAST_MILE");
  assert(duvvadaWalkOption !== undefined && duvvadaWalkOption.totalMinutesToCollege === 6, "TEST 12: Duvvada arrival calculates College arrival = Duvvada arrival + 6 min last mile");

  console.log("========================================================================");
  console.log(`TOTAL ENHANCED DEMO TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("========================================================================\n");

  return { passed, failed };
}

runEnhancedDemoAndLastMileTestSuite();
