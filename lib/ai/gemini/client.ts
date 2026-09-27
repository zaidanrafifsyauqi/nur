/**
 * Stage NUR AI — Gemini client factory (server-only).
 * Never import this from Client Components.
 */

import { GoogleGenAI } from "@google/genai";

let cached: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") return null;
  if (cached) return cached;
  cached = new GoogleGenAI({ apiKey: apiKey.trim() });
  return cached;
}

export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "";
}
