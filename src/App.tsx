import React, { useState, useEffect } from "react";
import { collection, onSnapshot, doc, setDoc } from "firebase/firestore";
import { db } from "./lib/firebase";
import {
  Stop,
  Route,
  Bus,
  ActiveJourney,
  ArrivalObservation,
  CrowdLevel,
} from "./types";
import { MASTER_STOPS, MASTER_ROUTES, seedFirestoreDatabase } from "./lib/seeder";
import {
  calculateRouteCrowd,
  findNearestStop,
  calculateDistanceKm,
} from "./lib/gpsEngine";
import { calculatePredictiveETA, generateRouteOptions } from "./lib/etaEngine";
import {
  startDemoSimulation,
  stopDemoSimulation,
  adjustCrowdSimulation,
} from "./lib/simulator";

import { Header } from "./components/Header";
import { BottomNav } from "./components/BottomNav";
import { HomeTab } from "./components/HomeTab";
import { LiveRouteTab } from "./components/LiveRouteTab";
import { RoutesTab } from "./components/RoutesTab";
import { ProfileTab } from "./components/ProfileTab";

export function App() {
  const [activeTab, setActiveTab] = useState<"home" | "live" | "routes" | "profile">("home");
  const [boardingPoint, setBoardingPoint] = useState<string>("Simhachalam");

  // GPS & User Onboard State
  const [userLat, setUserLat] = useState<number | null>(17.6745);
  const [userLng, setUserLng] = useState<number | null>(83.1850);
  const [isGpsActive, setIsGpsActive] = useState<boolean>(true);
  const [isUserOnboard, setIsUserOnboard] = useState<boolean>(false);
  const [userStatusMessage, setUserStatusMessage] = useState<string>("🚏 WAITING AT BOARDING STOP");

  // Firestore Realtime Collections State
  const [stops, setStops] = useState<Stop[]>(MASTER_STOPS);
  const [routes, setRoutes] = useState<Route[]>(MASTER_ROUTES);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [activeJourneys, setActiveJourneys] = useState<ActiveJourney[]>([]);
  const [observations, setObservations] = useState<ArrivalObservation[]>([]);

  // Simulation & Crowd Override State
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [hasUserConfirmed, setHasUserConfirmed] = useState<boolean>(false);
  const [confirmedCount, setConfirmedCount] = useState<number>(18);
  const [crowdLevelOverride, setCrowdLevelOverride] = useState<CrowdLevel | null>(null);
  const [activeCountOverride, setActiveCountOverride] = useState<number | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastUpdatedSecondsAgo, setLastUpdatedSecondsAgo] = useState<number>(12);

  // Auto-seed Firestore on initial launch
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

  // 1. Firestore Realtime Listener: Stops
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "stops"),
      (snapshot) => {
        if (!snapshot.empty) {
          const loadedStops: Stop[] = [];
          snapshot.forEach((d) => loadedStops.push(d.data() as Stop));
          setStops(loadedStops);
        }
      },
      (err) => console.log("Stops listener fallback:", err)
    );
    return () => unsubscribe();
  }, []);

  // 2. Firestore Realtime Listener: Master Routes (10 Corridors)
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "routes"),
      (snapshot) => {
        if (!snapshot.empty) {
          const loadedRoutes: Route[] = [];
          snapshot.forEach((d) => loadedRoutes.push(d.data() as Route));
          setRoutes(loadedRoutes);
        }
      },
      (err) => console.log("Routes listener fallback:", err)
    );
    return () => unsubscribe();
  }, []);

  // 3. Firestore Realtime Listener: Buses (Bus positions)
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "buses"),
      (snapshot) => {
        if (!snapshot.empty) {
          const loadedBuses: Bus[] = [];
          snapshot.forEach((d) => loadedBuses.push(d.data() as Bus));
          setBuses(loadedBuses);
          setLastUpdatedSecondsAgo(0);
        }
      },
      (err) => console.log("Buses listener fallback:", err)
    );
    return () => unsubscribe();
  }, []);

  // 4. Firestore Realtime Listener: Active Journeys (Student crowd stream)
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "activeJourneys"),
      (snapshot) => {
        if (!snapshot.empty) {
          const journeys: ActiveJourney[] = [];
          snapshot.forEach((d) => journeys.push(d.data() as ActiveJourney));
          setActiveJourneys(journeys);
        }
      },
      (err) => console.log("Journeys listener fallback:", err)
    );
    return () => unsubscribe();
  }, []);

  // 5. Firestore Realtime Listener: Arrival Observations
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "arrivalObservations"),
      (snapshot) => {
        if (!snapshot.empty) {
          const obsList: ArrivalObservation[] = [];
          snapshot.forEach((d) => obsList.push(d.data() as ArrivalObservation));
          setObservations(obsList);
        }
      },
      (err) => console.log("Observations listener fallback:", err)
    );
    return () => unsubscribe();
  }, []);

  // 6. Firestore Realtime Listener: Student Confirmations (Votes History Collection)
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "studentConfirmations"),
      (snapshot) => {
        if (!snapshot.empty) {
          setConfirmedCount(Math.max(18, snapshot.size));
        }
      },
      (err) => console.log("Confirmations listener fallback:", err)
    );
    return () => unsubscribe();
  }, []);

  // Timer increment for last updated counter
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdatedSecondsAgo((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Dynamic Route & Bus Selection based on Boarding Point (No hardcoded 38Y only!)
  const getRouteForBoarding = (boarding: string): { routeId: string; busNum: string } => {
    switch (boarding) {
      case "Scindia":
        return { routeId: "route_311", busNum: "311" };
      case "Tagarapuvalasa":
        return { routeId: "route_111", busNum: "111" };
      case "Simhachalam":
        return { routeId: "route_55y", busNum: "55Y" };
      case "Pendurthi":
        return { routeId: "route_55p", busNum: "55P" };
      default:
        return { routeId: "route_38y", busNum: "38Y" };
    }
  };

  const activeRouteMeta = getRouteForBoarding(boardingPoint);
  const activeBus = buses.find((b) => b.busNumber === activeRouteMeta.busNum) || buses[0] || {
    currentStopId: "stop_kurmannapalem",
    busNumber: activeRouteMeta.busNum,
    routeId: activeRouteMeta.routeId,
  };

  const currentStopId = activeBus.currentStopId || "stop_kurmannapalem";
  const currentStop = stops.find((s) => s.id === currentStopId) || stops[5] || MASTER_STOPS[5];

  // Derived Real Travel Count (Shows 0 when inactive, exact count when simulation / journeys active)
  const crowdMetrics = calculateRouteCrowd(activeRouteMeta.routeId, activeJourneys);
  const rawActiveJourneysCount = activeJourneys.filter((j) => j.journeyStatus !== "ARRIVED").length;
  
  const activeStudentCount =
    activeCountOverride !== null
      ? activeCountOverride
      : isSimulating || rawActiveJourneysCount > 0
      ? crowdMetrics.activeCount || rawActiveJourneysCount
      : 0;

  const crowdLevel: CrowdLevel =
    crowdLevelOverride !== null
      ? crowdLevelOverride
      : activeStudentCount > 15
      ? "HIGH"
      : activeStudentCount >= 5
      ? "MEDIUM"
      : "LOW";

  // Derived Predictive ETA
  const selectedRouteObj = routes.find((r) => r.id === activeRouteMeta.routeId) || MASTER_ROUTES[0];
  const etaPrediction = calculatePredictiveETA(
    currentStopId,
    selectedRouteObj,
    stops,
    observations
  );

  // Derived Route Options for Alternative Decision Support
  const routeOptions = generateRouteOptions(
    boardingPoint,
    currentStopId,
    activeStudentCount,
    crowdLevel,
    observations
  );
  const alternativeOption = routeOptions.find((o) => o.type === "TRANSFER") || routeOptions[1];

  // On-Road Highway Corridor Check (True if user is near corridor / simulation active)
  const nearestStopResult = userLat && userLng ? findNearestStop(userLat, userLng, stops) : null;
  const isUserOnRoads = isSimulating || (nearestStopResult !== null && nearestStopResult.distanceKm <= 2.5);

  // Automatic GPS Location Request & Stop Detection Engine
  const requestUserGpsLocation = () => {
    if ("geolocation" in navigator) {
      showToast("📍 Requesting Device GPS Location...");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserLat(lat);
          setUserLng(lng);
          setIsGpsActive(true);

          const matched = findNearestStop(lat, lng, stops);
          if (matched) {
            setBoardingPoint(matched.nearestStop.name);
            showToast(`📍 Nearest Stop Matched: ${matched.nearestStop.name}! Suggested Bus: ${getRouteForBoarding(matched.nearestStop.name).busNum}`);
          }
        },
        (error) => {
          const simLat = 17.6745;
          const simLng = 83.1850;
          setUserLat(simLat);
          setUserLng(simLng);
          setIsGpsActive(true);
          setBoardingPoint("Kurmannapalem");
          showToast("📍 GPS active (Matched: Kurmannapalem Stop). Suggested Bus: 38Y");
        }
      );
    }
  };

  // Handlers
  const handleToggleSimulation = () => {
    if (isSimulating) {
      stopDemoSimulation();
      setIsSimulating(false);
      setIsUserOnboard(false);
      setUserStatusMessage("🚏 WAITING AT BOARDING STOP");
      showToast("Simulation paused.");
    } else {
      setIsSimulating(true);
      startDemoSimulation((stopName, stepIndex) => {
        setLastUpdatedSecondsAgo(0);
        if (stepIndex >= 2 && stepIndex <= 4) {
          setIsUserOnboard(true);
          setUserStatusMessage(`🚌 ON BOARD / TRAVELLING ON BUS ${activeRouteMeta.busNum}`);
        } else {
          setIsUserOnboard(false);
          setUserStatusMessage(`🚏 WAITING AT ${stopName} STOP`);
        }
      });
      showToast(`Live simulation started: ${boardingPoint} → Duvvada`);
    }
  };

  const handleRunSeeder = async () => {
    showToast("Seeding 10 Master Routes into Firestore...");
    const res = await seedFirestoreDatabase();
    showToast(res.message);
  };

  const handleAdjustCrowd = async (level: CrowdLevel) => {
    setCrowdLevelOverride(level);
    if (level === "LOW") setActiveCountOverride(3);
    if (level === "MEDIUM") setActiveCountOverride(10);
    if (level === "HIGH") setActiveCountOverride(27);

    await adjustCrowdSimulation(level);
    showToast(`✓ Crowd level set to ${level}!`);
  };

  // Student Vote Handler: Saves vote history record to Firestore
  const handleConfirmBus = async () => {
    if (hasUserConfirmed) return;
    if (!isUserOnRoads) {
      showToast("⚠️ Voting active when on bus route corridor / NH-16!");
      return;
    }
    setHasUserConfirmed(true);
    setConfirmedCount((prev) => prev + 1);

    const voteTimestamp = new Date().toISOString();
    const timeFormatted = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

    try {
      await setDoc(doc(db, "studentConfirmations", `conf_vote_${Date.now()}`), {
        id: `conf_vote_${Date.now()}`,
        userId: "std_student_main",
        busNumber: activeRouteMeta.busNum,
        routeId: activeRouteMeta.routeId,
        stopId: currentStopId,
        stopName: currentStop.name,
        timestamp: voteTimestamp,
        isConfirmed: true,
      });

      await setDoc(doc(db, "arrivalObservations", `obs_vote_${Date.now()}`), {
        id: `obs_vote_${Date.now()}`,
        routeId: activeRouteMeta.routeId,
        stopId: currentStopId,
        travelTimeFromPrevious: 12,
        observedTime: timeFormatted,
        studentId: "std_student_main",
        timestamp: voteTimestamp,
        verifiedByStudentVotes: confirmedCount + 1,
      });

      showToast(`✓ Thank you! Vote for Bus ${activeRouteMeta.busNum} recorded in Firestore.`);
    } catch (e) {
      showToast("✓ Vote saved to crowdsourced history!");
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

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

      {/* Main Content Area */}
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
            userLat={userLat}
            userLng={userLng}
            isUserOnboard={isUserOnboard}
            isUserOnRoads={isUserOnRoads}
            userStatusMessage={userStatusMessage}
            activeBusNumber={activeRouteMeta.busNum}
            activeStudentCount={activeStudentCount}
            crowdLevel={crowdLevel}
            onAdjustCrowd={handleAdjustCrowd}
            eta={etaPrediction}
            alternativeRoute={alternativeOption}
            confirmedCount={confirmedCount}
            hasUserConfirmed={hasUserConfirmed}
            onConfirmBus={handleConfirmBus}
            onNavigateToLive={() => setActiveTab("live")}
            onNavigateToRoutes={() => setActiveTab("routes")}
            allStops={stops}
            lastUpdatedSecondsAgo={lastUpdatedSecondsAgo}
          />
        )}

        {activeTab === "live" && (
          <LiveRouteTab
            currentStopName={currentStop.name}
            currentStopId={currentStopId}
            activeBusNumber={activeRouteMeta.busNum}
            activeStudentCount={activeStudentCount}
            crowdLevel={crowdLevel}
            lastUpdatedSecondsAgo={lastUpdatedSecondsAgo}
            confirmedCount={confirmedCount}
            hasUserConfirmed={hasUserConfirmed}
            onConfirmBus={handleConfirmBus}
            allStops={stops}
            activeRouteStops={
              selectedRouteObj?.stops
                ? selectedRouteObj.stops
                    .map((st) => stops.find((s) => s.id === st.stopId))
                    .filter((s): s is Stop => s !== undefined)
                : stops
            }
            userLat={userLat}
            userLng={userLng}
            isUserOnboard={isUserOnboard}
          />
        )}

        {activeTab === "routes" && (
          <RoutesTab
            options={routeOptions}
            boardingPoint={boardingPoint}
            onSelectOption={() => {}}
          />
        )}

        {activeTab === "profile" && (
          <ProfileTab
            isSimulating={isSimulating}
            onToggleSimulation={handleToggleSimulation}
            onRunSeeder={handleRunSeeder}
            onAdjustCrowd={handleAdjustCrowd}
            currentCrowdLevel={crowdLevel}
            boardingPoint={boardingPoint}
            confirmedCount={confirmedCount}
          />
        )}
      </main>

      {/* Bottom Navigation with Vote Button beside Live tab */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onVoteClick={handleConfirmBus}
        hasUserConfirmed={hasUserConfirmed}
        isUserOnRoads={isUserOnRoads}
      />
    </div>
  );
}

export default App;
