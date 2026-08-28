"use client";

import React, { useState } from "react";
import {
  TerminalSquare,
  Play,
  Clock,
  Database,
  Code2,
  Table as TableIcon,
  CheckCircle2,
  FileCode,
  Sparkles,
} from "lucide-react";

interface QueryTemplate {
  title: string;
  category: string;
  cypher: string;
}

const TEMPLATES: QueryTemplate[] = [
  {
    title: "All Portfolios by Total AUM",
    category: "Portfolios",
    cypher: `MATCH (c:Person)-[:OWNS_ACCOUNT]->(p:InvestmentPortfolio)
RETURN c.name AS client_name, p.name AS portfolio_name, p.portfolio_type AS type, p.total_aum AS total_aum
ORDER BY p.total_aum DESC;`,
  },
  {
    title: "High-Risk Tech Equity Exposure",
    category: "Risk & Holdings",
    cypher: `MATCH (p:InvestmentPortfolio)-[h:CONTAINS_HOLDING]->(s:Share)
WHERE s.sector = 'Technology'
RETURN p.name AS portfolio, s.ticker AS ticker, s.name AS asset_name, h.allocation_pct AS allocation, h.current_value AS value_usd
ORDER BY h.allocation_pct DESC;`,
  },
  {
    title: "Family Trust Structures & Beneficiaries",
    category: "Estate Planning",
    cypher: `MATCH (c:Person)-[b:BENEFICIARY_OF]->(e:LegalEntity)
RETURN c.name AS client, e.name AS trust_name, e.entity_type AS entity_type, e.jurisdiction AS jurisdiction, b.share_pct AS beneficiary_stake;`,
  },
  {
    title: "SEC Reg BI Policy Limits & Thresholds",
    category: "Compliance",
    cypher: `MATCH (cp:CompliancePolicy)
RETURN cp.policy_id AS policy_id, cp.name AS policy_name, cp.max_equity_allocation_conservative AS max_equity_conservative, cp.max_illiquid_pct_conservative AS max_illiquid_pct;`,
  },
  {
    title: "Fixed Income Maturity & Coupon Yields",
    category: "Fixed Income",
    cypher: `MATCH (p:InvestmentPortfolio)-[h:CONTAINS_HOLDING]->(b:Bond)
RETURN b.instrument_id AS bond_id, b.name AS bond_name, b.coupon_rate AS coupon, b.maturity_date AS maturity, b.credit_rating AS rating, h.current_value AS holding_value;`,
  },
];

export const CypherStudio: React.FC = () => {
  const [activeCypher, setActiveCypher] = useState<string>(TEMPLATES[0].cypher);
  const [selectedTemplate, setSelectedTemplate] = useState<string>(TEMPLATES[0].title);
  const [running, setRunning] = useState(false);
  const [queryResult, setQueryResult] = useState<any>(null);

  const handleSelectTemplate = (tpl: QueryTemplate) => {
    setSelectedTemplate(tpl.title);
    setActiveCypher(tpl.cypher);
    setQueryResult(null);
  };

  const handleRunQuery = async () => {
    setRunning(true);
    try {
      const res = await fetch("http://localhost:8000/api/cypher/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: activeCypher }),
      });
      const data = await res.json();
      setQueryResult(data);
    } catch (err: any) {
      setQueryResult({ status: "ERROR", error: err.message || "Failed to execute Cypher" });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      {/* Header Banner */}
      <div className="glass-panel p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-white dark:from-amber-950/40 dark:via-slate-900/60 dark:to-slate-950 border border-amber-500/30 dark:border-amber-900/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-md">
        <div>
          <div className="flex items-center space-x-2.5">
            <TerminalSquare className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Cypher & Databricks Unity Catalog Studio
            </h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Execute real-time graph queries against the FIBO Neo4j knowledge database with sub-millisecond telemetry
          </p>
        </div>

        <button
          onClick={handleRunQuery}
          disabled={running}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95 shrink-0"
        >
          <Play className="w-3.5 h-3.5 fill-slate-950" />
          <span>{running ? "Executing Query..." : "Execute Cypher"}</span>
        </button>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Template Catalog */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 tracking-wider font-mono">
            FIBO Ontology Query Templates ({TEMPLATES.length})
          </div>

          <div className="space-y-2.5">
            {TEMPLATES.map((tpl) => {
              const isSelected = selectedTemplate === tpl.title;
              return (
                <div
                  key={tpl.title}
                  onClick={() => handleSelectTemplate(tpl)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "glass-panel border-amber-500/60 bg-amber-50/50 dark:bg-amber-500/10 shadow-md"
                      : "bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-900 dark:text-white">{tpl.title}</span>
                    <span className="px-2 py-0.5 text-[9px] font-semibold bg-slate-100 dark:bg-slate-800 text-amber-700 dark:text-amber-300 border border-slate-200 dark:border-slate-700 rounded">
                      {tpl.category}
                    </span>
                  </div>
                  <pre className="font-mono text-[10px] text-slate-500 dark:text-slate-400 mt-2 truncate">
                    {tpl.cypher.split("\n")[0]}
                  </pre>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Interactive Editor & Table Results */}
        <div className="lg:col-span-8 space-y-4">
          {/* Query Editor */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900/60 shadow-md">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="flex items-center space-x-1.5 font-mono text-slate-700 dark:text-slate-300 font-semibold">
                <FileCode className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Cypher Editor (Bolt: 7687)</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">Read-Only Guard Enabled</span>
            </div>

            <textarea
              value={activeCypher}
              onChange={(e) => setActiveCypher(e.target.value)}
              rows={6}
              className="w-full p-3.5 rounded-xl bg-slate-900 dark:bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400 focus:outline-none focus:border-amber-500/70 shadow-inner"
            />
          </div>

          {/* Execution Results & Telemetry */}
          <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-md bg-white dark:bg-slate-900/60">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <TableIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Query Execution Results</span>
              </div>

              {queryResult?.status === "SUCCESS" && (
                <div className="flex items-center space-x-3 text-xs font-mono">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{queryResult.execution_time_ms} ms</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                    {queryResult.row_count} Rows Returned
                  </span>
                </div>
              )}
            </div>

            {queryResult?.rows && queryResult.rows.length > 0 ? (
              <div className="overflow-x-auto max-h-80">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800 text-[10px]">
                    <tr>
                      {queryResult.columns.map((col: string) => (
                        <th key={col} className="px-4 py-2.5 font-mono">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
                    {queryResult.rows.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        {queryResult.columns.map((col: string) => {
                          const val = row[col];
                          const formatted =
                            typeof val === "number" && col.includes("aum")
                              ? `$${val.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                              : typeof val === "number" && col.includes("allocation")
                              ? `${(val * 100).toFixed(1)}%`
                              : typeof val === "object"
                              ? JSON.stringify(val)
                              : String(val ?? "null");

                          return (
                            <td key={col} className="px-4 py-2.5 font-mono text-slate-900 dark:text-slate-200">
                              {formatted}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : queryResult?.status === "ERROR" ? (
              <div className="p-6 text-center text-xs text-red-600 dark:text-red-400 font-mono">
                {queryResult.error}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500 font-mono">
                Click "Execute Cypher" to run the query and view results table.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
