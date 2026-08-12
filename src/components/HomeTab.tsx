import React, { useState } from "react";
import {
  Users,
  Clock,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  ThumbsUp,
  MapPin,
  Flame,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Navigation,
  Compass,
} from "lucide-react";
import { Stop, CrowdLevel, ETAPrediction, RouteOption } from "../types";

interface HomeTabProps {
  currentStopName: string;
  boardingPoint: string;
  onSelectBoardingPoint: (point: string) => void;
  onRequestGps: () => void;
  userLat?: number | null;
  userLng?: number | null;
  isUserOnboard?: boolean;
  isUserOnRoads?: boolean;
  userStatusMessage?: string;
  activeBusNumber?: string;
  activeStudentCount: number;
  crowdLevel: CrowdLevel;
  onAdjustCrowd: (level: CrowdLevel) => void;
  eta: ETAPrediction;
  alternativeRoute: RouteOption;
  confirmedCount: number;
  hasUserConfirmed: boolean;
  onConfirmBus: () => void;
  onNavigateToLive: () => void;
  onNavigateToRoutes: () => void;
  allStops: Stop[];
  lastUpdatedSecondsAgo: number;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  currentStopName,
  boardingPoint,
  onSelectBoardingPoint,
  onRequestGps,
  isUserOnboard = false,
  isUserOnRoads = true,
  userStatusMessage = "🚏 WAITING AT BOARDING STOP",
  activeBusNumber = "38Y",
  activeStudentCount,
  crowdLevel,
  onAdjustCrowd,
  eta,
  alternativeRoute,
  confirmedCount,
  hasUserConfirmed,
  onConfirmBus,
  onNavigateToLive,
  onNavigateToRoutes,
  lastUpdatedSecondsAgo,
}) => {
  const [showBoardingSelect, setShowBoardingSelect] = useState(false);

  const getCrowdBadgeStyle = (level: CrowdLevel) => {
    switch (level) {
      case "HIGH":
        return "bg-rose-500/20 text-rose-300 border-rose-500/40";
      case "MEDIUM":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      case "LOW":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    }
  };

  return (
    <div className="space-y-4 pb-28 max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl mx-auto px-3 sm:px-6 pt-3">
      {/* GPS AUTO LOCATION DETECTOR BANNER */}
      <div className="glass-card rounded-2xl p-3 sm:p-4 border border-indigo-500/40 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-950 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="p-2.5 rounded-xl bg-indigo-600 text-white shrink-0 shadow-md">
            <Compass className="w-5 h-5 animate-spin" style={{ animationDuration: '8s' }} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white">Device GPS Location</span>
              <span
                className={`text-[9px] px-2 py-0.5 rounded font-extrabold border ${
                  isUserOnboard
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                }`}
              >
                {userStatusMessage}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 truncate">
              Nearest Boarding: <strong className="text-indigo-300">{boardingPoint}</strong> (Suggested: Bus {activeBusNumber})
            </p>
          </div>
        </div>

        <button
          onClick={onRequestGps}
          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 shrink-0 transition-all"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Locate Me</span>
        </button>
      </div>

      {/* Boarding Point Manual Switcher Accordion */}
      <div className="glass-card rounded-2xl p-3 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs min-w-0">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-slate-400 block text-[10px]">Boarding Area</span>
            <span className="font-semibold text-slate-100 truncate block">
              {boardingPoint} (Bus {activeBusNumber})
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowBoardingSelect(!showBoardingSelect)}
          className="text-xs text-indigo-400 font-semibold px-2.5 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all shrink-0"
        >
          Change Stop
        </button>
      </div>

      {showBoardingSelect && (
        <div className="glass-card rounded-2xl p-3 border border-indigo-500/30 space-y-2 animate-in fade-in slide-in-from-top-2">
          <p className="text-xs font-semibold text-indigo-300">Select Boarding Point:</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              "Simhachalam",
              "RTC Complex",
              "NAD Junction",
              "Scindia",
              "Old Gajuwaka",
              "Kurmannapalem",
              "Steel Plant",
              "Pendurthi",
              "Tagarapuvalasa",
            ].map((stopName) => (
              <button
                key={stopName}
                onClick={() => {
                  onSelectBoardingPoint(stopName);
                  setShowBoardingSelect(false);
                }}
                className={`py-1.5 px-3 rounded-xl text-xs font-medium text-left border transition-all truncate ${
                  boardingPoint === stopName
                    ? "bg-indigo-600 text-white border-indigo-400"
                    : "bg-slate-900/60 text-slate-300 border-slate-800 hover:border-slate-700"
                }`}
              >
                {stopName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MAIN HOME HERO CARD */}
      <div className="glass-card rounded-3xl p-4 sm:p-6 border border-indigo-500/30 shadow-2xl shadow-indigo-950/40 relative overflow-hidden space-y-4">
        {/* Top Header Line */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-1.5 flex-wrap">
            <span>BUS {activeBusNumber}</span>
            <span className="text-indigo-400">→</span>
            <span>DUVVADA</span>
          </h2>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold live-beacon shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>LIVE</span>
          </div>
        </div>

        {/* Current Bus Location */}
        <div className="bg-slate-900/80 rounded-2xl p-3.5 border border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
              Bus Current Stop
            </span>
            <span className="text-base sm:text-lg font-bold text-white tracking-tight truncate block">
              {currentStopName}
            </span>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] text-slate-400 block flex items-center gap-1 justify-end">
              <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin" />
              Updated {lastUpdatedSecondsAgo}s ago
            </span>
            <span className="text-xs font-medium text-indigo-300 flex items-center gap-1 mt-0.5 justify-end">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              GPS Cluster Verified
            </span>
          </div>
        </div>

        {/* Student Count & Crowd Status Pill */}
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
          <div className="bg-slate-900/60 rounded-2xl p-3 border border-slate-800 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-lg font-extrabold text-white block">
                {activeStudentCount}
              </span>
              <span className="text-[11px] text-slate-400 block font-medium truncate">
                Students travelling
              </span>
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-2xl p-3 border border-slate-800 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-300 shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-xs font-semibold text-slate-400">Crowd:</span>
                <span
                  className={`text-xs font-extrabold px-2 py-0.5 rounded border transition-all ${getCrowdBadgeStyle(
                    crowdLevel
                  )}`}
                >
                  {crowdLevel}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5 font-medium truncate">
                {confirmedCount} verified confirmations
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Crowd Level Buttons */}
        <div className="bg-slate-900/70 p-2.5 rounded-2xl border border-slate-800/90 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-bold text-slate-400 pl-1 shrink-0">Select Crowd Level:</span>
          <div className="flex gap-1.5 flex-1 justify-end flex-wrap">
            {(["LOW", "MEDIUM", "HIGH"] as CrowdLevel[]).map((lvl) => (
              <button
                key={lvl}
                onClick={() => onAdjustCrowd(lvl)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  crowdLevel === lvl
                    ? "bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-950 scale-105"
                    : "bg-slate-950/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* ETAs Box */}
        <div className="bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900/60 rounded-2xl p-4 border border-indigo-500/30 grid grid-cols-2 gap-4">
          <div>
            <span className="text-[10px] sm:text-[11px] text-indigo-300 font-semibold block flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              ETA Duvvada
            </span>
            <span className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5 block truncate">
              {eta.duvvadaEta}
            </span>
          </div>

          <div>
            <span className="text-[10px] sm:text-[11px] text-purple-300 font-semibold block flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              ETA College
            </span>
            <span className="text-lg sm:text-xl font-black text-emerald-300 tracking-tight mt-0.5 block truncate">
              {eta.collegeEta}
            </span>
          </div>
        </div>

        {/* Reach On Time Status Banner */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">✓ You should reach on time</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium shrink-0">
            Based on {eta.observationCount} observations
          </span>
        </div>

        {/* Primary CTA Button */}
        <button
          onClick={onNavigateToLive}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all group"
        >
          <span>VIEW LIVE ROUTE MAP</span>
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* PROMINENT MAIN CONFIRMATION VOTE CALLOUT BUTTON */}
      <div className="glass-card rounded-2xl p-4 border border-indigo-500/40 bg-slate-900/90 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Student Confirmation Vote</h4>
              <p className="text-[11px] text-slate-400">
                {isUserOnRoads
                  ? "Verify active bus presence on NH-16 corridor"
                  : "Voting active when on NH-16 bus corridor"}
              </p>
            </div>
          </div>
          <span className="text-xs font-extrabold text-indigo-300 bg-indigo-500/20 px-2.5 py-1 rounded-xl border border-indigo-500/30">
            {confirmedCount} Votes Logged
          </span>
        </div>

        <button
          onClick={onConfirmBus}
          disabled={hasUserConfirmed || !isUserOnRoads}
          className={`w-full py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-black tracking-wide flex items-center justify-center gap-2 transition-all shadow-xl ${
            hasUserConfirmed
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default"
              : !isUserOnRoads
              ? "bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed opacity-60"
              : "bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500 hover:from-indigo-500 hover:to-emerald-400 text-white shadow-indigo-950 scale-[1.01]"
          }`}
        >
          <ThumbsUp className="w-4 h-4 fill-current" />
          <span>
            {hasUserConfirmed
              ? `CONFIRMED ON BUS ${activeBusNumber} ✓`
              : !isUserOnRoads
              ? "VOTE DISABLED (NOT ON CORRIDOR ROAD)"
              : `+ YES, I'M ON BUS ${activeBusNumber} NOW`}
          </span>
        </button>
      </div>

      {/* ALTERNATIVE ROUTE PREVIEW CARD */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            Alternative Route Option
          </span>
          <button
            onClick={onNavigateToRoutes}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-0.5 shrink-0"
          >
            Compare All <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white truncate">
              {alternativeRoute.pathSummary}
            </h4>
            <span className="text-[11px] text-slate-400 block mt-0.5 truncate">
              Transfer at Kurmannapalem Arch
            </span>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] text-slate-400 block">College ETA</span>
            <span className="text-sm font-extrabold text-amber-300">
              {alternativeRoute.collegeEta}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
