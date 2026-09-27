/**
 * Stage NUR AI — strict internal AI types. Never use `any`.
 * Request validation protects Gemini quota.
 */

export type AIMessageRole = "user" | "assistant";

export interface AIMessage {
  role: AIMessageRole;
  content: string;
}

export interface AIRequest {
  messages: AIMessage[];
}

export interface AIResponse {
  message: string;
  model?: string;
}

// Limits — protect Gemini quota (anonymous endpoint).
export const AI_MAX_MESSAGES = 20;
export const AI_MAX_CHARS_PER_MESSAGE = 4000;
export const AI_MAX_TOTAL_CHARS = 20000;
export const AI_MAX_MESSAGE_LENGTH = AI_MAX_CHARS_PER_MESSAGE;

export function isAIMessageRole(value: unknown): value is AIMessageRole {
  return value === "user" || value === "assistant";
}

export function isAIMessage(value: unknown): value is AIMessage {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    isAIMessageRole(v.role) &&
    typeof v.content === "string" &&
    v.content.trim().length > 0 &&
    v.content.length <= AI_MAX_CHARS_PER_MESSAGE
  );
}

export function validateAIRequest(body: unknown): { ok: true; data: AIRequest } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Invalid request body." };
  }
  const v = body as Record<string, unknown>;
  if (!Array.isArray(v.messages)) {
    return { ok: false, error: "messages is required." };
  }
  if (v.messages.length === 0) {
    return { ok: false, error: "At least one message is required." };
  }
  if (v.messages.length > AI_MAX_MESSAGES) {
    return { ok: false, error: `Too many messages. Maximum ${AI_MAX_MESSAGES} allowed.` };
  }
  const messages: AIMessage[] = [];
  let totalChars = 0;
  for (const item of v.messages) {
    if (!isAIMessage(item)) {
      return { ok: false, error: "Invalid message format." };
    }
    totalChars += item.content.length;
    if (totalChars > AI_MAX_TOTAL_CHARS) {
      return { ok: false, error: "Conversation too long." };
    }
    messages.push({ role: item.role, content: item.content.trim() });
  }
  // Last message must be user (to generate response)
  if (messages[messages.length - 1].role !== "user") {
    return { ok: false, error: "Last message must be from user." };
  }
  return { ok: true, data: { messages } };
}
