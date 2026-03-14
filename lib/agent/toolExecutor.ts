import { TOOL_REGISTRY, ToolName } from '../tools/toolRegistry';

export async function executeTool(toolName: string, args: any, apiKeys?: Record<string, string>) {
  const tool = TOOL_REGISTRY[toolName as ToolName];
  if (!tool) {
    throw new Error(`Tool ${toolName} not found in registry.`);
  }

  // Validate arguments using schema
  const validatedArgs = tool.schema.parse(args);

  // Execute tool
  return await (tool.execute as any)(validatedArgs, apiKeys);
}
