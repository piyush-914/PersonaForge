import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

import uvicorn
from agent import create_agent

load_dotenv()

app = FastAPI(title="PersonaForge Agent Service")

class ChatMessage(BaseModel):
    role: str
    content: str

class AgentRequest(BaseModel):
    messages: List[ChatMessage]
    agent_config: Dict[str, Any]
    api_keys: Dict[str, str]

@app.post("/chat")
async def chat(request: AgentRequest):
    mcp_ctx = None
    try:
        # Create Strands agent + optional MCP context
        agent, mcp_ctx = create_agent(request.agent_config, request.api_keys)

        # Get the last user message
        user_messages = [m.content for m in request.messages if m.role == "user"]
        last_message = user_messages[-1] if user_messages else ""

        # Run the Strands agent
        response = agent(last_message)

        # Extract text content
        content = getattr(response, 'message', None)
        if content and hasattr(content, 'content'):
            # Strands returns AgentResult with message.content list
            parts = content.content
            content = " ".join(
                p.get("text", "") if isinstance(p, dict) else str(p)
                for p in parts
            ) if isinstance(parts, list) else str(parts)
        else:
            content = str(response)

        return {
            "role": "assistant",
            "content": content,
            "toolActivity": []
        }

    except Exception as e:
        print(f"Error in python agent service: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # Clean up MCP context if it was created
        if mcp_ctx is not None:
            try:
                mcp_ctx.__exit__(None, None, None)
            except Exception:
                pass

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
