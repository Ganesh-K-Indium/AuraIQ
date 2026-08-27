"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Network,
  Bot,
  BarChart3,
  TerminalSquare,
  Building2,
  Lock,
  Layers,
  Activity,
  CheckCircle2,
  TrendingUp,
  Zap,
  Sun,
  Moon,
} from "lucide-react";

interface LandingHeroProps {
  onEnter: (tab?: "dashboard" | "copilot" | "graph" | "cypher") => void;
  clients: Array<{ client_id: string; name: string; net_worth_tier: string; total_aum: number }>;
  selectedClientId: string;
  setSelectedClientId: (id: string) => void;
  systemHealth: { status: string; neo4j_connected: boolean; nodes: number; relationships: number } | null;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onEnter,
  clients,
  selectedClientId,
  setSelectedClientId,
  systemHealth,
}) => {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("aura_theme");
    if (stored === "light") {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    } else {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("aura_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("aura_theme", "light");
    }
  };

  return (
    <div className="space-y-12 animate-fadeIn pb-12 font-sans">
      {/* Standalone Landing Top Header */}
      <div className="flex items-center justify-between py-2 border-b border-slate-800/80 pb-4">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 p-[1.5px] shadow-lg shadow-emerald-500/20">
            <div className="h-full w-full bg-[#070a12] rounded-[10px] flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-tight text-white font-mono">
                AURA<span className="text-emerald-400 font-sans font-semibold">Wealth</span>
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-md tracking-wider">
                INSTITUTIONAL
              </span>
            </div>
            <div className="flex items-center space-x-2 text-[11px] text-slate-400">
              <span className="text-slate-300 font-medium">Databricks Mosaic AI</span>
              <span>•</span>
              <span>FIBO Knowledge Graph</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition-all shadow-sm flex items-center justify-center"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-500" />}
          </button>

          <button
            onClick={() => onEnter("dashboard")}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center space-x-1.5 active:scale-95"
          >
            <span>Enter App</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Hero Header Section */}
      <div className="text-center max-w-4xl mx-auto space-y-6 pt-4">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wide shadow-sm">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>EDMC FIBO Ontology • Databricks Mosaic AI • FastMCP 2.0</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
          Autonomous Agentic RAG for{" "}
          <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-400 bg-clip-text text-transparent">
            Wealth Management
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          An institutional AI platform combining multi-hop knowledge graph reasoning, 
          SEC Regulation Best Interest compliance auditing, and dynamic portfolio rebalancing.
        </p>

        {/* Primary CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <button
            onClick={() => onEnter("dashboard")}
            className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all flex items-center space-x-2 active:scale-95 group"
          >
            <span>Enter Wealth Intelligence Cockpit</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => onEnter("copilot")}
            className="px-6 py-3.5 rounded-xl glass-panel bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-100 font-semibold text-sm transition-all flex items-center space-x-2 active:scale-95 shadow-md"
          >
            <Bot className="w-4 h-4 text-purple-400" />
            <span>Launch Mosaic Copilot</span>
          </button>

          <button
            onClick={() => onEnter("graph")}
            className="px-5 py-3.5 rounded-xl glass-panel bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-100 font-semibold text-sm transition-all flex items-center space-x-2 active:scale-95 shadow-md"
          >
            <Network className="w-4 h-4 text-cyan-400" />
            <span>Explore Graph Studio</span>
          </button>
        </div>
      </div>

      {/* Live System Telemetry Strip */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block font-mono">
              Neo4j Graph Database (Bolt :7687)
            </span>
            <span className="text-[11px] text-slate-400">
              {systemHealth?.nodes || 18} Nodes • {systemHealth?.relationships || 20} Relationships Active
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-xs font-mono">
          <div className="flex items-center space-x-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>FastMCP Tools: 5 Governed</span>
          </div>
          <div className="hidden sm:flex items-center space-x-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span>OpenAI GPT-4o Ready</span>
          </div>
        </div>
      </div>

      {/* 4 Core Pillar Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
        {/* Card 1: Copilot */}
        <div 
          onClick={() => onEnter("copilot")}
          className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-purple-500/50 hover:bg-purple-950/10 transition-all cursor-pointer group shadow-lg flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="h-10 w-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Bot className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
              Mosaic AI Wealth Copilot
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Autonomous multi-hop agent with Server-Sent Events (SSE) streaming and live Unity Catalog tool telemetry.
            </p>
          </div>
          <div className="pt-4 text-xs font-semibold text-purple-400 flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
            <span>Open Chat Stream</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Card 2: Knowledge Graph */}
        <div 
          onClick={() => onEnter("graph")}
          className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-cyan-500/50 hover:bg-cyan-950/10 transition-all cursor-pointer group shadow-lg flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Network className="w-5 h-5 text-cyan-400" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
              FIBO Knowledge Graph Studio
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Visualizes beneficial owners, Delaware irrevocable trusts, holding hierarchies, and SEC Reg BI compliance links.
            </p>
          </div>
          <div className="pt-4 text-xs font-semibold text-cyan-400 flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
            <span>View Graph Topology</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Card 3: Cockpit */}
        <div 
          onClick={() => onEnter("dashboard")}
          className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-950/10 transition-all cursor-pointer group shadow-lg flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
              Executive Wealth Cockpit
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Real-time asset drift simulation, SEC Reg BI suitability audit scores, and automated trade generation.
            </p>
          </div>
          <div className="pt-4 text-xs font-semibold text-emerald-400 flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
            <span>Open Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Card 4: Cypher IDE */}
        <div 
          onClick={() => onEnter("cypher")}
          className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-amber-500/50 hover:bg-amber-950/10 transition-all cursor-pointer group shadow-lg flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="h-10 w-10 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TerminalSquare className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
              Cypher & UC Tool Studio
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Interactive Cypher workspace with preloaded institutional queries and parameterized tool callers.
            </p>
          </div>
          <div className="pt-4 text-xs font-semibold text-amber-400 flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
            <span>Launch Query IDE</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Pre-Seeded HNW Client Cards */}
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
            Select Active HNW Investor Profile
          </span>
          <span className="text-xs text-slate-400">Click to switch client context</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Victoria Sterling */}
          <div
            onClick={() => {
              setSelectedClientId("HNW-CLIENT-001");
              onEnter("dashboard");
            }}
            className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-md ${
              selectedClientId === "HNW-CLIENT-001"
                ? "glass-panel border-emerald-500/60 bg-emerald-950/10 shadow-emerald-950/20"
                : "glass-panel border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-white">Victoria Sterling</span>
              <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Ultra-HNW ($25M+)
              </span>
            </div>
            <p className="text-xs text-slate-300 mb-3">
              Moderate Growth mandate • Tech overweight (51.2%) • The Sterling Dynasty Delaware Irrevocable Trust.
            </p>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800/60">
              <span>AUM: $12,500,000</span>
              <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                <span>Select & Enter</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* Marcus Thorne */}
          <div
            onClick={() => {
              setSelectedClientId("HNW-CLIENT-002");
              onEnter("dashboard");
            }}
            className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-md ${
              selectedClientId === "HNW-CLIENT-002"
                ? "glass-panel border-blue-500/60 bg-blue-950/10 shadow-blue-950/20"
                : "glass-panel border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-white">Marcus Thorne</span>
              <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                HNW ($5M-$10M)
              </span>
            </div>
            <p className="text-xs text-slate-300 mb-3">
              Conservative Preservation mandate • 70% Fixed Income • Direct Individual Ownership (Florida).
            </p>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800/60">
              <span>AUM: $6,000,000</span>
              <span className="text-blue-400 font-semibold flex items-center space-x-1">
                <span>Select & Enter</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

