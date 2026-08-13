import React, { useState } from "react";
import { MapPin, Search, Bus, Sparkles, Check, ArrowRight, Lock } from "lucide-react";
import { Stop } from "../types";

interface LocationSearchFormProps {
  allStops: Stop[];
  selectedBoardingPoint: string;
  onSelectLocation: (stopName: string) => void;
  isSimulating?: boolean;
}

export const LocationSearchForm: React.FC<LocationSearchFormProps> = ({
  allStops,
  selectedBoardingPoint,
  onSelectLocation,
  isSimulating = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Popular Hub Quick Chips
  const popularHubs = [
    "Old Gajuwaka",
    "NAD Junction",
    "RTC Complex",
    "Scindia",
    "Simhachalam",
    "Kurmannapalem",
    "Pendurthi",
    "Tagarapuvalasa",
    "Maddilapalem",
    "Steel Plant Main Gate",
  ];

  // Filter master stops by search query
  const filteredStops = allStops.filter((stop) =>
    stop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (stop.address && stop.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelectStop = (stopName: string) => {
    if (isSimulating) return; // Locked in Demo Mode
    onSelectLocation(stopName);
    setSearchTerm("");
    setIsDropdownOpen(false);
  };

  // DEMO MODE LOCKED STATE — Shows locked banner instead of route finder
  if (isSimulating) {
    return (
      <div className="glass-card rounded-3xl p-4 sm:p-5 border border-purple-500/40 bg-gradient-to-br from-slate-900/90 via-purple-950/30 to-slate-950 shadow-2xl space-y-3 font-sans">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-600/60 text-white shadow-md">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-purple-200 tracking-tight">
                Bus Fetch Locked — Demo Mode Active
              </h3>
              <p className="text-[11px] text-purple-400">
                Location is controlled by the Demo Control Panel above. Real location fetch is disabled.
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded border border-purple-500/40 font-bold shrink-0">
            DEMO LOCKED
          </span>
        </div>

        {/* Show current simulated boarding stop */}
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-purple-950/50 border border-purple-500/20 text-xs">
          <MapPin className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="text-slate-300">
            Demo Boarding Stop:{" "}
            <strong className="text-white font-extrabold">{selectedBoardingPoint}</strong>
          </span>
          <span className="ml-auto text-[9px] text-purple-300 bg-purple-500/20 px-1.5 py-0.5 rounded font-bold shrink-0">
            SET BY DEMO
          </span>
        </div>

        <p className="text-[10px] text-slate-500 text-center">
          Stop Demo Mode on Profile tab to re-enable real location search.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-3xl p-4 sm:p-5 border border-indigo-500/40 bg-gradient-to-br from-slate-900/90 via-indigo-950/40 to-slate-950 shadow-2xl space-y-4 font-sans">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md">
            <Search className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white tracking-tight">
              Fetch All Possible Buses
            </h3>
            <p className="text-[11px] text-slate-400">
              Select origin location to evaluate all direct & transfer buses
            </p>
          </div>
        </div>
        <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30 font-bold shrink-0">
          Route Finder
        </span>
      </div>

      {/* Location Search Input & Form */}
      <div className="relative space-y-2">
        <label className="text-[11px] font-bold text-indigo-300 block">
          Search or Select Boarding Stop:
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <MapPin className="w-4 h-4 text-indigo-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            placeholder={`Current: ${selectedBoardingPoint} (Type to search 34 stops...)`}
            className="w-full pl-9 pr-24 py-3 rounded-2xl bg-slate-950/80 border border-slate-700 focus:border-indigo-500 text-xs font-semibold text-white placeholder-slate-500 outline-none transition-all shadow-inner"
          />
          <button
            onClick={() => {
              if (searchTerm.trim()) {
                const match = allStops.find(
                  (s) => s.name.toLowerCase() === searchTerm.toLowerCase()
                );
                if (match) handleSelectStop(match.name);
                else if (filteredStops.length > 0) handleSelectStop(filteredStops[0].name);
              } else {
                setIsDropdownOpen(!isDropdownOpen);
              }
            }}
            className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold flex items-center gap-1 transition-all shadow"
          >
            <Bus className="w-3.5 h-3.5" />
            <span>Fetch</span>
          </button>
        </div>

        {/* Live Filtered Dropdown List */}
        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 z-30 mt-1 max-h-56 overflow-y-auto rounded-2xl bg-slate-900 border border-indigo-500/40 shadow-2xl p-1.5 space-y-1 backdrop-blur-xl">
            {filteredStops.length > 0 ? (
              filteredStops.map((stop) => (
                <button
                  key={stop.id}
                  onClick={() => handleSelectStop(stop.name)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all ${
                    selectedBoardingPoint === stop.name
                      ? "bg-indigo-600 text-white font-bold"
                      : "text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  <div className="min-w-0">
                    <span className="block font-semibold truncate">{stop.name}</span>
                    <span className="block text-[10px] text-slate-400 truncate">
                      {stop.address || "Duvvada Corridor Stop"}
                    </span>
                  </div>
                  {selectedBoardingPoint === stop.name && (
                    <Check className="w-4 h-4 text-emerald-300 shrink-0" />
                  )}
                </button>
              ))
            ) : (
              <div className="p-3 text-center text-xs text-slate-400">
                No stops found matching "{searchTerm}"
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed Destination Tag */}
      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
        <div className="flex items-center gap-2 text-slate-300 min-w-0">
          <span className="text-[10px] text-slate-400 uppercase font-bold">To Destination:</span>
          <span className="font-extrabold text-emerald-300 truncate">Duvvada / College Gate</span>
        </div>
        <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold shrink-0">
          Fixed Destination
        </span>
      </div>

      {/* Quick Select Hubs */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          Quick Boarding Hubs:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {popularHubs.map((hub) => (
            <button
              key={hub}
              onClick={() => handleSelectStop(hub)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all truncate ${
                selectedBoardingPoint === hub
                  ? "bg-indigo-600 text-white border-indigo-400 shadow-md scale-105"
                  : "bg-slate-950/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white"
              }`}
            >
              {hub}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
