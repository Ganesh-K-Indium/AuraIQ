"use client";

import React from "react";
import {
  ShieldCheck,
  MessageSquareCode,
  Network,
  TerminalSquare,
  Sparkles,
  BarChart3,
  ChevronDown,
  Activity,
  Globe,
  Sun,
  Moon,
} from "lucide-react";

import { useTheme } from "@/components/ThemeProvider";

interface NavbarProps {
  activeTab: "landing" | "dashboard" | "copilot" | "graph" | "cypher";
  setActiveTab: (tab: "landing" | "dashboard" | "copilot" | "graph" | "cypher") => void;
  selectedClientId: string;
  setSelectedClientId: (id: string) => void;
  clients: Array<{ client_id: string; name: string; net_worth_tier: string; total_aum: number }>;
  systemHealth: { status: string; neo4j_connected: boolean; nodes: number; relationships: number } | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedClientId,
  setSelectedClientId,
  clients,
  systemHealth,
}) => {
  const currentClient = clients.find((c) => c.client_id === selectedClientId);
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="border-b border-slate-200 dark:border-slate-800/90 bg-white/95 dark:bg-[#090d16]/95 backdrop-blur-xl sticky top-0 z-50 transition-colors">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Platform Identity (Clickable to return Home) */}
          <div 
            onClick={() => setActiveTab("landing")}
            className="flex items-center space-x-4 cursor-pointer group"
            title="Return to Home Landing"
          >
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 p-[1.5px] shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <div className="h-full w-full bg-white dark:bg-[#070a12] rounded-[10px] flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white font-mono group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    AURA<span className="text-emerald-600 dark:text-emerald-400 font-sans font-semibold">Wealth</span>
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 rounded-md tracking-wider">
                    INSTITUTIONAL
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Databricks Mosaic AI</span>
                  <span>•</span>
                  <span>FIBO Knowledge Graph</span>
                </div>
              </div>
            </div>
          </div>

          {/* Institutional Navigation Tabs */}
          <nav className="flex space-x-1.5 bg-slate-100 dark:bg-[#0e1320] p-1.5 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-inner">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "dashboard"
                  ? "bg-white dark:bg-gradient-to-r dark:from-emerald-500/20 dark:to-teal-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/40"
              }`}
            >
              <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Wealth Cockpit</span>
            </button>

            <button
              onClick={() => setActiveTab("copilot")}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "copilot"
                  ? "bg-white dark:bg-gradient-to-r dark:from-purple-500/20 dark:to-indigo-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/40 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/40"
              }`}
            >
              <MessageSquareCode className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Mosaic Copilot</span>
            </button>

            <button
              onClick={() => setActiveTab("graph")}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "graph"
                  ? "bg-white dark:bg-gradient-to-r dark:from-blue-500/20 dark:to-cyan-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/40 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/40"
              }`}
            >
              <Network className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Graph Studio</span>
            </button>

            <button
              onClick={() => setActiveTab("cypher")}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "cypher"
                  ? "bg-white dark:bg-gradient-to-r dark:from-amber-500/20 dark:to-yellow-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/40"
              }`}
            >
              <TerminalSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Cypher & UC IDE</span>
            </button>
          </nav>

          {/* Right Controls: Client Switcher & Live Connectivity */}
          <div className="flex items-center space-x-3">
            {/* Active Client Switcher */}
            <div className="relative">
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="bg-white dark:bg-[#0e1320] border border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 text-xs font-semibold text-slate-900 dark:text-slate-100 py-2 pl-3 pr-8 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer appearance-none shadow-sm"
              >
                {clients.map((c) => (
                  <option key={c.client_id} value={c.client_id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {c.name} • ${c.total_aum ? (c.total_aum / 1_000_000).toFixed(1) + "M" : "HNW"}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>

            {/* Live Database Badge */}
            <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#0e1320] border border-slate-200 dark:border-slate-800 text-[11px] font-mono shadow-sm">
              <span
                className={`w-2 h-2 rounded-full ${
                  systemHealth?.neo4j_connected ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-red-500"
                }`}
              />
              <span className="text-slate-700 dark:text-slate-300">
                Neo4j: {systemHealth?.nodes || 0} Nodes
              </span>
            </div>

            {/* Theme Toggle (Light / Dark Mode) */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-white dark:bg-[#0e1320] hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 transition-all shadow-sm flex items-center justify-center"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-blue-500" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
