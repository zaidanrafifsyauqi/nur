"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import type { Hadith } from "@/lib/types";

function formatHadithForCopy(h: Hadith): string {
  const lines = [`${h.collectionName} · No. ${h.hadithNumber}`];
  if (h.arabic) lines.push("", h.arabic);
  lines.push("", h.translation);
  if (h.reference) lines.push("", `Ref: ${h.reference}`);
  if (h.grading) lines.push(`Grade: ${h.grading}`);
  return lines.join("\n");
}

/** Stage 2F — copy island with clipboard fallback + graceful failure. */
export function CopyHadithButton({ hadith }: { hadith: Hadith }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const flash = (ok: boolean) => {
    setCopied(ok);
    setFailed(!ok);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setCopied(false);
      setFailed(false);
    }, 2000);
  };

  const copy = async () => {
    const text = formatHadithForCopy(hadith);
    try {
      await navigator.clipboard.writeText(text);
      flash(true);
      return;
    } catch {
      // Fallback for non-secure contexts / older browsers.
    }
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "absolute";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(area);
      flash(ok);
    } catch {
      flash(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy hadith ${hadith.collectionName} number ${hadith.hadithNumber}`}
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[var(--nur-border)] px-3.5 text-sm font-medium transition-colors hover:bg-[var(--nur-surface-2)]"
      >
        {copied ? (
          <Check className="h-4 w-4 text-nur-deep dark:text-nur-gold" aria-hidden />
        ) : (
          <Copy className="h-4 w-4" aria-hidden />
        )}
        {copied ? "Copied" : "Copy"}
      </button>
      {failed ? (
        <span role="status" className="text-xs text-[var(--nur-text-secondary)]">
          Copy failed in this browser.
        </span>
      ) : null}
    </span>
  );
}
