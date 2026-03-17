import { useState, useRef, useCallback, useLayoutEffect } from "react";
import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { MASSIVE_MARKDOWN } from "../content";
import { useSimpleStreamEngine } from "../hooks/useSimpleStreamEngine";
import { useBenchmark } from "../hooks/useBenchmark";
import { StreamControls } from "../components/StreamControls";
import { StatsBar } from "../components/StatsBar";
import { BenchmarkOverlay } from "../components/BenchmarkOverlay";

const CHARS_PER_TICK = 12;
const TICK_INTERVAL_MS = 8;

export function StandardStreamPage() {
  const [speed, setSpeed] = useState(CHARS_PER_TICK);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const autoScrollRef = useRef(true);

  const engine = useSimpleStreamEngine(MASSIVE_MARKDOWN, speed, TICK_INTERVAL_MS);

  const charsStreamed = engine.text.length;
  const charsPerSecond =
    engine.elapsedMs > 0
      ? Math.round((charsStreamed / engine.elapsedMs) * 1000)
      : 0;

  const benchmark = useBenchmark(engine.isStreaming, engine.elapsedMs, charsStreamed);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    autoScrollRef.current = atBottom;
    setAutoScroll(atBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (!containerRef.current) return;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
    autoScrollRef.current = true;
    setAutoScroll(true);
  }, []);

  useLayoutEffect(() => {
    if (!autoScrollRef.current || !engine.text) return;
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
    });
  }, [engine.text]);

  const startStream = useCallback(() => {
    autoScrollRef.current = true;
    setAutoScroll(true);
    benchmark.reset();
    engine.start();
  }, [engine.start, benchmark.reset]);

  const handleReset = useCallback(() => {
    engine.reset();
    benchmark.reset();
  }, [engine.reset, benchmark.reset]);

  return (
    <>
      <StreamControls
        isStreaming={engine.isStreaming}
        hasContent={engine.text.length > 0}
        speed={speed}
        setSpeed={setSpeed}
        onStart={startStream}
        onStop={engine.stop}
        onReset={handleReset}
      />
      <StatsBar
        progress={engine.progress}
        charsStreamed={charsStreamed}
        totalChars={engine.totalChars}
        charsPerSecond={charsPerSecond}
        elapsedMs={engine.elapsedMs}
      />
      <BenchmarkOverlay
        dataRef={benchmark.dataRef}
        pointCount={benchmark.pointCount}
        latestPoint={benchmark.latestPoint}
        pageType="standard"
        isStreaming={engine.isStreaming}
      />
      <div className="stream-wrapper">
        <div
          className="stream-container"
          ref={containerRef}
          onScroll={handleScroll}
        >
          {engine.text ? (
            <Streamdown
              plugins={{ code, math }}
              isAnimating={engine.isStreaming}
              animated={engine.isStreaming ? true : undefined}
              caret={engine.isStreaming ? "block" : undefined}
              mode={engine.isStreaming ? "streaming" : "static"}
            >
              {engine.text}
            </Streamdown>
          ) : (
            <div className="empty-state">
              Press <strong>Start Stream</strong> to begin.
            </div>
          )}
        </div>
        {engine.isStreaming && !autoScroll && (
          <button className="scroll-to-bottom" onClick={scrollToBottom}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 3v10m0 0l-4-4m4 4l4-4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Follow stream
          </button>
        )}
      </div>
    </>
  );
}
