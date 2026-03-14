import { StateGraph, MessagesAnnotation, END, START } from '@langchain/langgraph';
import { ChatGroq } from '@langchain/groq';
import { ChatOpenAI } from '@langchain/openai';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { TOOL_REGISTRY, getAvailableTools } from '../tools/toolRegistry';
import { executeTool } from './toolExecutor';
import { BaseMessage, HumanMessage, AIMessage, ToolMessage, SystemMessage } from '@langchain/core/messages';
import { convertToOpenAITool } from '@langchain/core/utils/function_calling';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { DynamicStructuredTool } from '@langchain/core/tools';

export type AgentState = typeof MessagesAnnotation.State;

export function createAgentGraph(agentConfig: any, apiKeys: Record<string, string>) {
  // 1. Initialize LLM
  // We prefer Groq as it was used before, but fallback to OpenAI if needed
  const llm = process.env.GROQ_API_KEY 
    ? new ChatGroq({
        apiKey: process.env.GROQ_API_KEY,
        model: 'llama-3.3-70b-versatile',
        temperature: 0, // Maximum stability for tool calling
      })
    : new ChatOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4o',
        temperature: 0.7,
      });

  // 2. Filter tools based on agent config
  const selectedTools = getAvailableTools(agentConfig.tools || []);
  
  // Convert to LangChain tools for reliable binding
  const langchainTools = selectedTools.map((tool) => {
    return new DynamicStructuredTool({
      name: tool.name,
      description: tool.description,
      schema: tool.schema as any,
      func: async () => "" // Logic is handled in the 'tools' node
    });
  });

  // Bind tools to LLM
  const modelWithTools = llm.bindTools(langchainTools);

  // 3. Define the nodes
  
  // Reasoning Node
  const callModel = async (state: any) => {
    const { messages } = state;
    
    // Supplement system prompt with agent config (from closure)
    let systemPrompt = agentConfig.systemPrompt || "You are a helpful AI assistant.";
    
    // Safety: Ensure no "XML tool tags" instructions exist in the prompt if they were auto-generated
    systemPrompt = systemPrompt.replace(/<function=.*?<\/function>/gi, '');
    systemPrompt = systemPrompt.replace(/use the format <function=.../gi, '');

    // We use a plain object for the system message to ensure Groq's API handles it natively
    const systemMessage = { role: 'system', content: systemPrompt };

    const response = await modelWithTools.invoke([
      systemMessage,
      ...messages,
    ]);
    
    return { messages: [response] };
  };

  // Tool Execution Node
  const callTool = async (state: any) => {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1] as AIMessage;
    
    const toolOutputs: ToolMessage[] = [];
    
    if (lastMessage.tool_calls) {
      for (const toolCall of lastMessage.tool_calls) {
        // Step 13: Security Confirmation for sensitive tools
        const isSensitiveTool = ['send_email', 'create_calendar_event'].includes(toolCall.name);
        const hasConfirmation = messages.some((m: BaseMessage) => 
          m instanceof HumanMessage && 
          typeof m.content === 'string' && 
          (m.content.toLowerCase().includes('confirm') || m.content.toLowerCase() === 'yes')
        );

        if (isSensitiveTool && !hasConfirmation) {
          toolOutputs.push(new ToolMessage({
            tool_call_id: toolCall.id!,
            content: `CONFIRMATION_REQUIRED: I am about to execute ${toolCall.name}. Please confirm to proceed.`,
          }));
          continue;
        }

        try {
          const result = await executeTool(toolCall.name, toolCall.args, apiKeys);
          toolOutputs.push(new ToolMessage({
            tool_call_id: toolCall.id!,
            content: typeof result === 'string' ? result : JSON.stringify(result),
          }));
        } catch (error: any) {
          toolOutputs.push(new ToolMessage({
            tool_call_id: toolCall.id!,
            content: `Error executing tool: ${error.message}`,
          }));
        }
      }
    }
    
    return { messages: toolOutputs };
  };

  // 4. Build the graph
  const workflow = new StateGraph(MessagesAnnotation)
    .addNode('agent', callModel)
    .addNode('tools', callTool)
    .addEdge(START, 'agent');

  // Add conditional edges
  workflow.addConditionalEdges(
    'agent',
    (state: AgentState) => {
      const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
      if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
        return 'tools';
      }
      return END;
    },
    {
      tools: 'tools',
      [END]: END,
    }
  );

  workflow.addEdge('tools', 'agent');

  return workflow.compile();
}
