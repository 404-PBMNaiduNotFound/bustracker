import React, { useState } from "react";
import {
  Database,
  Play,
  Square,
  Award,
  Clock,
  Navigation,
  SlidersHorizontal,
  CheckCircle2,
  Edit3,
} from "lucide-react";

const COLLEGE_TIMING_PRESETS = [
  "08:00 AM",
  "08:30 AM",
  "08:45 AM",
  "09:00 AM",
  "09:30 AM",
  "12:00 PM",
  "01:00 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "05:00 PM",
];

interface ProfileTabProps {
  isSimulating: boolean;
  onToggleSimulation: () => void;
  onRunSeeder: () => void;
  boardingPoint: string;
  confirmedCount: number;
  targetCollegeTime: string;
  onSelectTargetTime: (time: string) => void;
  gpsPermissionGranted: boolean;
  onRequestGps: () => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  isSimulating,
  onToggleSimulation,
  onRunSeeder,
  boardingPoint,
  confirmedCount,
  targetCollegeTime,
  onSelectTargetTime,
  gpsPermissionGranted,
  onRequestGps,
}) => {
  const [customTimeInput, setCustomTimeInput] = useState<string>(targetCollegeTime || "08:45 AM");
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  const handleTimeSelect = (time: string) => {
    setCustomTimeInput(time);
    onSelectTargetTime(time);
  };

  return (
    <div className="space-y-4 pb-24 max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl mx-auto px-3 sm:px-6 pt-3 font-sans">
      {/* STUDENT PROFILE CARD */}
      <div className="glass-card rounded-3xl p-4 sm:p-5 border border-indigo-500/30 flex flex-wrap items-center gap-4 shadow-xl">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-lg sm:text-xl font-black shadow-lg shadow-indigo-500/30 shrink-0">
          VS
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base sm:text-lg font-black text-white truncate">
            Vignan Student Commuter
          </h2>
          <p className="text-xs text-indigo-300 font-medium truncate">
            Destination: Duvvada / College
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
              CSE - 2026
            </span>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
              Default Stop: {boardingPoint}
            </span>
          </div>
        </div>
      </div>

      {/* ENHANCED COLLEGE TARGET ARRIVAL TIME SETTING (SUPPORTS ANY TIME E.G. 03:00 PM) */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 border border-indigo-500/40 bg-slate-900/90 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <h3 className="text-sm font-black text-white">College Target Arrival Timing</h3>
              <p className="text-[11px] text-slate-400">
                Set any arrival time (e.g. 08:45 AM, 03:00 PM, 05:00 PM) to evaluate commute ETAs
              </p>
            </div>
          </div>
          <span className="text-xs font-black text-emerald-300 bg-emerald-500/20 px-3 py-1 rounded-xl border border-emerald-500/40 shadow-sm shrink-0">
            Target: {targetCollegeTime}
          </span>
        </div>

        {/* QUICK PRESET TIME BUTTONS */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
            Quick College Timing Presets:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {["08:45 AM", "09:00 AM", "01:00 PM", "03:00 PM"].map((time) => (
              <button
                key={time}
                onClick={() => handleTimeSelect(time)}
                className={`py-2 px-2.5 rounded-xl text-xs font-extrabold border transition-all ${
                  targetCollegeTime === time
                    ? "bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-950 scale-[1.02]"
                    : "bg-slate-900 text-slate-300 border-slate-800 hover:border-indigo-500/50"
                }`}
              >
                {time}
              </button>
            ))}
          </div>
        </div>

        {/* CUSTOM TIME ENTRY INPUT OR FULL DROPDOWN */}
        <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
              Set Any Custom College Target Time:
            </label>
            <button
              onClick={() => setIsCustomMode(!isCustomMode)}
              className="text-[10px] text-amber-300 hover:underline flex items-center gap-1 font-bold"
            >
              <Edit3 className="w-3 h-3" />
              {isCustomMode ? "Select Preset Dropdown" : "Type Custom Time"}
            </button>
          </div>

          {isCustomMode ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customTimeInput}
                onChange={(e) => {
                  setCustomTimeInput(e.target.value);
                  onSelectTargetTime(e.target.value);
                }}
                placeholder="e.g. 03:00 PM or 03:15 PM"
                className="flex-1 bg-slate-900 text-amber-300 text-xs font-black px-3.5 py-2.5 rounded-xl border border-amber-500/50 outline-none focus:border-amber-400 transition-all placeholder:text-slate-600"
              />
              <button
                onClick={() => handleTimeSelect(customTimeInput)}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all"
              >
                Update
              </button>
            </div>
          ) : (
            <select
              value={targetCollegeTime}
              onChange={(e) => handleTimeSelect(e.target.value)}
              className="w-full bg-slate-900 text-amber-300 text-xs font-black px-3.5 py-2.5 rounded-xl border border-amber-500/40 outline-none focus:border-amber-400 transition-all cursor-pointer"
            >
              {COLLEGE_TIMING_PRESETS.map((t) => (
                <option key={t} value={t}>
                  🎓 College Target: {t}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="bg-indigo-950/40 p-3 rounded-xl border border-indigo-500/20 text-xs text-indigo-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Active target set to <strong className="text-white font-extrabold">{targetCollegeTime}</strong>. All route recommendations evaluate arrival risk against this target.
          </span>
        </div>
      </div>

      {/* LOCATION PERMISSION STATUS */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-white">Device Location Permission</h3>
          </div>
          <span
            className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
              gpsPermissionGranted
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                : "bg-amber-500/20 text-amber-300 border-amber-500/40"
            }`}
          >
            {gpsPermissionGranted ? "GRANTED" : "NOT GRANTED"}
          </span>
        </div>

        <p className="text-[11px] text-slate-400">
          Continuous GPS tracking allows automatic stop detection without manual check-ins.
        </p>

        <button
          onClick={onRequestGps}
          className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
        >
          <Navigation className="w-3.5 h-3.5 text-indigo-400" />
          <span>{gpsPermissionGranted ? "Re-Check GPS Signal" : "Grant Device Location Permission"}</span>
        </button>
      </div>

      {/* TODAY'S COMMUTE CONTRIBUTIONS */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-400 shrink-0" />
            Commute Activity Summary
          </h3>
          <span className="text-[10px] text-emerald-400 font-bold">Verified Commuter</span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block truncate">Route Confirmations</span>
            <span className="text-sm font-extrabold text-indigo-400 block mt-0.5">
              {confirmedCount} votes logged
            </span>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block truncate">Destination</span>
            <span className="text-xs font-extrabold text-emerald-300 block mt-0.5 truncate">
              Duvvada / College
            </span>
          </div>
        </div>
      </div>

      {/* DEMO MODE SUITE */}
      <div className="glass-card rounded-3xl p-4 sm:p-5 border border-indigo-500/40 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">
                Demo & Simulation Controller
              </h3>
              <p className="text-[10px] text-slate-400">
                Simulate live student GPS flow on a single device
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30 font-bold shrink-0">
            DEMO MODE
          </span>
        </div>

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
                <span>Stop Demo Simulation</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current shrink-0" />
                <span>Start Demo Mode (Simhachalam → Duvvada)</span>
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
      </div>
    </div>
  );
};
