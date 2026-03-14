import { sendEmail, sendEmailSchema } from './sendEmail';
import { createCalendarEvent, createCalendarEventSchema } from './createCalendarEvent';
import { webSearch, webSearchSchema } from './webSearch';
import { visitUrl, visitUrlSchema } from './visitUrl';
import { readFile, readFileSchema } from './readFile';

export const TOOL_REGISTRY = {
  send_email: {
    name: 'send_email',
    description: 'Send an email to a recipient with a subject and body.',
    schema: sendEmailSchema,
    execute: sendEmail,
  },
  create_calendar_event: {
    name: 'create_calendar_event',
    description: 'Schedule a new event on the Google Calendar.',
    schema: createCalendarEventSchema,
    execute: createCalendarEvent,
  },
  web_search: {
    name: 'web_search',
    description: 'Search the web for information using a search query.',
    schema: webSearchSchema,
    execute: webSearch,
  },
  visit_url: {
    name: 'visit_url',
    description: 'Visit a specific URL and extract text content from the page.',
    schema: visitUrlSchema,
    execute: visitUrl,
  },
  read_file: {
    name: 'read_file',
    description: 'Read the contents of a local file by providing its path.',
    schema: readFileSchema,
    execute: readFile,
  },
};

export const SENSITIVE_TOOLS = ['send_email', 'create_calendar_event'];

export type ToolName = keyof typeof TOOL_REGISTRY;

export function isSensitive(toolName: string) {
  return SENSITIVE_TOOLS.includes(toolName);
}

export function getAvailableTools(toolNames: string[]) {
  return toolNames
    .filter((name): name is ToolName => name in TOOL_REGISTRY)
    .map((name) => TOOL_REGISTRY[name]);
}
