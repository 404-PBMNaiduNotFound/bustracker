import React, { useState, useEffect } from "react";
import { Sliders, MapPin, Users, Route as RouteIcon, Play, RotateCcw, ChevronDown, ChevronUp, Sparkles, Clock, CheckCircle2, Edit3 } from "lucide-react";
import { Stop, Route, RouteStopOrder } from "../types";
import { getCandidateRoutesForStop } from "../services/routeMatcher";

export interface DemoPreset {
  id: string;
  name: string;
  locationId: string;
  locationName: string;
  studentCount: number;
  routeId: string;
  description: string;
  targetCollegeTime?: string;
}

export const DEMO_PRESETS: DemoPreset[] = [
  {
    id: "preset_1",
    name: "1. Kurmannapalem – Morning (8:45 AM)",
    locationId: "kurmannapalem",
    locationName: "Kurmannapalem",
    studentCount: 8,
    routeId: "38Y",
    description: "8 verified students travelling on 38Y -> High confidence LIVE bus position",
    targetCollegeTime: "08:45 AM",
  },
  {
    id: "preset_2",
    name: "2. Gajuwaka – Afternoon (03:00 PM)",
    locationId: "gajuwaka",
    locationName: "Gajuwaka",
    studentCount: 12,
    routeId: "38Y",
    description: "12 students across candidate buses -> 03:00 PM afternoon college target",
    targetCollegeTime: "03:00 PM",
  },
  {
    id: "preset_3",
    name: "3. Duvvada – Last Mile (09:00 AM)",
    locationId: "duvvada",
    locationName: "Duvvada Railway Station",
    studentCount: 7,
    routeId: "38Y",
    description: "Student at Duvvada station -> Walk/Auto last-mile option to College Gate",
    targetCollegeTime: "09:00 AM",
  },
  {
    id: "preset_4",
    name: "4. Evening Commute (05:00 PM)",
    locationId: "gajuwaka",
    locationName: "Gajuwaka",
    studentCount: 5,
    routeId: "38Y",
    description: "5 students -> Evening 05:00 PM target timing evaluation",
    targetCollegeTime: "05:00 PM",
  },
  {
    id: "preset_5",
    name: "5. No Students",
    locationId: "gajuwaka",
    locationName: "Gajuwaka",
    studentCount: 0,
    routeId: "38Y",
    description: "0 active students -> Timetable SCHEDULED ESTIMATE fallback",
    targetCollegeTime: "09:15 AM",
  },
];

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

interface DemoControlPanelProps {
  allStops: Stop[];
  allRoutes: Route[];
  routeStops?: RouteStopOrder[];
  currentBoardingStopId: string;
  currentStudentCount: number;
  currentRouteId: string;
  targetCollegeTime?: string;
  onApplyDemoParams: (stopId: string, count: number, routeId: string, targetTime?: string) => void;
  onResetDemo: () => void;
  onCollegeTimeChange?: (time: string) => void;
}

export const DemoControlPanel: React.FC<DemoControlPanelProps> = ({
  allStops,
  allRoutes,
  routeStops = [],
  currentBoardingStopId,
  currentStudentCount,
  currentRouteId,
  targetCollegeTime = "08:45 AM",
  onApplyDemoParams,
  onResetDemo,
  onCollegeTimeChange,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [selectedStopId, setSelectedStopId] = useState<string>(currentBoardingStopId || "gajuwaka");
  const [studentCount, setStudentCount] = useState<number>(currentStudentCount || 8);
  const [selectedRouteId, setSelectedRouteId] = useState<string>(currentRouteId || "38Y");
  const [selectedCollegeTime, setSelectedCollegeTime] = useState<string>(targetCollegeTime || "08:45 AM");
  const [isCustomTimeMode, setIsCustomTimeMode] = useState<boolean>(false);

  // Dynamically filter candidate routes serving the selected demo location
  const candidateRoutes = getCandidateRoutesForStop(selectedStopId, routeStops, allRoutes);
  const validRoutes = candidateRoutes.length > 0 ? candidateRoutes : allRoutes.filter((r) => r.isActive !== false);

  // Auto-adjust selected route if not serving the newly selected demo location
  useEffect(() => {
    if (validRoutes.length > 0 && !validRoutes.some((r) => r.id === selectedRouteId)) {
      setSelectedRouteId(validRoutes[0].id);
    }
  }, [selectedStopId, validRoutes, selectedRouteId]);

  const handleTimeUpdate = (newTime: string) => {
    setSelectedCollegeTime(newTime);
    if (onCollegeTimeChange) onCollegeTimeChange(newTime);
  };

  const handlePresetSelect = (preset: DemoPreset) => {
    setSelectedStopId(preset.locationId);
    setStudentCount(preset.studentCount);
    setSelectedRouteId(preset.routeId);
    const newTime = preset.targetCollegeTime || "08:45 AM";
    handleTimeUpdate(newTime);
    onApplyDemoParams(preset.locationId, preset.studentCount, preset.routeId, newTime);
  };

  const handleApply = () => {
    handleTimeUpdate(selectedCollegeTime);
    onApplyDemoParams(selectedStopId, studentCount, selectedRouteId, selectedCollegeTime);
  };

  return (
    <div className="glass-card rounded-3xl border border-purple-500/50 bg-gradient-to-br from-slate-900 via-purple-950/40 to-slate-950 shadow-2xl overflow-hidden font-sans">
      {/* PANEL COLLAPSIBLE HEADER */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between text-left bg-purple-950/60 hover:bg-purple-900/60 transition-all border-b border-purple-500/30"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-600 text-white shadow-md">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-purple-200 tracking-wider">
                🟣 HACKATHON DEMO CONTROLS
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded font-extrabold bg-purple-500/30 text-purple-200 border border-purple-400/40">
                ANY LOCATION & ANY TIME
              </span>
            </div>
            <p className="text-[11px] text-purple-300 font-medium">
              Simulate any location, candidate bus, student votes & any custom college target time (e.g. 03:00 PM)
            </p>
          </div>
        </div>

        <div className="p-1 rounded-lg bg-slate-900/80 text-purple-300">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* BODY CONTENT */}
      {isOpen && (
        <div className="p-4 sm:p-5 space-y-4 text-xs">
          {/* 1. QUICK SCENARIO PRESETS */}
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Quick Hackathon Presets (1-Click Judge Scenarios):
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEMO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset)}
                  className="p-2.5 rounded-2xl border text-left transition-all bg-slate-900/80 border-slate-800 hover:border-purple-500/60 hover:bg-purple-950/30 group"
                >
                  <span className="font-extrabold text-white group-hover:text-purple-300 block truncate">
                    {preset.name}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                    {preset.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-purple-500/20 pt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* 2. DEMO LOCATION SELECTOR */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-300 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                Select Boarding Location:
              </label>
              <select
                value={selectedStopId}
                onChange={(e) => setSelectedStopId(e.target.value)}
                className="w-full bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-xl border border-slate-700 outline-none focus:border-purple-500 transition-all truncate"
              >
                {allStops.map((s) => (
                  <option key={s.id} value={s.id}>
                    📍 {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. DEMO STUDENT VOTES / SIGNALS */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  Student Votes:
                </span>
                <span className="text-purple-300 font-extrabold">{studentCount} Signals</span>
              </label>
              <div className="flex items-center gap-1 pt-0.5">
                {[0, 1, 3, 5, 8, 12, 20].map((num) => (
                  <button
                    key={num}
                    onClick={() => setStudentCount(num)}
                    className={`flex-1 py-1.5 rounded-xl text-[10px] font-extrabold border transition-all ${
                      studentCount === num
                        ? "bg-purple-600 text-white border-purple-400 shadow-md"
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. DEMO TARGET BUS SELECTOR */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <RouteIcon className="w-3.5 h-3.5 text-emerald-400" />
                  Target Bus:
                </span>
                <span className="text-[9px] font-semibold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                  {validRoutes.length} Buses
                </span>
              </label>
              <select
                value={selectedRouteId}
                onChange={(e) => setSelectedRouteId(e.target.value)}
                className="w-full bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-xl border border-slate-700 outline-none focus:border-purple-500 transition-all truncate"
              >
                {validRoutes.map((r) => (
                  <option key={r.id} value={r.id}>
                    🚌 Bus {r.name} ({r.origin} → {r.destination})
                  </option>
                ))}
              </select>
            </div>

            {/* 5. COLLEGE TARGET TIMING (Supports ANY arbitrary time e.g. 03:00 PM / 3 PM) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  College Target Time:
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomTimeMode(!isCustomTimeMode)}
                  className="text-[9px] text-amber-300 hover:underline flex items-center gap-0.5 font-bold"
                >
                  <Edit3 className="w-2.5 h-2.5" />
                  {isCustomTimeMode ? "Select Preset" : "Custom Type"}
                </button>
              </div>

              {isCustomTimeMode ? (
                <input
                  type="text"
                  value={selectedCollegeTime}
                  onChange={(e) => handleTimeUpdate(e.target.value)}
                  placeholder="e.g. 03:00 PM or 03:15 PM"
                  className="w-full bg-slate-900 text-amber-300 text-xs font-black px-3 py-2 rounded-xl border border-amber-500/50 outline-none focus:border-amber-400 transition-all placeholder:text-slate-600"
                />
              ) : (
                <select
                  value={selectedCollegeTime}
                  onChange={(e) => handleTimeUpdate(e.target.value)}
                  className="w-full bg-slate-900 text-amber-300 text-xs font-black px-3 py-2 rounded-xl border border-amber-500/40 outline-none focus:border-amber-400 transition-all truncate"
                >
                  {COLLEGE_TIMING_PRESETS.map((t) => (
                    <option key={t} value={t}>
                      🎓 Target: {t}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* ACTIVE DEMO LOCATION & BUS SUMMARY BANNER */}
          <div className="bg-purple-950/40 p-2.5 rounded-2xl border border-purple-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="text-slate-300">
                Location: <strong className="text-white font-extrabold">{allStops.find((s) => s.id === selectedStopId)?.name || selectedStopId}</strong> • Target Bus: <strong className="text-emerald-300 font-extrabold">Bus {selectedRouteId}</strong> ({studentCount} signals) • College Target: <strong className="text-amber-300 font-extrabold">{selectedCollegeTime}</strong>
              </span>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleApply}
              className="flex-1 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-md shadow-purple-950 flex items-center justify-center gap-1.5 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>APPLY DEMO AT {allStops.find((s) => s.id === selectedStopId)?.name?.toUpperCase() || "LOCATION"} ({selectedCollegeTime})</span>
            </button>

            <button
              onClick={onResetDemo}
              className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-extrabold flex items-center gap-1.5 transition-all shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
