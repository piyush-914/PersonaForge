import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.tools import tool

# Import tools from agent_service
from agent_service.web_search import web_search, WebSearchInput
from agent_service.send_email import send_email, SendEmailInput

load_dotenv()

# Setup Groq LLM
llm = ChatGroq(
    api_key=os.getenv("GROQ_API_KEY"),
    model="llama-3.3-70b-versatile",
    temperature=0
)

# Define LangChain tools using your specific tool logic
@tool("web_search", args_schema=WebSearchInput)
def tool_web_search(query: str):
    """Search the web for information."""
    return web_search(query)

@tool("send_email", args_schema=SendEmailInput)
def tool_send_email(to: str, subject: str, body: str):
    """Send an email to a recipient."""
    return send_email(to, subject, body, {})

# Bind tools
llm_with_tools = llm.bind_tools([tool_web_search, tool_send_email])

# Stability Prompt
system_prompt = "You are a helpful assistant with access to tools. CRITICAL: Use native tool calling, NO XML tags."

# Run it
response = llm_with_tools.invoke([
    {"role": "system", "content": system_prompt},
    HumanMessage(content="Find the latest AI news and summarize it.")
])

print("\nFull Response Object:")
print(response)

print("\nAI Response Content:")
print(response.content)

if hasattr(response, 'tool_calls') and response.tool_calls:
    print("\nTool Calls Found:")
    for tc in response.tool_calls:
        print(f"- {tc['name']}({tc['args']})")
else:
    print("\nNo Tool Calls Found in the object.")
