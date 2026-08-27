"use client";

import React, { useState, useRef, useEffect } from "react";
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
} from "lucide-react";

interface StepTrace {
  step: number;
  type: "PLAN" | "TOOL_CALL" | "OBSERVATION" | "SYNTHESIS" | string;
  action: string;
  tool?: string;
  details?: any;
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
  const [selectedTraceStep, setSelectedTraceStep] = useState<number | null>(null);
  const [modelInfo, setModelInfo] = useState<any>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const accumulatedTextRef = useRef("");
  const rafIdRef = useRef<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch active AI model status
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
  }, [selectedClientId, clientName]);

  // Smooth Auto-scroll during message generation
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, loading]);

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
    accumulatedTextRef.current = "";

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
            };
            currentTraces.push(newTrace);
            setAllSessionTraces([...currentTraces]);
            setSelectedTraceStep(newTrace.step);

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

  const activeSelectedTrace = allSessionTraces.find((t) => t.step === selectedTraceStep) || allSessionTraces[allSessionTraces.length - 1];

  return (
    <div className="space-y-4 animate-fadeIn font-sans">
      {/* Top Banner */}
      <div className="glass-panel p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-slate-950 border border-purple-900/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center shadow-lg shadow-purple-500/10 shrink-0">
            <Bot className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Mosaic AI Agent Workbench
              </h2>
              {modelInfo && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border flex items-center space-x-1 font-mono ${
                    modelInfo.is_openai_active
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_8px_#10b98144]"
                      : "bg-purple-500/10 text-purple-300 border-purple-500/30"
                  }`}
                >
                  <Zap className="w-3 h-3 fill-current" />
                  <span>{modelInfo.is_openai_active ? "OpenAI GPT-4o" : "Local FIBO ReAct Engine"}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live split-pane reasoning: SSE advisory stream (Left) & Tool execution telemetry (Right)
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setMessages([]);
            setAllSessionTraces([]);
          }}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset Session</span>
        </button>
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
              className="glass-panel p-2.5 px-3 rounded-xl border border-slate-800 hover:border-purple-500/50 hover:bg-purple-500/5 text-left transition-all flex items-center space-x-2.5 group active:scale-[0.98] shadow-sm"
            >
              <Icon className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform shrink-0" />
              <span className="text-xs font-semibold text-slate-200 group-hover:text-purple-300 truncate">
                {chip.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2-Column Split-Pane Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT COLUMN: Pure Fluid Chat Stream (7 Cols) */}
        <div className="lg:col-span-7 xl:col-span-7 flex flex-col h-[650px] glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          {/* Chat Messages Header */}
          <div className="px-4 py-2.5 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-slate-300 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
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
                      ? "bg-emerald-600/30 border border-emerald-500/40 text-emerald-300"
                      : "bg-purple-600/30 border border-purple-500/40 text-purple-300"
                  }`}
                >
                  {msg.sender === "user" ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                </div>

                {/* Message Content Bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-sm shadow-md transition-all ${
                    msg.sender === "user"
                      ? "bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-medium"
                      : "glass-panel bg-[#0d121f]/95 border border-slate-800/90 text-slate-100"
                  }`}
                >
                  {/* Rich Markdown Output */}
                  {msg.text ? (
                    <div className="prose prose-invert prose-sm max-w-none text-slate-200 leading-relaxed">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ node, ...props }) => (
                            <h1 className="text-base font-bold text-white mt-2.5 mb-1.5 border-b border-slate-800 pb-1" {...props} />
                          ),
                          h2: ({ node, ...props }) => (
                            <h2 className="text-sm font-bold text-emerald-400 mt-2 mb-1" {...props} />
                          ),
                          h3: ({ node, ...props }) => (
                            <h3 className="text-xs font-bold text-purple-300 mt-2 mb-1 flex items-center space-x-1.5" {...props} />
                          ),
                          p: ({ node, ...props }) => (
                            <p className="mb-2 text-slate-200 leading-relaxed text-xs sm:text-sm" {...props} />
                          ),
                          strong: ({ node, ...props }) => (
                            <strong className="font-bold text-white" {...props} />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul className="list-disc ml-4 mb-2 space-y-0.5 text-slate-200 text-xs sm:text-sm" {...props} />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol className="list-decimal ml-4 mb-2 space-y-0.5 text-slate-200 text-xs sm:text-sm" {...props} />
                          ),
                          li: ({ node, ...props }) => (
                            <li className="my-0.5 text-slate-200" {...props} />
                          ),
                          blockquote: ({ node, ...props }) => (
                            <blockquote className="border-l-2 border-purple-500 pl-3 italic my-2 text-slate-300 text-xs" {...props} />
                          ),
                          code: ({ node, className, children, ...props }: any) => {
                            const isInline = !className && typeof children === "string";
                            if (isInline) {
                              return (
                                <code className="px-1.5 py-0.5 bg-slate-900 border border-slate-700/80 rounded text-emerald-400 font-mono text-[11.5px] font-semibold" {...props}>
                                  {children}
                                </code>
                              );
                            }
                            return (
                              <pre className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-emerald-300 font-mono text-xs overflow-x-auto my-2">
                                <code>{children}</code>
                              </pre>
                            );
                          },
                          table: ({ node, ...props }) => (
                            <div className="overflow-x-auto my-2.5 rounded-lg border border-slate-800">
                              <table className="w-full text-left text-xs text-slate-300" {...props} />
                            </div>
                          ),
                          thead: ({ node, ...props }) => (
                            <thead className="bg-slate-900 text-slate-200 font-semibold border-b border-slate-800" {...props} />
                          ),
                          th: ({ node, ...props }) => (
                            <th className="px-2.5 py-1.5 font-semibold font-mono text-[11px]" {...props} />
                          ),
                          td: ({ node, ...props }) => (
                            <td className="px-2.5 py-1.5 border-t border-slate-800/60 font-mono text-[11px]" {...props} />
                          ),
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>

                      {msg.isStreaming && (
                        <span className="inline-block w-1.5 h-3.5 ml-1 bg-purple-400 animate-pulse align-middle" />
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-purple-300 py-1">
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                      <span className="font-mono text-xs">Reasoning over FIBO Knowledge Graph...</span>
                    </div>
                  )}

                  {/* Footer Controls: Copy & Timestamp */}
                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-800/60 text-[10px] text-slate-400 font-mono">
                    {msg.sender === "copilot" ? (
                      <button
                        onClick={() => copyToClipboard(msg.text, msg.id)}
                        className="flex items-center space-x-1 hover:text-white transition-colors"
                      >
                        {copiedMsgId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
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
          <div className="p-3.5 border-t border-slate-800 bg-[#080c16]">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder={`Ask anything about ${clientName}'s holdings, Reg BI compliance, or sector risks...`}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500/80 shadow-inner"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={loading || !inputMessage.trim()}
                className={`p-2.5 px-3 rounded-xl font-semibold transition-all shrink-0 ${
                  loading || !inputMessage.trim()
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20 active:scale-95"
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Tool & Agent Execution Telemetry (5 Cols) */}
        <div className="lg:col-span-5 xl:col-span-5 flex flex-col h-[650px] glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold text-white tracking-wide font-mono">
                Agent Telemetry & UC Tools
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {loading ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center space-x-1 animate-pulse font-mono">
                  <Activity className="w-3 h-3 animate-spin" />
                  <span>Executing</span>
                </span>
              ) : allSessionTraces.length > 0 ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1 font-mono">
                  <CheckCircle className="w-3 h-3" />
                  <span>{allSessionTraces.length} Steps</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 font-mono">
                  Idle
                </span>
              )}
            </div>
          </div>

          {/* Timeline & Detail Inspector Split View */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Step Sequence Timeline */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Execution Steps Sequence
              </span>

              {allSessionTraces.length === 0 ? (
                <div className="p-6 rounded-xl bg-slate-950/40 border border-slate-800/80 text-center text-xs text-slate-500 space-y-2">
                  <Cpu className="w-8 h-8 text-slate-600 mx-auto animate-pulse" />
                  <p>No active agent execution.</p>
                  <p className="text-[11px] text-slate-600">
                    Ask a question in the chat to see real-time tool calls & graph observations.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {allSessionTraces.map((trace) => {
                    const isSelected = selectedTraceStep === trace.step;
                    return (
                      <button
                        key={trace.step}
                        onClick={() => setSelectedTraceStep(trace.step)}
                        className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between ${
                          isSelected
                            ? "bg-purple-950/40 border-purple-500/60 shadow-md shadow-purple-950/30"
                            : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold shrink-0 ${
                              trace.type === "TOOL_CALL"
                                ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                : trace.type === "OBSERVATION"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            }`}
                          >
                            {trace.type}
                          </span>
                          <span className="text-xs font-semibold text-slate-200 truncate">
                            {trace.action}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-2">
                          #{trace.step}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Active Step JSON Inspector */}
            {activeSelectedTrace && (
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center space-x-1.5">
                    <Database className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Payload Inspector (Step #{activeSelectedTrace.step})</span>
                  </span>
                  <span className="text-[10px] font-mono text-purple-400 font-semibold">
                    {activeSelectedTrace.type}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/90 font-mono text-[10.5px]">
                  <pre className="text-emerald-400 overflow-x-auto p-2 bg-[#080c16] rounded-lg border border-slate-800/80 max-h-48 leading-relaxed">
                    {JSON.stringify(activeSelectedTrace.details, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Governed Infrastructure Card */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-2">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Active Architecture
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-500 block text-[9.5px]">REASONING MODEL</span>
                  <span className="text-slate-200 font-semibold">
                    {modelInfo?.is_openai_active ? "OpenAI GPT-4o" : "Local Planner"}
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-500 block text-[9.5px]">TOOL REGISTRY</span>
                  <span className="text-slate-200 font-semibold">Unity Catalog (5)</span>
                </div>
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-500 block text-[9.5px]">GRAPH ENGINE</span>
                  <span className="text-slate-200 font-semibold">Neo4j Bolt:7687</span>
                </div>
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-500 block text-[9.5px]">ONTOLOGY</span>
                  <span className="text-slate-200 font-semibold">EDMC FIBO v2</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
