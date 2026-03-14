import os
import warnings
warnings.filterwarnings("ignore", category=ResourceWarning)

from typing import Dict, Any, List
from strands import Agent
from strands.models.gemini import GeminiModel

# Import the strands-compatible tools
from web_search import websearch
from visit_url import visit_url
from send_email import send_email
from read_file import read_file
from calendar_event import create_calendar_event

def create_agent(agent_config: Dict[str, Any], api_keys: Dict[str, str]):
    # Get the Gemini API key — prioritize passed api_keys, fallback to env
    gemini_api_key = api_keys.get("GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY", "")

    # Gemini model configuration
    gemini_model = GeminiModel(
        client_args={
            "api_key": gemini_api_key,
        },
        model_id="gemini-2.5-flash",
        params={"temperature": 0.7}
    )

    system_prompt = agent_config.get("systemPrompt", "You are a helpful AI assistant.")
    enabled_tools: List[str] = agent_config.get("tools", [])

    # Map tool IDs to their implementations
    TOOL_MAP = {
        "web_search": websearch,
        "visit_url": visit_url,
        "send_email": lambda to, subject, body: send_email(to, subject, body, api_keys),
        "read_file": read_file,
        "create_calendar_event": lambda event_details: create_calendar_event(event_details, api_keys),
    }

    tools = [TOOL_MAP[t] for t in enabled_tools if t in TOOL_MAP]

    # --- AWS MCP Documentation Tool ---
    # If aws_docs_mcp is enabled, launch the MCP client and add its tools
    mcp_client_ctx = None
    if "aws_docs_mcp" in enabled_tools:
        try:
            from aws_docs_mcp import get_aws_mcp_client
            mcp_client_ctx = get_aws_mcp_client()
            mcp_client_ctx.__enter__()
            mcp_tools = mcp_client_ctx.list_tools_sync()
            tools.extend(mcp_tools)
        except Exception as e:
            print(f"[AWS MCP] Warning: Could not load AWS docs MCP tools: {e}")

    assistant_agent = Agent(
        model=gemini_model,
        tools=tools,
        system_prompt=system_prompt
    )

    return assistant_agent, mcp_client_ctx
