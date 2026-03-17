import { useState, useRef, useCallback, useEffect } from "react";
import { parseMarkdownIntoBlocks } from "streamdown";

export interface StreamBlock {
  id: number;
  content: string;
  isComplete: boolean;
}

export function useStreamEngine(
  source: string,
  charsPerTick: number,
  tickIntervalMs: number
) {
  const [blocks, setBlocks] = useState<StreamBlock[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const startTimeRef = useRef(0);
  const prevBlocksRef = useRef<StreamBlock[]>([]);

  useEffect(() => {
    if (!isStreaming) return;
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const next = Math.min(indexRef.current + charsPerTick, source.length);
      indexRef.current = next;

      const text = source.slice(0, next);
      const raw = parseMarkdownIntoBlocks(text);
      const done = next >= source.length;
      const prev = prevBlocksRef.current;

      const updated: StreamBlock[] = raw.map((content, i) => {
        const isComplete = done || i < raw.length - 1;

        // Reuse previous object reference when nothing changed (memo stability)
        if (
          prev[i] &&
          prev[i].content === content &&
          prev[i].isComplete === isComplete
        ) {
          return prev[i];
        }

        return { id: prev[i]?.id ?? i, content, isComplete };
      });

      prevBlocksRef.current = updated;
      setBlocks(updated);
      setProgress((next / source.length) * 100);
      setElapsedMs(Date.now() - startTimeRef.current);

      if (done) {
        clearInterval(timerRef.current);
        setIsStreaming(false);
      }
    }, tickIntervalMs);

    return () => clearInterval(timerRef.current);
  }, [isStreaming, charsPerTick, tickIntervalMs, source]);

  const start = useCallback(() => {
    indexRef.current = 0;
    prevBlocksRef.current = [];
    setBlocks([]);
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
    prevBlocksRef.current = [];
    setBlocks([]);
    setProgress(0);
    setElapsedMs(0);
  }, []);

  return {
    blocks,
    isStreaming,
    progress,
    elapsedMs,
    totalChars: source.length,
    start,
    stop,
    reset,
  };
}
