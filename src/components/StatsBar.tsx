interface StatsBarProps {
  progress: number;
  charsStreamed: number;
  totalChars: number;
  charsPerSecond: number;
  elapsedMs: number;
  blockCount?: number;
}

export function StatsBar({
  progress,
  charsStreamed,
  totalChars,
  charsPerSecond,
  elapsedMs,
  blockCount,
}: StatsBarProps) {
  return (
    <>
      <div className="stats-bar">
        <div className="stat">
          <span className="stat-label">Progress</span>
          <span className="stat-value">{progress.toFixed(1)}%</span>
        </div>
        <div className="stat">
          <span className="stat-label">Chars</span>
          <span className="stat-value">
            {charsStreamed.toLocaleString()} / {totalChars.toLocaleString()}
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
            {(elapsedMs / 1000).toFixed(1)}s
          </span>
        </div>
        {blockCount !== undefined && (
          <div className="stat">
            <span className="stat-label">Blocks</span>
            <span className="stat-value">{blockCount}</span>
          </div>
        )}
      </div>

      <div className="progress-bar-container">
        <div
          className="progress-bar"
          style={{ width: `${progress}%` }}
        />
      </div>
    </>
  );
}
