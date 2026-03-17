import { useState, useRef, useCallback, useEffect } from "react";

export interface BenchmarkDataPoint {
  step: number;
  time_ms: number;
  characters: number;
  dom_elements: number;
  memory_estimate_bytes: number;
}

const DISPLAY_UPDATE_INTERVAL = 10;

export function useBenchmark(
  isStreaming: boolean,
  elapsedMs: number,
  characters: number
) {
  const dataRef = useRef<BenchmarkDataPoint[]>([]);
  const stepRef = useRef(0);
  const [pointCount, setPointCount] = useState(0);
  const [latestPoint, setLatestPoint] = useState<BenchmarkDataPoint | null>(
    null
  );

  useEffect(() => {
    if (!isStreaming || elapsedMs === 0) return;

    stepRef.current += 1;

    const point: BenchmarkDataPoint = {
      step: stepRef.current,
      time_ms: elapsedMs,
      characters,
      dom_elements: document.querySelectorAll("*").length,
      memory_estimate_bytes:
        (performance as unknown as { memory?: { usedJSHeapSize: number } })
          .memory?.usedJSHeapSize ?? 0,
    };

    dataRef.current.push(point);

    if (stepRef.current % DISPLAY_UPDATE_INTERVAL === 0) {
      setPointCount(dataRef.current.length);
      setLatestPoint(point);
    }
  }, [isStreaming, elapsedMs, characters]);

  useEffect(() => {
    if (!isStreaming && dataRef.current.length > 0) {
      setPointCount(dataRef.current.length);
      setLatestPoint(dataRef.current[dataRef.current.length - 1]);
    }
  }, [isStreaming]);

  const reset = useCallback(() => {
    stepRef.current = 0;
    dataRef.current = [];
    setPointCount(0);
    setLatestPoint(null);
  }, []);

  return { dataRef, pointCount, latestPoint, reset };
}
