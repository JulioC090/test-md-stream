import type { BenchmarkDataPoint } from "../hooks/useBenchmark";

const CSV_HEADER = "step,time_ms,characters,dom_elements,memory_estimate_bytes";

export function generateCSV(dataPoints: BenchmarkDataPoint[]): string {
  const rows = dataPoints.map(
    (p) =>
      `${p.step},${p.time_ms},${p.characters},${p.dom_elements},${p.memory_estimate_bytes}`
  );
  return [CSV_HEADER, ...rows].join("\n");
}

export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
