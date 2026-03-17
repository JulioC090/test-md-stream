import type { BenchmarkDataPoint } from "../hooks/useBenchmark";
import { generateCSV, downloadCSV } from "../utils/csv";

interface BenchmarkOverlayProps {
  dataRef: React.RefObject<BenchmarkDataPoint[]>;
  pointCount: number;
  latestPoint: BenchmarkDataPoint | null;
  pageType: "standard" | "block" | "virtualized";
  isStreaming: boolean;
}

export function BenchmarkOverlay({
  dataRef,
  pointCount,
  latestPoint,
  pageType,
  isStreaming,
}: BenchmarkOverlayProps) {
  const handleExport = () => {
    const csv = generateCSV(dataRef.current);
    downloadCSV(csv, `benchmark-${pageType}.csv`);
  };

  return (
    <div className="benchmark-overlay">
      <div className="benchmark-header">
        <span className="benchmark-title">Benchmark</span>
        <span className="benchmark-dot" data-active={isStreaming} />
      </div>
      <div className="benchmark-stats">
        <div className="benchmark-stat">
          <span>Data points</span>
          <strong>{pointCount}</strong>
        </div>
        {latestPoint && (
          <>
            <div className="benchmark-stat">
              <span>DOM elements</span>
              <strong>{latestPoint.dom_elements.toLocaleString()}</strong>
            </div>
            <div className="benchmark-stat">
              <span>Memory</span>
              <strong>
                {latestPoint.memory_estimate_bytes > 0
                  ? `${(latestPoint.memory_estimate_bytes / 1024 / 1024).toFixed(1)} MB`
                  : "N/A"}
              </strong>
            </div>
          </>
        )}
      </div>
      <button
        className="btn btn-secondary benchmark-export-btn"
        onClick={handleExport}
        disabled={pointCount === 0}
      >
        Export CSV
      </button>
    </div>
  );
}
