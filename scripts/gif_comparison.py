"""
Generate animated GIFs comparing all page types side by side,
one GIF per metric.

Reads CSV files from ../data/ and outputs GIFs to ../data/gifs/
"""

import sys
from pathlib import Path
from typing import Callable, Optional

import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
from PIL import Image
import io

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
OUT_DIR = DATA_DIR / "gifs"

PAGE_TYPES = ["standard", "block", "virtualized"]
COLORS = {"standard": "#ef4444", "block": "#3b82f6", "virtualized": "#22c55e"}
LABELS = {"standard": "Standard", "block": "Block", "virtualized": "Virtualized"}

METRICS = [
    ("characters", "Characters Streamed", None),
    ("dom_elements", "DOM Elements", None),
    ("memory_estimate_bytes", "Memory (MB)", lambda y: y / 1024 / 1024),
]

FRAMES_COUNT = 60
FRAME_DURATION_MS = 80


def load_data() -> dict[str, pd.DataFrame]:
    frames: dict[str, pd.DataFrame] = {}
    for pt in PAGE_TYPES:
        path = DATA_DIR / f"benchmark-{pt}.csv"
        if path.exists():
            frames[pt] = pd.read_csv(path)
    return frames


def fig_to_pil(fig: plt.Figure) -> Image.Image:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=100, bbox_inches="tight")
    buf.seek(0)
    img = Image.open(buf).copy()
    buf.close()
    return img


def compute_global_limits(
    frames: dict[str, pd.DataFrame],
    metric: str,
    transform: Optional[Callable],
) -> tuple[float, float, float]:
    max_time = 0.0
    max_y = 0.0
    max_rows = 0
    for df in frames.values():
        t = df["time_ms"].values / 1000
        y = df[metric].values.copy().astype(float)
        if transform:
            y = transform(y)
        max_time = max(max_time, t[-1])
        max_y = max(max_y, y.max())
        max_rows = max(max_rows, len(df))
    return max_time, max_y * 1.1 if max_y > 0 else 1, max_rows


def main() -> None:
    frames = load_data()
    if len(frames) < 2:
        print(f"Need at least 2 CSV files in {DATA_DIR} for comparison.")
        sys.exit(1)

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    available = [pt for pt in PAGE_TYPES if pt in frames]
    n_cols = len(available)

    for metric, title, transform in METRICS:
        print(f"Generating comparison: {metric} ...")
        max_time, max_y, max_rows = compute_global_limits(frames, metric, transform)

        step_size = max(1, max_rows // FRAMES_COUNT)
        indices = list(range(step_size, max_rows, step_size))
        if not indices or indices[-1] != max_rows:
            indices.append(max_rows)

        images: list[Image.Image] = []

        for end in indices:
            fig, axes = plt.subplots(1, n_cols, figsize=(6 * n_cols, 4))
            if n_cols == 1:
                axes = [axes]

            for ax, pt in zip(axes, available):
                df = frames[pt]
                row_end = min(end, len(df))
                t = df["time_ms"].values[:row_end] / 1000
                y = df[metric].values[:row_end].copy().astype(float)
                if transform:
                    y = transform(y)

                ax.plot(t, y, color=COLORS[pt], linewidth=1.6)
                ax.set_xlim(0, max_time)
                ax.set_ylim(0, max_y)
                ax.set_xlabel("Time (s)")
                ax.set_title(f"{LABELS[pt]}", fontsize=11, fontweight="bold")
                ax.grid(True, alpha=0.3)

                pct = (row_end / len(df)) * 100
                ax.text(
                    0.98, 0.02, f"{pct:.0f}%",
                    transform=ax.transAxes, ha="right", va="bottom",
                    fontsize=16, fontweight="bold", color=COLORS[pt], alpha=0.5,
                )

            fig.suptitle(title, fontsize=13, fontweight="bold")
            fig.tight_layout()
            images.append(fig_to_pil(fig))
            plt.close(fig)

        durations = [FRAME_DURATION_MS] * len(images)
        durations[-1] = 1500

        out_path = OUT_DIR / f"comparison_{metric}.gif"
        images[0].save(
            out_path,
            save_all=True,
            append_images=images[1:],
            duration=durations,
            loop=0,
        )
        print(f"  Saved: {out_path}")

    print("Done.")


if __name__ == "__main__":
    main()
