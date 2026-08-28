"use client";

import React, { useState } from "react";
import { Wrench, Play, CheckCircle2, Code2, Database, ShieldCheck, Zap } from "lucide-react";

interface ToolDef {
  name: string;
  catalog_path: string;
  description: string;
  defaultParams: Record<string, any>;
}

const TOOLS: ToolDef[] = [
  {
    name: "get_client_profile_and_holdings",
    catalog_path: "wealth_mgmt_catalog.fibo_knowledge_graph.get_client_profile_and_holdings",
    description: "Fetches complete HNW client profile, risk tolerance, and multi-asset portfolio holdings via FIBO graph traversal.",
    defaultParams: { client_id: "HNW-CLIENT-001" },
  },
  {
    name: "check_portfolio_risk_suitability",
    catalog_path: "wealth_mgmt_catalog.fibo_knowledge_graph.check_portfolio_risk_suitability",
    description: "Evaluates whether portfolio allocations comply with client risk mandate and SEC Reg BI policy limits.",
    defaultParams: { client_id: "HNW-CLIENT-001", portfolio_id: "PORT-VS-GROWTH-01" },
  },
  {
    name: "find_correlated_exposure",
    catalog_path: "wealth_mgmt_catalog.fibo_knowledge_graph.find_correlated_exposure",
    description: "Identifies systemic concentration risk and sector exposure across all portfolios in the wealth book.",
    defaultParams: { sector: "Technology", min_allocation_pct: 0.05 },
  },
  {
    name: "analyze_client_tax_and_trust_structure",
    catalog_path: "wealth_mgmt_catalog.fibo_knowledge_graph.analyze_client_tax_and_trust_structure",
    description: "Analyzes multi-entity wealth structures, irrevocable trusts, and estate beneficiary stakes.",
    defaultParams: { client_id: "HNW-CLIENT-001" },
  },
  {
    name: "query_fibo_knowledge_graph",
    catalog_path: "wealth_mgmt_catalog.fibo_knowledge_graph.query_fibo_knowledge_graph",
    description: "Executes a controlled, read-only Cypher query with strict mutation guards.",
    defaultParams: { cypher_query: "MATCH (p:InvestmentPortfolio) RETURN p.name AS name, p.total_aum AS aum" },
  },
];

export const UCToolRegistry: React.FC = () => {
  const [selectedTool, setSelectedTool] = useState<ToolDef>(TOOLS[0]);
  const [paramInput, setParamInput] = useState<string>(JSON.stringify(TOOLS[0].defaultParams, null, 2));
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);

  const handleSelectTool = (tool: ToolDef) => {
    setSelectedTool(tool);
    setParamInput(JSON.stringify(tool.defaultParams, null, 2));
    setExecutionResult(null);
  };

  const handleExecute = async () => {
    setExecuting(true);
    try {
      const parsedParams = JSON.parse(paramInput);
      const res = await fetch("http://localhost:8000/api/tools/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool_name: selectedTool.name,
          parameters: parsedParams,
        }),
      });
      const data = await res.json();
      setExecutionResult(data);
    } catch (err: any) {
      setExecutionResult({ error: err.message || "Failed to execute tool" });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      {/* Banner */}
      <div className="glass-panel p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-white dark:from-amber-950/40 dark:via-slate-900/60 dark:to-slate-950 border border-amber-500/30 dark:border-amber-900/30 flex items-center justify-between shadow-md">
        <div>
          <div className="flex items-center space-x-2.5">
            <Wrench className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Databricks Unity Catalog Tool Registry
            </h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Standardized Python & SQL functions registered under <code className="font-mono text-amber-700 dark:text-amber-300">wealth_mgmt_catalog.fibo_knowledge_graph</code>
          </p>
        </div>
      </div>

      {/* Two Column Layout: Tool List & Runner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Registered Tools */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 tracking-wider font-mono">
            Registered Catalog Functions ({TOOLS.length})
          </div>

          <div className="space-y-2.5">
            {TOOLS.map((tool) => {
              const isSelected = selectedTool.name === tool.name;
              return (
                <div
                  key={tool.name}
                  onClick={() => handleSelectTool(tool)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "glass-panel border-amber-500/60 bg-amber-50/50 dark:bg-amber-500/10 shadow-md"
                      : "bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">{tool.name}</span>
                    <span className="px-2 py-0.5 text-[9px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 rounded">
                      UC Tool
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{tool.description}</p>
                  <div className="font-mono text-[10px] text-amber-600 dark:text-amber-400/80 mt-2 truncate">
                    {tool.catalog_path}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Interactive Runner & Result Viewer */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 bg-white dark:bg-slate-900/60 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white font-mono">{selectedTool.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono text-[11px]">{selectedTool.catalog_path}</p>
              </div>
              <button
                onClick={handleExecute}
                disabled={executing}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98]"
              >
                <Play className="w-3.5 h-3.5 fill-slate-950" />
                <span>{executing ? "Executing Tool..." : "Run Function"}</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Parameters (JSON Input):
              </label>
              <textarea
                value={paramInput}
                onChange={(e) => setParamInput(e.target.value)}
                rows={4}
                className="w-full p-3 rounded-lg bg-slate-900 dark:bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400 focus:outline-none focus:border-amber-500/60 shadow-inner"
              />
            </div>

            {/* Execution Result */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                  <Code2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Execution Output:</span>
                </span>
                {executionResult?.status && (
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">Status: {executionResult.status}</span>
                )}
              </div>
              <pre className="p-4 bg-slate-900 dark:bg-slate-950 rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto border border-slate-800 max-h-80 shadow-inner">
                {executionResult
                  ? JSON.stringify(executionResult, null, 2)
                  : "// Click 'Run Function' to execute tool against live Neo4j database"}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
