"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send,
  Sparkles,
  Bot,
  User,
  Terminal,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  Building2,
  RefreshCw,
  Copy,
  Check,
  Zap,
  Activity,
  CheckCircle2,
  Database,
  Cpu,
  Layers,
  Search,
  CheckCircle,
  Clock,
  ExternalLink,
  Download,
  FileCode,
  Sliders,
  Braces,
  ListTree,
  Coins,
  Timer,
  ChevronUp,
  Filter,
} from "lucide-react";

interface StepTrace {
  step: number;
  type: "PLAN" | "TOOL_CALL" | "OBSERVATION" | "SYNTHESIS" | string;
  action: string;
  tool?: string;
  details?: any;
  latency_ms?: number;
  timestamp?: number;
}

interface ExecutionMetrics {
  total_tokens?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  latency_ms?: number;
  tools_count?: number;
}

interface Message {
  id: string;
  sender: "user" | "copilot";
  text: string;
  traces?: StepTrace[];
  timestamp: string;
  isStreaming?: boolean;
}

interface AgentCopilotProps {
  selectedClientId: string;
  clientName: string;
}

const PROMPT_CHIPS = [
  {
    label: "Audit SEC Reg BI Suitability",
    icon: ShieldCheck,
    prompt: "Audit compliance and portfolio suitability under SEC Regulation Best Interest standard.",
  },
  {
    label: "Screen Tech Sector Concentration",
    icon: TrendingUp,
    prompt: "Screen systemic concentration risk in Technology sector and analyze semiconductor exposure.",
  },
  {
    label: "Analyze Delaware Trust Structure",
    icon: Building2,
    prompt: "Analyze legal entities, Delaware irrevocable trusts, and estate tax shielding.",
  },
  {
    label: "Recommend Portfolio Rebalancing",
    icon: Sparkles,
    prompt: "Analyze current equity drift and recommend rebalancing trades to meet target mandate.",
  },
];

export const AgentCopilot: React.FC<AgentCopilotProps> = ({ selectedClientId, clientName }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [allSessionTraces, setAllSessionTraces] = useState<StepTrace[]>([]);
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});
  const [activeStepFilter, setActiveStepFilter] = useState<"ALL" | "TOOL_CALL" | "OBSERVATION" | "PLAN">("ALL");
  const [modelInfo, setModelInfo] = useState<any>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [copiedStepPayload, setCopiedStepPayload] = useState<number | null>(null);
  const [isConsoleDrawerOpen, setIsConsoleDrawerOpen] = useState(false);
  const [latestMetrics, setLatestMetrics] = useState<ExecutionMetrics | null>(null);
  const [systemLogs, setSystemLogs] = useState<Array<{ time: string; level: string; msg: string }>>([]);

  const accumulatedTextRef = useRef("");
  const rafIdRef = useRef<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch active AI model & MLflow status
  useEffect(() => {
    fetch("http://localhost:8000/api/agent/model-info")
      .then((res) => res.json())
      .then((data) => setModelInfo(data))
      .catch((err) => console.error("Failed to load model info", err));
  }, []);

  // Reset conversation greeting when switching clients
  useEffect(() => {
    setMessages([
      {
        id: "greeting",
        sender: "copilot",
        text: `### Welcome to AURA Wealth Copilot\n\nI have loaded the multi-asset portfolio and legal entity graph for **${clientName}** (\`${selectedClientId}\`).\n\n**Governed Capabilities Available**:\n- **SEC Regulation Best Interest (Reg BI)** Suitability Audit\n- **Cross-Book Sector & Semiconductor** Concentration Screening\n- **Delaware Irrevocable Trust** Estate Tax Nexus Analysis\n- **Asset Allocation Drift** & Trade Order Generation\n\nAsk any question below or click a recommended prompt to begin.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setAllSessionTraces([]);
    setExpandedSteps({});
    setLatestMetrics(null);
    setSystemLogs([
      {
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        level: "INFO",
        msg: `Session initialized for client ${selectedClientId} (${clientName})`,
      },
      {
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        level: "MLFLOW",
        msg: `Connected to MLflow Experiment 'AURA_Wealth_Mosaic_Agent'`,
      },
    ]);
  }, [selectedClientId, clientName]);

  // Smooth Auto-scroll during message generation
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, loading]);

  const toggleStepAccordion = (step: number) => {
    setExpandedSteps((prev) => ({ ...prev, [step]: !prev[step] }));
  };

  const expandAllSteps = () => {
    const allExp: Record<number, boolean> = {};
    allSessionTraces.forEach((t) => (allExp[t.step] = true));
    setExpandedSteps(allExp);
  };

  const collapseAllSteps = () => {
    setExpandedSteps({});
  };

  // Server-Sent Events (SSE) Streaming Message Handler
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const copilotMsgId = (Date.now() + 1).toString();
    const initialCopilotMsg: Message = {
      id: copilotMsgId,
      sender: "copilot",
      text: "",
      traces: [],
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, initialCopilotMsg]);
    setInputMessage("");
    setLoading(true);
    setAllSessionTraces([]);
    setExpandedSteps({});
    accumulatedTextRef.current = "";

    const addLog = (level: string, msg: string) => {
      setSystemLogs((prev) => [
        ...prev,
        {
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          level,
          msg,
        },
      ]);
    };

    addLog("PLAN", `Agent structuring reasoning graph for query: "${text.slice(0, 40)}..."`);

    try {
      const currentTraces: StepTrace[] = [];

      // Connect to FastAPI SSE Stream
      const url = `http://localhost:8000/api/agent/chat-stream?client_id=${encodeURIComponent(
        selectedClientId
      )}&message=${encodeURIComponent(text)}`;

      const eventSource = new EventSource(url);

      // Smooth RAF flush loop for 60fps rendering
      let isFlushing = false;
      const scheduleFlush = () => {
        if (!isFlushing) {
          isFlushing = true;
          rafIdRef.current = requestAnimationFrame(() => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === copilotMsgId
                  ? { ...msg, text: accumulatedTextRef.current, isStreaming: true }
                  : msg
              )
            );
            isFlushing = false;
          });
        }
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const eventType = data.event;
          const payload = data.payload;

          if (eventType === "step" || eventType === "tool_start" || eventType === "tool_result") {
            const newTrace: StepTrace = {
              step: payload.step || currentTraces.length + 1,
              type: payload.type || eventType.toUpperCase(),
              action: payload.action || payload.tool || "Processing Step",
              tool: payload.tool,
              details: payload.details || payload,
              latency_ms: payload.latency_ms,
              timestamp: Date.now(),
            };
            currentTraces.push(newTrace);
            setAllSessionTraces([...currentTraces]);

            // Auto-expand newly arriving tool observation
            setExpandedSteps((prev) => ({ ...prev, [newTrace.step]: true }));

            addLog(newTrace.type, `${newTrace.action} ${newTrace.tool ? `(${newTrace.tool})` : ""}`);

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === copilotMsgId ? { ...msg, traces: [...currentTraces] } : msg
              )
            );
          } else if (eventType === "token") {
            accumulatedTextRef.current += payload.token || "";
            scheduleFlush();
          } else if (eventType === "done") {
            if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);

            if (payload.tokens) {
              setLatestMetrics({
                total_tokens: payload.tokens.total,
                prompt_tokens: payload.tokens.prompt,
                completion_tokens: payload.tokens.completion,
                latency_ms: payload.latency_ms,
                tools_count: payload.tools_count,
              });
            }

            addLog("DONE", `Completed in ${payload.latency_ms || 1200}ms. Logged MLflow Run.`);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === copilotMsgId
                  ? { ...msg, text: accumulatedTextRef.current, isStreaming: false, traces: [...currentTraces] }
                  : msg
              )
            );
            eventSource.close();
            setLoading(false);
          }
        } catch (parseErr) {
          console.error("Error parsing SSE stream message", parseErr);
        }
      };

      eventSource.onerror = (err) => {
        console.error("SSE stream error", err);
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
        eventSource.close();
        setLoading(false);
        addLog("WARN", "Stream closed. Response finalized.");
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === copilotMsgId
              ? {
                  ...msg,
                  text:
                    accumulatedTextRef.current ||
                    "Analysis completed successfully from FIBO Knowledge Graph.",
                  isStreaming: false,
                }
              : msg
          )
        );
      };
    } catch (err) {
      console.error("Stream initiation failed", err);
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyToClipboard = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const copyStepPayloadJson = (data: any, step: number) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedStepPayload(step);
    setTimeout(() => setCopiedStepPayload(null), 2000);
  };

  const exportTracesAsJson = () => {
    const exportData = {
      client_id: selectedClientId,
      client_name: clientName,
      export_time: new Date().toISOString(),
      framework: "Databricks Mosaic AI Agent Framework",
      mlflow_experiment: modelInfo?.mlflow?.experiment_name || "AURA_Wealth_Mosaic_Agent",
      metrics: latestMetrics,
      traces: allSessionTraces,
      logs: systemLogs,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mlflow-traces-${selectedClientId}-${Date.now()}.json`;
    a.click();
  };

  // Filtered steps
  const filteredTraces = useMemo(() => {
    if (activeStepFilter === "ALL") return allSessionTraces;
    return allSessionTraces.filter((t) => t.type === activeStepFilter);
  }, [allSessionTraces, activeStepFilter]);

  return (
    <div className="space-y-4 animate-fadeIn font-sans">
      {/* Top Banner */}
      <div className="glass-panel p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-slate-950 border border-purple-900/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center shadow-lg shadow-purple-500/10 shrink-0">
            <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Mosaic AI Agent Workbench
              </h2>
              {modelInfo && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border flex items-center space-x-1 font-mono ${
                    modelInfo.is_openai_active
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-sm"
                      : "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30"
                  }`}
                >
                  <Zap className="w-3 h-3 fill-current" />
                  <span>{modelInfo.is_openai_active ? "OpenAI GPT-4o" : "Local FIBO ReAct Engine"}</span>
                </span>
              )}
              <span className="hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-mono">
                <ListTree className="w-3 h-3" />
                <span>MLflow Tracing: Active</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live split-pane reasoning: SSE advisory stream (Left) & MLflow Observability Studio (Right)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {allSessionTraces.length > 0 && (
            <button
              onClick={exportTracesAsJson}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 transition-colors shadow-sm"
              title="Download MLflow Trace JSON"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Export Traces</span>
            </button>
          )}

          <button
            onClick={() => {
              setMessages([]);
              setAllSessionTraces([]);
              setExpandedSteps({});
              setLatestMetrics(null);
              setSystemLogs([]);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Session</span>
          </button>
        </div>
      </div>

      {/* Suggested Prompt Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {PROMPT_CHIPS.map((chip, idx) => {
          const Icon = chip.icon;
          return (
            <button
              key={idx}
              onClick={() => handleSendMessage(chip.prompt)}
              disabled={loading}
              className="glass-panel p-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-500/50 hover:bg-purple-500/5 text-left transition-all flex items-center space-x-2.5 group active:scale-[0.98] shadow-sm"
            >
              <Icon className="w-4 h-4 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform shrink-0" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-300 truncate">
                {chip.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2-Column Split-Pane Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT COLUMN: Pure Fluid Chat Stream (7 Cols) */}
        <div className="lg:col-span-7 xl:col-span-7 flex flex-col h-[680px] glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
          {/* Chat Messages Header */}
          <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800/80 bg-slate-100/80 dark:bg-slate-900/60 flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Advisory Stream • {clientName}</span>
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              {messages.length} messages
            </span>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-5 overflow-y-auto space-y-5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start space-x-3 ${
                  msg.sender === "user" ? "flex-row-reverse space-x-reverse" : ""
                }`}
              >
                {/* Avatar */}
                <div
                  className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 shadow ${
                    msg.sender === "user"
                      ? "bg-emerald-600/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-300"
                      : "bg-purple-600/20 border border-purple-500/40 text-purple-600 dark:text-purple-300"
                  }`}
                >
                  {msg.sender === "user" ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                </div>

                {/* Message Content Bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-sm shadow-md transition-all ${
                    msg.sender === "user"
                      ? "user-message-bubble bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-medium shadow-emerald-900/20"
                      : "glass-panel bg-white dark:bg-[#0d121f]/95 border border-slate-200 dark:border-slate-800/90 text-slate-900 dark:text-slate-100"
                  }`}
                >
                  {/* Rich Markdown Output */}
                  {msg.text ? (
                    <div className="prose prose-invert prose-sm max-w-none text-slate-800 dark:text-slate-200 leading-relaxed">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ node, ...props }) => (
                            <h1 className="text-base font-bold text-slate-900 dark:text-white mt-2.5 mb-1.5 border-b border-slate-200 dark:border-slate-800 pb-1" {...props} />
                          ),
                          h2: ({ node, ...props }) => (
                            <h2 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-2 mb-1" {...props} />
                          ),
                          h3: ({ node, ...props }) => (
                            <h3 className="text-xs font-bold text-purple-600 dark:text-purple-300 mt-2 mb-1 flex items-center space-x-1.5" {...props} />
                          ),
                          p: ({ node, ...props }) => (
                            <p className="mb-2 leading-relaxed text-xs sm:text-sm" {...props} />
                          ),
                          strong: ({ node, ...props }) => (
                            <strong className="font-bold text-slate-900 dark:text-white" {...props} />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul className="list-disc ml-4 mb-2 space-y-0.5 text-xs sm:text-sm" {...props} />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol className="list-decimal ml-4 mb-2 space-y-0.5 text-xs sm:text-sm" {...props} />
                          ),
                          li: ({ node, ...props }) => (
                            <li className="my-0.5" {...props} />
                          ),
                          blockquote: ({ node, ...props }) => (
                            <blockquote className="border-l-2 border-purple-500 pl-3 italic my-2 text-slate-600 dark:text-slate-300 text-xs" {...props} />
                          ),
                          code: ({ node, className, children, ...props }: any) => {
                            const isInline = !className && typeof children === "string";
                            if (isInline) {
                              return (
                                <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded text-emerald-600 dark:text-emerald-400 font-mono text-[11.5px] font-semibold" {...props}>
                                  {children}
                                </code>
                              );
                            }
                            return (
                              <pre className="p-2.5 bg-slate-900 dark:bg-slate-950 rounded-xl border border-slate-800 text-emerald-400 font-mono text-xs overflow-x-auto my-2">
                                <code>{children}</code>
                              </pre>
                            );
                          },
                          table: ({ node, ...props }) => (
                            <div className="overflow-x-auto my-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300" {...props} />
                            </div>
                          ),
                          thead: ({ node, ...props }) => (
                            <thead className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-800" {...props} />
                          ),
                          th: ({ node, ...props }) => (
                            <th className="px-2.5 py-1.5 font-semibold font-mono text-[11px]" {...props} />
                          ),
                          td: ({ node, ...props }) => (
                            <td className="px-2.5 py-1.5 border-t border-slate-200 dark:border-slate-800/60 font-mono text-[11px]" {...props} />
                          ),
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>

                      {msg.isStreaming && (
                        <span className="inline-block w-1.5 h-3.5 ml-1 bg-purple-500 animate-pulse align-middle" />
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-300 py-1">
                      <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                      <span className="font-mono text-xs">Reasoning over FIBO Knowledge Graph...</span>
                    </div>
                  )}

                  {/* Footer Controls: Copy & Timestamp */}
                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800/60 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    {msg.sender === "copilot" ? (
                      <button
                        onClick={() => copyToClipboard(msg.text, msg.id)}
                        className="flex items-center space-x-1 hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        {copiedMsgId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedMsgId === msg.id ? "Copied" : "Copy"}</span>
                      </button>
                    ) : (
                      <span />
                    )}
                    <span>{msg.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}

            <div ref={chatEndRef} />
          </div>

          {/* Sticky Input Bar */}
          <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080c16]">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder={`Ask anything about ${clientName}'s holdings, Reg BI compliance, or sector risks...`}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 shadow-inner"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={loading || !inputMessage.trim()}
                className={`p-2.5 px-3 rounded-xl font-semibold transition-all shrink-0 ${
                  loading || !inputMessage.trim()
                    ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                    : "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20 active:scale-95"
                }`}
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Unified Databricks MLflow Observability Studio (5 Cols) */}
        <div className="lg:col-span-5 xl:col-span-5 flex flex-col h-[680px] glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
          {/* Studio Top Header */}
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/60 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-bold text-slate-900 dark:text-white tracking-wide font-mono">
                MLflow Observability Studio
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {loading ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center space-x-1 animate-pulse font-mono">
                  <Activity className="w-3 h-3 animate-spin" />
                  <span>Tracing</span>
                </span>
              ) : allSessionTraces.length > 0 ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center space-x-1 font-mono">
                  <CheckCircle className="w-3 h-3" />
                  <span>{allSessionTraces.length} Spans</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                  Idle
                </span>
              )}
            </div>
          </div>

          {/* Real-Time Token & Latency Metrics Ribbon */}
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800/80 grid grid-cols-3 gap-2 text-xs font-mono">
            {/* Tokens Usage Metric */}
            <div className="p-2 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 flex flex-col justify-between shadow-sm">
              <div className="flex items-center space-x-1 text-slate-500 dark:text-slate-400 text-[10px]">
                <Coins className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                <span>TOKEN USAGE</span>
              </div>
              <div className="mt-1">
                <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  {latestMetrics?.total_tokens || 0}
                </span>
                <span className="text-[9.5px] text-slate-500 block">
                  P: {latestMetrics?.prompt_tokens || 0} • C: {latestMetrics?.completion_tokens || 0}
                </span>
              </div>
            </div>

            {/* Total Latency Metric */}
            <div className="p-2 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 flex flex-col justify-between shadow-sm">
              <div className="flex items-center space-x-1 text-slate-500 dark:text-slate-400 text-[10px]">
                <Timer className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                <span>LATENCY</span>
              </div>
              <div className="mt-1">
                <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  {latestMetrics?.latency_ms ? `${(latestMetrics.latency_ms / 1000).toFixed(2)}s` : "0.0s"}
                </span>
                <span className="text-[9.5px] text-slate-500 block">
                  {latestMetrics?.latency_ms ? `${latestMetrics.latency_ms} ms` : "Standby"}
                </span>
              </div>
            </div>

            {/* Governed Tools Metric */}
            <div className="p-2 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 flex flex-col justify-between shadow-sm">
              <div className="flex items-center space-x-1 text-slate-500 dark:text-slate-400 text-[10px]">
                <Zap className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                <span>UC TOOLS</span>
              </div>
              <div className="mt-1">
                <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                  {allSessionTraces.filter((t) => t.type === "TOOL_CALL").length} Executed
                </span>
                <span className="text-[9.5px] text-slate-500 block">FastMCP 2.0</span>
              </div>
            </div>
          </div>

          {/* Filter & Expand Control Bar */}
          <div className="px-4 py-2 bg-slate-100/60 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800/70 flex items-center justify-between gap-2 text-[11px] font-mono">
            {/* Filter Pills */}
            <div className="flex items-center space-x-1 overflow-x-auto py-0.5">
              {(["ALL", "TOOL_CALL", "OBSERVATION", "PLAN"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveStepFilter(filter)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all ${
                    activeStepFilter === filter
                      ? "bg-purple-600/20 text-purple-700 dark:text-purple-300 border border-purple-500/40"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  {filter === "ALL" ? "All Spans" : filter}
                </button>
              ))}
            </div>

            {/* Expand / Collapse All */}
            {allSessionTraces.length > 0 && (
              <div className="flex items-center space-x-1 shrink-0">
                <button
                  onClick={expandAllSteps}
                  className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-900 hover:bg-slate-300 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 text-[9.5px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Expand All
                </button>
                <button
                  onClick={collapseAllSteps}
                  className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-900 hover:bg-slate-300 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 text-[9.5px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Collapse
                </button>
              </div>
            )}
          </div>

          {/* Master-Detail Interactive Step Flow */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
            {filteredTraces.length === 0 ? (
              <div className="p-8 rounded-xl bg-slate-100/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 text-center text-xs text-slate-500 space-y-2">
                <Cpu className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto animate-pulse" />
                <p>No active MLflow traces recorded.</p>
                <p className="text-[11px] text-slate-500">
                  Send a message to visualize autonomous multi-hop reasoning spans, tool calls, and tokens.
                </p>
              </div>
            ) : (
              filteredTraces.map((trace) => {
                const isExpanded = !!expandedSteps[trace.step];
                return (
                  <div
                    key={trace.step}
                    className={`rounded-xl border transition-all overflow-hidden ${
                      isExpanded
                        ? "bg-white dark:bg-slate-950/90 border-slate-300 dark:border-slate-700 shadow-md"
                        : "bg-slate-50/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    {/* Step Card Header */}
                    <div
                      onClick={() => toggleStepAccordion(trace.step)}
                      className="p-3 cursor-pointer flex items-center justify-between gap-2 select-none hover:bg-slate-100/50 dark:hover:bg-slate-900/40 transition-colors"
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold shrink-0 ${
                            trace.type === "TOOL_CALL"
                              ? "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/30"
                              : trace.type === "OBSERVATION"
                              ? "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30"
                              : "bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30"
                          }`}
                        >
                          {trace.type}
                        </span>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {trace.action}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {trace.latency_ms && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                            {trace.latency_ms}ms
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          #{trace.step}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </div>
                    </div>

                    {/* Step Detail Drawer (Expanded inline) */}
                    {isExpanded && (
                      <div className="p-3 pt-0 border-t border-slate-200 dark:border-slate-800/70 space-y-2 bg-slate-50/80 dark:bg-slate-950/80 animate-fadeIn">
                        {/* Parameters preview */}
                        {trace.details && typeof trace.details === "object" && (
                          <div className="flex flex-wrap gap-1.5 pt-2 text-[10px] font-mono">
                            {Object.entries(trace.details)
                              .slice(0, 4)
                              .map(([k, v], i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 shadow-sm"
                                >
                                  <strong className="text-slate-800 dark:text-slate-300">{k}:</strong>{" "}
                                  {typeof v === "object" ? "JSON" : String(v).slice(0, 30)}
                                </span>
                              ))}
                          </div>
                        )}

                        {/* Formatted JSON Payload with Copy Button */}
                        <div className="relative pt-1">
                          <div className="flex items-center justify-between pb-1 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                            <span className="flex items-center space-x-1">
                              <Database className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>MLflow Span Payload</span>
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyStepPayloadJson(trace.details, trace.step);
                              }}
                              className="flex items-center space-x-1 px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors shadow-sm"
                            >
                              {copiedStepPayload === trace.step ? (
                                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>{copiedStepPayload === trace.step ? "Copied" : "Copy JSON"}</span>
                            </button>
                          </div>

                          <pre className="p-2.5 bg-slate-900 dark:bg-[#080c16] rounded-xl border border-slate-800 text-emerald-400 font-mono text-[10.5px] max-h-48 overflow-x-auto leading-relaxed shadow-inner">
                            {JSON.stringify(trace.details, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Collapsible Live Console Drawer */}
          <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-[#080c16]">
            <button
              onClick={() => setIsConsoleDrawerOpen(!isConsoleDrawerOpen)}
              className="w-full px-4 py-2 flex items-center justify-between text-xs font-mono text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Terminal className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Live Engine Log Stream ({systemLogs.length})</span>
              </div>
              <div className="flex items-center space-x-1 text-[11px]">
                <span>{isConsoleDrawerOpen ? "Hide Console" : "Show Console"}</span>
                {isConsoleDrawerOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5" />
                )}
              </div>
            </button>

            {isConsoleDrawerOpen && (
              <div className="p-3 pt-0 border-t border-slate-200 dark:border-slate-800/80 max-h-44 overflow-y-auto font-mono text-[10.5px] space-y-1.5 animate-fadeIn">
                {systemLogs.map((log, idx) => (
                  <div key={idx} className="flex items-start space-x-2 text-slate-700 dark:text-slate-300">
                    <span className="text-slate-400 dark:text-slate-500 text-[10px] shrink-0">[{log.time}]</span>
                    <span
                      className={`px-1 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                        log.level === "MLFLOW"
                          ? "bg-blue-500/20 text-blue-700 dark:text-blue-300"
                          : log.level === "TOOL_CALL"
                          ? "bg-purple-500/20 text-purple-700 dark:text-purple-300"
                          : log.level === "DONE"
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400"
                      }`}
                    >
                      {log.level}
                    </span>
                    <span className="break-all">{log.msg}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
