import React from "react";
import {
  Database,
  Play,
  Square,
  Award,
  Flame,
  SlidersHorizontal,
} from "lucide-react";
import { CrowdLevel } from "../types";

interface ProfileTabProps {
  isSimulating: boolean;
  onToggleSimulation: () => void;
  onRunSeeder: () => void;
  onAdjustCrowd: (level: CrowdLevel) => void;
  currentCrowdLevel: CrowdLevel;
  boardingPoint: string;
  confirmedCount: number;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  isSimulating,
  onToggleSimulation,
  onRunSeeder,
  onAdjustCrowd,
  currentCrowdLevel,
  boardingPoint,
  confirmedCount,
}) => {
  return (
    <div className="space-y-4 pb-24 max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl mx-auto px-3 sm:px-6 pt-3">
      {/* STUDENT PROFILE CARD */}
      <div className="glass-card rounded-3xl p-4 sm:p-5 border border-indigo-500/30 flex flex-wrap items-center gap-4">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-lg sm:text-xl font-black shadow-lg shadow-indigo-500/30 shrink-0">
          VS
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base sm:text-lg font-black text-white truncate">
            Vignan Student
          </h2>
          <p className="text-xs text-indigo-300 font-medium truncate">
            Duvvada / Kompallaju Campus
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
              CSE - 2026 Batch
            </span>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
              Default: {boardingPoint}
            </span>
          </div>
        </div>
      </div>

      {/* TODAY'S COMMUTE CONTRIBUTIONS */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-400 shrink-0" />
            Today's Commute Activity
          </h3>
          <span className="text-[10px] text-emerald-400 font-bold shrink-0">
            Active Commuter
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block truncate">GPS Signals Transmitted</span>
            <span className="text-sm sm:text-base font-extrabold text-white block">142 live updates</span>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block truncate">Route Confirmations</span>
            <span className="text-sm sm:text-base font-extrabold text-indigo-400 block">
              {confirmedCount} votes cast
            </span>
          </div>
        </div>
      </div>

      {/* DEMO CONTROLLER & SIMULATION SUITE */}
      <div className="glass-card rounded-3xl p-4 sm:p-5 border border-indigo-500/40 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">
                Demo & Simulation Suite
              </h3>
              <p className="text-[10px] text-slate-400">
                Test live Firestore synchronization
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30 font-bold shrink-0">
            DEMO MODE
          </span>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            onClick={onToggleSimulation}
            className={`w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md ${
              isSimulating
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-rose-950/50"
                : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-950"
            }`}
          >
            {isSimulating ? (
              <>
                <Square className="w-4 h-4 fill-current animate-pulse shrink-0" />
                <span>Stop Route Movement Simulation</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current shrink-0" />
                <span>Simulate Journey (Simhachalam → Duvvada)</span>
              </>
            )}
          </button>

          <button
            onClick={onRunSeeder}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-all"
          >
            <Database className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Re-Seed Firestore Master Database</span>
          </button>
        </div>

        {/* Crowd Simulation Controls */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <span className="text-[11px] text-slate-400 font-semibold block flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            Test Live Crowd Level Aggregation:
          </span>

          <div className="grid grid-cols-3 gap-2 text-xs">
            {(["LOW", "MEDIUM", "HIGH"] as CrowdLevel[]).map((level) => (
              <button
                key={level}
                onClick={() => onAdjustCrowd(level)}
                className={`py-2 rounded-xl font-bold border transition-all ${
                  currentCrowdLevel === level
                    ? "bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-950"
                    : "bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SYSTEM DATASET METRICS */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800 space-y-2">
        <h4 className="text-xs font-bold text-slate-300">
          Firestore System Architecture
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400">
          <div>• Seeded Stops: <strong className="text-slate-200">10 Master Stops</strong></div>
          <div>• Active Corridors: <strong className="text-slate-200">6 APSRTC Routes</strong></div>
          <div>• Stored Observations: <strong className="text-slate-200">24 History Logged</strong></div>
          <div>• Realtime Listeners: <strong className="text-emerald-400">Connected ✓</strong></div>
        </div>
      </div>
    </div>
  );
};
