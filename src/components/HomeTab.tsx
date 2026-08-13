import React from "react";
import {
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ThumbsUp,
  Flame,
  ShieldCheck,
  Navigation,
  Compass,
  GitFork,
  Zap,
  MapPin,
  Calendar,
  Layers,
  Footprints,
} from "lucide-react";
import { Stop, Route, RouteStopOrder, CrowdLevel, DiscoveredPath, ETAPrediction } from "../types";
import { LocationSearchForm } from "./LocationSearchForm";
import { DemoControlPanel } from "./DemoControlPanel";

interface HomeTabProps {
  currentStopName: string;
  boardingPoint: string;
  onSelectBoardingPoint: (point: string) => void;
  onRequestGps: () => void;
  gpsPermissionGranted: boolean;
  gpsPermissionError: string | null;
  userLat?: number | null;
  userLng?: number | null;
  isUserOnboard?: boolean;
  userStatusMessage?: string;
  activeBusNumber?: string;
  activeStudentCount: number;
  crowdLevel: CrowdLevel;
  onAdjustCrowd?: (level: CrowdLevel) => void;
  eta: ETAPrediction;
  routeOptions: DiscoveredPath[];
  confirmedCount: number;
  hasUserConfirmed: boolean;
  onConfirmBus: () => void;
  onNavigateToLive: () => void;
  onNavigateToRoutes: () => void;
  allStops: Stop[];
  allRoutes?: Route[];
  routeStops?: RouteStopOrder[];
  lastUpdatedSecondsAgo: number;
  targetCollegeTime: string;
  isSimulating: boolean;
  onApplyDemoSimulation?: (stopId: string, count: number, routeId: string, targetTime?: string) => void;
  onResetDemoSimulation?: () => void;
  onCollegeTimeChange?: (time: string) => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  currentStopName,
  boardingPoint,
  onSelectBoardingPoint,
  onRequestGps,
  gpsPermissionGranted,
  gpsPermissionError,
  userStatusMessage = "🚏 WAITING AT BOARDING STOP",
  activeBusNumber = "38Y",
  activeStudentCount,
  crowdLevel,
  onAdjustCrowd,
  routeOptions,
  confirmedCount,
  hasUserConfirmed,
  onConfirmBus,
  onNavigateToLive,
  onNavigateToRoutes,
  allStops,
  allRoutes = [],
  routeStops = [],
  targetCollegeTime,
  isSimulating,
  isUserOnboard = false,
  onApplyDemoSimulation,
  onResetDemoSimulation,
  onCollegeTimeChange,
}) => {
  // Top 5 Performance Limit (1 BEST OPTION + Top 4 Alternatives)
  const initialTopRoutes = routeOptions.slice(0, 5);
  const bestOption = initialTopRoutes.find((o) => o.isRecommended) || initialTopRoutes[0];
  const alternativeOptions = initialTopRoutes.filter((o) => o.pathId !== bestOption?.pathId);

  const getCrowdBadgeStyle = (level: CrowdLevel | "NO DATA") => {
    switch (level) {
      case "VERY HIGH":
      case "HIGH":
        return "bg-rose-500/20 text-rose-300 border-rose-500/40";
      case "MEDIUM":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      case "LOW":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  const getPriorityBadgeStyle = (statusTag: string) => {
    switch (statusTag) {
      case "LIVE":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      case "RECENT":
        return "bg-indigo-500/20 text-indigo-300 border-indigo-500/40";
      case "TRAFFIC-ADJUSTED":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/40";
      case "SCHEDULED":
        return "bg-sky-500/20 text-sky-300 border-sky-500/40";
      case "LIMITED DATA":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  return (
    <div className="space-y-4 pb-28 max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl mx-auto px-3 sm:px-6 pt-3 font-sans">
      {/* COLLAPSIBLE DEMO CONTROLS PANEL IN DEMO MODE */}
      {isSimulating && onApplyDemoSimulation && (
        <DemoControlPanel
          allStops={allStops}
          allRoutes={allRoutes}
          routeStops={routeStops}
          currentBoardingStopId={boardingPoint.toLowerCase().replace(/[^a-z0-9]/g, "_")}
          currentStudentCount={activeStudentCount}
          currentRouteId={activeBusNumber}
          targetCollegeTime={targetCollegeTime}
          onApplyDemoParams={onApplyDemoSimulation}
          onResetDemo={onResetDemoSimulation || (() => {})}
          onCollegeTimeChange={onCollegeTimeChange}
        />
      )}

      {/* CLEAR BOARDING LOCATION HEADER BANNER */}
      <div className="glass-card rounded-3xl p-4 sm:p-5 border border-indigo-500/40 bg-gradient-to-br from-slate-900 via-indigo-950/50 to-slate-950 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-400 shrink-0 animate-bounce" style={{ animationDuration: "3s" }} />
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Current Location & Boarding
              </span>
              <h2 className="text-base sm:text-lg font-black text-white">
                Near {boardingPoint}
              </h2>
            </div>
          </div>

          <button
            onClick={onRequestGps}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all shrink-0"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Refetch GPS</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <div className="bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 block font-semibold">Boarding Stop</span>
              <strong className="text-white font-extrabold block truncate">{boardingPoint} (Detected from GPS)</strong>
            </div>
          </div>

          <div className="bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 block font-semibold">Destination</span>
              <strong className="text-emerald-300 font-extrabold block truncate">Duvvada / College (Target: {targetCollegeTime})</strong>
            </div>
          </div>
        </div>
      </div>

      {/* LOCATION SEARCH & BOARDING STOP SELECTOR FORM */}
      <LocationSearchForm
        allStops={allStops}
        selectedBoardingPoint={boardingPoint}
        onSelectLocation={onSelectBoardingPoint}
        isSimulating={isSimulating}
      />

      {/* BEST OPTION HERO CARD */}
      {bestOption && (
        <div className="glass-card rounded-3xl p-4 sm:p-6 border border-indigo-500/50 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 shadow-2xl relative overflow-hidden space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black shrink-0">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>⭐ BEST OPTION TO REACH COLLEGE</span>
            </div>
            <span
              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded border uppercase ${getPriorityBadgeStyle(
                bestOption.priorityTag || bestOption.liveStatus
              )}`}
            >
              {bestOption.scheduledStatusText || bestOption.priorityTag || bestOption.liveStatus}
            </span>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {bestOption.pathSummary}
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Board at <span className="text-indigo-300 font-extrabold">{boardingPoint}</span>. {bestOption.summaryDetail || "Direct to Duvvada & College Gate."}
            </p>
          </div>

          {/* Timetable Schedule Info if SCHEDULED or LIVE */}
          {bestOption.departureFromBoardingTime && (
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">Scheduled Departure at Boarding</span>
                <span className="text-white font-extrabold">{bestOption.departureFromBoardingTime}</span>
              </div>
              {bestOption.waitingMinutes !== undefined && (
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-semibold">Waiting Time</span>
                  <span className="text-indigo-300 font-extrabold">{bestOption.waitingMinutes} mins</span>
                </div>
              )}
            </div>
          )}

          {/* Passenger & Crowd Level */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900/80 rounded-2xl p-3 border border-slate-800 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-base sm:text-lg font-extrabold text-white block">
                  {bestOption.activeStudentCount || activeStudentCount}
                </span>
                <span className="text-[10px] text-slate-400 block font-medium truncate">
                  Students travelling
                </span>
              </div>
            </div>

            <div className="bg-slate-900/80 rounded-2xl p-3 border border-slate-800 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-300 shrink-0">
                <Flame className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block font-medium">Crowd Level</span>
                <span
                  className={`text-xs font-extrabold px-2 py-0.5 rounded border inline-block mt-0.5 ${getCrowdBadgeStyle(
                    bestOption.crowdLevel
                  )}`}
                >
                  {bestOption.crowdLevel}
                </span>
              </div>
            </div>
          </div>

          {/* ETAs Box */}
          <div className="bg-gradient-to-r from-indigo-950/70 via-purple-950/50 to-slate-900/70 rounded-2xl p-4 border border-indigo-500/30 grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] sm:text-[11px] text-indigo-300 font-semibold block flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                ETA Duvvada / Hub
              </span>
              <span className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5 block truncate">
                {bestOption.predictedDuvvadaArrival}
              </span>
            </div>

            <div>
              <span className="text-[10px] sm:text-[11px] text-purple-300 font-semibold block flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                College Arrival
              </span>
              <span className="text-base sm:text-lg font-black text-emerald-300 tracking-tight mt-0.5 block truncate">
                {bestOption.predictedCollegeArrival}
              </span>
            </div>
          </div>

          {/* College Target Status Banner */}
          <div
            className={`flex flex-wrap items-center justify-between gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs font-semibold ${
              bestOption.status === "ON TIME"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {bestOption.status === "ON TIME" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="truncate">
                {bestOption.status === "ON TIME" ? "✓ ON TIME for College target" : `⚠️ ${bestOption.status}`}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium shrink-0">
              Target: {targetCollegeTime}
            </span>
          </div>

          {/* Action CTA */}
          <button
            onClick={onNavigateToLive}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all group"
          >
            <span>VIEW LIVE MAP & ROUTE RADAR</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}

      {/* TOP ALTERNATIVE ROUTES & LAST-MILE OPTIONS */}
      {alternativeOptions.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-400" />
              Alternative Routes & Last-Mile Options ({alternativeOptions.length})
            </h3>
            <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              Ranked by Risk
            </span>
          </div>

          <div className="space-y-2">
            {alternativeOptions.map((opt) => (
              <div key={opt.pathId} className="glass-card rounded-2xl p-3.5 border border-slate-800 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                    {opt.type === "LAST_MILE" && <Footprints className="w-4 h-4 text-purple-400 shrink-0" />}
                    {opt.pathSummary}
                  </span>
                  <span
                    className={`text-[9px] font-extrabold px-2 py-0.5 rounded border ${getPriorityBadgeStyle(
                      opt.priorityTag || opt.liveStatus
                    )}`}
                  >
                    {opt.scheduledStatusText || opt.priorityTag || opt.liveStatus}
                  </span>
                </div>

                {opt.summaryDetail && (
                  <p className="text-[11px] text-purple-300 font-medium bg-purple-950/40 p-2 rounded-xl border border-purple-500/20">
                    {opt.summaryDetail}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/80">
                  <span>
                    College Arrival: <strong className="text-emerald-300 font-extrabold">{opt.predictedCollegeArrival}</strong>
                  </span>
                  <span className={`font-bold ${opt.status === "ON TIME" ? "text-emerald-400" : "text-rose-400"}`}>
                    {opt.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* VIEW ALL ROUTES BUTTON */}
          <button
            onClick={onNavigateToRoutes}
            className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-indigo-500/30 text-xs font-extrabold flex items-center justify-center gap-2 transition-all shadow-md"
          >
            <span>[ VIEW ALL DISCOVERED ROUTES ({routeOptions.length}) ]</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STUDENT CONFIRMATION VOTE CARD WITH GPS VALIDATION STATUS */}
      <div className="glass-card rounded-2xl p-4 border border-indigo-500/40 bg-slate-900/90 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-white">Student Travel Contribution</h4>
              <p className="text-[11px] text-slate-400">Vote only when on the bus & co-located with boarding students</p>
            </div>
          </div>
          <span className="text-xs font-extrabold text-indigo-300 bg-indigo-500/20 px-2.5 py-1 rounded-xl border border-indigo-500/30">
            {confirmedCount} Claims Recorded
          </span>
        </div>

        {/* Vote Eligibility Status */}
        {!hasUserConfirmed && (
          <div className={`p-2 rounded-xl border text-xs flex items-center gap-2 ${
            isUserOnboard
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-amber-500/10 border-amber-500/30 text-amber-300"
          }`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              isUserOnboard ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
            }`}></span>
            <span className="font-semibold">
              {isUserOnboard
                ? `✓ You are ON BUS ${activeBusNumber} — Voting enabled`
                : `⚠️ Voting is only allowed once you board Bus ${activeBusNumber} at your starting stop`}
            </span>
          </div>
        )}

        {hasUserConfirmed && (
          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Your Signal Validation:</span>
            <span className="px-2.5 py-0.5 rounded-lg font-black text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              VERIFIED IN-TRANSIT
            </span>
          </div>
        )}

        <button
          onClick={onConfirmBus}
          disabled={hasUserConfirmed || !isUserOnboard}
          title={!isUserOnboard ? `Board Bus ${activeBusNumber} first at your boarding stop to enable voting` : undefined}
          className={`w-full py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-black tracking-wide flex items-center justify-center gap-2 transition-all shadow-xl ${
            hasUserConfirmed
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default"
              : !isUserOnboard
              ? "bg-slate-800/60 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60"
              : "bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500 hover:from-indigo-500 hover:to-emerald-400 text-white shadow-indigo-950 scale-[1.01]"
          }`}
        >
          <ThumbsUp className={`w-4 h-4 ${hasUserConfirmed || isUserOnboard ? "fill-current" : ""}`} />
          <span>
            {hasUserConfirmed
              ? `TRAVELLING ON BUS ${activeBusNumber} (VERIFIED) ✓`
              : !isUserOnboard
              ? `Board Bus ${activeBusNumber} to Vote (Not On Bus Yet)`
              : `+ I'M TRAVELLING ON BUS ${activeBusNumber} NOW`}
          </span>
        </button>
      </div>
    </div>
  );
};
