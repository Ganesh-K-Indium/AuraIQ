"""
Agentic RAG Engine for Wealth Management following FIBO Ontology.
Powered by OpenAI GPT-4o with Databricks Unity Catalog Tool Calling
and MLflow-compatible step-by-step reasoning traces.
"""

from typing import Any, Dict, List, Optional
import os
import time
import json
import structlog
from dotenv import load_dotenv

load_dotenv()

from src.tools.uc_portfolio_tools import (
    get_client_profile_and_holdings,
    check_portfolio_risk_suitability,
    find_correlated_exposure,
    analyze_client_tax_and_trust_structure,
    query_fibo_knowledge_graph,
)

logger = structlog.get_logger()

# OpenAI Tool Definitions for Unity Catalog Tools
OPENAI_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_client_profile_and_holdings",
            "description": "Retrieves comprehensive client profile, risk tolerance, and multi-asset portfolio holdings from FIBO knowledge graph.",
            "parameters": {
                "type": "object",
                "properties": {
                    "client_id": {
                        "type": "string",
                        "description": "Unique Client identifier (e.g. HNW-CLIENT-001 or HNW-CLIENT-002)",
                    }
                },
                "required": ["client_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "check_portfolio_risk_suitability",
            "description": "Evaluates portfolio asset allocation drift against target mandate and audits compliance under SEC Regulation Best Interest (Reg BI). If portfolio_id is omitted, automatically evaluates the client's primary portfolio.",
            "parameters": {
                "type": "object",
                "properties": {
                    "client_id": {"type": "string", "description": "Unique Client identifier (e.g. HNW-CLIENT-001 or HNW-CLIENT-002)"},
                    "portfolio_id": {"type": "string", "description": "Optional portfolio identifier (e.g. 'PORT-VS-GROWTH-01' or 'PORT-MT-INCOME-02'). If omitted, defaults to primary portfolio."},
                },
                "required": ["client_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "find_correlated_exposure",
            "description": "Screens the entire institutional wealth book for systemic concentration risk in a specific sector (e.g. Technology, Healthcare).",
            "parameters": {
                "type": "object",
                "properties": {
                    "sector": {"type": "string", "description": "Industry sector name (e.g. Technology, Financials)"},
                    "min_allocation_pct": {
                        "type": "number",
                        "description": "Minimum allocation threshold (e.g. 0.05 for 5%)",
                        "default": 0.05,
                    },
                },
                "required": ["sector"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "analyze_client_tax_and_trust_structure",
            "description": "Analyzes client tax domicile, KYC status, and connected estate planning entities such as Delaware Irrevocable Trusts.",
            "parameters": {
                "type": "object",
                "properties": {
                    "client_id": {"type": "string", "description": "Unique Client identifier"},
                },
                "required": ["client_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "query_fibo_knowledge_graph",
            "description": "Executes a safe read-only Cypher query directly against the Neo4j FIBO graph database for custom relational analysis.",
            "parameters": {
                "type": "object",
                "properties": {
                    "cypher_query": {"type": "string", "description": "Read-only Cypher MATCH query"},
                },
                "required": ["cypher_query"],
            },
        },
    },
]


class AgentStepTrace:
    """Structured trace for an agent reasoning step, compatible with MLflow Tracing."""

    def __init__(self, step_number: int, step_type: str, action: str, details: Dict[str, Any]):
        self.step_number = step_number
        self.step_type = step_type  # e.g., 'PLAN', 'TOOL_CALL', 'OBSERVATION', 'SYNTHESIS'
        self.action = action
        self.details = details
        self.timestamp = time.time()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "step": self.step_number,
            "type": self.step_type,
            "action": self.action,
            "details": self.details,
            "timestamp": self.timestamp,
        }


class WealthAgentRAG:
    """
    Mosaic AI Agent Framework-compatible agent for FIBO Wealth Management.
    Supports OpenAI GPT-4o with tool calling and deterministic local fallback.
    """

    def __init__(self):
        self.available_tools = {
            "get_client_profile_and_holdings": get_client_profile_and_holdings,
            "check_portfolio_risk_suitability": check_portfolio_risk_suitability,
            "find_correlated_exposure": find_correlated_exposure,
            "analyze_client_tax_and_trust_structure": analyze_client_tax_and_trust_structure,
            "query_fibo_knowledge_graph": query_fibo_knowledge_graph,
        }
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.openai_model = os.getenv("OPENAI_MODEL", "gpt-4o")

    def get_model_status(self) -> Dict[str, Any]:
        """Returns the active AI model status."""
        has_key = bool(self.openai_api_key and len(self.openai_api_key.strip()) > 5)
        return {
            "active_model": self.openai_model if has_key else "Local ReAct Planner (FIBO Governed)",
            "provider": "OpenAI" if has_key else "Local Engine",
            "is_openai_active": has_key,
            "supported_tools": list(self.available_tools.keys()),
        }

    def chat(self, client_id: str, message: str) -> Dict[str, Any]:
        """
        Processes a natural language chat query using OpenAI GPT-4o with Tool Calling,
        or deterministic multi-hop reasoning if OpenAI API key is not configured.
        """
        self.openai_api_key = os.getenv("OPENAI_API_KEY")  # Reload from environment
        has_key = bool(self.openai_api_key and len(self.openai_api_key.strip()) > 5)

        if has_key:
            try:
                return self._chat_with_openai_gpt4o(client_id, message)
            except Exception as e:
                logger.error("OpenAI GPT-4o call failed, falling back to local engine", error=str(e))
                res = self._chat_with_local_engine(client_id, message)
                res["fallback_warning"] = f"OpenAI error: {str(e)}. Handled by local FIBO engine."
                return res
        else:
            return self._chat_with_local_engine(client_id, message)

    def _chat_with_openai_gpt4o(self, client_id: str, message: str) -> Dict[str, Any]:
        """Executes multi-turn conversation with OpenAI GPT-4o and Unity Catalog Tool Calling."""
        from openai import OpenAI

        client = OpenAI(api_key=self.openai_api_key)
        traces: List[Dict[str, Any]] = []
        step_idx = 1

        client_summary = get_client_profile_and_holdings(client_id)
        c_name = client_summary.get("name", "Client")
        c_tier = client_summary.get("net_worth_tier", "HNW")
        c_ports = client_summary.get("portfolios", [])
        primary_pid = c_ports[0]["portfolio_id"] if c_ports else ""
        primary_pname = c_ports[0]["portfolio_name"] if c_ports else "Primary Portfolio"
        c_mandate = client_summary.get("risk_profile", {}).get("tolerance_level", "Standard")

        system_prompt = f"""You are AURA Wealth Copilot, an elite AI Investment Strategist & Risk Officer powered by the FIBO Knowledge Graph and Databricks Unity Catalog.
Current Active Client Context:
- Client ID: '{client_id}'
- Client Name: '{c_name}'
- Net Worth Tier: '{c_tier}'
- Active Portfolio ID: '{primary_pid}' ({primary_pname})
- Risk Mandate: '{c_mandate}'

You have access to 5 governed Databricks Unity Catalog functions to retrieve holdings, risk profiles, SEC Reg BI compliance policies, Delaware trust structures, and live Cypher queries.

Instructions:
1. Always call the appropriate tool(s) first before answering questions about holdings, risk, trusts, or compliance.
2. When calling check_portfolio_risk_suitability, pass client_id='{client_id}' and portfolio_id='{primary_pid}' (or omit portfolio_id to use default).
3. Structure your answers in clean, professional markdown with bold metrics and bullet points.
4. Be precise with financial terminology (AUM, SEC Reg BI, Asset Drift, Yield, MiFID II, Delaware Nexus)."""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Client ID: {client_id}. Request: {message}"},
        ]

        traces.append({
            "step": step_idx,
            "type": "PLAN",
            "action": f"GPT-4o Planning Reasoning Route for Client {client_id}",
            "details": {"model": self.openai_model, "query": message},
        })
        step_idx += 1

        # Initial call with tools
        response = client.chat.completions.create(
            model=self.openai_model,
            messages=messages,
            tools=OPENAI_TOOLS,
            tool_choice="auto",
        )

        response_message = response.choices[0].message
        messages.append(response_message)

        # Loop over tool calls if requested by GPT-4o
        if response_message.tool_calls:
            for tool_call in response_message.tool_calls:
                function_name = tool_call.function.name
                arguments = json.loads(tool_call.function.arguments)

                # Inject client_id if omitted
                if "client_id" in self.available_tools[function_name].__code__.co_varnames and "client_id" not in arguments:
                    arguments["client_id"] = client_id

                traces.append({
                    "step": step_idx,
                    "type": "TOOL_CALL",
                    "action": f"GPT-4o Invoking UC Tool: {function_name}",
                    "details": arguments,
                })
                step_idx += 1

                # Execute Python function
                tool_func = self.available_tools.get(function_name)
                if tool_func:
                    function_response = tool_func(**arguments)
                else:
                    function_response = {"error": f"Tool {function_name} not found"}

                traces.append({
                    "step": step_idx,
                    "type": "OBSERVATION",
                    "action": f"Observation from {function_name}",
                    "details": function_response,
                })
                step_idx += 1

                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "name": function_name,
                    "content": json.dumps(function_response),
                })

            # Get final synthesis response from GPT-4o
            second_response = client.chat.completions.create(
                model=self.openai_model,
                messages=messages,
            )
            final_reply = second_response.choices[0].message.content
        else:
            final_reply = response_message.content

        traces.append({
            "step": step_idx,
            "type": "SYNTHESIS",
            "action": "GPT-4o Generated Strategic Advisory Report",
            "details": {"tokens_used": response.usage.total_tokens if response.usage else 0},
        })

        return {
            "reply": final_reply,
            "traces": traces,
            "model": self.openai_model,
            "provider": "OpenAI GPT-4o",
        }

    def chat_stream(self, client_id: str, message: str):
        """
        Generator yielding Server-Sent Events (SSE) for fluid real-time tool observation and token streaming.
        """
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        has_key = bool(self.openai_api_key and len(self.openai_api_key.strip()) > 5)

        if has_key:
            try:
                from openai import OpenAI
                client = OpenAI(api_key=self.openai_api_key)
                step_idx = 1

                # 1. Emit Initial Plan Event
                plan_event = {
                    "event": "step",
                    "payload": {
                        "step": step_idx,
                        "type": "PLAN",
                        "action": f"GPT-4o Structuring Reasoning Route for {client_id}",
                        "details": {"model": self.openai_model, "query": message},
                    },
                }
                yield f"data: {json.dumps(plan_event)}\n\n"
                step_idx += 1

                client_summary = get_client_profile_and_holdings(client_id)
                c_name = client_summary.get("name", "Client")
                c_tier = client_summary.get("net_worth_tier", "HNW")
                c_ports = client_summary.get("portfolios", [])
                primary_pid = c_ports[0]["portfolio_id"] if c_ports else ""
                primary_pname = c_ports[0]["portfolio_name"] if c_ports else "Primary Portfolio"
                c_mandate = client_summary.get("risk_profile", {}).get("tolerance_level", "Standard")

                system_prompt = f"""You are AURA Wealth Copilot, an elite AI Investment Strategist & Risk Officer powered by the FIBO Knowledge Graph and Databricks Unity Catalog.
Current Active Client Context:
- Client ID: '{client_id}'
- Client Name: '{c_name}'
- Net Worth Tier: '{c_tier}'
- Active Portfolio ID: '{primary_pid}' ({primary_pname})
- Risk Mandate: '{c_mandate}'

You have access to 5 governed Databricks Unity Catalog functions to retrieve holdings, risk profiles, SEC Reg BI compliance policies, Delaware trust structures, and live Cypher queries.

Instructions:
1. Always call the appropriate tool(s) first before answering questions about holdings, risk, trusts, or compliance.
2. When calling check_portfolio_risk_suitability, pass client_id='{client_id}' and portfolio_id='{primary_pid}' (or omit portfolio_id to use default).
3. Structure your answers in clean, professional markdown with bold metrics and bullet points.
4. Be precise with financial terminology (AUM, SEC Reg BI, Asset Drift, Yield, MiFID II, Delaware Nexus)."""

                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Client ID: {client_id}. Request: {message}"},
                ]

                # First call to get tool calls
                response = client.chat.completions.create(
                    model=self.openai_model,
                    messages=messages,
                    tools=OPENAI_TOOLS,
                    tool_choice="auto",
                )

                response_message = response.choices[0].message
                messages.append(response_message)

                if response_message.tool_calls:
                    for tool_call in response_message.tool_calls:
                        function_name = tool_call.function.name
                        arguments = json.loads(tool_call.function.arguments)
                        if "client_id" in self.available_tools[function_name].__code__.co_varnames and "client_id" not in arguments:
                            arguments["client_id"] = client_id

                        # Emit Tool Start Event
                        tool_start_event = {
                            "event": "tool_start",
                            "payload": {
                                "step": step_idx,
                                "type": "TOOL_CALL",
                                "tool": function_name,
                                "action": f"Invoking Unity Catalog Tool: {function_name}",
                                "details": arguments,
                            },
                        }
                        yield f"data: {json.dumps(tool_start_event)}\n\n"
                        step_idx += 1

                        # Execute tool
                        tool_func = self.available_tools.get(function_name)
                        function_response = tool_func(**arguments) if tool_func else {"error": f"Tool {function_name} not found"}

                        # Emit Tool Result Event
                        tool_result_event = {
                            "event": "tool_result",
                            "payload": {
                                "step": step_idx,
                                "type": "OBSERVATION",
                                "tool": function_name,
                                "action": f"Retrieved {function_name} from FIBO Graph (Bolt :7687)",
                                "details": function_response,
                            },
                        }
                        yield f"data: {json.dumps(tool_result_event)}\n\n"
                        step_idx += 1

                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "name": function_name,
                            "content": json.dumps(function_response),
                        })

                    # Stream second completion token-by-token
                    stream_response = client.chat.completions.create(
                        model=self.openai_model,
                        messages=messages,
                        stream=True,
                    )

                    for chunk in stream_response:
                        if chunk.choices and chunk.choices[0].delta.content:
                            token = chunk.choices[0].delta.content
                            token_event = {"event": "token", "payload": {"token": token}}
                            yield f"data: {json.dumps(token_event)}\n\n"

                else:
                    # No tools needed, stream tokens
                    content = response_message.content or ""
                    words = content.split(" ")
                    for w in words:
                        token_event = {"event": "token", "payload": {"token": w + " "}}
                        yield f"data: {json.dumps(token_event)}\n\n"
                        time.sleep(0.01)

                done_event = {
                    "event": "done",
                    "payload": {
                        "status": "SUCCESS",
                        "model": self.openai_model,
                        "provider": "OpenAI GPT-4o",
                    },
                }
                yield f"data: {json.dumps(done_event)}\n\n"
                return

            except Exception as e:
                logger.error("OpenAI stream failed, switching to local stream", error=str(e))

        # Local Engine Streaming Fallback
        local_result = self._chat_with_local_engine(client_id, message)
        for trace in local_result.get("traces", []):
            event_type = "tool_start" if trace["type"] == "TOOL_CALL" else "tool_result" if trace["type"] == "OBSERVATION" else "step"
            step_event = {"event": event_type, "payload": trace}
            yield f"data: {json.dumps(step_event)}\n\n"
            time.sleep(0.04)

        # Stream reply tokens smoothly in fluid multi-word phrases
        reply_text = local_result.get("reply", "")
        words = reply_text.split(" ")
        # Group into 2-3 word fluid chunks
        chunk_size = 2
        for i in range(0, len(words), chunk_size):
            chunk_words = words[i:i + chunk_size]
            token_str = " ".join(chunk_words) + " "
            token_event = {"event": "token", "payload": {"token": token_str}}
            yield f"data: {json.dumps(token_event)}\n\n"
            time.sleep(0.008)

        done_event = {
            "event": "done",
            "payload": {
                "status": "SUCCESS",
                "model": "Local FIBO ReAct Engine",
                "provider": "Deterministic Local Planner",
            },
        }
        yield f"data: {json.dumps(done_event)}\n\n"

    def _chat_with_local_engine(self, client_id: str, message: str) -> Dict[str, Any]:
        """Deterministic rule-based multi-hop execution when no OpenAI API key is set."""
        query = message.lower().strip()
        traces = []
        step = 1

        client_info = get_client_profile_and_holdings(client_id)
        client_name = client_info.get("name", "the client")
        portfolios = client_info.get("portfolios", [])
        primary_port = portfolios[0] if portfolios else {}
        port_id = primary_port.get("portfolio_id", "")

        if any(k in query for k in ["rebalance", "drift", "allocation", "equity", "fixed income"]):
            traces.append({
                "step": step,
                "type": "PLAN",
                "action": "Plan Portfolio Allocation Audit",
                "details": {"client_id": client_id, "portfolio_id": port_id, "tool": "check_portfolio_risk_suitability"}
            })
            step += 1
            
            suitability = check_portfolio_risk_suitability(client_id, port_id)
            traces.append({
                "step": step,
                "type": "TOOL_CALL",
                "action": f"Execute check_portfolio_risk_suitability('{port_id}')",
                "details": suitability
            })
            step += 1

            drift = suitability.get("allocations", {}).get("equity_drift_pct", 0)
            actual_eq = suitability.get("allocations", {}).get("actual_equity_pct", 0)
            target_eq = suitability.get("allocations", {}).get("target_equity_pct", 0)
            status = suitability.get("suitability_status", "UNKNOWN")

            reply = f"### Portfolio Allocation & Rebalancing Audit\n\n"
            reply += f"- **Client**: {client_name} (`{client_id}`)\n"
            reply += f"- **Investment Mandate**: {suitability.get('risk_mandate')}\n"
            reply += f"- **Current Equity Weight**: **{actual_eq * 100:.1f}%** (Target: {target_eq * 100:.1f}%)\n"
            reply += f"- **Equity Drift**: **{drift * 100:+.1f}%**\n"
            reply += f"- **SEC Reg BI Status**: `{status}`\n\n"

            if abs(drift) > 0.05:
                direction = "SELL Equities" if drift > 0 else "BUY Equities"
                amount_delta = abs(drift) * primary_port.get("total_aum", 0)
                reply += f"**Actionable Rebalance Recommendation**:\n"
                reply += f"- Execute **{direction}** of approximately **${amount_delta:,.2f}** to restore mandate target.\n"
                reply += f"- Reallocate proceeds into benchmark Fixed Income (e.g. US Treasury 10-Year) to mitigate portfolio volatility."
            else:
                reply += "Portfolio is within acceptable $\\pm 5\\%$ drift tolerance."

        elif any(k in query for k in ["tech", "concentration", "sector", "semiconductor", "apple", "nvidia"]):
            traces.append({
                "step": step,
                "type": "PLAN",
                "action": "Screen Systemic Sector Concentration",
                "details": {"sector": "Technology", "min_allocation_pct": 0.05, "tool": "find_correlated_exposure"}
            })
            step += 1

            exposure = find_correlated_exposure("Technology", min_allocation_pct=0.05)
            traces.append({
                "step": step,
                "type": "OBSERVATION",
                "action": "Retrieved Cross-Portfolio Technology Exposure",
                "details": {"matching_positions": len(exposure)}
            })
            step += 1

            reply = f"### Technology Sector Concentration Risk Screen\n\n"
            reply += f"Analysis across managed portfolios reveals significant concentration in Mega-Cap Technology:\n\n"
            for item in exposure:
                reply += f"- **{item['instrument_name']}** (`{item['ticker']}`): **{item['allocation_pct'] * 100:.1f}%** allocation (${item['exposure_value_usd']:,.2f} market value) in {item['portfolio_name']}\n"
            reply += f"\n**Advisory Risk Note**: Overweight exposure to semiconductors and hyperscalers drives portfolio beta above baseline. Consider tax-loss harvesting or collar options for downside protection."

        elif any(k in query for k in ["trust", "estate", "delaware", "legal", "tax", "entity"]):
            traces.append({
                "step": step,
                "type": "PLAN",
                "action": "Analyze Legal & Estate Trust Entities",
                "details": {"client_id": client_id, "tool": "analyze_client_tax_and_trust_structure"}
            })
            step += 1

            trust = analyze_client_tax_and_trust_structure(client_id)
            traces.append({
                "step": step,
                "type": "OBSERVATION",
                "action": "Retrieved Estate Entity Records",
                "details": trust
            })
            step += 1

            entities = trust.get("legal_entities", [])
            reply = f"### Estate Planning & Trust Structure Analysis\n\n"
            reply += f"- **Client**: {client_name}\n"
            reply += f"- **Tax Residence**: {trust.get('tax_residence')}\n"
            reply += f"- **KYC Verification**: `{trust.get('kyc_status')}`\n\n"
            if entities:
                reply += f"**Connected Legal Entities & Family Trusts**:\n"
                for e in entities:
                    reply += f"- **{e['entity_name']}** (`{e['entity_id']}`)\n"
                    reply += f"  - Type: `{e['entity_type']}`\n"
                    reply += f"  - Jurisdiction: **{e['jurisdiction']}** (Delaware Statutory Trust)\n"
                    reply += f"  - Beneficiary Stake: **{e['beneficiary_share_pct'] * 100:.0f}%**\n"
                reply += f"\n**Tax Efficiency Note**: Delaware statutory trust provides state income tax exemption on undistributed capital gains and multi-generational dynasty wealth preservation."
            else:
                reply += "No connected irrevocable trusts currently mapped in knowledge graph."
        else:
            traces.append({
                "step": step,
                "type": "PLAN",
                "action": "Comprehensive Multi-Asset Overview",
                "details": {"client_id": client_id, "tool": "get_client_profile_and_holdings"}
            })
            step += 1

            reply = f"### Portfolio Overview for {client_name}\n\n"
            reply += f"- **Tier**: {client_info.get('net_worth_tier')}\n"
            reply += f"- **Total AUM**: **${primary_port.get('total_aum', 0):,.2f}**\n"
            reply += f"- **Holdings Summary** ({len(primary_port.get('holdings', []))} positions):\n"
            for h in primary_port.get("holdings", []):
                reply += f"  - {h['name']} (`{h['ticker_or_id']}`): {h['allocation_pct'] * 100:.1f}% (${h['current_value']:,.2f})\n"

        traces.append({
            "step": step,
            "type": "SYNTHESIS",
            "action": "Synthesized Advisory Response",
            "details": {"client_name": client_name}
        })

        return {
            "reply": reply,
            "traces": traces,
            "model": "Local FIBO ReAct Engine",
            "provider": "Deterministic Local Planner",
        }

    def execute_advisory_review(self, client_id: str) -> Dict[str, Any]:
        """Multi-step workflow for full comprehensive review with MLflow traces."""
        traces: List[AgentStepTrace] = []
        step_idx = 1

        # Step 1: Client & Holdings Retrieval
        traces.append(
            AgentStepTrace(
                step_number=step_idx,
                step_type="PLAN",
                action="Identify Client Profile & Portfolios",
                details={"client_id": client_id, "tool_target": "get_client_profile_and_holdings"},
            )
        )
        step_idx += 1

        client_data = get_client_profile_and_holdings(client_id=client_id)
        if "error" in client_data:
            return {"status": "FAILED", "error": client_data["error"], "execution_traces": [t.to_dict() for t in traces]}

        traces.append(
            AgentStepTrace(
                step_number=step_idx,
                step_type="OBSERVATION",
                action="Client Holdings Retrieved",
                details={
                    "client_name": client_data.get("name"),
                    "risk_tolerance": client_data.get("risk_profile", {}).get("tolerance_level"),
                    "portfolio_count": len(client_data.get("portfolios", [])),
                },
            )
        )
        step_idx += 1

        # Step 2: Risk & Suitability Checks
        suitability_results = []
        for port in client_data.get("portfolios", []):
            port_id = port["portfolio_id"]
            suitability = check_portfolio_risk_suitability(client_id=client_id, portfolio_id=port_id)
            suitability_results.append(suitability)
            traces.append(
                AgentStepTrace(
                    step_number=step_idx,
                    step_type="TOOL_CALL",
                    action=f"Suitability Check for {port_id}",
                    details={"portfolio_id": port_id, "suitability_status": suitability.get("suitability_status")},
                )
            )
            step_idx += 1

        # Step 3: Tax & Trust Analysis
        trust_data = analyze_client_tax_and_trust_structure(client_id=client_id)
        traces.append(
            AgentStepTrace(
                step_number=step_idx,
                step_type="OBSERVATION",
                action="Trust & Legal Entity Analysis",
                details={"entities": trust_data.get("legal_entities", [])},
            )
        )
        step_idx += 1

        # Step 4: Concentration Screening
        top_sectors = {h.get("sector") for port in client_data.get("portfolios", []) for h in port.get("holdings", []) if h.get("sector")}
        concentration_alerts = [{"sector": s, "exposure_records": find_correlated_exposure(sector=s, min_allocation_pct=0.15)} for s in top_sectors if find_correlated_exposure(sector=s, min_allocation_pct=0.15)]

        traces.append(
            AgentStepTrace(
                step_number=step_idx,
                step_type="OBSERVATION",
                action="Sector Concentration Risk Screen",
                details={"screened_sectors": list(top_sectors), "alerts": len(concentration_alerts)},
            )
        )
        step_idx += 1

        synthesis = {
            "client_id": client_id,
            "client_name": client_data.get("name"),
            "net_worth_tier": client_data.get("net_worth_tier"),
            "risk_profile": client_data.get("risk_profile"),
            "portfolios": client_data.get("portfolios"),
            "suitability_evaluations": suitability_results,
            "trust_structures": trust_data.get("legal_entities"),
            "sector_concentration_alerts": concentration_alerts,
            "recommendation_summary": [
                f"{client_data.get('name')}'s portfolio evaluated under SEC Reg BI standard with active FIBO graph monitoring."
            ],
        }

        traces.append(
            AgentStepTrace(
                step_number=step_idx,
                step_type="SYNTHESIS",
                action="Final Advisory Recommendations Compiled",
                details={"summary_length": len(synthesis["recommendation_summary"])},
            )
        )

        return {
            "status": "SUCCESS",
            "report": synthesis,
            "execution_traces": [t.to_dict() for t in traces],
        }


# Singleton agent instance
wealth_agent = WealthAgentRAG()
