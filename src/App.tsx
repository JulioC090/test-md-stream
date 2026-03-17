import { useState, useRef, useCallback, useLayoutEffect } from "react";
import "streamdown/styles.css";
import "katex/dist/katex.min.css";
import { MASSIVE_MARKDOWN } from "./content";
import { useStreamEngine } from "./useStreamEngine";
import { VirtualizedStream } from "./VirtualizedStream";

const CHARS_PER_TICK = 12;
const TICK_INTERVAL_MS = 8;

function App() {
  const [speed, setSpeed] = useState(CHARS_PER_TICK);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const autoScrollRef = useRef(true);

  const engine = useStreamEngine(MASSIVE_MARKDOWN, speed, TICK_INTERVAL_MS);

  // --- scroll helpers ---

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

  // Keep viewport pinned to the bottom while auto-scroll is on.
  // useLayoutEffect runs after DOM commit but before paint, so the
  // user never sees the scroll lag behind the new content.
  useLayoutEffect(() => {
    if (!autoScrollRef.current || engine.blocks.length === 0) return;
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
    });
  }, [engine.blocks]);

  // --- derived stats ---

  const charsStreamed = Math.round(
    (engine.progress / 100) * engine.totalChars
  );
  const charsPerSecond =
    engine.elapsedMs > 0
      ? Math.round((charsStreamed / engine.elapsedMs) * 1000)
      : 0;

  // --- actions ---

  const startStream = useCallback(() => {
    autoScrollRef.current = true;
    setAutoScroll(true);
    engine.start();
  }, [engine.start]);

  return (
    <div className="app">
      <header className="header">
        <h1>Streamdown Massive Stream Demo</h1>
        <p className="subtitle">
          Simulating massive AI streaming output &mdash;{" "}
          {engine.totalChars.toLocaleString()} characters
        </p>
      </header>

      <div className="controls">
        <div className="controls-row">
          {!engine.isStreaming ? (
            <button className="btn btn-primary" onClick={startStream}>
              {engine.blocks.length > 0 ? "Restart Stream" : "Start Stream"}
            </button>
          ) : (
            <button className="btn btn-danger" onClick={engine.stop}>
              Stop
            </button>
          )}
          <button
            className="btn btn-secondary"
            onClick={engine.reset}
            disabled={engine.isStreaming}
          >
            Reset
          </button>
        </div>

        <div className="speed-control">
          <label>
            Speed: <strong>{speed}</strong> chars/tick
          </label>
          <input
            type="range"
            min={1}
            max={1000}
            step={10}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="stats-bar">
        <div className="stat">
          <span className="stat-label">Progress</span>
          <span className="stat-value">{engine.progress.toFixed(1)}%</span>
        </div>
        <div className="stat">
          <span className="stat-label">Chars</span>
          <span className="stat-value">
            {charsStreamed.toLocaleString()} /{" "}
            {engine.totalChars.toLocaleString()}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Speed</span>
          <span className="stat-value">
            {charsPerSecond.toLocaleString()} c/s
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Elapsed</span>
          <span className="stat-value">
            {(engine.elapsedMs / 1000).toFixed(1)}s
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Blocks</span>
          <span className="stat-value">{engine.blocks.length}</span>
        </div>
      </div>

      <div className="progress-bar-container">
        <div
          className="progress-bar"
          style={{ width: `${engine.progress}%` }}
        />
      </div>

      <div className="stream-wrapper">
        <div
          className="stream-container"
          ref={containerRef}
          onScroll={handleScroll}
        >
          {engine.blocks.length > 0 ? (
            <VirtualizedStream
              blocks={engine.blocks}
              isStreaming={engine.isStreaming}
              scrollElementRef={containerRef}
            />
          ) : (
            <div className="empty-state">
              Press <strong>Start Stream</strong> to begin the massive streaming
              simulation.
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
    </div>
  );
}

export default App;
