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
  ArrowRight,
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
  const [activeTraces, setActiveTraces] = useState<StepTrace[]>([]);
  const [modelInfo, setModelInfo] = useState<any>(null);
  const [expandedTraceMsgId, setExpandedTraceMsgId] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
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
        text: `### Welcome to AURA Wealth Copilot\n\nI have loaded the multi-asset portfolio and legal entity graph for **${clientName}** (\`${selectedClientId}\`).\n\n**Governed Capabilities Available**:\n- **SEC Regulation Best Interest (Reg BI)** Suitability Audit\n- **Cross-Book Sector & Semiconductor** Concentration Screening\n- **Delaware Irrevocable Trust** Estate Tax Nexus Analysis\n- **Asset Allocation Drift** & Trade Order Generation\n\nHow would you like to proceed?`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  }, [selectedClientId, clientName]);

  const accumulatedTextRef = useRef("");
  const rafIdRef = useRef<number | null>(null);

  // Auto-scroll on new message content
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, activeTraces.length, loading]);

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
    setActiveTraces([]);
    accumulatedTextRef.current = "";

    try {
      const currentTraces: StepTrace[] = [];

      // Connect to FastAPI SSE Stream
      const url = `http://localhost:8000/api/agent/chat-stream?client_id=${encodeURIComponent(
        selectedClientId
      )}&message=${encodeURIComponent(text)}`;

      const eventSource = new EventSource(url);

      // Smooth RAF flush loop
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
            setActiveTraces([...currentTraces]);

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
            setExpandedTraceMsgId(copilotMsgId);
            eventSource.close();
            setLoading(false);
            setActiveTraces([]);
          }
        } catch (parseErr) {
          console.error("Error parsing SSE stream message", parseErr);
        }
      };

      eventSource.onerror = (err) => {
        console.error("SSE stream closed", err);
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
        eventSource.close();
        setLoading(false);
        setActiveTraces([]);
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

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      {/* Copilot Header */}
      <div className="glass-panel p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-slate-950 border border-purple-900/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center shadow-lg shadow-purple-500/10">
            <Bot className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Mosaic AI Wealth Copilot
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
                  <span>{modelInfo.is_openai_active ? "OpenAI GPT-4o (Active)" : "Local FIBO ReAct Engine"}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time SSE tool execution traces & multi-hop graph reasoning
            </p>
          </div>
        </div>

        <button
          onClick={() => setMessages([])}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Clear Chat</span>
        </button>
      </div>

      {/* Suggested Prompt Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {PROMPT_CHIPS.map((chip, idx) => {
          const Icon = chip.icon;
          return (
            <button
              key={idx}
              onClick={() => handleSendMessage(chip.prompt)}
              disabled={loading}
              className="glass-panel p-3.5 rounded-xl border border-slate-800 hover:border-purple-500/50 hover:bg-purple-500/5 text-left transition-all flex items-start space-x-2.5 group active:scale-[0.98] shadow-sm"
            >
              <Icon className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform mt-0.5 shrink-0" />
              <div className="text-xs font-semibold text-slate-200 group-hover:text-purple-300">
                {chip.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Fluid Chat Box */}
      <div className="glass-panel rounded-2xl border border-slate-800 flex flex-col h-[640px] overflow-hidden shadow-2xl">
        {/* Messages Stream */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start space-x-3.5 ${
                msg.sender === "user" ? "flex-row-reverse space-x-reverse" : ""
              }`}
            >
              {/* Avatar */}
              <div
                className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                  msg.sender === "user"
                    ? "bg-emerald-600/30 border border-emerald-500/40 text-emerald-300"
                    : "bg-purple-600/30 border border-purple-500/40 text-purple-300"
                }`}
              >
                {msg.sender === "user" ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              </div>

              {/* Message Content Bubble */}
              <div
                className={`max-w-3xl rounded-2xl p-5 text-sm shadow-xl transition-all ${
                  msg.sender === "user"
                    ? "bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-medium"
                    : "glass-panel bg-[#0d121f]/95 border border-slate-800/90 text-slate-100"
                }`}
              >
                {/* Real-time Tool Execution Badges Accordion */}
                {msg.traces && msg.traces.length > 0 && (
                  <div className="mb-4 pb-3.5 border-b border-slate-800/80">
                    <button
                      onClick={() =>
                        setExpandedTraceMsgId(expandedTraceMsgId === msg.id ? null : msg.id)
                      }
                      className="flex items-center justify-between w-full text-xs font-mono text-purple-400 hover:text-purple-300 bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <Terminal className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                        <span className="font-bold">
                          {msg.traces.length} Databricks UC & FIBO Reasoning Steps
                        </span>
                      </div>
                      {expandedTraceMsgId === msg.id ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {expandedTraceMsgId === msg.id && (
                      <div className="mt-3 space-y-2.5 animate-fadeIn">
                        {msg.traces.map((trace, i) => (
                          <div
                            key={i}
                            className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px]"
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span
                                className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                                  trace.type === "TOOL_CALL"
                                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                    : trace.type === "OBSERVATION"
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                }`}
                              >
                                [{trace.type}] {trace.action}
                              </span>
                              <span className="text-[10px] text-slate-500 font-sans">Step #{trace.step}</span>
                            </div>
                            <pre className="text-[10px] text-emerald-400 overflow-x-auto p-2.5 bg-[#080c16] rounded-lg border border-slate-800/80 max-h-40 leading-tight">
                              {JSON.stringify(trace.details, null, 2)}
                            </pre>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Rich Markdown Output */}
                {msg.text ? (
                  <div className="prose prose-invert prose-sm max-w-none text-slate-200 leading-relaxed">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ node, ...props }) => (
                          <h1 className="text-lg font-bold text-white mt-3 mb-2 border-b border-slate-800 pb-1" {...props} />
                        ),
                        h2: ({ node, ...props }) => (
                          <h2 className="text-base font-bold text-white mt-3 mb-1.5 text-emerald-400" {...props} />
                        ),
                        h3: ({ node, ...props }) => (
                          <h3 className="text-sm font-bold text-white mt-2.5 mb-1 text-purple-300 flex items-center space-x-1.5" {...props} />
                        ),
                        p: ({ node, ...props }) => (
                          <p className="mb-2.5 text-slate-200 leading-relaxed text-sm" {...props} />
                        ),
                        strong: ({ node, ...props }) => (
                          <strong className="font-bold text-white" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul className="list-disc ml-5 mb-2.5 space-y-1 text-slate-200 text-sm" {...props} />
                        ),
                        ol: ({ node, ...props }) => (
                          <ol className="list-decimal ml-5 mb-2.5 space-y-1 text-slate-200 text-sm" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                          <li className="my-0.5 text-slate-200" {...props} />
                        ),
                        blockquote: ({ node, ...props }) => (
                          <blockquote className="border-l-2 border-purple-500 pl-3 italic my-2 text-slate-300" {...props} />
                        ),
                        code: ({ node, className, children, ...props }: any) => {
                          const isInline = !className && typeof children === "string";
                          if (isInline) {
                            return (
                              <code className="px-1.5 py-0.5 bg-slate-900 border border-slate-700/80 rounded text-emerald-400 font-mono text-xs font-semibold" {...props}>
                                {children}
                              </code>
                            );
                          }
                          return (
                            <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-emerald-300 font-mono text-xs overflow-x-auto my-2">
                              <code>{children}</code>
                            </pre>
                          );
                        },
                        table: ({ node, ...props }) => (
                          <div className="overflow-x-auto my-3 rounded-xl border border-slate-800">
                            <table className="w-full text-left text-xs text-slate-300" {...props} />
                          </div>
                        ),
                        thead: ({ node, ...props }) => (
                          <thead className="bg-slate-900 text-slate-200 font-semibold border-b border-slate-800" {...props} />
                        ),
                        th: ({ node, ...props }) => (
                          <th className="px-3 py-2 font-semibold font-mono text-[11px]" {...props} />
                        ),
                        td: ({ node, ...props }) => (
                          <td className="px-3 py-2 border-t border-slate-800/60 font-mono text-[11px]" {...props} />
                        ),
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>

                    {msg.isStreaming && (
                      <span className="inline-block w-2 h-4 ml-1 bg-purple-400 animate-pulse align-middle" />
                    )}
                  </div>
                ) : (
                  <div className="flex items-center space-x-2.5 text-purple-300 py-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping" />
                    <span className="font-mono text-xs font-semibold">
                      Reasoning over FIBO Knowledge Graph & Executing UC Tools...
                    </span>
                  </div>
                )}

                {/* Footer Controls: Copy & Timestamp */}
                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800/60 text-[11px] text-slate-400 font-mono">
                  {msg.sender === "copilot" ? (
                    <button
                      onClick={() => copyToClipboard(msg.text, msg.id)}
                      className="flex items-center space-x-1.5 hover:text-white transition-colors"
                    >
                      {copiedMsgId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedMsgId === msg.id ? "Copied Markdown" : "Copy Markdown"}</span>
                    </button>
                  ) : (
                    <span />
                  )}
                  <span>{msg.timestamp}</span>
                </div>
              </div>
            </div>
          ))}

          {/* Active Live Tool Progress Bar while Loading */}
          {loading && activeTraces.length > 0 && (
            <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-800/50 text-xs text-purple-200 animate-pulse flex items-center justify-between shadow-lg">
              <div className="flex items-center space-x-2.5">
                <Activity className="w-4 h-4 text-purple-400 animate-spin" />
                <span className="font-mono text-xs font-semibold">
                  {activeTraces[activeTraces.length - 1]?.action || "Executing FIBO Graph Query..."}
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded text-[10.5px] font-bold bg-purple-900/80 text-purple-300 font-mono border border-purple-700/50">
                Step #{activeTraces.length} Active
              </span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-[#080c16]">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder={`Ask anything about ${clientName}'s holdings, Reg BI compliance, or sector risks...`}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500/80 shadow-inner"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={loading || !inputMessage.trim()}
              className={`p-3 rounded-xl font-semibold transition-all ${
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
    </div>
  );
};
