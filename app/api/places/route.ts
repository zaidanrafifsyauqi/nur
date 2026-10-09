/**
 * Stage Proxy-1 — same-origin Overpass proxy (server-only).
 * POST /api/places — validates coordinates/category/radius, builds the
 * Overpass query server-side, relays with a short budget, and returns the
 * raw `{ elements }` shape the client mapper already understands.
 *
 * The browser never talks to Overpass directly, so Overpass CORS behavior
 * is irrelevant here. Raw upstream bodies, queries, and coordinates are
 * never logged or surfaced. No server-side cache in this stage.
 */

import { NextRequest, NextResponse } from "next/server";
import { serveNearbySearch } from "@/lib/services/travel/placesServer";

// Simple in-memory rate limiting (best-effort, instance-local).
// Mirrors /api/ai: same window, same budget, same IP extraction.
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

function isAbortLike(error: unknown): boolean {
  if (error instanceof DOMException) return error.name === "AbortError";
  if (error instanceof Error) return /abort/i.test(error.message);
  return false;
}

export async function POST(req: NextRequest) {
  // Rate limiting — before any heavy work.
  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Nearby search is currently busy. Please try again in a moment." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const outcome = await serveNearbySearch(body, { signal: req.signal });
    if (outcome.status === 200) {
      return NextResponse.json({ elements: outcome.elements });
    }
    return NextResponse.json(
      { error: outcome.error },
      { status: outcome.status }
    );
  } catch (error) {
    // The caller went away mid-flight; nothing to deliver to.
    if (isAbortLike(error)) {
      return NextResponse.json({ error: "Request cancelled." }, { status: 499 });
    }
    return NextResponse.json(
      { error: "We couldn't load nearby places right now." },
      { status: 502 }
    );
  }
}

// Only POST allowed
export async function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
