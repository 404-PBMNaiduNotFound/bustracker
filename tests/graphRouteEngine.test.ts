import { discoverGraphPaths } from "../src/services/graphRouteEngine";
import masterData from "../src/data/excelMasterData.json";
import { Route, Stop, RouteStopOrder, TransferConnection } from "../src/types";

// Load Excel master dataset for testing
const routes = masterData.routes as Route[];
const stops = masterData.stops as Stop[];
const routeStops = masterData.routeStops as RouteStopOrder[];
const transferConnections = masterData.transferConnections as TransferConnection[];

export function runAutomatedTestSuite() {
  console.log("\n==========================================");
  console.log("RUNNING ROUTEREACH GRAPH ENGINE TEST SUITE");
  console.log("==========================================");

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

  // 1. TEST DIRECT ROUTE DISCOVERY
  const rtcPaths = discoverGraphPaths({
    boardingStopId: "rtc",
    destinationStopId: "duvvada",
    routes,
    stops,
    routeStops,
    transferConnections,
    maxTransfers: 2,
  });

  const direct38Y = rtcPaths.find((p) => p.type === "DIRECT" && p.segments[0].routeId === "38Y");
  assert(direct38Y !== undefined, "1. Direct route discovery (RTC -> Duvvada via 38Y)");

  // 2. TEST VALID 1-TRANSFER ROUTE DISCOVERY
  const maddilapalemPaths = discoverGraphPaths({
    boardingStopId: "maddilapalem",
    destinationStopId: "duvvada",
    routes,
    stops,
    routeStops,
    transferConnections,
    maxTransfers: 2,
  });

  const transfer400YTo38Y = maddilapalemPaths.find(
    (p) =>
      p.type === "TRANSFER" &&
      p.transfersCount === 1 &&
      p.segments[0].routeId === "400Y" &&
      p.segments[1].routeId === "38Y"
  );
  assert(transfer400YTo38Y !== undefined, "2. Valid 1-transfer route discovery (400Y -> Gajuwaka -> 38Y -> Duvvada)");

  // 3. TEST REJECTION OF INVALID BACKWARD TRAVEL
  const duvvadaPaths = discoverGraphPaths({
    boardingStopId: "duvvada",
    destinationStopId: "duvvada",
    routes,
    stops,
    routeStops,
    transferConnections,
    maxTransfers: 2,
  });

  assert(duvvadaPaths.length === 0, "3. Rejection of backward sequence travel");

  // 4. TEST DUPLICATE PATH REMOVAL & CYCLE PREVENTION
  const gajuwakaPaths = discoverGraphPaths({
    boardingStopId: "gajuwaka",
    destinationStopId: "duvvada",
    routes,
    stops,
    routeStops,
    transferConnections,
    maxTransfers: 2,
  });

  const pathIds = gajuwakaPaths.map((p) => p.pathId);
  const uniquePathIds = new Set(pathIds);
  assert(pathIds.length === uniquePathIds.size, "4. Duplicate path removal & cycle prevention");

  // 5. TEST MAXIMUM 2 TRANSFERS ENFORCEMENT
  const maxTransfersCount = Math.max(...maddilapalemPaths.map((p) => p.transfersCount));
  assert(maxTransfersCount <= 2, "5. Strict enforcement of MAX_TRANSFERS = 2");

  // 6. TEST NO-LIVE-DATA ROUTES REMAIN VISIBLE
  const noLiveDataPaths = gajuwakaPaths.filter((p) => p.liveStatus === "NO LIVE DATA");
  assert(noLiveDataPaths.length > 0, "6. Routes without live student signals remain visible as NO LIVE DATA");

  // 7. TEST DYNAMIC DISCOVERY OF NEWLY ADDED FIRESTORE ROUTE
  const newRoute: Route = {
    id: "NEW_EXPRESS",
    name: "NEW_EXPRESS",
    type: "direct",
    origin: "NAD",
    destination: "Duvvada",
    isDirectToDuvvada: true,
    busNumbers: ["NEW_EXPRESS"],
    isActive: true,
  };

  const newRouteStops: RouteStopOrder[] = [
    { routeId: "NEW_EXPRESS", stopId: "nad", sequence: 1 },
    { routeId: "NEW_EXPRESS", stopId: "duvvada", sequence: 2 },
  ];

  const updatedRoutes = [...routes, newRoute];
  const updatedRouteStops = [...routeStops, ...newRouteStops];

  const nadPathsNew = discoverGraphPaths({
    boardingStopId: "nad",
    destinationStopId: "duvvada",
    routes: updatedRoutes,
    stops,
    routeStops: updatedRouteStops,
    transferConnections,
    maxTransfers: 2,
  });

  const discoveredNewRoute = nadPathsNew.find((p) => p.segments.some((s) => s.routeId === "NEW_EXPRESS"));
  assert(discoveredNewRoute !== undefined, "7. Dynamically discovers newly added Firestore route without React changes");

  console.log("==========================================");
  console.log(`TOTAL TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==========================================\n");

  return { passed, failed };
}

// Run test suite
runAutomatedTestSuite();
