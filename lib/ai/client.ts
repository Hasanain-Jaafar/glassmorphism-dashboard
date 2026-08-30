import Anthropic from "@anthropic-ai/sdk";

/**
 * Anthropic client for the AI Assistant. Reads ANTHROPIC_API_KEY from the
 * environment — server-only, only ever import this from a Route Handler
 * (app/api/assistant/**), never from a client component.
 */
export const anthropic = new Anthropic();
