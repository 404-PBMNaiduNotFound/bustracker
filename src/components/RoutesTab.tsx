import React from "react";
import {
  Users,
  Flame,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Zap,
  Bus as BusIcon,
  CheckCircle2,
} from "lucide-react";
import { RouteOption } from "../types";

interface RoutesTabProps {
  options: RouteOption[];
  boardingPoint: string;
  onSelectOption: (option: RouteOption) => void;
}

export const MASTER_CORRIDOR_CATALOGUE = [
  { id: "38Y", name: "38Y", desc: "RTC Complex ↔ Duvvada Railway Station", direct: "Direct Duvvada", stops: "RTC Complex → Gurudwara → NAD Junction → BHPV → Gajuwaka → Kurmannapalem → Duvvada" },
  { id: "111", name: "111", desc: "Tagarapuvalasa ↔ Duvvada / Kurmannapalem", direct: "Direct Duvvada", stops: "Tagarapuvalasa → Madhurawada → Zoo Park → Maddilapalem → NAD → Gajuwaka → Kurmannapalem → Duvvada" },
  { id: "311", name: "311", desc: "Scindia ↔ Chodavaram via Duvvada", direct: "Via Duvvada", stops: "Scindia → Gajuwaka → Kurmannapalem → Duvvada → Sabbavaram → Chodavaram" },
  { id: "55Y", name: "55Y", desc: "Duvvada Railway Station ↔ Simhachalam", direct: "Direct Duvvada", stops: "Duvvada → Kurmannapalem → Gajuwaka → NAD Junction → Gopalapatnam → Simhachalam" },
  { id: "55P", name: "55P", desc: "Duvvada Railway Station ↔ Pendurthi", direct: "Direct Duvvada", stops: "Duvvada → Kurmannapalem → Gajuwaka → NAD Junction → Vepagunta → Pendurthi" },
  { id: "400", name: "400", desc: "RTC Complex ↔ Rajeev Nagar / Kurmannapalem", direct: "Feeder / Transfer", stops: "RTC Complex → Railway Station → Scindia → Malkapuram → Gajuwaka → Kurmannapalem" },
  { id: "400Y", name: "400Y", desc: "RTC Complex ↔ Yelamanchili via Gajuwaka", direct: "Feeder / Transfer", stops: "RTC Complex → Railway Station → Scindia → Malkapuram → Gajuwaka → Kurmannapalem → Parawada → Achyutapuram → Yelamanchili" },
  { id: "500", name: "500", desc: "RTC Complex ↔ Anakapalli via Kurmannapalem", direct: "Feeder / Transfer", stops: "RTC Complex → Gurudwara → NAD Junction → Gajuwaka → Kurmannapalem → Steel Plant → Aganampudi → Anakapalli" },
  { id: "38K", name: "38K / 38", desc: "RTC Complex / Maddilapalem ↔ Kurmannapalem Area", direct: "Feeder / Transfer", stops: "RTC Complex → Maddilapalem → Gurudwara → NAD Junction → Gajuwaka → Kurmannapalem" },
  { id: "38RN", name: "38R/N", desc: "RTC Complex ↔ Steel Plant / Rajeev Nagar", direct: "Feeder / Transfer", stops: "RTC Complex → NAD Junction → Gajuwaka → Kurmannapalem → Steel Plant / Rajeev Nagar" },
];

export const RoutesTab: React.FC<RoutesTabProps> = ({
  options,
  boardingPoint,
}) => {
  const recommended = options.find((o) => o.isRecommended) || options[0];

  return (
    <div className="space-y-4 pb-24 max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl mx-auto px-3 sm:px-6 pt-3">
      {/* RECOMMENDATION HIGHLIGHT BANNER */}
      <div className="glass-card rounded-3xl p-4 sm:p-6 border border-indigo-500/40 bg-gradient-to-br from-indigo-950/70 via-slate-900 to-slate-950 space-y-3 relative overflow-hidden shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-extrabold shrink-0">
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>AI DECISION RECOMMENDATION</span>
          </div>
          <span className="text-[10px] text-slate-400 shrink-0">
            Destination: Duvvada Gate
          </span>
        </div>

        <div>
          <h2 className="text-lg sm:text-xl font-black text-white truncate">
            {recommended.pathSummary}
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Board at <span className="text-indigo-300 font-bold">{boardingPoint}</span>. Calculated based on live student GPS flow & historical observation database.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
          <div>
            <span className="text-[10px] text-slate-400 block">Est College Gate Arrival</span>
            <span className="text-base sm:text-lg font-black text-emerald-300">
              {recommended.collegeEta}
            </span>
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-extrabold shadow-md shrink-0">
            {recommended.badgeTag}
          </span>
        </div>
      </div>

      {/* DYNAMIC COMMUTE OPTIONS COMPARISON */}
      <div className="space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 px-1">
          Dynamic Commute Options ({options.length})
        </h3>

        {options.map((opt) => {
          const isRec = opt.isRecommended;
          return (
            <div
              key={opt.id}
              className={`glass-card rounded-2xl p-4 border transition-all space-y-3 ${
                isRec
                  ? "border-indigo-500/50 bg-slate-900/80 shadow-lg shadow-indigo-950/30"
                  : "border-slate-800 hover:border-slate-700 bg-slate-900/40"
              }`}
            >
              {/* Header Badge */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      opt.type === "DIRECT"
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        : opt.type === "TRANSFER"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    }`}
                  >
                    {opt.title}
                  </span>
                  {isRec && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                      <Sparkles className="w-3 h-3 text-emerald-400" /> Best Option
                    </span>
                  )}
                </div>

                <span className="text-xs font-extrabold text-white shrink-0">
                  {opt.totalMinutes} min total
                </span>
              </div>

              {/* Path & Bus numbers */}
              <div>
                <h4 className="text-sm sm:text-base font-extrabold text-white truncate">
                  {opt.pathSummary}
                </h4>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    {opt.activeStudents} students
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
                    {opt.duvvadaEta}
                  </span>
                </div>

                <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />

                <div className="text-right min-w-0">
                  <span className="text-[10px] text-slate-400 block truncate">College Gate</span>
                  <span className="text-sm font-extrabold text-emerald-300 block truncate">
                    {opt.collegeEta}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* SEEDED DUVVADA MASTER ROUTE CATALOGUE (10 ROUTES) */}
      <div className="glass-card rounded-3xl p-5 border border-indigo-500/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BusIcon className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
              Seeded Master Corridors (10 Routes)
            </h3>
          </div>
          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-bold border border-indigo-500/30">
            Firestore Database
          </span>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {MASTER_CORRIDOR_CATALOGUE.map((r) => (
            <div key={r.id} className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-black">
                    {r.name}
                  </span>
                  <span className="truncate">{r.desc}</span>
                </span>
                <span className="text-[9px] font-extrabold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
                  {r.direct}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                {r.stops}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CROWDSOURCED VOTE HISTORY INFO */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Crowdsourced Vote History Engine</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Every student vote cast at a bus stop is stored permanently in Firestore's <code className="text-indigo-300">studentConfirmations</code> and <code className="text-indigo-300">arrivalObservations</code> collections to continuously train future ETA predictions.
        </p>
      </div>
    </div>
  );
};
