import { useState, useEffect, useRef, useCallback } from "react";
import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import "streamdown/styles.css";
import "katex/dist/katex.min.css";
import { MASSIVE_MARKDOWN } from "./content";

const CHARS_PER_TICK = 12;
const TICK_INTERVAL_MS = 8;

function App() {
  const [text, setText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [speed, setSpeed] = useState(CHARS_PER_TICK);
  const [progress, setProgress] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const startTimeRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const autoScrollRef = useRef(true);

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

  useEffect(() => {
    if (!isStreaming) return;

    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const nextIndex = Math.min(
        indexRef.current + speed,
        MASSIVE_MARKDOWN.length
      );
      const chunk = MASSIVE_MARKDOWN.slice(0, nextIndex);
      indexRef.current = nextIndex;
      setText(chunk);
      setProgress((nextIndex / MASSIVE_MARKDOWN.length) * 100);
      setElapsedMs(Date.now() - startTimeRef.current);

      if (autoScrollRef.current && containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }

      if (nextIndex >= MASSIVE_MARKDOWN.length) {
        clearInterval(timerRef.current);
        setIsStreaming(false);
      }
    }, TICK_INTERVAL_MS);

    return () => clearInterval(timerRef.current);
  }, [isStreaming, speed]);

  const startStream = () => {
    indexRef.current = 0;
    setText("");
    setProgress(0);
    setElapsedMs(0);
    autoScrollRef.current = true;
    setAutoScroll(true);
    setIsStreaming(true);
  };

  const stopStream = () => {
    clearInterval(timerRef.current);
    setIsStreaming(false);
  };

  const resetStream = () => {
    clearInterval(timerRef.current);
    setIsStreaming(false);
    indexRef.current = 0;
    setText("");
    setProgress(0);
    setElapsedMs(0);
  };

  const charsStreamed = indexRef.current;
  const charsPerSecond =
    elapsedMs > 0 ? Math.round((charsStreamed / elapsedMs) * 1000) : 0;

  return (
    <div className="app">
      <header className="header">
        <h1>Streamdown Massive Stream Demo</h1>
        <p className="subtitle">
          Simulating massive AI streaming output — {MASSIVE_MARKDOWN.length.toLocaleString()} characters
        </p>
      </header>

      <div className="controls">
        <div className="controls-row">
          {!isStreaming ? (
            <button className="btn btn-primary" onClick={startStream}>
              {text ? "Restart Stream" : "Start Stream"}
            </button>
          ) : (
            <button className="btn btn-danger" onClick={stopStream}>
              Stop
            </button>
          )}
          <button
            className="btn btn-secondary"
            onClick={resetStream}
            disabled={isStreaming}
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
          <span className="stat-value">{progress.toFixed(1)}%</span>
        </div>
        <div className="stat">
          <span className="stat-label">Chars Streamed</span>
          <span className="stat-value">
            {charsStreamed.toLocaleString()} / {MASSIVE_MARKDOWN.length.toLocaleString()}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Speed</span>
          <span className="stat-value">
            {charsPerSecond.toLocaleString()} chars/sec
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Elapsed</span>
          <span className="stat-value">{(elapsedMs / 1000).toFixed(1)}s</span>
        </div>
      </div>

      <div className="progress-bar-container">
        <div className="progress-bar" style={{ width: `${progress}%` }} />
      </div>

      <div className="stream-wrapper">
        <div
          className="stream-container"
          ref={containerRef}
          onScroll={handleScroll}
        >
          {text ? (
            <Streamdown
              plugins={{ code, math }}
              isAnimating={isStreaming}
              animated
              caret={isStreaming ? "block" : undefined}
            >
              {text}
            </Streamdown>
          ) : (
            <div className="empty-state">
              Press <strong>Start Stream</strong> to begin the massive streaming
              simulation.
            </div>
          )}
        </div>
        {isStreaming && !autoScroll && (
          <button className="scroll-to-bottom" onClick={scrollToBottom}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Follow stream
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
