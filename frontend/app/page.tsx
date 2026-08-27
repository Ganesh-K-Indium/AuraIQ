"use client";

import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { LandingHero } from "@/components/LandingHero";
import { ExecutiveDashboard } from "@/components/ExecutiveDashboard";
import { AgentCopilot } from "@/components/AgentCopilot";
import { GraphCanvas } from "@/components/GraphCanvas";
import { CypherStudio } from "@/components/CypherStudio";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"landing" | "dashboard" | "copilot" | "graph" | "cypher">("landing");
  const [selectedClientId, setSelectedClientId] = useState<string>("HNW-CLIENT-001");
  const [clients, setClients] = useState<any[]>([]);
  const [clientData, setClientData] = useState<any | null>(null);
  const [systemHealth, setSystemHealth] = useState<any | null>(null);

  // Initial Fetch: Health & Clients List
  useEffect(() => {
    const initData = async () => {
      try {
        const healthRes = await fetch("http://localhost:8000/api/health");
        const healthData = await healthRes.json();
        setSystemHealth(healthData);

        const clientsRes = await fetch("http://localhost:8000/api/clients");
        const clientsData = await clientsRes.json();
        if (clientsData.clients && clientsData.clients.length > 0) {
          setClients(clientsData.clients);
          setSelectedClientId(clientsData.clients[0].client_id);
        }
      } catch (err) {
        console.error("Failed to load initial system data", err);
      }
    };
    initData();
  }, []);

  // Fetch Selected Client Details
  useEffect(() => {
    if (!selectedClientId) return;
    const fetchClient = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/client/${selectedClientId}`);
        const data = await res.json();
        setClientData(data);
      } catch (err) {
        console.error("Failed to fetch client details", err);
      }
    };
    fetchClient();
  }, [selectedClientId]);

  const currentClient = clients.find((c) => c.client_id === selectedClientId);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#070a12] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20">
      {/* Fixed Top Navbar (Only visible inside application workspace) */}
      {activeTab !== "landing" && (
        <div className="shrink-0 z-50 animate-fadeIn">
          <Navbar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedClientId={selectedClientId}
            setSelectedClientId={setSelectedClientId}
            clients={clients}
            systemHealth={systemHealth}
          />
        </div>
      )}

      {/* Scrollable Viewport Container */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Main Content Area */}
        <main className={`flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 ${activeTab === "landing" ? "py-4" : "py-8"}`}>
          {activeTab === "landing" && (
            <LandingHero
              onEnter={(tab) => setActiveTab(tab || "dashboard")}
              clients={clients}
              selectedClientId={selectedClientId}
              setSelectedClientId={setSelectedClientId}
              systemHealth={systemHealth}
            />
          )}

          {activeTab === "dashboard" && (
            <ExecutiveDashboard
              key={selectedClientId}
              clientData={clientData}
              onNavigateToCopilot={() => setActiveTab("copilot")}
              onNavigateToGraph={() => setActiveTab("graph")}
            />
          )}

          {activeTab === "copilot" && (
            <AgentCopilot
              key={selectedClientId}
              selectedClientId={selectedClientId}
              clientName={currentClient?.name || "Client"}
            />
          )}

          {activeTab === "graph" && <GraphCanvas selectedClientId={selectedClientId} />}

          {activeTab === "cypher" && <CypherStudio />}
        </main>

        {/* Institutional Footer */}
        <footer className="border-t border-slate-800/80 bg-[#080c16] py-4 text-center text-xs text-slate-500 shrink-0">
          <div className="max-w-[1600px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="flex items-center space-x-2">
              <span className="font-bold text-slate-400">AURA Wealth IQ</span>
              <span>•</span>
              <span>Financial Industry Business Ontology (FIBO)</span>
              <span>•</span>
              <span>Databricks Mosaic AI Agent Framework</span>
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              Neo4j Engine: Active (Bolt :7687) • Protocol: FastMCP 2.0
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
