"use client";

import React, { useState } from "react";
import {
  Wallet,
  TrendingUp,
  Shield,
  Building2,
  PieChart as PieIcon,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Zap,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

interface ClientDetail {
  client_id: string;
  name: string;
  net_worth_tier: string;
  tax_residence: string;
  risk_profile: {
    tolerance_level: string;
    target_equity_pct: number;
    target_fixed_income_pct: number;
    target_alternatives_pct: number;
    max_drawdown_pct: number;
    esg_preference: string;
  };
  portfolios: Array<{
    portfolio_id: string;
    portfolio_name: string;
    portfolio_type: string;
    total_aum: number;
    holdings: Array<{
      name: string;
      asset_class: string;
      ticker_or_id: string;
      sector?: string;
      allocation_pct: number;
      current_value: number;
      risk_rating: string;
    }>;
  }>;
  legal_entities?: Array<{
    entity_id: string;
    entity_name: string;
    jurisdiction: string;
    entity_type: string;
    beneficiary_share_pct: number;
  }>;
}

interface ExecutiveDashboardProps {
  clientData: ClientDetail | null;
  onNavigateToCopilot: () => void;
  onNavigateToGraph: () => void;
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  clientData,
  onNavigateToCopilot,
  onNavigateToGraph,
}) => {
  const primaryPortfolio = clientData?.portfolios?.[0];
  const totalAUM = primaryPortfolio?.total_aum || 0;

  // Rebalance Simulation State
  const [targetEquity, setTargetEquity] = useState<number>(50);
  const [targetFixedIncome, setTargetFixedIncome] = useState<number>(40);
  const [targetAlternatives, setTargetAlternatives] = useState<number>(10);
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  // Sync sliders and reset simulation when clientData changes
  React.useEffect(() => {
    if (clientData?.risk_profile) {
      setTargetEquity(Math.round((clientData.risk_profile.target_equity_pct || 0.5) * 100));
      setTargetFixedIncome(Math.round((clientData.risk_profile.target_fixed_income_pct || 0.4) * 100));
      setTargetAlternatives(Math.round((clientData.risk_profile.target_alternatives_pct || 0.1) * 100));
      setSimulationResult(null);
    }
  }, [clientData?.client_id]);

  if (!clientData) {
    return (
      <div className="flex items-center justify-center p-16 text-slate-400 text-sm">
        Loading client profile and FIBO portfolio holdings...
      </div>
    );
  }

  // Calculate Asset Breakdown
  const assetClassTotals: Record<string, number> = {};
  primaryPortfolio?.holdings?.forEach((h) => {
    const ac = h.asset_class || "Other";
    assetClassTotals[ac] = (assetClassTotals[ac] || 0) + (h.current_value || 0);
  });

  const pieData = Object.entries(assetClassTotals).map(([name, value]) => ({
    name,
    value,
    pct: ((value / totalAUM) * 100).toFixed(1),
  }));

  // Sector Data
  const sectorTotals: Record<string, number> = {};
  primaryPortfolio?.holdings?.forEach((h) => {
    if (h.sector) {
      sectorTotals[h.sector] = (sectorTotals[h.sector] || 0) + (h.current_value || 0);
    }
  });

  const sectorData = Object.entries(sectorTotals).map(([sector, val]) => ({
    sector,
    value: val / 1000,
    pct: ((val / totalAUM) * 100).toFixed(1),
  }));

  const handleRunRebalanceSimulation = async () => {
    if (!primaryPortfolio) return;
    setSimulating(true);
    try {
      const res = await fetch("http://localhost:8000/api/portfolio/simulate-rebalance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientData.client_id,
          portfolio_id: primaryPortfolio.portfolio_id,
          target_equity_pct: targetEquity / 100,
          target_fixed_income_pct: targetFixedIncome / 100,
          target_alternatives_pct: targetAlternatives / 100,
        }),
      });
      const data = await res.json();
      setSimulationResult(data);
    } catch (err) {
      console.error("Simulation failed", err);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-2xl bg-gradient-to-r from-slate-900/90 via-[#0d1322] to-slate-950 border border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 shadow-xl">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">{clientData.name}</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full">
              {clientData.net_worth_tier}
            </span>
            <span className="px-2.5 py-0.5 text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 rounded-full font-mono">
              {clientData.tax_residence}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center space-x-2">
            <span>Client ID: <span className="font-mono text-slate-300">{clientData.client_id}</span></span>
            <span>•</span>
            <span>Investment Mandate: <span className="text-emerald-400 font-semibold">{clientData.risk_profile.tolerance_level}</span></span>
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onNavigateToCopilot}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-500/20 transition-all active:scale-95"
          >
            <Zap className="w-3.5 h-3.5 fill-white" />
            <span>Open AI Copilot</span>
          </button>
          <button
            onClick={onNavigateToGraph}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all"
          >
            <span>Explore FIBO Graph</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Managed AUM</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            ${totalAUM.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1">
            Account: {primaryPortfolio?.portfolio_type} Discretionary
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 hover:border-purple-500/30 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Risk Profile Mandate</span>
            <Shield className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-lg font-bold text-purple-300">
            {clientData.risk_profile.tolerance_level}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Max Drawdown Threshold: {(clientData.risk_profile.max_drawdown_pct * 100).toFixed(0)}%
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 hover:border-blue-500/30 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Supervisory Standard</span>
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-lg font-bold text-blue-300">SEC Reg BI & MiFID II</div>
          <div className="text-[11px] text-emerald-400 mt-1">
            Status: Fully Compliant Mandate
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Estate & Trust Structure</span>
            <Building2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-base font-bold text-amber-300 truncate">
            {clientData.legal_entities?.[0]?.entity_name || "Direct Individual Account"}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">
            {clientData.legal_entities?.[0]?.jurisdiction
              ? `Jurisdiction: ${clientData.legal_entities[0].jurisdiction}`
              : "Standard Tax Status"}
          </div>
        </div>
      </div>

      {/* Interactive Rebalance Simulation Suite */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5 bg-gradient-to-r from-slate-900/60 to-[#0b101d]">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center space-x-2.5">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Interactive Rebalance Simulation Engine
              </h3>
              <p className="text-xs text-slate-400">
                Simulate portfolio reallocation trades and audit real-time Reg BI suitability compliance
              </p>
            </div>
          </div>

          <button
            onClick={handleRunRebalanceSimulation}
            disabled={simulating}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${simulating ? "animate-spin" : ""}`} />
            <span>{simulating ? "Calculating Orders..." : "Run Rebalance Simulation"}</span>
          </button>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Target Equities Weight</span>
              <span className="font-mono font-bold text-emerald-400">{targetEquity}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={80}
              value={targetEquity}
              onChange={(e) => {
                const eq = Number(e.target.value);
                setTargetEquity(eq);
                setTargetFixedIncome(Math.max(10, 100 - eq - targetAlternatives));
              }}
              className="w-full accent-emerald-400 cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Target Fixed Income Weight</span>
              <span className="font-mono font-bold text-blue-400">{targetFixedIncome}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={80}
              value={targetFixedIncome}
              onChange={(e) => {
                const fi = Number(e.target.value);
                setTargetFixedIncome(fi);
                setTargetEquity(Math.max(10, 100 - fi - targetAlternatives));
              }}
              className="w-full accent-blue-400 cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Target Alternatives Weight</span>
              <span className="font-mono font-bold text-pink-400">{targetAlternatives}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={30}
              value={targetAlternatives}
              onChange={(e) => {
                const alt = Number(e.target.value);
                setTargetAlternatives(alt);
                setTargetFixedIncome(Math.max(10, 100 - targetEquity - alt));
              }}
              className="w-full accent-pink-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Simulation Output Box */}
        {simulationResult && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Generated Trade Order Basket
              </span>
              <span
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                  simulationResult.simulated_compliance_status === "COMPLIANT"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : "bg-red-500/10 text-red-400 border border-red-500/30"
                }`}
              >
                {simulationResult.simulated_compliance_status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {simulationResult.trades?.map((t: any, idx: number) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded ${
                        t.action === "BUY" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {t.action}
                    </span>
                    <span className="font-mono font-bold text-white">
                      ${t.amount_usd.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 font-semibold">{t.asset_class}</div>
                  <div className="text-[10px] text-slate-400 truncate">{t.suggested_instrument}</div>
                </div>
              ))}
            </div>

            <div className="text-xs text-slate-400 pt-2 border-t border-slate-900">
              {simulationResult.compliance_notes?.[0]}
            </div>
          </div>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Class Allocation Donut */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <PieIcon className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">FIBO Asset Class Breakdown</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">{primaryPortfolio?.portfolio_id}</span>
          </div>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [`$${Number(value).toLocaleString()}`, "Valuation"]}
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-2 pt-3 border-t border-slate-800">
            {pieData.map((item, idx) => (
              <div key={item.name} className="flex items-center space-x-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="text-slate-300">{item.name}: <span className="font-semibold text-white">{item.pct}%</span></span>
              </div>
            ))}
          </div>
        </div>

        {/* Sector Exposure Chart */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">Sector Concentration ($K USD)</h3>
            </div>
            <span className="text-xs text-amber-400 font-medium">Overweight Screened</span>
          </div>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectorData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="sector" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  formatter={(value: any) => [`$${(Number(value) * 1000).toLocaleString()}`, "Exposure"]}
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px" }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Governed under FIBO Financial Instrument standard</span>
            <span className="font-mono text-slate-300">Technology &gt; 50%</span>
          </div>
        </div>
      </div>

      {/* Underlying Instruments Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Underlying FIBO Financial Instruments</h3>
            <p className="text-xs text-slate-400">Directly mapped to Neo4j graph nodes and holdings</p>
          </div>
          <span className="text-xs font-mono bg-slate-800 text-slate-300 px-3 py-1 rounded-lg">
            {primaryPortfolio?.holdings?.length || 0} Assets
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">Asset / Identifier</th>
                <th className="px-5 py-3">Asset Class</th>
                <th className="px-5 py-3">Sector</th>
                <th className="px-5 py-3 text-right">Allocation</th>
                <th className="px-5 py-3 text-right">Market Value</th>
                <th className="px-5 py-3 text-center">Risk Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {primaryPortfolio?.holdings?.map((h, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-white">{h.name}</div>
                    <div className="font-mono text-[11px] text-slate-400">{h.ticker_or_id}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                      {h.asset_class}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-300">{h.sector || "N/A"}</td>
                  <td className="px-5 py-3.5 text-right font-mono font-semibold text-emerald-400">
                    {(h.allocation_pct * 100).toFixed(1)}%
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-white">
                    ${h.current_value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        h.risk_rating === "High"
                          ? "bg-red-500/10 text-red-400 border border-red-500/30"
                          : h.risk_rating === "Moderate"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      }`}
                    >
                      {h.risk_rating || "Standard"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
