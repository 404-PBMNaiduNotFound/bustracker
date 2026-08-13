import React, { useState } from "react";
import {
  Radio,
  RefreshCw,
  Users,
  Flame,
  ShieldCheck,
  MapPin,
  Zap,
  AlertTriangle,
  Eye,
  EyeOff,
  ThumbsUp,
  BarChart3,
} from "lucide-react";
import { Stop, CrowdLevel, ActiveJourney, Route } from "../types";
import { LeafletMap } from "./LeafletMap";
import { calculateRouteCrowdMetrics, isJourneyFresh, MIN_LIVE_STUDENTS } from "../services/crowdService";
import { calculateDistanceKm } from "../services/gpsService";

interface LiveRouteTabProps {
  currentStopName: string;
  currentStopId: string;
  activeBusNumber?: string;
  activeStudentCount: number;
  crowdLevel: CrowdLevel;
  lastUpdatedSecondsAgo: number;
  confirmedCount: number;
  hasUserConfirmed: boolean;
  onConfirmBus: () => void;
  allStops: Stop[];
  activeRouteStops: Stop[];
  allMasterRoutes?: Route[];
  activeJourneys?: ActiveJourney[];
  userLat?: number | null;
  userLng?: number | null;
  isUserOnboard?: boolean;
  isSimulating?: boolean;
  onRefreshLiveData?: () => void;
  onVoteCrowd?: (level: CrowdLevel) => void;
}

const CROWD_LEVELS: CrowdLevel[] = ["LOW", "MEDIUM", "HIGH", "VERY HIGH"];

const getCrowdStyle = (level: CrowdLevel, selected: boolean) => {
  const base = selected ? "scale-105 shadow-lg" : "opacity-70 hover:opacity-100";
  switch (level) {
    case "LOW":
      return `${base} ${selected ? "bg-emerald-500 border-emerald-300 text-white" : "bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:border-emerald-400"}`;
    case "MEDIUM":
      return `${base} ${selected ? "bg-amber-500 border-amber-300 text-white" : "bg-amber-950/60 border-amber-500/40 text-amber-300 hover:border-amber-400"}`;
    case "HIGH":
      return `${base} ${selected ? "bg-orange-500 border-orange-300 text-white" : "bg-orange-950/60 border-orange-500/40 text-orange-300 hover:border-orange-400"}`;
    case "VERY HIGH":
      return `${base} ${selected ? "bg-rose-500 border-rose-300 text-white" : "bg-rose-950/60 border-rose-500/40 text-rose-300 hover:border-rose-400"}`;
  }
};

const getCrowdEmoji = (level: CrowdLevel) => {
  switch (level) {
    case "LOW": return "🟢";
    case "MEDIUM": return "🟡";
    case "HIGH": return "🟠";
    case "VERY HIGH": return "🔴";
  }
};

export const LiveRouteTab: React.FC<LiveRouteTabProps> = ({
  currentStopName,
  currentStopId,
  activeBusNumber = "38Y",
  activeStudentCount,
  crowdLevel,
  lastUpdatedSecondsAgo,
  confirmedCount,
  hasUserConfirmed,
  onConfirmBus,
  allStops,
  activeRouteStops,
  allMasterRoutes = [],
  activeJourneys = [],
  userLat,
  userLng,
  isUserOnboard = false,
  isSimulating = false,
  onRefreshLiveData,
  onVoteCrowd,
}) => {
  const [selectedRouteFilter, setSelectedRouteFilter] = useState<string>("ALL");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedTime, setLastRefreshedTime] = useState<string>(
    new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
  );
  const [showLiveOnly, setShowLiveOnly] = useState<boolean>(false);
  const [userCrowdVote, setUserCrowdVote] = useState<CrowdLevel | null>(null);
  const [crowdVoteTally, setCrowdVoteTally] = useState<Record<CrowdLevel, number>>({
    LOW: 2,
    MEDIUM: 5,
    HIGH: 3,
    "VERY HIGH": 1,
  });
  const [hasCrowdVoted, setHasCrowdVoted] = useState<boolean>(false);

  const isRealMode = !isSimulating;

  // Filter fresh active journeys (< 2 mins old)
  const freshJourneys = activeJourneys.filter(
    (j) => j.journeyStatus === "IN_TRANSIT" && (isRealMode ? !j.isDemo : true) && isJourneyFresh(j.lastUpdated || j.lastLocationAt || "")
  );

  // Group active journeys by route ID
  const routeGroupsMap = new Map<string, ActiveJourney[]>();
  freshJourneys.forEach((j) => {
    if (!routeGroupsMap.has(j.routeId)) {
      routeGroupsMap.set(j.routeId, []);
    }
    routeGroupsMap.get(j.routeId)!.push(j);
  });

  const activeRouteIds = Array.from(routeGroupsMap.keys());

  // "Live only" filter logic: Only show routes in dropdown that have live students
  const routesForDropdown = showLiveOnly
    ? allMasterRoutes.filter((r) => activeRouteIds.includes(r.id))
    : allMasterRoutes;

  const effectiveSelectedRouteId = selectedRouteFilter === "ALL" ? (activeRouteIds[0] || activeBusNumber) : selectedRouteFilter;

  // Calculate Crowd Metrics & Centroid Aggregation for Effective Route
  const routeMetrics = calculateRouteCrowdMetrics(
    effectiveSelectedRouteId,
    activeJourneys,
    [],
    allStops,
    isRealMode
  );

  const displayStops = activeRouteStops.length > 0 ? activeRouteStops : allStops.slice(0, 8);

  // Determine current stop from aggregated centroid if available
  let matchedStop = displayStops[0] || allStops[0] || { id: "gajuwaka", name: "Gajuwaka", lat: 17.69029, lng: 83.22383 };

  if (routeMetrics.aggregatedPosition) {
    const aggLat = routeMetrics.aggregatedPosition.latitude;
    const aggLng = routeMetrics.aggregatedPosition.longitude;

    // Match centroid against route stops
    let minDistance = Infinity;
    for (const stop of displayStops) {
      const dist = calculateDistanceKm(aggLat, aggLng, stop.lat, stop.lng);
      if (dist < minDistance) {
        minDistance = dist;
        matchedStop = stop;
      }
    }
  } else {
    const found = displayStops.find((s) => s.id === currentStopId);
    if (found) matchedStop = found;
  }

  const currentStopIndex = Math.max(0, displayStops.findIndex((s) => s.id === matchedStop.id));

  // Manual Refresh Handler
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setLastRefreshedTime(
      new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
    );

    if (onRefreshLiveData) {
      onRefreshLiveData();
    }

    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  // Crowd Level Vote Handler
  const handleCrowdVote = (level: CrowdLevel) => {
    if (hasCrowdVoted) return;
    const prev = userCrowdVote;
    const newTally = { ...crowdVoteTally };
    if (prev) newTally[prev] = Math.max(0, newTally[prev] - 1);
    newTally[level] = (newTally[level] || 0) + 1;
    setCrowdVoteTally(newTally);
    setUserCrowdVote(level);
    setHasCrowdVoted(true);
    if (onVoteCrowd) onVoteCrowd(level);
  };

  // Majority crowd level from tally
  const majorityLevel: CrowdLevel = (Object.entries(crowdVoteTally) as [CrowdLevel, number][])
    .sort((a, b) => b[1] - a[1])[0][0];

  const totalCrowdVotes = Object.values(crowdVoteTally).reduce((a, b) => a + b, 0);

  const getStatusBadgeStyle = (statusTag: string) => {
    switch (statusTag) {
      case "LIVE":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      case "LIMITED DATA":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  return (
    <div className="space-y-4 pb-28 max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl mx-auto px-3 sm:px-6 pt-3 font-sans">
      {/* MODE BANNER */}
      {isSimulating ? (
        <div className="bg-purple-950/90 border border-purple-500/50 rounded-2xl p-3 flex items-center justify-between text-xs text-purple-200 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping"></span>
            <span className="font-extrabold uppercase">DEMO MODE — SIMULATED STUDENT SENSOR NETWORK</span>
          </div>
          <span className="text-[10px] text-purple-300 font-bold bg-purple-900/60 px-2 py-0.5 rounded border border-purple-500/30">
            DEMO DATA
          </span>
        </div>
      ) : (
        <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-2xl p-3 flex items-center justify-between text-xs text-emerald-200 shadow-lg">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="font-extrabold uppercase">REAL MODE — REAL STUDENT GPS TELEMETRY</span>
          </div>
          <span className="text-[10px] text-emerald-300 font-bold bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-500/30">
            LIVE PHONES
          </span>
        </div>
      )}

      {/* TOP CONTROLS BAR (ROUTE FILTER, LIVE ONLY TOGGLE & REFRESH) */}
      <div className="glass-card rounded-2xl p-3 border border-indigo-500/30 space-y-2 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Zap className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-xs font-bold text-white shrink-0">Filter Route:</span>
            <select
              value={selectedRouteFilter}
              onChange={(e) => setSelectedRouteFilter(e.target.value)}
              className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-700 outline-none focus:border-indigo-500 transition-all flex-1 min-w-0 truncate"
            >
              <option value="ALL">ALL ACTIVE ROUTES ({activeRouteIds.length})</option>
              {routesForDropdown.map((r) => (
                <option key={r.id} value={r.id}>
                  Route {r.name} ({r.origin} → {r.destination})
                  {activeRouteIds.includes(r.id) ? " 🟢 LIVE" : ""}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleManualRefresh}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>REFRESH</span>
          </button>
        </div>

        {/* LIVE ONLY FILTER TOGGLE */}
        <button
          onClick={() => {
            setShowLiveOnly((v) => !v);
            if (!showLiveOnly) setSelectedRouteFilter("ALL"); // reset when toggling on
          }}
          className={`w-full py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 border transition-all ${
            showLiveOnly
              ? "bg-emerald-600 border-emerald-400 text-white shadow-md"
              : "bg-slate-900/80 border-slate-700 text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300"
          }`}
        >
          {showLiveOnly ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>
            {showLiveOnly
              ? `SHOWING LIVE BUSES ONLY (${activeRouteIds.length} active)`
              : "SHOW ONLY LIVE BUSES (where students are travelling)"}
          </span>
          {showLiveOnly && <span className="ml-auto w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>}
        </button>

        {showLiveOnly && activeRouteIds.length === 0 && (
          <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>No live buses detected right now. Students may not be travelling yet.</span>
          </div>
        )}
      </div>

      {/* AGGREGATED BUS TELEMETRY STATUS CARD */}
      <div className="glass-card rounded-3xl p-4 sm:p-5 border border-indigo-500/40 bg-gradient-to-br from-slate-900/90 via-indigo-950/40 to-slate-950 shadow-2xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-xl bg-indigo-600 text-white font-black text-xs">
              BUS {effectiveSelectedRouteId}
            </span>
            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${getStatusBadgeStyle(
                routeMetrics.liveStatus
              )}`}
            >
              {routeMetrics.liveStatus}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-medium">Last updated</span>
            <span className="text-xs font-extrabold text-indigo-300">{lastRefreshedTime}</span>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-black text-white tracking-tight">
            Approximate Live Location: <span className="text-emerald-300">{matchedStop.name} Area</span>
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            {routeMetrics.statusMessage}
          </p>
        </div>

        {/* Telemetry Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-slate-950/70 p-2.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-semibold truncate flex items-center justify-center gap-1">
              <Users className="w-3 h-3 text-indigo-400" />
              Live Students
            </span>
            <span className="font-black text-white text-sm mt-0.5 block">
              {routeMetrics.activeCount}
            </span>
          </div>

          <div className="bg-slate-950/70 p-2.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-semibold truncate flex items-center justify-center gap-1">
              <Flame className="w-3 h-3 text-rose-400" />
              Crowd Level
            </span>
            <span className="font-extrabold text-rose-400 text-xs mt-0.5 block">
              {routeMetrics.activeCount > 0 ? routeMetrics.crowdLevel : "NO DATA"}
            </span>
          </div>

          <div className="bg-slate-950/70 p-2.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-semibold truncate flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Confidence
            </span>
            <span
              className={`font-black text-xs mt-0.5 block ${
                routeMetrics.confidence === "HIGH" ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {routeMetrics.confidence}
            </span>
          </div>
        </div>
      </div>

      {/* CROWD LEVEL VOTING PANEL */}
      <div className="glass-card rounded-3xl p-4 sm:p-5 border border-purple-500/40 bg-gradient-to-br from-slate-900/90 via-purple-950/30 to-slate-950 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-white">Crowd Level Vote</h4>
              <p className="text-[11px] text-slate-400">Vote to help others know how packed the bus is</p>
            </div>
          </div>
          <span className="text-xs font-extrabold text-purple-300 bg-purple-500/20 px-2.5 py-1 rounded-xl border border-purple-500/30">
            {totalCrowdVotes} Votes
          </span>
        </div>

        {/* Majority Result Banner */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
          <span className="text-slate-400 font-semibold">Community Majority:</span>
          <span className={`font-extrabold ${
            majorityLevel === "LOW" ? "text-emerald-300" :
            majorityLevel === "MEDIUM" ? "text-amber-300" :
            majorityLevel === "HIGH" ? "text-orange-300" : "text-rose-300"
          }`}>
            {getCrowdEmoji(majorityLevel)} {majorityLevel}
          </span>
        </div>

        {/* Voting Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CROWD_LEVELS.map((level) => {
            const voteCount = crowdVoteTally[level] || 0;
            const pct = totalCrowdVotes > 0 ? Math.round((voteCount / totalCrowdVotes) * 100) : 0;
            const isSelected = userCrowdVote === level;
            return (
              <button
                key={level}
                onClick={() => handleCrowdVote(level)}
                disabled={hasCrowdVoted}
                className={`flex flex-col items-center gap-1 p-3 rounded-2xl border text-xs font-extrabold transition-all ${getCrowdStyle(level, isSelected)} ${hasCrowdVoted ? "cursor-default" : "cursor-pointer"}`}
              >
                <span className="text-xl">{getCrowdEmoji(level)}</span>
                <span className="text-[11px] font-black">{level}</span>
                <span className="text-[10px] font-semibold opacity-80">{pct}% ({voteCount})</span>
                {isSelected && (
                  <span className="text-[9px] font-black bg-white/20 px-1.5 py-0.5 rounded-full">YOUR VOTE</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Vote Bar Chart */}
        <div className="space-y-1.5">
          {CROWD_LEVELS.map((level) => {
            const voteCount = crowdVoteTally[level] || 0;
            const pct = totalCrowdVotes > 0 ? Math.round((voteCount / totalCrowdVotes) * 100) : 0;
            const barColor = level === "LOW" ? "bg-emerald-500" : level === "MEDIUM" ? "bg-amber-500" : level === "HIGH" ? "bg-orange-500" : "bg-rose-500";
            return (
              <div key={level} className="flex items-center gap-2 text-[10px]">
                <span className="w-16 text-slate-400 font-semibold shrink-0">{level}</span>
                <div className="flex-1 bg-slate-900 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-8 text-right text-slate-400 font-bold shrink-0">{pct}%</span>
              </div>
            );
          })}
        </div>

        {hasCrowdVoted && (
          <div className="flex items-center gap-2 p-2 rounded-xl bg-purple-950/50 border border-purple-500/30 text-[11px] text-purple-300">
            <ThumbsUp className="w-3.5 h-3.5 shrink-0 fill-current" />
            <span>Thanks for voting! Your contribution helps other students.</span>
          </div>
        )}
      </div>

      {/* LEAFLET MAP WITH AGGREGATED BUS CENTROID MARKER */}
      <div className="glass-card rounded-3xl p-4 border border-indigo-500/30 overflow-hidden relative space-y-3 shadow-xl">
        <div className="flex items-center justify-between text-xs z-10 relative">
          <span className="font-extrabold text-white flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-indigo-400" />
            Live Crowd Centroid Radar
          </span>
          <span className="text-[10px] text-indigo-300 font-semibold bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">
            Privacy Protected Marker
          </span>
        </div>

        <LeafletMap
          currentStopLat={routeMetrics.aggregatedPosition ? routeMetrics.aggregatedPosition.latitude : matchedStop.lat}
          currentStopLng={routeMetrics.aggregatedPosition ? routeMetrics.aggregatedPosition.longitude : matchedStop.lng}
          currentStopName={matchedStop.name}
          activeStudentCount={routeMetrics.activeCount}
          activeRouteStops={displayStops}
          activeBusNumber={effectiveSelectedRouteId}
          userLat={userLat}
          userLng={userLng}
          isUserOnboard={isUserOnboard}
        />
      </div>

      {/* DYNAMIC ROUTE PATH TIMELINE (UPDATES AUTOMATICALLY BELOW MAP) */}
      <div className="glass-card rounded-3xl p-4 sm:p-5 border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-indigo-400" />
            Route {effectiveSelectedRouteId} Path Trajectory ({displayStops.length} Stops)
          </h3>
          <span className="text-[10px] text-emerald-300 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            Current Area: {matchedStop.name}
          </span>
        </div>

        <div className="relative pl-6 space-y-4 pt-1">
          <div className="absolute top-2 bottom-2 left-2.5 w-0.5 bg-gradient-to-b from-indigo-500 via-purple-500 to-emerald-500 rounded"></div>

          {displayStops.map((stop, index) => {
            const isPassed = index < currentStopIndex;
            const isCurrent = index === currentStopIndex;

            return (
              <div key={stop.id} className="relative flex flex-wrap items-center justify-between gap-2">
                <div
                  className={`absolute -left-[21px] w-5 h-5 rounded-full border-2 flex items-center justify-center z-10 ${
                    isCurrent
                      ? "bg-indigo-600 border-white text-white shadow-lg shadow-indigo-500/50"
                      : isPassed
                      ? "bg-emerald-500 border-emerald-300 text-slate-950"
                      : "bg-slate-900 border-slate-700 text-slate-500"
                  }`}
                >
                  {isCurrent ? (
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                  ) : isPassed ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-950"></span>
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                  )}
                </div>

                <div className="ml-2 min-w-0 flex-1">
                  <span
                    className={`text-xs font-bold block truncate ${
                      isCurrent
                        ? "text-indigo-300 text-sm font-extrabold"
                        : isPassed
                        ? "text-slate-400 line-through decoration-slate-600"
                        : "text-slate-200"
                    }`}
                  >
                    {stop.name}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    {stop.address || "Duvvada Corridor Stop"}
                  </span>
                </div>

                {isCurrent && (
                  <span className="px-2.5 py-0.5 rounded-xl bg-indigo-600 text-white text-[10px] font-black animate-pulse shrink-0 shadow-md">
                    🚌 BUS HERE
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* OTHER ACTIVE ROUTES SUMMARY */}
      {activeRouteIds.length > 0 && (
        <div className="glass-card rounded-3xl p-4 border border-slate-800 space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
            Other Active Route Sensor Networks:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {activeRouteIds.map((rId) => {
              const count = (routeGroupsMap.get(rId) || []).length;
              return (
                <button
                  key={rId}
                  onClick={() => setSelectedRouteFilter(rId)}
                  className={`p-2.5 rounded-2xl border text-xs flex items-center justify-between transition-all ${
                    effectiveSelectedRouteId === rId
                      ? "bg-indigo-600 text-white border-indigo-400 font-bold"
                      : "bg-slate-900/60 text-slate-300 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <span className="font-extrabold">Bus {rId}</span>
                  <span className="text-[10px] font-semibold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    👥 {count} Student{count > 1 ? "s" : ""} ({count >= MIN_LIVE_STUDENTS ? "LIVE" : "LIMITED"})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
