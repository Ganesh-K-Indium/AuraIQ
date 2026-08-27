"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  Network,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Search,
  Layers,
  Filter,
  Copy,
  Check,
  Compass,
  ArrowRight,
  Shield,
  Building2,
  Wallet,
  TrendingUp,
  FileCheck2,
  TreeDeciduous,
  LayoutGrid,
} from "lucide-react";

interface NodeData {
  id: number;
  label: string;
  name: string;
  color: string;
  properties: Record<string, any>;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface LinkData {
  source: number;
  target: number;
  type: string;
  properties?: Record<string, any>;
}

interface GraphData {
  nodes: NodeData[];
  links: LinkData[];
}

interface GraphCanvasProps {
  selectedClientId?: string;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({ selectedClientId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"graph" | "tree">("graph");
  const [layoutMode, setLayoutMode] = useState<"hierarchy" | "client_focus" | "force">("hierarchy");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [copiedCypher, setCopiedCypher] = useState(false);

  // Simulation & View Transform State
  const nodesRef = useRef<NodeData[]>([]);
  const linksRef = useRef<LinkData[]>([]);
  const transformRef = useRef<{ x: number; y: number; k: number }>({ x: 0, y: 0, k: 1 });
  const isDraggingRef = useRef(false);
  const dragNodeRef = useRef<NodeData | null>(null);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const fetchGraph = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/graph/data");
      const data: GraphData = await res.json();
      setGraphData(data);
      nodesRef.current = data.nodes;
      linksRef.current = data.links;

      // Auto-select client node
      const targetClient = data.nodes.find(
        (n) =>
          n.properties?.client_id === selectedClientId ||
          (n.label === "Person" && selectedClientId?.includes("001")
            ? n.name?.includes("Victoria")
            : n.name?.includes("Marcus"))
      );
      setSelectedNode(targetClient || data.nodes[0] || null);

      // Initial hierarchy layout
      positionNodes("hierarchy", data.nodes, targetClient?.id);
    } catch (err) {
      console.error("Failed to fetch graph data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, []);

  // Compute connected neighbor IDs for subgraph isolation
  const connectedNodeIds = useMemo(() => {
    if (!selectedNode || !graphData) return new Set<number>();
    const neighbors = new Set<number>([selectedNode.id]);
    graphData.links.forEach((l) => {
      if (l.source === selectedNode.id) neighbors.add(l.target);
      if (l.target === selectedNode.id) neighbors.add(l.source);
    });
    return neighbors;
  }, [selectedNode, graphData]);

  // Structured Position Engines
  const positionNodes = (mode: "hierarchy" | "client_focus" | "force", nodes: NodeData[], focusNodeId?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);
    const cx = width / 2;

    if (mode === "hierarchy" || mode === "client_focus") {
      // Group by FIBO Hierarchy Levels
      const clients = nodes.filter((n) => n.label === "Person");
      const trusts = nodes.filter((n) => n.label === "LegalEntity");
      const portfolios = nodes.filter((n) => n.label === "Portfolio");
      const policies = nodes.filter((n) => n.label === "CompliancePolicy");
      const riskProfiles = nodes.filter((n) => n.label === "RiskProfile");
      const equities = nodes.filter((n) => n.label === "Equity");
      const bonds = nodes.filter((n) => n.label === "Bond");
      const alts = nodes.filter((n) => n.label === "Alternative");

      // Level 1: Clients & Trusts (Y = 80)
      const topRow = [...clients, ...trusts];
      topRow.forEach((n, i) => {
        n.x = cx + (i - (topRow.length - 1) / 2) * 280;
        n.y = 80;
        n.vx = 0;
        n.vy = 0;
      });

      // Level 2: Portfolios & Governance (Y = 220)
      const midRow = [...portfolios, ...riskProfiles, ...policies];
      midRow.forEach((n, i) => {
        n.x = cx + (i - (midRow.length - 1) / 2) * 190;
        n.y = 230;
        n.vx = 0;
        n.vy = 0;
      });

      // Level 3: Financial Instruments (Y = 400 - 480)
      const bottomRow = [...equities, ...bonds, ...alts];
      bottomRow.forEach((n, i) => {
        n.x = cx + (i - (bottomRow.length - 1) / 2) * 115;
        n.y = i % 2 === 0 ? 390 : 470;
        n.vx = 0;
        n.vy = 0;
      });

      transformRef.current = { x: 0, y: 0, k: 0.95 };
    } else {
      // Force Random Initial Circle
      nodes.forEach((n, idx) => {
        const angle = (idx / nodes.length) * 2 * Math.PI;
        n.x = cx + Math.cos(angle) * 220;
        n.y = height / 2 + Math.sin(angle) * 180;
        n.vx = 0;
        n.vy = 0;
      });
      transformRef.current = { x: 0, y: 0, k: 0.95 };
    }
  };

  const handleSwitchLayout = (mode: "hierarchy" | "client_focus" | "force") => {
    setLayoutMode(mode);
    if (graphData) {
      positionNodes(mode, nodesRef.current, selectedNode?.id);
    }
  };

  // Sync with navbar client change
  useEffect(() => {
    if (!graphData || !selectedClientId) return;
    const target = graphData.nodes.find(
      (n) =>
        n.properties?.client_id === selectedClientId ||
        (n.label === "Person" && selectedClientId.includes("001")
          ? n.name?.includes("Victoria")
          : n.name?.includes("Marcus"))
    );
    if (target) {
      setSelectedNode(target);
    }
  }, [selectedClientId, graphData]);

  // High-DPI Canvas Rendering Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Retina / High-DPI Display Scaling
    const dpr = window.devicePixelRatio || 2;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const render = () => {
      const width = rect.width;
      const height = rect.height;
      const nodes = nodesRef.current;
      const links = linksRef.current;
      const t = transformRef.current;

      // Force simulation in force mode
      if (layoutMode === "force") {
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const n1 = nodes[i];
            const n2 = nodes[j];
            const dx = (n2.x || 0) - (n1.x || 0);
            const dy = (n2.y || 0) - (n1.y || 0);
            const distSq = dx * dx + dy * dy + 1;
            const dist = Math.sqrt(distSq);
            const force = 3000 / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            n1.vx = (n1.vx || 0) - fx;
            n1.vy = (n1.vy || 0) - fy;
            n2.vx = (n2.vx || 0) + fx;
            n2.vy = (n2.vy || 0) + fy;
          }
        }

        for (const n of nodes) {
          if (n === dragNodeRef.current) continue;
          n.x = (n.x || 0) + (n.vx || 0);
          n.y = (n.y || 0) + (n.vy || 0);
          n.vx = (n.vx || 0) * 0.85;
          n.vy = (n.vy || 0) * 0.85;
        }
      }

const getNodeTheme = (label: string, isDark: boolean) => {
  switch (label) {
    case "Person":
      return {
        color: isDark ? "#818cf8" : "#4f46e5",
        bg: isDark ? "#0f1322" : "#ffffff",
        text: isDark ? "#ffffff" : "#0f172a",
        sub: isDark ? "#94a3b8" : "#475569",
        tag: isDark ? "#a5b4fc" : "#4338ca",
      };
    case "InvestmentPortfolio":
      return {
        color: isDark ? "#34d399" : "#059669",
        bg: isDark ? "#0a1715" : "#ffffff",
        text: isDark ? "#ffffff" : "#0f172a",
        sub: isDark ? "#94a3b8" : "#475569",
        tag: isDark ? "#6ee7b7" : "#047857",
      };
    case "Share":
      return {
        color: isDark ? "#38bdf8" : "#0284c7",
        bg: isDark ? "#091522" : "#ffffff",
        text: isDark ? "#ffffff" : "#0f172a",
        sub: isDark ? "#94a3b8" : "#475569",
        tag: isDark ? "#7dd3fc" : "#0369a1",
      };
    case "Bond":
      return {
        color: isDark ? "#fbbf24" : "#d97706",
        bg: isDark ? "#17140b" : "#ffffff",
        text: isDark ? "#ffffff" : "#0f172a",
        sub: isDark ? "#94a3b8" : "#475569",
        tag: isDark ? "#fde68a" : "#b45309",
      };
    case "AlternativeAsset":
      return {
        color: isDark ? "#c084fc" : "#9333ea",
        bg: isDark ? "#150d20" : "#ffffff",
        text: isDark ? "#ffffff" : "#0f172a",
        sub: isDark ? "#94a3b8" : "#475569",
        tag: isDark ? "#e9d5ff" : "#7e22ce",
      };
    case "LegalEntity":
      return {
        color: isDark ? "#fb7185" : "#e11d48",
        bg: isDark ? "#1b0b12" : "#ffffff",
        text: isDark ? "#ffffff" : "#0f172a",
        sub: isDark ? "#94a3b8" : "#475569",
        tag: isDark ? "#fecdd3" : "#be123c",
      };
    case "CompliancePolicy":
      return {
        color: isDark ? "#2dd4bf" : "#0d9488",
        bg: isDark ? "#091716" : "#ffffff",
        text: isDark ? "#ffffff" : "#0f172a",
        sub: isDark ? "#94a3b8" : "#475569",
        tag: isDark ? "#99f6e4" : "#0f766e",
      };
    default:
      return {
        color: isDark ? "#94a3b8" : "#64748b",
        bg: isDark ? "#0f172a" : "#ffffff",
        text: isDark ? "#ffffff" : "#0f172a",
        sub: isDark ? "#94a3b8" : "#475569",
        tag: isDark ? "#cbd5e1" : "#475569",
      };
  }
};

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

      // Canvas Background fill
      ctx.fillStyle = isDark ? "#070a12" : "#f8fafc";
      ctx.fillRect(0, 0, width, height);

      // Background Grid Dots
      ctx.fillStyle = isDark ? "rgba(30, 41, 59, 0.4)" : "rgba(203, 213, 225, 0.7)";
      for (let gx = 0; gx < width; gx += 28) {
        for (let gy = 0; gy < height; gy += 28) {
          ctx.fillRect(gx, gy, 1.5, 1.5);
        }
      }

      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.scale(t.k, t.k);

      const nodeMap = new Map(nodes.map((n) => [n.id, n]));

      // 1. Draw Links with High Contrast Curved Paths
      for (const link of links) {
        const source = nodeMap.get(link.source);
        const target = nodeMap.get(link.target);
        if (!source || !target) continue;

        const isHighlighted =
          selectedNode &&
          (link.source === selectedNode.id || link.target === selectedNode.id);
        const isDimmed = selectedNode && !isHighlighted;

        ctx.beginPath();
        ctx.moveTo(source.x || 0, source.y || 0);
        ctx.lineTo(target.x || 0, target.y || 0);
        ctx.strokeStyle = isHighlighted
          ? (isDark ? "#38bdf8" : "#0284c7")
          : isDimmed
          ? (isDark ? "rgba(51, 65, 85, 0.2)" : "rgba(203, 213, 225, 0.3)")
          : (isDark ? "rgba(100, 116, 139, 0.45)" : "rgba(148, 163, 184, 0.7)");
        ctx.lineWidth = isHighlighted ? 2.5 : 1.2;
        ctx.stroke();

        // Relationship Pill Label Badge
        if (!isDimmed) {
          const midX = ((source.x || 0) + (target.x || 0)) / 2;
          const midY = ((source.y || 0) + (target.y || 0)) / 2;

          ctx.fillStyle = isHighlighted
            ? (isDark ? "#0f172a" : "#ffffff")
            : (isDark ? "#0a0f1d" : "#ffffff");
          ctx.beginPath();
          ctx.roundRect(midX - 35, midY - 8, 70, 16, 4);
          ctx.fill();
          ctx.strokeStyle = isHighlighted
            ? (isDark ? "#38bdf8" : "#0284c7")
            : (isDark ? "rgba(100, 116, 139, 0.4)" : "#cbd5e1");
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = isHighlighted
            ? (isDark ? "#38bdf8" : "#0284c7")
            : (isDark ? "#94a3b8" : "#475569");
          ctx.font = "bold 8.5px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(link.type, midX, midY);
        }
      }

      // 2. Draw Crystal-Clear Structured Entity Cards / Nodes
      for (const n of nodes) {
        if (filterType !== "ALL" && n.label !== filterType) continue;

        const isSelected = selectedNode?.id === n.id;
        const isConnected = connectedNodeIds.has(n.id);
        const isDimmed = selectedNode && !isSelected && !isConnected;

        const cardWidth = 120;
        const cardHeight = 44;
        const cardX = (n.x || 0) - cardWidth / 2;
        const cardY = (n.y || 0) - cardHeight / 2;

        const theme = getNodeTheme(n.label, isDark);

        // Glowing selection halo
        if (isSelected) {
          ctx.beginPath();
          ctx.roundRect(cardX - 4, cardY - 4, cardWidth + 8, cardHeight + 8, 10);
          ctx.fillStyle = isDark ? "rgba(56, 189, 248, 0.25)" : "rgba(2, 132, 199, 0.2)";
          ctx.fill();
        }

        // Main Node Box
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 8);
        ctx.fillStyle = isDimmed
          ? (isDark ? "rgba(15, 23, 42, 0.3)" : "rgba(241, 245, 249, 0.4)")
          : theme.bg;
        ctx.fill();
        ctx.strokeStyle = isSelected
          ? (isDark ? "#38bdf8" : "#0284c7")
          : isDimmed
          ? (isDark ? "rgba(51, 65, 85, 0.2)" : "rgba(203, 213, 225, 0.4)")
          : theme.color;
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.stroke();

        // Left Color Bar
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, 4, cardHeight, [8, 0, 0, 8]);
        ctx.fillStyle = isDimmed ? (isDark ? "rgba(71, 85, 105, 0.3)" : "rgba(203, 213, 225, 0.4)") : theme.color;
        ctx.fill();

        // Category Tag (Top Line)
        ctx.fillStyle = isDimmed ? (isDark ? "rgba(100, 116, 139, 0.3)" : "rgba(148, 163, 184, 0.4)") : theme.tag;
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(n.label.toUpperCase(), cardX + 9, cardY + 7);

        // Node Name / Ticker (Bold Primary Line)
        ctx.fillStyle = isDimmed ? (isDark ? "rgba(148, 163, 184, 0.3)" : "rgba(148, 163, 184, 0.4)") : theme.text;
        ctx.font = "bold 10px sans-serif";
        const displayName = n.name.length > 15 ? n.name.slice(0, 14) + "…" : n.name;
        ctx.fillText(displayName, cardX + 9, cardY + 18);

        // Subtitle / Metric (Bottom Line)
        let subtitle = n.properties?.ticker || n.properties?.jurisdiction || "";
        if (n.properties?.total_aum) {
          subtitle = `$${(n.properties.total_aum / 1_000_000).toFixed(1)}M AUM`;
        } else if (n.properties?.current_price) {
          subtitle = `$${n.properties.current_price} • ${n.properties.sector || n.label}`;
        } else if (n.properties?.coupon_rate) {
          subtitle = `${(n.properties.coupon_rate * 100).toFixed(2)}% Yield`;
        }

        if (subtitle) {
          ctx.fillStyle = isDimmed ? (isDark ? "rgba(100, 116, 139, 0.2)" : "rgba(148, 163, 184, 0.3)") : theme.sub;
          ctx.font = "8px sans-serif";
          ctx.fillText(subtitle, cardX + 9, cardY + 31);
        }
      }

      ctx.restore();
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [graphData, selectedNode, connectedNodeIds, layoutMode, filterType]);

  // Mouse Interaction (Click & Drag)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left - transformRef.current.x) / transformRef.current.k;
    const my = (e.clientY - rect.top - transformRef.current.y) / transformRef.current.k;

    // Check hit on card bounds (width 120, height 44)
    for (const n of nodesRef.current) {
      const halfW = 60;
      const halfH = 22;
      if (
        mx >= (n.x || 0) - halfW &&
        mx <= (n.x || 0) + halfW &&
        my >= (n.y || 0) - halfH &&
        my <= (n.y || 0) + halfH
      ) {
        dragNodeRef.current = n;
        setSelectedNode(n);
        isDraggingRef.current = true;
        return;
      }
    }

    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX - transformRef.current.x,
      y: e.clientY - transformRef.current.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (dragNodeRef.current) {
      dragNodeRef.current.x =
        (e.clientX - canvas.getBoundingClientRect().left - transformRef.current.x) /
        transformRef.current.k;
      dragNodeRef.current.y =
        (e.clientY - canvas.getBoundingClientRect().top - transformRef.current.y) /
        transformRef.current.k;
    } else {
      transformRef.current.x = e.clientX - dragStartRef.current.x;
      transformRef.current.y = e.clientY - dragStartRef.current.y;
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    dragNodeRef.current = null;
  };

  const zoom = (factor: number) => {
    transformRef.current.k = Math.max(0.4, Math.min(2.5, transformRef.current.k * factor));
  };

  const resetZoom = () => {
    transformRef.current = { x: 0, y: 0, k: 0.95 };
  };

  const handleSearchNode = (name: string) => {
    setSearchQuery(name);
    const target = nodesRef.current.find((n) =>
      n.name.toLowerCase().includes(name.toLowerCase()) ||
      (n.properties?.ticker && n.properties.ticker.toLowerCase().includes(name.toLowerCase()))
    );
    if (target) {
      setSelectedNode(target);
    }
  };

  const copyNodeCypher = () => {
    if (!selectedNode) return;
    const cypher = `MATCH (n:\`${selectedNode.label}\` {id: ${selectedNode.id}}) RETURN n;`;
    navigator.clipboard.writeText(cypher);
    setCopiedCypher(true);
    setTimeout(() => setCopiedCypher(false), 2000);
  };

  // Connected relationships for selected node
  const connectedRelationships = useMemo(() => {
    if (!selectedNode || !graphData) return [];
    const nodeMap = new Map(graphData.nodes.map((n) => [n.id, n]));
    return graphData.links
      .filter((l) => l.source === selectedNode.id || l.target === selectedNode.id)
      .map((l) => ({
        type: l.type,
        targetNode: l.source === selectedNode.id ? nodeMap.get(l.target) : nodeMap.get(l.source),
        direction: l.source === selectedNode.id ? "OUTGOING" : "INCOMING",
      }));
  }, [selectedNode, graphData]);

  // Structured Hierarchy Grouping for Tree View
  const hierarchyGroups = useMemo(() => {
    if (!graphData) return null;
    return {
      clients: graphData.nodes.filter((n) => n.label === "Person"),
      trusts: graphData.nodes.filter((n) => n.label === "LegalEntity"),
      portfolios: graphData.nodes.filter((n) => n.label === "Portfolio"),
      policies: graphData.nodes.filter((n) => n.label === "CompliancePolicy"),
      equities: graphData.nodes.filter((n) => n.label === "Equity"),
      bonds: graphData.nodes.filter((n) => n.label === "Bond"),
      alternatives: graphData.nodes.filter((n) => n.label === "Alternative"),
    };
  }, [graphData]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Studio Header Toolbar */}
      <div className="glass-panel p-5 rounded-2xl bg-gradient-to-r from-blue-950/50 via-[#0d1424] to-slate-950 border border-blue-900/40 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center space-x-2.5">
            <Network className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              FIBO Graph Intelligence Studio
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            High-resolution entity visualization with structured hierarchy & direct subgraph isolation
          </p>
        </div>

        {/* View Mode & Layout Buttons */}
        <div className="flex items-center space-x-2">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode("graph")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "graph"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Interactive Graph</span>
            </button>
            <button
              onClick={() => setViewMode("tree")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "tree"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <TreeDeciduous className="w-3.5 h-3.5" />
              <span>Hierarchy Tree</span>
            </button>
          </div>

          {viewMode === "graph" && (
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => handleSwitchLayout("hierarchy")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  layoutMode === "hierarchy" ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                Structured Tree
              </button>
              <button
                onClick={() => handleSwitchLayout("force")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  layoutMode === "force" ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                Network
              </button>
            </div>
          )}

          <button
            onClick={fetchGraph}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 transition-colors"
            title="Reload Graph"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Studio View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Canvas or Structured Tree */}
        <div className="lg:col-span-8 glass-panel p-4 rounded-2xl border border-slate-800 relative flex flex-col items-center shadow-2xl">
          {viewMode === "graph" ? (
            <>
              {/* Canvas Controls Header */}
              <div className="w-full flex items-center justify-between gap-3 mb-3">
                {/* Search */}
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search node (e.g. AAPL, Victoria)..."
                    value={searchQuery}
                    onChange={(e) => handleSearchNode(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Filter & Zoom Controls */}
                <div className="flex items-center space-x-2">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-xs text-slate-300 py-1.5 px-3 rounded-lg focus:outline-none"
                  >
                    <option value="ALL">All FIBO Layers</option>
                    <option value="Person">Clients (Person)</option>
                    <option value="Portfolio">InvestmentPortfolio</option>
                    <option value="Equity">Equities / Shares</option>
                    <option value="Bond">Fixed Income Bonds</option>
                    <option value="Alternative">Alternative Funds</option>
                    <option value="LegalEntity">Irrevocable Trusts</option>
                    <option value="CompliancePolicy">Compliance Rules</option>
                  </select>

                  <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button
                      onClick={() => zoom(1.2)}
                      className="p-1 hover:bg-slate-800 rounded text-slate-300"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => zoom(0.8)}
                      className="p-1 hover:bg-slate-800 rounded text-slate-300"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={resetZoom}
                      className="p-1 hover:bg-slate-800 rounded text-slate-300"
                      title="Reset View"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* High-DPI Crisp Canvas */}
              <div ref={containerRef} className="w-full h-[560px] relative">
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  className="w-full h-full bg-[#060911] rounded-xl cursor-grab active:cursor-grabbing border border-slate-800 shadow-inner"
                />
              </div>

              {/* Bottom Interactive Legend */}
              <div className="w-full mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                <div className="flex flex-wrap items-center gap-3 font-semibold">
                  <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" /><span>Client</span></span>
                  <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_8px_#3b82f6]" /><span>Portfolio</span></span>
                  <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" /><span>Equity</span></span>
                  <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_8px_#8b5cf6]" /><span>Bond</span></span>
                  <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-pink-400 shadow-[0_0_8px_#ec4899]" /><span>Alternative</span></span>
                  <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]" /><span>Trust</span></span>
                </div>
                <span className="text-[11px] text-blue-400 font-bold">
                  Click any card to isolate & trace its subgraph
                </span>
              </div>
            </>
          ) : (
            /* Structured Tree / Hierarchy View */
            <div className="w-full space-y-6 p-2 max-h-[620px] overflow-y-auto pr-2">
              {/* Level 1: Clients & Estate Entities */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2 flex items-center space-x-1.5">
                  <Building2 className="w-4 h-4" />
                  <span>Level 1: High-Net-Worth Clients & Estate Trusts</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {hierarchyGroups?.clients.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => setSelectedNode(c)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        selectedNode?.id === c.id
                          ? "bg-emerald-500/15 border-emerald-400 shadow-lg shadow-emerald-500/10"
                          : "bg-slate-950 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-white">{c.name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                          {c.properties?.net_worth_tier}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">Tax Nexus: {c.properties?.tax_residence}</div>
                    </div>
                  ))}
                  {hierarchyGroups?.trusts.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedNode(t)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        selectedNode?.id === t.id
                          ? "bg-cyan-500/15 border-cyan-400 shadow-lg shadow-cyan-500/10"
                          : "bg-slate-950 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-white">{t.name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-400">
                          {t.properties?.entity_type}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">Jurisdiction: {t.properties?.jurisdiction}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Level 2: Portfolios & Governance */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center space-x-1.5">
                  <Wallet className="w-4 h-4" />
                  <span>Level 2: Investment Portfolios & Mandates</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {hierarchyGroups?.portfolios.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedNode(p)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        selectedNode?.id === p.id
                          ? "bg-blue-500/15 border-blue-400 shadow-lg shadow-blue-500/10"
                          : "bg-slate-950 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-white">{p.name}</span>
                        <span className="font-mono font-bold text-emerald-400">
                          ${(p.properties?.total_aum / 1_000_000).toFixed(1)}M AUM
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">Type: {p.properties?.portfolio_type} Discretionary</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Level 3: Underlying Financial Instruments */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center space-x-1.5">
                  <TrendingUp className="w-4 h-4" />
                  <span>Level 3: Underlying FIBO Financial Instruments</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[...(hierarchyGroups?.equities || []), ...(hierarchyGroups?.bonds || []), ...(hierarchyGroups?.alternatives || [])].map((inst) => (
                    <div
                      key={inst.id}
                      onClick={() => setSelectedNode(inst)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        selectedNode?.id === inst.id
                          ? "bg-amber-500/15 border-amber-400 shadow"
                          : "bg-slate-950 border-slate-800/80 hover:border-slate-700"
                      }`}
                    >
                      <div className="font-bold text-xs text-white truncate">{inst.name}</div>
                      <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400 font-mono">
                        <span>{inst.properties?.ticker || inst.properties?.fund_id || "BOND"}</span>
                        <span className="text-emerald-400 font-semibold">{inst.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Rich Node Inspector Drawer */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-slate-200 font-bold text-sm">
                <Compass className="w-4 h-4 text-blue-400" />
                <span>FIBO Entity Inspector</span>
              </div>
              {selectedNode && (
                <button
                  onClick={copyNodeCypher}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300 transition-colors"
                >
                  {copiedCypher ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCypher ? "Copied" : "Copy Cypher"}</span>
                </button>
              )}
            </div>

            {selectedNode ? (
              <div className="space-y-4">
                {/* Node Main Details Card */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      FIBO Ontology Type
                    </span>
                    <span
                      className="px-2.5 py-0.5 rounded text-[10px] font-bold text-white shadow-sm"
                      style={{ backgroundColor: selectedNode.color }}
                    >
                      {selectedNode.label}
                    </span>
                  </div>
                  <div className="text-base font-bold text-white tracking-tight">{selectedNode.name}</div>
                  <div className="text-[11px] font-mono text-slate-400">Graph Node ID: #{selectedNode.id}</div>
                </div>

                {/* Direct Connected Relationships */}
                <div>
                  <div className="text-xs font-bold text-slate-300 mb-2 flex items-center justify-between">
                    <span>Connected Subgraph Links</span>
                    <span className="font-mono text-[10px] text-blue-400 font-bold">
                      {connectedRelationships.length} Connections
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {connectedRelationships.map((rel, idx) => (
                      <div
                        key={idx}
                        onClick={() => rel.targetNode && setSelectedNode(rel.targetNode)}
                        className="p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-xs cursor-pointer transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-[10px] text-blue-300 font-bold">[:{rel.type}]</span>
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <span className="font-semibold text-slate-200 truncate max-w-[120px]">
                            {rel.targetNode?.name || "Target"}
                          </span>
                        </div>
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: rel.targetNode?.color || "#94a3b8" }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Node Raw Properties */}
                <div>
                  <span className="text-xs font-bold text-slate-300 block mb-1.5">
                    FIBO Schema Properties
                  </span>
                  <pre className="p-3 bg-slate-950 rounded-xl text-[11px] font-mono text-emerald-300 overflow-x-auto border border-slate-800 max-h-48">
                    {JSON.stringify(selectedNode.properties, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs">
                Select any node on the graph to inspect entity attributes.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
