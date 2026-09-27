"use client";

/**
 * Stage 2C — single audio controller for a surah page.
 *
 * Owns ONE HTMLAudioElement (created on mount, cleaned up on unmount)
 * and exposes two contexts so subscribers re-render selectively:
 * - AudioStateContext: availability, status, current index, actions
 *   (consumed by play buttons + indicator — no per-second updates).
 * - AudioTimeContext: currentTime + duration at most 1 Hz
 *   (consumed by the progress bar only).
 *
 * Behavior: play/pause per ayah, prev/next preserve the playing state,
 * auto-advance on ended, stop (no loop) after the last ayah.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { QuranAudioAyah } from "@/lib/types";

export type QuranAudioStatus = "idle" | "loading" | "playing" | "paused" | "error";

export type QuranPlaybackMode = "single" | "surah";

interface AudioStateValue {
  available: boolean;
  status: QuranAudioStatus;
  /** 0-based index into `audios`, null before first selection. */
  index: number | null;
  total: number;
  error: string | null;
  playbackMode: QuranPlaybackMode;
  playAyah: (index: number) => void;
  toggleAyah: (index: number) => void;
  toggleSurah: () => void;
  /** Stage continuous: Play/Resume full surah sequential playback */
  playSurah: () => void;
  /** Reset to awal surah (ayah 1) tanpa autoplay */
  resetSurah: () => void;
  /** Pause current playback (keeps mode & position) */
  pauseAudio: () => void;
  prev: () => void;
  next: () => void;
  seek: (seconds: number) => void;
  retry: () => void;
}

interface AudioTimeValue {
  currentTime: number;
  duration: number;
}

const AudioStateContext = createContext<AudioStateValue | null>(null);
const AudioTimeContext = createContext<AudioTimeValue>({ currentTime: 0, duration: 0 });

export function useAudioState(): AudioStateValue {
  const ctx = useContext(AudioStateContext);
  if (!ctx) throw new Error("useAudioState must be used inside SurahAudioProvider.");
  return ctx;
}

export function useAudioTime(): AudioTimeValue {
  return useContext(AudioTimeContext);
}

const PLAYBACK_ERROR_MESSAGE =
  "Quran audio couldn't be played. Please try again.";

export function SurahAudioProvider({
  audios,
  children,
}: {
  audios: QuranAudioAyah[] | null;
  children: React.ReactNode;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [status, setStatus] = useState<QuranAudioStatus>("idle");
  const [index, setIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackMode, setPlaybackMode] = useState<QuranPlaybackMode>("single");

  const indexRef = useRef<number | null>(null);
  const statusRef = useRef<QuranAudioStatus>("idle");
  const playbackModeRef = useRef<QuranPlaybackMode>("single");
  const lastWholeSecond = useRef(0);

  const total = audios?.length ?? 0;

  useEffect(() => {
    indexRef.current = index;
  }, [index]);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => {
    playbackModeRef.current = playbackMode;
  }, [playbackMode]);

  const setMode = useCallback((m: QuranPlaybackMode) => {
    setPlaybackMode(m);
    playbackModeRef.current = m;
  }, []);

  /** Load (if needed) and play the ayah at `i`. Returns false on rejection. */
  const loadAndPlay = useCallback(
    async (i: number): Promise<boolean> => {
      const el = audioRef.current;
      const url = audios?.[i]?.audioUrl;
      if (!el || !url) return false;
      setError(null);
      setStatus("loading");
      try {
        const absolute = new URL(url, window.location.href).href;
        if (el.src !== absolute) {
          el.src = url;
          el.load();
        }
        await el.play();
        return true;
      } catch {
        setStatus("error");
        setError(PLAYBACK_ERROR_MESSAGE);
        // Continuous mode must not stay stuck in loading
        if (playbackModeRef.current === "surah") setMode("single");
        return false;
      }
    },
    [audios]
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const playAyah = useCallback(
    (i: number) => {
      if (!audios || i < 0 || i >= audios.length) return;
      setMode("single");
      setIndex(i);
      setCurrentTime(0);
      lastWholeSecond.current = 0;
      void loadAndPlay(i);
    },
    [audios, loadAndPlay, setMode]
  );

  const toggleAyah = useCallback(
    (i: number) => {
      if (index === i && statusRef.current === "playing") {
        // Pause keeps single mode
        pause();
        return;
      }
      // Any per-ayah click switches to single mode
      playAyah(i);
    },
    [index, pause, playAyah, setMode]
  );

  /**
   * Continuous surah playback: sequential auto-advance.
   * - Idle: start from current ?? 0
   * - Playing single at cur: switch to surah without restarting
   * - Playing surah: pause (resume preserves position)
   * - Paused surah: resume without restart
   * - Paused single/idle: start surah from current ?? 0
   * - If at final ayah (completed), restart from awal
   */
  const playSurah = useCallback(() => {
    if (!audios || audios.length === 0) return;
    const cur = indexRef.current;
    const isPlaying = statusRef.current === "playing";
    const curMode = playbackModeRef.current;

    if (curMode === "surah" && isPlaying) {
      pause();
      return;
    }
    if (curMode === "surah" && !isPlaying && cur != null) {
      // Resume surah from paused position without resetting time
      const el = audioRef.current;
      const url = audios[cur]?.audioUrl;
      if (el && url) {
        const absolute = (() => {
          try {
            return new URL(url, window.location.href).href;
          } catch {
            return url;
          }
        })();
        if (el.src === absolute && el.currentTime > 0 && Number.isFinite(el.duration)) {
          setError(null);
          setStatus("loading");
          el.play().catch(() => {
            setStatus("error");
            setError(PLAYBACK_ERROR_MESSAGE);
            setMode("single");
          });
          return;
        }
      }
      // Fallback to load current if src mismatch
      setMode("surah");
      setCurrentTime(0);
      lastWholeSecond.current = 0;
      void loadAndPlay(cur);
      return;
    }
    if (cur != null && isPlaying) {
      // Switch to surah without restarting current ayah
      setMode("surah");
      return;
    }
    // If at last ayah and completed, reset to awal
    let start = cur ?? 0;
    if (cur != null && cur === audios.length - 1 && !isPlaying && curMode !== "surah") {
      start = 0;
    }
    if (start <0 || start >= audios.length) return;
    setMode("surah");
    setIndex(start);
    setCurrentTime(0);
    lastWholeSecond.current = 0;
    void loadAndPlay(start);
  }, [audios, pause, loadAndPlay, setMode]);

  const resetSurah = useCallback(() => {
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
    setMode("single");
    setStatus("paused");
    setIndex(0);
    setCurrentTime(0);
    lastWholeSecond.current = 0;
    setError(null);
    // Preload ayah 1 without autoplay
    const url = audios?.[0]?.audioUrl;
    if (el && url) {
      try {
        const absolute = new URL(url, window.location.href).href;
        if (el.src !== absolute) {
          el.src = url;
          el.load();
        }
      } catch {
        // ignore
      }
    }
  }, [audios, setMode]);

  const toggleSurah = useCallback(() => {
    // Keep toggleSurah as alias to playSurah for backward compat
    playSurah();
  }, [playSurah]);

  /** Move selection, preserving the playing state (no auto-play if paused). */
  const step = useCallback(
    (delta: -1 | 1) => {
      if (!audios || audios.length === 0) return;
      const wasPlaying = statusRef.current === "playing";
      const current = indexRef.current;
      const target =
        current == null ? (delta === 1 ? 0 : audios.length - 1) : current + delta;
      if (target < 0 || target >= audios.length) return;
      const el = audioRef.current;
      const url = audios[target]?.audioUrl;
      if (!el || !url) return;
      setIndex(target);
      setCurrentTime(0);
      lastWholeSecond.current = 0;
      setError(null);
      try {
        const absolute = new URL(url, window.location.href).href;
        if (el.src !== absolute) {
          el.src = url;
          el.load();
        }
        if (wasPlaying) {
          setStatus("loading");
          el.play()?.catch(() => {
            setStatus("error");
            setError(PLAYBACK_ERROR_MESSAGE);
            if (playbackModeRef.current === "surah") setMode("single");
          });
        } else {
          setStatus("paused");
        }
      } catch {
        setStatus("error");
        setError(PLAYBACK_ERROR_MESSAGE);
        if (playbackModeRef.current === "surah") setMode("single");
      }
    },
    [audios, setMode]
  );

  const prev = useCallback(() => step(-1), [step]);
  const next = useCallback(() => step(1), [step]);

  const seek = useCallback((seconds: number) => {
    const el = audioRef.current;
    if (!el || !Number.isFinite(el.duration)) return;
    const clamped = Math.min(Math.max(0, seconds), el.duration);
    el.currentTime = clamped;
    setCurrentTime(clamped);
  }, []);

  const retry = useCallback(() => {
    const i = indexRef.current ?? 0;
    if (!audios || i >= audios.length) return;
    setError(null);
    void loadAndPlay(i);
  }, [audios, loadAndPlay]);

  // Ref mirrors for values the element callbacks need. Declared before
  // the mount effect; synced in an effect (never written during render).
  const audiosRef = useRef(audios);
  const stepRef = useRef(step);
  useEffect(() => {
    audiosRef.current = audios;
    stepRef.current = step;
  }, [audios, step]);

  // Single element + event wiring for the provider lifetime.
  useEffect(() => {
    const el = new Audio();
    el.preload = "metadata";
    audioRef.current = el;

    const onPlay = () => {
      setError(null);
      setStatus("playing");
    };
    const onPause = () => {
      if (statusRef.current !== "error") setStatus("paused");
    };
    const onTimeUpdate = () => {
      const whole = Math.floor(el.currentTime);
      if (whole !== lastWholeSecond.current) {
        lastWholeSecond.current = whole;
        setCurrentTime(el.currentTime);
      }
    };
    const onLoadedMetadata = () => {
      if (Number.isFinite(el.duration)) setDuration(el.duration);
    };
    const onEnded = () => {
      const mode = playbackModeRef.current;
      if (mode !== "surah") {
        // Single ayah mode: stop after this ayah (preserve existing behavior)
        setStatus("paused");
        return;
      }
      const i = indexRef.current;
      const count = audiosRef.current?.length ?? 0;
      if (i == null) {
        setStatus("paused");
        setMode("single");
        return;
      }
      if (i < count - 1) {
        // Continuous: advance to next ayah
        stepRef.current(1);
      } else {
        // Final ayah: stop, clear continuous mode, keep final ayah selected
        setStatus("paused");
        setMode("single");
      }
    };
    const onElementError = () => {
      setStatus("error");
      setError("Quran audio couldn't be loaded. Please try again.");
      // Stop continuous on error to avoid stuck loading state
      setMode("single");
    };

    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("loadedmetadata", onLoadedMetadata);
    el.addEventListener("ended", onEnded);
    el.addEventListener("error", onElementError);
    return () => {
      el.pause();
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("loadedmetadata", onLoadedMetadata);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("error", onElementError);
      el.removeAttribute("src");
      el.load();
      audioRef.current = null;
    };
  }, [step]);

  const stateValue = useMemo<AudioStateValue>(
    () => ({
      available: !!audios && audios.length > 0,
      status,
      index,
      total,
      error,
      playbackMode,
      playAyah,
      toggleAyah,
      toggleSurah,
      playSurah,
      resetSurah,
      pauseAudio: pause,
      prev,
      next,
      seek,
      retry,
    }),
    [
      audios,
      status,
      index,
      total,
      error,
      playbackMode,
      playAyah,
      toggleAyah,
      toggleSurah,
      playSurah,
      resetSurah,
      pause,
      prev,
      next,
      seek,
      retry,
    ]
  );

  const timeValue = useMemo<AudioTimeValue>(
    () => ({ currentTime, duration }),
    [currentTime, duration]
  );

  return (
    <AudioStateContext.Provider value={stateValue}>
      <AudioTimeContext.Provider value={timeValue}>
        {children}
      </AudioTimeContext.Provider>
    </AudioStateContext.Provider>
  );
}
