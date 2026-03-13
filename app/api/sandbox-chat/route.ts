import { NextRequest, NextResponse } from 'next/server'
import { checkInputGuardrails, checkOutputGuardrails, enhancePromptWithGuardrails } from '@/lib/guardrails'

export async function POST(req: NextRequest) {
  try {
    const { messages, agentConfig } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 })
    }

    // Get the last user message
    const lastMessage = messages[messages.length - 1]?.content || ''

    // 1. LAYER 1: Input Guardrails Check
    if (checkInputGuardrails(lastMessage)) {
      return NextResponse.json({
        role: 'assistant',
        content: "I cannot assist with that request because it violates safety guidelines."
      })
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 })
    }

    // 2. LAYER 2: System Prompt Guardrails
    let baseSystemPrompt = agentConfig?.systemPrompt || "You are a helpful AI assistant."
    
    // Append custom agent guardrails if they exist
    if (agentConfig?.guardrails && Array.isArray(agentConfig.guardrails) && agentConfig.guardrails.length > 0) {
      const customGuardrails = agentConfig.guardrails.map((g: string) => `- ${g}`).join('\n')
      baseSystemPrompt += `\n\nSpecific Agent Guardrails:\n${customGuardrails}`
    }

    const enhancedSystemPrompt = enhancePromptWithGuardrails(baseSystemPrompt)

    // Prepare messages for Groq
    const groqMessages = [
      { role: 'system', content: enhancedSystemPrompt },
      ...messages
    ]

    // Call Groq API (OpenAI compatible)
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: groqMessages,
        temperature: 0.7,
        max_tokens: 1024
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ error: errorData.error?.message || 'Groq AI request failed' }, { status: response.status })
    }

    const data = await response.json()
    const aiResponse = data.choices[0].message.content

    // 3. LAYER 3: Output Guardrails Check
    if (checkOutputGuardrails(aiResponse)) {
      return NextResponse.json({
        role: 'assistant',
        content: "I'm sorry, but I cannot provide information related to that topic as it may violate safety guidelines."
      })
    }

    return NextResponse.json({
      role: 'assistant',
      content: aiResponse
    })

  } catch (error: any) {
    console.error('Sandbox Chat error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
