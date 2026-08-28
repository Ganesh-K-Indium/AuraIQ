"use client";

import React, { useState } from "react";
import {
  Cpu,
  Play,
  CheckCircle,
  AlertTriangle,
  Layers,
  Code2,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Terminal,
  Activity,
  Compass,
} from "lucide-react";

interface AgentTrace {
  step: number;
  type: "PLAN" | "TOOL_CALL" | "OBSERVATION" | "SYNTHESIS";
  action: string;
  details: any;
  timestamp: number;
}

interface AgentReport {
  client_id: string;
  client_name: string;
  net_worth_tier: string;
  risk_profile: any;
  portfolios: any[];
  suitability_evaluations: any[];
  trust_structures: any[];
  sector_concentration_alerts: any[];
  recommendation_summary: string[];
}

interface AgentMissionControlProps {
  selectedClientId: string;
  agentRunning: boolean;
  agentResult: {
    status: string;
    report: AgentReport;
    execution_traces: AgentTrace[];
  } | null;
  onRunReview: () => void;
}

export const AgentMissionControl: React.FC<AgentMissionControlProps> = ({
  selectedClientId,
  agentRunning,
  agentResult,
  onRunReview,
}) => {
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});

  const toggleStep = (step: number) => {
    setExpandedSteps((prev) => ({ ...prev, [step]: !prev[step] }));
  };

  const getStepBadge = (type: string) => {
    switch (type) {
      case "PLAN":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30";
      case "TOOL_CALL":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30";
      case "OBSERVATION":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30";
      case "SYNTHESIS":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      {/* Control Banner */}
      <div className="glass-panel p-6 rounded-2xl bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-white dark:from-purple-950/40 dark:via-slate-900/60 dark:to-slate-950 border border-purple-500/30 dark:border-purple-900/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-md">
        <div>
          <div className="flex items-center space-x-2.5">
            <Cpu className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Mosaic AI Agent Mission Control
            </h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Autonomous multi-hop reasoning over FIBO Wealth Ontology & Unity Catalog tools
          </p>
        </div>

        <button
          onClick={onRunReview}
          disabled={agentRunning}
          className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all shadow-lg ${
            agentRunning
              ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
              : "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20 active:scale-[0.98]"
          }`}
        >
          {agentRunning ? (
            <>
              <Activity className="w-4 h-4 animate-spin text-purple-600 dark:text-purple-400" />
              <span>Agent Traversing Graph...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 text-white fill-white" />
              <span className="text-white">Execute Autonomous Review</span>
            </>
          )}
        </button>
      </div>

      {/* Main Two-Column Layout: Traces & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Step-by-Step Traces Timeline */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-300 font-semibold text-sm">
              <Terminal className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Chain-of-Thought Reasoning Traces (MLflow Tracing)</span>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              {agentResult?.execution_traces?.length || 0} Steps Executed
            </span>
          </div>

          {!agentResult && !agentRunning && (
            <div className="glass-panel p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3 bg-white dark:bg-slate-900/60 shadow-md">
              <Compass className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto animate-pulse" />
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                No active execution traces. Click "Execute Autonomous Review" to begin graph traversal.
              </p>
            </div>
          )}

          {agentRunning && (
            <div className="glass-panel p-8 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 bg-white dark:bg-slate-900/60 shadow-md">
              <div className="flex items-center space-x-3 text-purple-600 dark:text-purple-400 text-sm font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping" />
                <span>Navigating FIBO Knowledge Graph & Unity Catalog Tools...</span>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse w-3/4" />
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse w-1/2" />
              </div>
            </div>
          )}

          {agentResult?.execution_traces && (
            <div className="space-y-3">
              {agentResult.execution_traces.map((trace) => {
                const isExpanded = expandedSteps[trace.step];
                return (
                  <div
                    key={trace.step}
                    className="glass-panel rounded-xl border border-slate-200 dark:border-slate-800/80 overflow-hidden transition-all bg-white dark:bg-slate-900/60 shadow-sm"
                  >
                    <div
                      onClick={() => toggleStep(trace.step)}
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="font-mono text-xs font-bold text-slate-400 w-6">
                          #{trace.step}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getStepBadge(
                            trace.type
                          )}`}
                        >
                          {trace.type}
                        </span>
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">{trace.action}</span>
                      </div>
                      <div className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-slate-200 dark:border-slate-800/60 pt-3 bg-slate-50 dark:bg-slate-950/60">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                          <span className="flex items-center space-x-1 font-mono">
                            <Code2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                            <span>Payload Details</span>
                          </span>
                          <span className="font-mono text-[10px]">
                            {new Date(trace.timestamp * 1000).toLocaleTimeString()}
                          </span>
                        </div>
                        <pre className="p-3 bg-slate-900 dark:bg-slate-950 rounded-lg text-[11px] font-mono text-emerald-400 overflow-x-auto border border-slate-800 shadow-inner">
                          {JSON.stringify(trace.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Advisory Synthesis & Actionable Recommendations */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-300 font-semibold text-sm">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Synthesized Advisory Report & Actions</span>
          </div>

          {agentResult?.report ? (
            <div className="space-y-4">
              {/* Suitability Badge Card */}
              <div className="glass-panel p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900/60 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                    Suitability Compliance
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                    {agentResult.report.suitability_evaluations?.[0]?.suitability_status || "COMPLIANT"}
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {agentResult.report.suitability_evaluations?.[0]?.compliance_notes?.[0] ||
                    "Portfolio is fully compliant with SEC Regulation Best Interest standard."}
                </p>
              </div>

              {/* Recommendations Card */}
              <div className="glass-panel p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900/60 shadow-md">
                <h4 className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                  Actionable Recommendations
                </h4>
                <div className="space-y-2.5">
                  {agentResult.report.recommendation_summary.map((rec, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex items-start space-x-2.5 text-xs text-slate-800 dark:text-slate-200 shadow-sm"
                    >
                      <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Concentration Alert Card if present */}
              {agentResult.report.sector_concentration_alerts?.length > 0 && (
                <div className="glass-panel p-5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2 shadow-md">
                  <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 font-semibold text-xs">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Systemic Sector Concentration Detected</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    High correlated exposure in Technology sector detected. Automated rebalancing workflow recommended to mitigate drawdown risk.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-panel p-8 rounded-xl border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900/60 shadow-sm">
              Awaiting agent execution to compile synthesis...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
