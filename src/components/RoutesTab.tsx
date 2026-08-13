import React, { useState } from "react";
import {
  Users,
  Flame,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Bus as BusIcon,
  GitBranch,
  MapPin,
  ThumbsUp,
  ChevronDown,
  ChevronUp,
  Navigation,
  AlertTriangle,
} from "lucide-react";
import { Stop, DiscoveredPath, Route, ActiveJourney, CrowdLevel } from "../types";
import { LocationSearchForm } from "./LocationSearchForm";
import { isJourneyFresh } from "../services/crowdService";

interface RoutesTabProps {
  options: DiscoveredPath[];
  boardingPoint: string;
  allStops?: Stop[];
  allMasterRoutes?: Route[];
  onSelectBoardingPoint?: (point: string) => void;
  activeJourneys?: ActiveJourney[];
  isSimulating?: boolean;
  hasUserConfirmed?: boolean;
  isUserOnboard?: boolean;
  onConfirmBus?: () => void;
}

export const RoutesTab: React.FC<RoutesTabProps> = ({
  options,
  boardingPoint,
  allStops = [],
  allMasterRoutes = [],
  onSelectBoardingPoint,
  activeJourneys = [],
  isSimulating = false,
  hasUserConfirmed = false,
  isUserOnboard = false,
  onConfirmBus,
}) => {
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);

  const recommended = options.find((o) => o.isRecommended) || options[0];

  const getStatusBadgeStyle = (statusTag: string) => {
    switch (statusTag) {
      case "LIVE":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      case "RECENT":
        return "bg-indigo-500/20 text-indigo-300 border-indigo-500/40";
      case "LIMITED DATA":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  /** Get current bus position info for a route from live active journeys */
  const getBusStatusForRoute = (routeId: string) => {
    // Pull only fresh IN_TRANSIT journeys for this route
    const busJourneys = activeJourneys.filter(
      (j) =>
        j.routeId === routeId &&
        j.journeyStatus === "IN_TRANSIT" &&
        isJourneyFresh(j.lastUpdated || j.lastLocationAt || "")
    );
    return busJourneys;
  };

  /** Build aggregated centroid position from journeys */
  const getAggregatedPosition = (journeys: ActiveJourney[]) => {
    const withGps = journeys.filter((j) => j.latitude && j.longitude);
    if (withGps.length === 0) return null;
    const avgLat = withGps.reduce((s, j) => s + (j.latitude || 0), 0) / withGps.length;
    const avgLng = withGps.reduce((s, j) => s + (j.longitude || 0), 0) / withGps.length;
    return { lat: avgLat, lng: avgLng };
  };

  /** Find nearest stop name from lat/lng */
  const getNearestStopName = (lat: number, lng: number): string => {
    if (!allStops.length) return "En Route";
    let best = allStops[0];
    let bestDist = Infinity;
    for (const s of allStops) {
      const dx = (s.lat - lat) * 110.574;
      const dy = (s.lng - lng) * 111.32 * Math.cos((lat * Math.PI) / 180);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist) {
        bestDist = dist;
        best = s;
      }
    }
    return best.name;
  };

  const toggleRoute = (pathId: string) => {
    setExpandedRouteId((prev) => (prev === pathId ? null : pathId));
  };

  return (
    <div className="space-y-4 pb-24 max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl mx-auto px-3 sm:px-6 pt-3 font-sans">
      {/* LOCATION SEARCH & FETCH FORM */}
      {allStops.length > 0 && onSelectBoardingPoint && (
        <LocationSearchForm
          allStops={allStops}
          selectedBoardingPoint={boardingPoint}
          onSelectLocation={onSelectBoardingPoint}
          isSimulating={isSimulating}
        />
      )}

      {/* RECOMMENDATION HIGHLIGHT BANNER */}
      {recommended && (
        <div className="glass-card rounded-3xl p-4 sm:p-6 border border-indigo-500/40 bg-gradient-to-br from-indigo-950/70 via-slate-900 to-slate-950 space-y-3 relative overflow-hidden shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-extrabold shrink-0">
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              <span>BEST RECOMMENDED ROUTE</span>
            </div>
            <span className="text-[10px] text-slate-400 shrink-0">
              Destination: Duvvada / College
            </span>
          </div>

          <div>
            <h2 className="text-lg sm:text-xl font-black text-white truncate">
              {recommended.pathSummary}
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Boarding at <span className="text-indigo-300 font-bold">{boardingPoint}</span>. Discovered dynamically from Firestore route graph using live student GPS signals and arrival observations.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 block">College Gate Arrival</span>
              <span className="text-base sm:text-lg font-black text-emerald-300">
                {recommended.predictedCollegeArrival}
              </span>
            </div>
            <span className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-extrabold shadow-md shrink-0">
              {recommended.badgeTag}
            </span>
          </div>
        </div>
      )}

      {/* DYNAMICALLY DISCOVERED GRAPH PATHS LIST */}
      <div className="space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 px-1 flex items-center gap-1.5">
          <GitBranch className="w-4 h-4 text-indigo-400" />
          Discovered Route Paths from {boardingPoint} ({options.length})
        </h3>

        {options.map((opt) => {
          const isExpanded = expandedRouteId === opt.pathId;

          // Live bus data for this route's primary segment
          const primaryRouteId = opt.segments[0]?.routeId || opt.pathId;
          const liveJourneys = getBusStatusForRoute(primaryRouteId);
          const hasBuses = liveJourneys.length > 0;
          const aggPos = getAggregatedPosition(liveJourneys);
          const busNearStop = aggPos ? getNearestStopName(aggPos.lat, aggPos.lng) : null;

          return (
            <div
              key={opt.pathId}
              className={`glass-card rounded-2xl border transition-all space-y-0 ${
                opt.isRecommended
                  ? "border-indigo-500/50 bg-slate-900/80 shadow-lg shadow-indigo-950/30"
                  : "border-slate-800 hover:border-slate-700 bg-slate-900/40"
              }`}
            >
              {/* Main Card Header — always visible */}
              <div className="p-4 space-y-3">
                {/* Header Badge & Status Tag */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        opt.type === "DIRECT"
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {opt.badgeTag}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${getStatusBadgeStyle(
                        opt.liveStatus
                      )}`}
                    >
                      {opt.liveStatus}
                    </span>
                  </div>

                  <span className="text-xs font-extrabold text-white shrink-0">
                    {opt.totalMinutesToCollege ? `${opt.totalMinutesToCollege} min total` : "Est time"}
                  </span>
                </div>

                {/* Path Summary */}
                <div>
                  <h4 className="text-sm sm:text-base font-extrabold text-white truncate">
                    {opt.pathSummary}
                  </h4>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      {opt.activeStudentCount > 0 ? `${opt.activeStudentCount} active students` : "No active students"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-rose-400" />
                      Crowd: <strong className="text-slate-200">{opt.crowdLevel}</strong>
                    </span>
                  </div>
                </div>

                {/* Timing breakdown */}
                <div className="bg-slate-950/70 rounded-xl p-3 border border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 block truncate">Duvvada Station</span>
                    <span className="text-xs font-bold text-slate-200 block truncate">
                      {opt.predictedDuvvadaArrival}
                    </span>
                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />

                  <div className="text-right min-w-0">
                    <span className="text-[10px] text-slate-400 block truncate">College Gate</span>
                    <span className="text-sm font-extrabold text-emerald-300 block truncate">
                      {opt.predictedCollegeArrival}
                    </span>
                  </div>
                </div>

                {/* SELECT / VIEW BUS STATUS BUTTON */}
                <button
                  onClick={() => toggleRoute(opt.pathId)}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all border ${
                    isExpanded
                      ? "bg-indigo-600 text-white border-indigo-400 shadow-lg"
                      : "bg-slate-950/80 text-indigo-300 border-indigo-500/40 hover:bg-indigo-950/60"
                  }`}
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{isExpanded ? "HIDE BUS STATUS" : "SELECT ROUTE — VIEW BUS STATUS"}</span>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
                </button>
              </div>

              {/* EXPANDED PANEL — Bus Position + Vote */}
              {isExpanded && (
                <div className="border-t border-slate-800 p-4 space-y-3 bg-slate-950/60 rounded-b-2xl">
                  {/* Route Segments Breakdown */}
                  <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Route Path Trajectory:
                    </span>
                    <div className="space-y-1 text-xs text-slate-300">
                      {opt.segments.map((seg, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-indigo-300">
                            Leg {idx + 1}: Bus {seg.routeName || seg.routeId}
                          </span>
                          <span className="text-slate-400">
                            {seg.fromStopName} → {seg.toStopName}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CURRENT BUS POSITION PANEL */}
                  <div className={`rounded-xl p-3 border space-y-2 ${
                    hasBuses
                      ? "bg-emerald-950/40 border-emerald-500/30"
                      : "bg-amber-950/40 border-amber-500/30"
                  }`}>
                    <div className="flex items-center gap-2">
                      <BusIcon className={`w-4 h-4 shrink-0 ${hasBuses ? "text-emerald-400" : "text-amber-400"}`} />
                      <span className={`text-xs font-extrabold ${hasBuses ? "text-emerald-300" : "text-amber-300"}`}>
                        {hasBuses ? "🚌 Live Bus Location Detected" : "⚠️ No Live Buses Found on This Route"}
                      </span>
                    </div>

                    {hasBuses ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 font-semibold flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-400" />
                            Current Bus Area:
                          </span>
                          <span className="text-white font-extrabold">{busNearStop || "En Route"}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 font-semibold flex items-center gap-1">
                            <Users className="w-3 h-3 text-indigo-400" />
                            Students On Bus:
                          </span>
                          <span className="text-indigo-300 font-extrabold">{liveJourneys.length} reporting</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 font-semibold">Signal Freshness:</span>
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block"></span>
                            LIVE (&lt;2 min old)
                          </span>
                        </div>
                        {aggPos && (
                          <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800">
                            Centroid: {aggPos.lat.toFixed(4)}°N, {aggPos.lng.toFixed(4)}°E
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-[11px] text-amber-300/80">
                          No students are currently broadcasting from this bus. Either no one has boarded yet, or GPS signals are stale.
                        </p>
                        <p className="text-[10px] text-slate-500">
                          You cannot vote without live bus data. Board the bus and submit your signal to contribute.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* VOTE BUTTON — Only when bus is live & student is onboard */}
                  <div className="space-y-2">
                    {!hasUserConfirmed && !hasBuses && (
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Vote is disabled — no buses present on this route right now.</span>
                      </div>
                    )}
                    {!hasUserConfirmed && hasBuses && !isUserOnboard && (
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-300">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>You must be ON the bus at your boarding stop to vote.</span>
                      </div>
                    )}

                    <button
                      onClick={onConfirmBus}
                      disabled={hasUserConfirmed || !hasBuses || !isUserOnboard}
                      className={`w-full py-3 px-4 rounded-xl text-xs font-black tracking-wide flex items-center justify-center gap-2 transition-all ${
                        hasUserConfirmed
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default"
                          : !hasBuses || !isUserOnboard
                          ? "bg-slate-800/40 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50"
                          : "bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500 hover:from-indigo-500 hover:to-emerald-400 text-white shadow-lg shadow-indigo-900/40"
                      }`}
                    >
                      <ThumbsUp className={`w-4 h-4 ${hasUserConfirmed || (hasBuses && isUserOnboard) ? "fill-current" : ""}`} />
                      <span>
                        {hasUserConfirmed
                          ? `✓ VOTED — TRAVELLING ON BUS ${opt.segments[0]?.routeId || primaryRouteId}`
                          : !hasBuses
                          ? "NO BUS PRESENT — CANNOT VOTE"
                          : !isUserOnboard
                          ? "BOARD BUS FIRST TO VOTE"
                          : `+ I'M ON BUS ${opt.segments[0]?.routeId || primaryRouteId} NOW`}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* DYNAMIC MASTER ROUTE NETWORK LOADED FROM FIRESTORE */}
      {allMasterRoutes.length > 0 && (
        <div className="glass-card rounded-3xl p-5 border border-indigo-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BusIcon className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                Master Firestore Routes Network ({allMasterRoutes.length} Routes)
              </h3>
            </div>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-bold border border-indigo-500/30">
              Firestore Source of Truth
            </span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {allMasterRoutes.map((r) => (
              <div key={r.id} className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-black">
                      {r.name}
                    </span>
                    <span className="truncate">{r.origin} ↔ {r.destination}</span>
                  </span>
                  <span className="text-[9px] font-extrabold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
                    {r.isDirectToDuvvada ? "Direct Duvvada" : "Feeder Route"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DATA ARCHITECTURE EXPLANATION */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Real-time Graph Architecture</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Routes without current live student GPS signals display <code className="text-amber-300">NO LIVE DATA</code> or <code className="text-amber-300">LIMITED DATA</code> instead of disappearing.
        </p>
      </div>
    </div>
  );
};
