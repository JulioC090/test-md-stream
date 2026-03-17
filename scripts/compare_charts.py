"""
Side-by-side static comparison charts for benchmark data.

Reads CSV files from ../data/ and outputs PNG charts to ../data/charts/
"""

import sys
from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
OUT_DIR = DATA_DIR / "charts"

PAGE_TYPES = ["standard", "block", "virtualized"]
COLORS = {"standard": "#ef4444", "block": "#3b82f6", "virtualized": "#22c55e"}
LABELS = {"standard": "Standard", "block": "Block", "virtualized": "Virtualized"}

METRICS = [
    ("characters", "Characters Streamed"),
    ("dom_elements", "DOM Elements"),
    ("memory_estimate_bytes", "Memory (MB)"),
]


def load_data() -> dict[str, pd.DataFrame]:
    frames: dict[str, pd.DataFrame] = {}
    for pt in PAGE_TYPES:
        path = DATA_DIR / f"benchmark-{pt}.csv"
        if path.exists():
            frames[pt] = pd.read_csv(path)
    return frames


def plot_metric_vs_time(
    frames: dict[str, pd.DataFrame],
    metric: str,
    title: str,
    ax: plt.Axes,
) -> None:
    for pt, df in frames.items():
        y = df[metric].copy()
        if metric == "memory_estimate_bytes":
            y = y / 1024 / 1024  # bytes -> MB
        ax.plot(df["time_ms"] / 1000, y, color=COLORS[pt], label=LABELS[pt], linewidth=1.4)
    ax.set_xlabel("Time (s)")
    ax.set_title(title, fontsize=11, fontweight="bold")
    ax.legend(fontsize=8)
    ax.grid(True, alpha=0.3)


def main() -> None:
    frames = load_data()
    if not frames:
        print(f"No CSV files found in {DATA_DIR}. Export benchmarks first.")
        sys.exit(1)

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # --- Combined chart with all metrics ---
    fig, axes = plt.subplots(1, len(METRICS), figsize=(6 * len(METRICS), 5))
    if len(METRICS) == 1:
        axes = [axes]

    for ax, (metric, title) in zip(axes, METRICS):
        plot_metric_vs_time(frames, metric, title, ax)

    fig.suptitle("Benchmark Comparison", fontsize=14, fontweight="bold", y=1.02)
    fig.tight_layout()
    out_path = OUT_DIR / "comparison_all.png"
    fig.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"Saved: {out_path}")

    # --- Individual metric charts ---
    for metric, title in METRICS:
        fig, ax = plt.subplots(figsize=(8, 5))
        plot_metric_vs_time(frames, metric, title, ax)
        fig.tight_layout()
        out_path = OUT_DIR / f"comparison_{metric}.png"
        fig.savefig(out_path, dpi=150, bbox_inches="tight")
        plt.close(fig)
        print(f"Saved: {out_path}")

    print("Done.")


if __name__ == "__main__":
    main()
