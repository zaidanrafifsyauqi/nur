/**
 * Stage NUR AI — API route (server-only).
 * POST /api/ai — validates, enriches with NUR context, calls Gemini, returns normalized response.
 * Never exposes GEMINI_API_KEY or raw provider internals.
 */

import { NextRequest, NextResponse } from "next/server";
import { buildNurContext, enrichSystemPrompt } from "@/lib/ai/context";
import { GeminiProvider } from "@/lib/ai/gemini/provider";
import { isGeminiConfigured } from "@/lib/ai/gemini/client";
import { NUR_SYSTEM_PROMPT } from "@/lib/ai/prompts/nurSystemPrompt";
import { validateAIRequest } from "@/lib/ai/types";

// Simple in-memory rate limiting (best-effort, instance-local).
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX) return true;
  entry.count += 1;
  return false;
}

export async function POST(req: NextRequest) {
  // Rate limiting — before any heavy work
  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "NUR AI is currently busy. Please try again in a moment." },
      { status: 429 }
    );
  }

  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "NUR AI is temporarily unavailable." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const validation = validateAIRequest(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { messages } = validation.data;
  const lastUserQuery = messages[messages.length - 1].content;

  // Build NUR structured context (best-effort, never throws)
  let contexts: string[] = [];
  try {
    contexts = await buildNurContext(lastUserQuery);
  } catch {
    contexts = [];
  }

  const systemPrompt = enrichSystemPrompt(NUR_SYSTEM_PROMPT, contexts);

  try {
    const provider = new GeminiProvider();
    const message = await provider.generateResponse({ messages, systemPrompt });
    return NextResponse.json({ message, model: "gemini-3.5-flash" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    // Map known errors to safe user messages
    if (msg.includes("GEMINI_API_KEY")) {
      return NextResponse.json(
        { error: "NUR AI is temporarily unavailable." },
        { status: 503 }
      );
    }
    if (/quota|rate.?limit|429/i.test(msg)) {
      return NextResponse.json(
        { error: "NUR AI is currently busy. Please try again in a moment." },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: "NUR AI is temporarily unavailable. Please try again." },
      { status: 500 }
    );
  }
}

// Only POST allowed
export async function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
