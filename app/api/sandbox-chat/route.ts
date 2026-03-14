import { NextRequest, NextResponse } from 'next/server'
import { checkInputGuardrails, checkOutputGuardrails } from '@/lib/guardrails'
import { createAgentGraph } from '@/lib/agent/createAgentGraph'
import { HumanMessage, AIMessage } from '@langchain/core/messages'
import Agent from '@/models/Agent'
import dbConnect from '@/lib/mongodb'

export async function POST(req: NextRequest) {
  try {
    const { messages, agentConfig: clientAgentConfig } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 })
    }

    // Get the last user message
    const lastMessageContent = messages[messages.length - 1]?.content || ''

    // 1. Guardrails Check
    if (checkInputGuardrails(lastMessageContent)) {
      return NextResponse.json({
        role: 'assistant',
        content: "I cannot assist with that request because it violates safety guidelines."
      })
    }

    // 2. Load Agent from DB to get latest config and API keys
    await dbConnect()
    const agentId = clientAgentConfig?._id
    let agent = null
    if (agentId && /^[0-9a-fA-F]{24}$/.test(agentId)) {
      agent = await Agent.findById(agentId)
    }

    const finalAgentConfig = agent ? agent.toObject() : clientAgentConfig
    const apiKeys = agent ? Object.fromEntries(agent.apiKeys || new Map()) : (clientAgentConfig?.apiKeys || {})

    // 3. Call Python Agent Service
    const pythonServiceUrl = process.env.PYTHON_AGENT_SERVICE_URL || 'http://localhost:8000'
    const pythonResponse = await fetch(`${pythonServiceUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        agent_config: finalAgentConfig,
        api_keys: apiKeys
      })
    })

    if (!pythonResponse.ok) {
      const errorData = await pythonResponse.json()
      throw new Error(errorData.detail || 'Python agent service error')
    }

    const data = await pythonResponse.json()
    return NextResponse.json(data)

  } catch (error: any) {
    console.error('Sandbox Chat error:', error)
    
    // Check for missing API key errors to prompt user
    if (error.message.includes('missing') || error.message.includes('not configured')) {
      return NextResponse.json({ 
        error: error.message,
        needsApiKey: true,
        missingTool: error.message.match(/(\w+ API key|\w+ credentials)/)?.[0] || 'Tool API Key'
      }, { status: 400 })
    }

    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      details: error.response?.data || null 
    }, { status: error.status || 500 })
  }
}
