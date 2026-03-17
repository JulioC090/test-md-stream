import { useState, useRef, useCallback, useEffect } from "react";

export function useSimpleStreamEngine(
  source: string,
  charsPerTick: number,
  tickIntervalMs: number
) {
  const [text, setText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const startTimeRef = useRef(0);

  useEffect(() => {
    if (!isStreaming) return;
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const next = Math.min(indexRef.current + charsPerTick, source.length);
      indexRef.current = next;

      setText(source.slice(0, next));
      setProgress((next / source.length) * 100);
      setElapsedMs(Date.now() - startTimeRef.current);

      if (next >= source.length) {
        clearInterval(timerRef.current);
        setIsStreaming(false);
      }
    }, tickIntervalMs);

    return () => clearInterval(timerRef.current);
  }, [isStreaming, charsPerTick, tickIntervalMs, source]);

  const start = useCallback(() => {
    indexRef.current = 0;
    setText("");
    setProgress(0);
    setElapsedMs(0);
    setIsStreaming(true);
  }, []);

  const stop = useCallback(() => {
    clearInterval(timerRef.current);
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    clearInterval(timerRef.current);
    setIsStreaming(false);
    indexRef.current = 0;
    setText("");
    setProgress(0);
    setElapsedMs(0);
  }, []);

  return {
    text,
    isStreaming,
    progress,
    elapsedMs,
    totalChars: source.length,
    start,
    stop,
    reset,
  };
}
