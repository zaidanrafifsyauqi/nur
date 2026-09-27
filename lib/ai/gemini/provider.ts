/**
 * Stage NUR AI — Gemini provider implementation.
 * Server-only. Never expose raw Gemini types to UI.
 */

import { getGeminiClient } from "./client";
import type { AIProvider, AIProviderInput } from "../provider";

const MODEL = "gemini-3.5-flash";

export class GeminiProvider implements AIProvider {
  async generateResponse(input: AIProviderInput): Promise<string> {
    const client = getGeminiClient();
    if (!client) throw new Error("GEMINI_API_KEY is not configured.");

    // Build contents: system prompt as first user instruction + history
    // Gemini 2.0 supports systemInstruction via config.
    const contents = input.messages.map((m) => ({
      role: m.role === "assistant" ? "model" as const : "user" as const,
      parts: [{ text: m.content }],
    }));

    const response = await client.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction: input.systemPrompt,
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    });

    const text = response.text?.trim();
    if (!text) throw new Error("Empty response from AI provider.");
    return text;
  }
}
