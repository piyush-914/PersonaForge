# import warnings

# warnings.filterwarnings("ignore", category=ResourceWarning)

# from strands import Agent, tool
# from strands.models.gemini import GeminiModel
# from ddgs import DDGS
# from ddgs.exceptions import DDGSException, RatelimitException, TimeoutException

# # -----------------------------
# # gemini model configuration
# # -----------------------------
# gemini_model = GeminiModel(
#     client_args={
#         "api_key": "AIzaSyCVynNTnDRLO2PIs0TK1f-GLb7JRox2ikU",
#     },
#     model_id="gemini-2.5-flash",
#     params={"temperature": 0.7},
# )


# # -----------------------------
# # Web search tool
# # -----------------------------
# @tool
# def websearch(keywords: str, region: str = "us-en", max_results: int | None = 5) -> str:
#     """Search the web and return summarized results with sources."""
#     try:
#         with DDGS() as ddgs:
#             results = list(ddgs.text(keywords, region=region, max_results=max_results))

#             if not results:
#                 return "No relevant web results found."

#             formatted = []
#             for r in results:
#                 formatted.append(
#                     f"- {r.get('title')}\n"
#                     f"  {r.get('body')}\n"
#                     f"  Source: {r.get('href')}"
#                 )

#             return "\n\n".join(formatted)

#     except RatelimitException:
#         return "Rate limit reached. Please try again later."
#     except TimeoutException:
#         return "Web search timed out."
#     except DDGSException as e:
#         return f"DDGS error: {e}"
#     except Exception as e:
#         return f"Unexpected error: {e}"


# # -----------------------------
# # General-purpose AI Agent
# # -----------------------------
# assistant_agent = Agent(
#     model=gemini_model,
#     tools=[websearch],
#     system_prompt="You are a helpful assistant whose work is to fetch information from the web and provide it to the user.",
# )

# # -----------------------------
# # Run the agent
# # -----------------------------
# assistant_agent("Give me details about the recent LPG gas price increase.")

from mcp import StdioServerParameters, stdio_client
from mcp.client.streamable_http import streamablehttp_client
from mcp.server import FastMCP
from strands import Agent

from strands.tools.mcp import MCPClient
from strands.models.gemini import GeminiModel

stdio_mcp_client = MCPClient(
    lambda: stdio_client(
        StdioServerParameters(
            command="uvx", args=["awslabs.aws-documentation-mcp-server@latest"]
        )
    )
)

# Ollama model configuration
gemini_model = GeminiModel(
    client_args={
        "api_key": "AIzaSyCVynNTnDRLO2PIs0TK1f-GLb7JRox2ikU",
    },
    model_id="gemini-2.5-flash",
    params={"temperature": 0.7},
)

with stdio_mcp_client:
    # Get the tools from the MCP server
    tools = stdio_mcp_client.list_tools_sync()

    # Create an agent with these tools
    agent = Agent(
        system_prompt="You are a helpful assistant.", model=gemini_model, tools=tools
    )

    agent("What are the tools do you have?")
