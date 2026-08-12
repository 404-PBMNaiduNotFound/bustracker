import React from "react";
import { Navigation, Radio, Play, Square, Database } from "lucide-react";

interface HeaderProps {
  isSimulating: boolean;
  onToggleSimulation: () => void;
  onRunSeeder: () => void;
  activeTab: string;
}

export const Header: React.FC<HeaderProps> = ({
  isSimulating,
  onToggleSimulation,
  onRunSeeder,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-6 py-2.5">
      <div className="max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2">
        {/* Brand Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <Navigation className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-white truncate">
                RouteReach
              </h1>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                Live GPS
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
              Smart College Commute Assistant
            </p>
          </div>
        </div>

        {/* Demo Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRunSeeder}
            title="Seed Firebase Database"
            className="p-1.5 sm:p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-indigo-400 transition-colors"
          >
            <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <button
            onClick={onToggleSimulation}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold transition-all shadow-md ${
              isSimulating
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-rose-950/50"
                : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-900/40"
            }`}
          >
            {isSimulating ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current animate-pulse" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Simulate GPS</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Destination Fixed Banner */}
      <div className="max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl mx-auto mt-2 flex flex-wrap items-center justify-between gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800/60 text-[11px] sm:text-xs">
        <div className="flex items-center gap-1.5 text-slate-300 flex-wrap min-w-0">
          <Radio className="w-3 h-3 text-emerald-400 animate-pulse shrink-0" />
          <span>Destination Fixed:</span>
          <span className="font-semibold text-emerald-300 truncate">
            Duvvada / Kompallaju College
          </span>
        </div>
        <span className="text-[9px] sm:text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
          Firestore Realtime
        </span>
      </div>
    </header>
  );
};
