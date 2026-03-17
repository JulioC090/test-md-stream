interface StreamControlsProps {
  isStreaming: boolean;
  hasContent: boolean;
  speed: number;
  setSpeed: (speed: number) => void;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
}

export function StreamControls({
  isStreaming,
  hasContent,
  speed,
  setSpeed,
  onStart,
  onStop,
  onReset,
}: StreamControlsProps) {
  return (
    <div className="controls">
      <div className="controls-row">
        {!isStreaming ? (
          <button className="btn btn-primary" onClick={onStart}>
            {hasContent ? "Restart Stream" : "Start Stream"}
          </button>
        ) : (
          <button className="btn btn-danger" onClick={onStop}>
            Stop
          </button>
        )}
        <button
          className="btn btn-secondary"
          onClick={onReset}
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
  );
}
