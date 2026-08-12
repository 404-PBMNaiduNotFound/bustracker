import React from "react";
import {
  Radio,
  CheckCircle,
  ShieldCheck,
} from "lucide-react";
import { Stop, CrowdLevel } from "../types";
import { LeafletMap } from "./LeafletMap";
import { calculateDistanceKm } from "../lib/gpsEngine";

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
  userLat?: number | null;
  userLng?: number | null;
  isUserOnboard?: boolean;
}

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
  userLat,
  userLng,
  isUserOnboard = false,
}) => {
  // Use the exact active route stops sequence (e.g. 311 for Scindia, 111 for Tagarapuvalasa, 55Y for Simhachalam)
  const displayStops = activeRouteStops.length > 0 ? activeRouteStops : allStops.slice(0, 6);

  const currentStopIndex = Math.max(
    0,
    displayStops.findIndex((s) => s.id === currentStopId)
  );

  const matchedStop = displayStops.find((s) => s.id === currentStopId) || displayStops[0] || {
    lat: 17.6745,
    lng: 83.185,
    name: currentStopName,
  };

  const nextStopObj = displayStops[currentStopIndex + 1] || displayStops[currentStopIndex];

  // Dynamic Distance to Next Stop Calculation
  const distanceToNextKm =
    matchedStop && nextStopObj && matchedStop !== nextStopObj
      ? calculateDistanceKm(
          matchedStop.lat,
          matchedStop.lng,
          nextStopObj.lat,
          nextStopObj.lng
        ).toFixed(1)
      : "1.8";

  // Calculate cumulative distance along active route stops timeline
  let runningDistance = 0;
  const routeStopsTimeline = displayStops.map((stop, index) => {
    if (index > 0) {
      const prev = displayStops[index - 1];
      runningDistance += calculateDistanceKm(prev.lat, prev.lng, stop.lat, stop.lng);
    }
    return {
      id: stop.id,
      name: stop.name,
      distance: `${runningDistance.toFixed(1)} km`,
    };
  });

  const dynamicSpeedKmH = Math.round(
    28 + Math.sin(currentStopIndex * 1.5) * 8 + (activeStudentCount % 5)
  );

  return (
    <div className="space-y-4 pb-24 max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl mx-auto px-3 sm:px-6 pt-3">
      {/* LEAFLET INTERACTIVE REAL-TIME MAP */}
      <div className="glass-card rounded-3xl p-4 border border-indigo-500/30 overflow-hidden relative space-y-3">
        {/* Map Header Overlay */}
        <div className="flex flex-wrap items-center justify-between gap-2 z-10 relative">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-indigo-600 text-white font-black text-xs">
              BUS {activeBusNumber} ROUTE MAP
            </span>
            <span className="text-xs text-slate-300 font-semibold truncate">
              Original Corridor Trajectory
            </span>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1 shrink-0">
            <Radio className="w-3 h-3 animate-ping" />
            Active GPS Stream
          </span>
        </div>

        {/* Leaflet Real-time Map Canvas */}
        <LeafletMap
          currentStopLat={matchedStop.lat}
          currentStopLng={matchedStop.lng}
          currentStopName={currentStopName}
          activeStudentCount={activeStudentCount}
          activeRouteStops={displayStops}
          activeBusNumber={activeBusNumber}
          userLat={userLat}
          userLng={userLng}
          isUserOnboard={isUserOnboard}
        />

        {/* Dynamic Telemetry Panel */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block truncate">Calculated Speed</span>
            <span className="font-extrabold text-white">{dynamicSpeedKmH} km/h</span>
          </div>
          <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block truncate">Next Stop Dist</span>
            <span className="font-extrabold text-indigo-400">{distanceToNextKm} km</span>
          </div>
          <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block truncate">Crowd Level</span>
            <span className="font-extrabold text-rose-400">{crowdLevel}</span>
          </div>
        </div>
      </div>

      {/* STOP-BY-STOP ROUTE TIMELINE */}
      <div className="glass-card rounded-3xl p-4 sm:p-5 border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
            Bus {activeBusNumber} Original Stop Sequence ({displayStops.length} Stops)
          </h3>
          <span className="text-[10px] text-slate-400">
            Last update: {lastUpdatedSecondsAgo}s ago
          </span>
        </div>

        <div className="relative pl-6 space-y-4">
          {/* Vertical connecting timeline bar */}
          <div className="absolute top-2 bottom-2 left-2.5 w-0.5 bg-gradient-to-b from-indigo-500 via-purple-500 to-emerald-500 rounded"></div>

          {routeStopsTimeline.map((stop, index) => {
            const isPassed = index < currentStopIndex;
            const isCurrent = index === currentStopIndex;

            return (
              <div key={stop.id} className="relative flex flex-wrap items-center justify-between gap-2">
                {/* Node icon on vertical line */}
                <div
                  className={`absolute -left-[21px] w-5 h-5 rounded-full border-2 flex items-center justify-center z-10 ${
                    isCurrent
                      ? "bg-indigo-600 border-white text-white shadow-lg shadow-indigo-500/50"
                      : isPassed
                      ? "bg-emerald-500 border-emerald-300 text-slate-950"
                      : "bg-slate-900 border-slate-700 text-slate-500"
                  }`}
                >
                  {isPassed ? (
                    <CheckCircle className="w-3 h-3 fill-current" />
                  ) : isCurrent ? (
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                  )}
                </div>

                <div className="ml-2 min-w-0 flex-1">
                  <span
                    className={`text-xs font-bold block truncate ${
                      isCurrent
                        ? "text-indigo-300 text-sm"
                        : isPassed
                        ? "text-slate-400 line-through decoration-slate-600"
                        : "text-slate-200"
                    }`}
                  >
                    {stop.name}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    {stop.distance} from origin
                  </span>
                </div>

                {isCurrent && (
                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-extrabold animate-pulse shrink-0">
                    BUS HERE
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* CONFIRMATION / VOTING BANNER */}
      <div className="glass-card rounded-2xl p-3.5 border border-indigo-500/30 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0" />
          <div className="min-w-0">
            <span className="text-xs font-bold text-white block truncate">
              Confidence: High
            </span>
            <span className="text-[10px] text-slate-400 block truncate">
              {confirmedCount} student confirmations on route
            </span>
          </div>
        </div>
        <button
          onClick={onConfirmBus}
          disabled={hasUserConfirmed}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            hasUserConfirmed
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default"
              : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-950"
          }`}
        >
          {hasUserConfirmed ? "Voted ✓" : "+ Vote Bus"}
        </button>
      </div>
    </div>
  );
};
