import React from "react";
import { Home, MapPin, GitFork, User, ThumbsUp } from "lucide-react";

interface BottomNavProps {
  activeTab: "home" | "live" | "routes" | "profile";
  onTabChange: (tab: "home" | "live" | "routes" | "profile") => void;
  onVoteClick: () => void;
  hasUserConfirmed: boolean;
  isUserOnRoads: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onVoteClick,
  hasUserConfirmed,
  isUserOnRoads,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-2 sm:px-6 py-2">
      <div className="max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl mx-auto flex items-center justify-between gap-1">
        {/* Home Tab */}
        <button
          onClick={() => onTabChange("home")}
          className={`flex flex-col items-center justify-center py-1 px-2 sm:px-4 rounded-2xl transition-all duration-200 relative ${
            activeTab === "home"
              ? "text-indigo-400 font-semibold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {activeTab === "home" && (
            <div className="absolute inset-0 bg-indigo-500/10 rounded-2xl border border-indigo-500/30 -z-10" />
          )}
          <Home className={`w-5 h-5 mb-0.5 ${activeTab === "home" ? "scale-110" : ""}`} />
          <span className="text-[10px] sm:text-xs">Home</span>
        </button>

        {/* Live Tab */}
        <button
          onClick={() => onTabChange("live")}
          className={`flex flex-col items-center justify-center py-1 px-2 sm:px-4 rounded-2xl transition-all duration-200 relative ${
            activeTab === "live"
              ? "text-indigo-400 font-semibold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {activeTab === "live" && (
            <div className="absolute inset-0 bg-indigo-500/10 rounded-2xl border border-indigo-500/30 -z-10" />
          )}
          <MapPin className={`w-5 h-5 mb-0.5 ${activeTab === "live" ? "scale-110" : ""}`} />
          <span className="text-[10px] sm:text-xs">Live</span>
        </button>

        {/* PROMINENT VOTE BUTTON RIGHT BESIDE LIVE TAB */}
        <button
          onClick={onVoteClick}
          disabled={hasUserConfirmed || !isUserOnRoads}
          title={
            !isUserOnRoads
              ? "Voting available when on NH-16 / Bus Corridor"
              : hasUserConfirmed
              ? "Bus confirmed ✓"
              : "Vote active bus presence"
          }
          className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-2xl text-xs font-black transition-all shadow-lg shrink-0 ${
            hasUserConfirmed
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default"
              : !isUserOnRoads
              ? "bg-slate-900 text-slate-500 border border-slate-800 opacity-60 cursor-not-allowed"
              : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-950 scale-105"
          }`}
        >
          <ThumbsUp className="w-4 h-4 fill-current" />
          <span className="hidden xs:inline">{hasUserConfirmed ? "Voted ✓" : "Vote Bus"}</span>
        </button>

        {/* Routes Tab */}
        <button
          onClick={() => onTabChange("routes")}
          className={`flex flex-col items-center justify-center py-1 px-2 sm:px-4 rounded-2xl transition-all duration-200 relative ${
            activeTab === "routes"
              ? "text-indigo-400 font-semibold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {activeTab === "routes" && (
            <div className="absolute inset-0 bg-indigo-500/10 rounded-2xl border border-indigo-500/30 -z-10" />
          )}
          <GitFork className={`w-5 h-5 mb-0.5 ${activeTab === "routes" ? "scale-110" : ""}`} />
          <span className="text-[10px] sm:text-xs">Routes</span>
        </button>

        {/* Profile Tab */}
        <button
          onClick={() => onTabChange("profile")}
          className={`flex flex-col items-center justify-center py-1 px-2 sm:px-4 rounded-2xl transition-all duration-200 relative ${
            activeTab === "profile"
              ? "text-indigo-400 font-semibold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {activeTab === "profile" && (
            <div className="absolute inset-0 bg-indigo-500/10 rounded-2xl border border-indigo-500/30 -z-10" />
          )}
          <User className={`w-5 h-5 mb-0.5 ${activeTab === "profile" ? "scale-110" : ""}`} />
          <span className="text-[10px] sm:text-xs">Profile</span>
        </button>
      </div>
    </nav>
  );
};
