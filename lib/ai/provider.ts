/**
 * Stage NUR AI — provider abstraction. UI and API route depend only on this
 * interface, never on Gemini-specific types.
 */

import type { AIMessage } from "./types";

export interface AIProviderInput {
  messages: AIMessage[];
  systemPrompt: string;
}

export interface AIProvider {
  generateResponse(input: AIProviderInput): Promise<string>;
}
