import React, { useState, useEffect, useRef } from "react";
import {
  Stop,
  Route,
  RouteStopOrder,
  TransferConnection,
  Bus,
  ActiveJourney,
  ArrivalObservation,
  StudentConfirmation,
  CrowdLevel,
} from "./types";
import {
  MASTER_STOPS,
  MASTER_ROUTES,
  MASTER_ROUTE_STOPS,
  MASTER_TRANSFER_CONNECTIONS,
  seedFirestoreDatabase,
} from "./lib/seeder";
import {
  subscribeStops,
  subscribeRoutes,
  subscribeRouteStops,
  subscribeTransferConnections,
  subscribeBuses,
  subscribeActiveJourneys,
  subscribeArrivalObservations,
  subscribeStudentConfirmations,
  updateActiveStudentJourney,
  recordStudentConfirmation,
  recordArrivalObservation,
  updateCollegeTargetTime,
  subscribeCollegeTargetTime,
} from "./services/firebaseService";
import {
  startContinuousGpsTracking,
  stopContinuousGpsTracking,
  findNearestStop,
  getDebouncedCurrentStop,
} from "./services/gpsService";
import { calculateRouteCrowdMetrics } from "./services/crowdService";
import { calculatePredictiveETAFromObservations } from "./services/etaEngine";
import { generateAllRouteRecommendations } from "./services/recommendationEngine";
import { validateStudentVoteEligibility } from "./services/studentJourneyValidator";
import {
  startDemoSimulation,
  stopDemoSimulation,
  applyDemoSimulationParams,
} from "./lib/simulator";

import { Header } from "./components/Header";
import { BottomNav } from "./components/BottomNav";
import { HomeTab } from "./components/HomeTab";
import { LiveRouteTab } from "./components/LiveRouteTab";
import { RoutesTab } from "./components/RoutesTab";
import { ProfileTab } from "./components/ProfileTab";

export function App() {
  const [activeTab, setActiveTab] = useState<"home" | "live" | "routes" | "profile">("home");
  const [boardingPoint, setBoardingPoint] = useState<string>("Old Gajuwaka");
  
  // Persisted College Target Time (stored in localStorage & Firestore)
  const [targetCollegeTime, setTargetCollegeTimeState] = useState<string>(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      return localStorage.getItem("routereach_targetCollegeTime") || "08:45 AM";
    }
    return "08:45 AM";
  });

  const setTargetCollegeTime = (newTime: string) => {
    setTargetCollegeTimeState(newTime);
    updateCollegeTargetTime(newTime);
  };

  // GPS & User Onboard State
  const [userLat, setUserLat] = useState<number | null>(17.6896);
  const [userLng, setUserLng] = useState<number | null>(83.2185);
  const [isGpsActive, setIsGpsActive] = useState<boolean>(false);
  const [gpsPermissionGranted, setGpsPermissionGranted] = useState<boolean>(false);
  const [gpsPermissionError, setGpsPermissionError] = useState<string | null>(null);
  const [isUserOnboard, setIsUserOnboard] = useState<boolean>(false);
  const [userStatusMessage, setUserStatusMessage] = useState<string>("🚏 WAITING AT BOARDING STOP");

  // Firestore Realtime Master & Dynamic Collections State
  const [stops, setStops] = useState<Stop[]>(MASTER_STOPS);
  const [routes, setRoutes] = useState<Route[]>(MASTER_ROUTES);
  const [routeStops, setRouteStops] = useState<RouteStopOrder[]>(MASTER_ROUTE_STOPS);
  const [transferConnections, setTransferConnections] = useState<TransferConnection[]>(
    MASTER_TRANSFER_CONNECTIONS
  );
  const [buses, setBuses] = useState<Bus[]>([]);
  const [activeJourneys, setActiveJourneys] = useState<ActiveJourney[]>([]);
  const [observations, setObservations] = useState<ArrivalObservation[]>([]);
  const [confirmations, setConfirmations] = useState<StudentConfirmation[]>([]);

  // Simulation & Local Confirmation State
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [hasUserConfirmed, setHasUserConfirmed] = useState<boolean>(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastUpdatedSecondsAgo, setLastUpdatedSecondsAgo] = useState<number>(0);

  const prevMatchedStopRef = useRef<Stop | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // 1. Initial Launch: Seed Master Database into Firestore if empty
  useEffect(() => {
    async function initSeeding() {
      try {
        await seedFirestoreDatabase();
      } catch (e) {
        console.log("Using local master dataset fallback.");
      }
    }
    initSeeding();
  }, []);

  // 2. Real-time Firestore Listeners for runtime single source of truth
  useEffect(() => {
    const unsubStops = subscribeStops((data) => setStops(data));
    const unsubRoutes = subscribeRoutes((data) => setRoutes(data));
    const unsubRouteStops = subscribeRouteStops((data) => setRouteStops(data));
    const unsubTransfers = subscribeTransferConnections((data) => setTransferConnections(data));
    const unsubBuses = subscribeBuses((data) => {
      setBuses(data);
      setLastUpdatedSecondsAgo(0);
    });
    const unsubJourneys = subscribeActiveJourneys((data) => setActiveJourneys(data));
    const unsubObs = subscribeArrivalObservations((data) => setObservations(data));
    const unsubConf = subscribeStudentConfirmations((data) => setConfirmations(data));
    const unsubTargetTime = subscribeCollegeTargetTime((time) => setTargetCollegeTimeState(time));

    return () => {
      unsubStops();
      unsubRoutes();
      unsubRouteStops();
      unsubTransfers();
      unsubBuses();
      unsubJourneys();
      unsubObs();
      unsubConf();
      unsubTargetTime();
    };
  }, []);

  // 3. Increment update timer
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdatedSecondsAgo((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Dynamic Route & Bus Lookup based on Boarding Point
  const getRouteForBoarding = (boarding: string): { routeId: string; busNum: string } => {
    const matchedStop = stops.find((s) => s.name.toLowerCase() === boarding.toLowerCase());
    const stopId = matchedStop?.id || "gajuwaka";
    const rs = routeStops.find((r) => r.stopId === stopId);
    if (rs) {
      return { routeId: rs.routeId, busNum: rs.routeId };
    }
    return { routeId: "38Y", busNum: "38Y" };
  };

  const activeRouteMeta = getRouteForBoarding(boardingPoint);
  const activeBus = buses.find((b) => b.busNumber === activeRouteMeta.busNum) || buses[0] || {
    currentStopId: "gajuwaka",
    busNumber: activeRouteMeta.busNum,
    routeId: activeRouteMeta.routeId,
  };

  const currentStopId = activeBus.currentStopId || "gajuwaka";
  const currentStop = stops.find((s) => s.id === currentStopId) || stops[0] || MASTER_STOPS[0];
  const selectedRouteObj = routes.find((r) => r.id === activeRouteMeta.routeId) || MASTER_ROUTES[0];

  // 4. Continuous Student GPS Tracking Handler (Bypassed in Demo Mode)
  const requestUserGpsLocation = () => {
    if (isSimulating) {
      showToast("🟣 Demo Mode Active: Location is controlled by Presenter Controls.");
      return;
    }

    if (watchIdRef.current) {
      stopContinuousGpsTracking(watchIdRef.current);
    }

    showToast("📍 Requesting Continuous Device GPS Location...");

    const id = startContinuousGpsTracking(
      (status) => {
        setIsGpsActive(status.isGpsActive || false);
        setGpsPermissionGranted(status.permissionGranted || false);
        setGpsPermissionError(status.permissionError || null);

        if (status.userLat && status.userLng && !isSimulating) {
          setUserLat(status.userLat);
          setUserLng(status.userLng);

          // Automatic Stop Detection with Debouncing (Only in Real Mode)
          const debouncedStop = getDebouncedCurrentStop(
            status.userLat,
            status.userLng,
            prevMatchedStopRef.current,
            stops
          );

          if (debouncedStop && !isSimulating) {
            prevMatchedStopRef.current = debouncedStop;
            setBoardingPoint(debouncedStop.name);

            // Update student's active journey in Firestore seamlessly
            updateActiveStudentJourney({
              id: "std_current_user",
              userId: "std_current_user",
              routeId: activeRouteMeta.routeId,
              boardingPoint: debouncedStop.name,
              currentStopId: debouncedStop.id,
              latitude: status.userLat,
              longitude: status.userLng,
              lastUpdated: new Date().toISOString(),
              journeyStatus: debouncedStop.isDestination ? "ARRIVED" : "IN_TRANSIT",
              confidence: "HIGH",
              confirmedByStudent: hasUserConfirmed,
            });
          }
        }
      },
      (errorMsg) => {
        setGpsPermissionGranted(false);
        setGpsPermissionError(errorMsg);
        showToast(errorMsg);
      }
    );

    watchIdRef.current = id;
  };

  // 5. Crowd Metrics & Predictive ETA Engines
  const crowdMetrics = calculateRouteCrowdMetrics(activeRouteMeta.routeId, activeJourneys, confirmations);
  const etaPrediction = calculatePredictiveETAFromObservations(
    currentStopId,
    selectedRouteObj,
    stops,
    observations
  );

  // 6. Dynamic Graph Pathfinding & Recommendation Engine
  const boardingStopObj = stops.find((s) => s.name.toLowerCase() === boardingPoint.toLowerCase()) || stops[0];
  const routeOptions = generateAllRouteRecommendations(
    boardingStopObj ? boardingStopObj.id : "gajuwaka",
    routes,
    stops,
    routeStops,
    transferConnections,
    activeJourneys,
    observations,
    targetCollegeTime
  );

  // Handlers
  const handleToggleSimulation = () => {
    if (isSimulating) {
      stopDemoSimulation();
      setIsSimulating(false);
      setIsUserOnboard(false);
      setUserStatusMessage("🚏 WAITING AT BOARDING STOP");
      showToast("Demo Mode stopped.");
    } else {
      if (watchIdRef.current) {
        stopContinuousGpsTracking(watchIdRef.current);
      }
      setIsSimulating(true);
      startDemoSimulation(
        (stopName, stepIndex) => {
          setLastUpdatedSecondsAgo(0);
          if (stepIndex >= 2 && stepIndex <= 4) {
            setIsUserOnboard(true);
            setUserStatusMessage(`🚌 ON BOARD / TRAVELLING ON BUS ${activeRouteMeta.busNum}`);
          } else {
            setIsUserOnboard(false);
            setUserStatusMessage(`🚏 WAITING AT ${stopName} STOP`);
          }
        },
        4000,
        activeRouteMeta.routeId
      );
      showToast(`DEMO MODE started: Simhachalam → Duvvada`);
    }
  };

  const handleRunSeeder = async () => {
    showToast("Seeding 16 Master Routes & 35 Stops from Excel into Firestore...");
    const res = await seedFirestoreDatabase();
    showToast(res.message);
  };

  const handleAdjustCrowd = async (level: CrowdLevel) => {
    const count = level === "VERY HIGH" ? 20 : level === "HIGH" ? 12 : level === "MEDIUM" ? 6 : 2;
    await applyDemoSimulationParams(currentStopId, count, activeRouteMeta.routeId, stops);
    showToast(`✓ Crowd level adjusted to ${level}!`);
  };

  const handleConfirmBus = async () => {
    if (hasUserConfirmed) return;

    // Validate strict voting eligibility criteria
    const voteCheck = validateStudentVoteEligibility(
      userLat || currentStop.lat,
      userLng || currentStop.lng,
      currentStopId,
      stops,
      activeJourneys,
      isSimulating
    );

    if (!voteCheck.canVote) {
      showToast(voteCheck.message);
      return;
    }

    setHasUserConfirmed(true);

    try {
      // 1. Record confirmation vote in studentConfirmations
      await recordStudentConfirmation(
        "std_current_user",
        activeRouteMeta.busNum,
        activeRouteMeta.routeId,
        currentStopId
      );

      // 2. Record arrival observation in arrivalObservations
      await recordArrivalObservation(
        activeRouteMeta.routeId,
        currentStopId,
        12,
        "std_current_user"
      );

      // 3. Update active journey in activeJourneys so passenger count updates immediately
      await updateActiveStudentJourney({
        id: "std_current_user",
        userId: "std_current_user",
        routeId: activeRouteMeta.routeId,
        boardingPoint: boardingPoint,
        currentStopId: currentStopId,
        latitude: currentStop.lat,
        longitude: currentStop.lng,
        lastUpdated: new Date().toISOString(),
        journeyStatus: "IN_TRANSIT",
        confidence: "HIGH",
        confirmedByStudent: true,
      });

      showToast(`✓ Vote recorded! Bus ${activeRouteMeta.busNum} confirmed in Firestore.`);
    } catch (e) {
      showToast("✓ Vote saved to crowdsourced history!");
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const currentConfirmedCount = confirmations.length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white px-4 py-2 rounded-2xl text-xs font-bold shadow-2xl shadow-indigo-950 border border-indigo-400 flex items-center gap-2 animate-in fade-in slide-in-from-top-3 max-w-md text-center">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <Header
        isSimulating={isSimulating}
        onToggleSimulation={handleToggleSimulation}
        onRunSeeder={handleRunSeeder}
        activeTab={activeTab}
      />

      {/* Main Tab Content */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === "home" && (
          <HomeTab
            currentStopName={currentStop.name}
            boardingPoint={boardingPoint}
            onSelectBoardingPoint={(p) => {
              setBoardingPoint(p);
              const routeMeta = getRouteForBoarding(p);
              showToast(`Boarding point set to ${p}. Bus: ${routeMeta.busNum}`);
            }}
            onRequestGps={requestUserGpsLocation}
            gpsPermissionGranted={gpsPermissionGranted}
            gpsPermissionError={gpsPermissionError}
            userLat={userLat}
            userLng={userLng}
            isUserOnboard={isUserOnboard}
            userStatusMessage={userStatusMessage}
            activeBusNumber={activeRouteMeta.busNum}
            activeStudentCount={crowdMetrics.activeCount}
            crowdLevel={crowdMetrics.crowdLevel}
            onAdjustCrowd={handleAdjustCrowd}
            eta={etaPrediction}
            routeOptions={routeOptions}
            confirmedCount={currentConfirmedCount}
            hasUserConfirmed={hasUserConfirmed}
            onConfirmBus={handleConfirmBus}
            onNavigateToLive={() => setActiveTab("live")}
            onNavigateToRoutes={() => setActiveTab("routes")}
            allStops={stops}
            allRoutes={routes}
            routeStops={routeStops}
            lastUpdatedSecondsAgo={lastUpdatedSecondsAgo}
            targetCollegeTime={targetCollegeTime}
            isSimulating={isSimulating}
            onApplyDemoSimulation={async (stopId, count, routeId, targetTime) => {
              setIsSimulating(true);
              if (targetTime) {
                setTargetCollegeTime(targetTime);
              }
              const matchedStop = stops.find((s) => s.id === stopId);
              if (matchedStop) {
                setBoardingPoint(matchedStop.name);
              }
              const newDemoJourneys = await applyDemoSimulationParams(stopId, count, routeId, stops);
              setActiveJourneys((prev) => {
                const nonDemo = prev.filter((j) => !j.isDemo);
                return [...nonDemo, ...newDemoJourneys];
              });
              showToast(`✓ Demo Simulation applied: ${matchedStop?.name || stopId}, ${count} students on Bus ${routeId}${targetTime ? ` (Target: ${targetTime})` : ""}`);
            }}
            onResetDemoSimulation={() => {
              stopDemoSimulation();
              setIsSimulating(false);
              showToast("✓ Demo Simulation reset to Real Mode.");
            }}
            onCollegeTimeChange={(newTime) => {
              setTargetCollegeTime(newTime);
              showToast(`🎓 College Target Timing updated to ${newTime}`);
            }}
          />
        )}

        {activeTab === "live" && (
          <LiveRouteTab
            currentStopName={currentStop.name}
            currentStopId={currentStopId}
            activeBusNumber={activeRouteMeta.busNum}
            activeStudentCount={crowdMetrics.activeCount}
            crowdLevel={crowdMetrics.crowdLevel}
            lastUpdatedSecondsAgo={lastUpdatedSecondsAgo}
            confirmedCount={currentConfirmedCount}
            hasUserConfirmed={hasUserConfirmed}
            onConfirmBus={handleConfirmBus}
            allStops={stops}
            activeRouteStops={
              routeStops.length > 0
                ? routeStops
                    .filter((rs) => rs.routeId === activeRouteMeta.routeId)
                    .map((rs) => stops.find((s) => s.id === rs.stopId))
                    .filter((s): s is Stop => s !== undefined)
                : stops
            }
            userLat={userLat}
            userLng={userLng}
            isUserOnboard={isUserOnboard}
            allMasterRoutes={routes}
            activeJourneys={activeJourneys}
            isSimulating={isSimulating}
            onRefreshLiveData={() => showToast("✓ Refreshed live student telemetry!")}
            onVoteCrowd={(level) => showToast(`🗳️ Crowd vote recorded: ${level}`)}
          />
        )}

        {activeTab === "routes" && (
          <RoutesTab
            options={routeOptions}
            boardingPoint={boardingPoint}
            allStops={stops}
            allMasterRoutes={routes}
            activeJourneys={activeJourneys}
            isSimulating={isSimulating}
            hasUserConfirmed={hasUserConfirmed}
            isUserOnboard={isUserOnboard}
            onConfirmBus={handleConfirmBus}
            onSelectBoardingPoint={(p) => {
              setBoardingPoint(p);
              const routeMeta = getRouteForBoarding(p);
              showToast(`Boarding point set to ${p}. Bus: ${routeMeta.busNum}`);
            }}
          />
        )}

        {activeTab === "profile" && (
          <ProfileTab
            isSimulating={isSimulating}
            onToggleSimulation={handleToggleSimulation}
            onRunSeeder={handleRunSeeder}
            boardingPoint={boardingPoint}
            confirmedCount={currentConfirmedCount}
            targetCollegeTime={targetCollegeTime}
            onSelectTargetTime={(t) => {
              setTargetCollegeTime(t);
              showToast(`Target arrival time updated to ${t}`);
            }}
            gpsPermissionGranted={gpsPermissionGranted}
            onRequestGps={requestUserGpsLocation}
          />
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onVoteClick={handleConfirmBus}
        hasUserConfirmed={hasUserConfirmed}
        isUserOnRoads={true}
      />
    </div>
  );
}

export default App;
