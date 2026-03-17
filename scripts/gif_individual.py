"""
Generate animated GIFs showing the individual evolution of each metric
over time, one GIF per page type per metric.

Reads CSV files from ../data/ and outputs GIFs to ../data/gifs/
"""

import sys
from pathlib import Path
from typing import Callable, Optional

import matplotlib.pyplot as plt
import pandas as pd
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


def generate_individual_gif(
    df: pd.DataFrame,
    page_type: str,
    metric: str,
    title: str,
    transform: Optional[Callable],
) -> list[Image.Image]:
    time_s = df["time_ms"].values / 1000
    y = df[metric].values.copy().astype(float)
    if transform:
        y = transform(y)

    total = len(df)
    step_size = max(1, total // FRAMES_COUNT)
    indices = list(range(step_size, total, step_size))
    if indices[-1] != total:
        indices.append(total)

    images: list[Image.Image] = []
    for end in indices:
        fig, ax = plt.subplots(figsize=(7, 4))
        ax.plot(time_s[:end], y[:end], color=COLORS[page_type], linewidth=1.6)
        ax.set_xlim(time_s[0], time_s[-1])
        ax.set_ylim(0, y.max() * 1.1 if y.max() > 0 else 1)
        ax.set_xlabel("Time (s)")
        ax.set_title(f"{LABELS[page_type]} — {title}", fontsize=11, fontweight="bold")
        ax.grid(True, alpha=0.3)

        # Progress text
        pct = (end / total) * 100
        ax.text(
            0.98, 0.02, f"{pct:.0f}%",
            transform=ax.transAxes, ha="right", va="bottom",
            fontsize=16, fontweight="bold", color=COLORS[page_type], alpha=0.5,
        )

        fig.tight_layout()
        images.append(fig_to_pil(fig))
        plt.close(fig)

    return images


def main() -> None:
    frames = load_data()
    if not frames:
        print(f"No CSV files found in {DATA_DIR}. Export benchmarks first.")
        sys.exit(1)

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for pt, df in frames.items():
        for metric, title, transform in METRICS:
            if metric not in df.columns:
                continue
            print(f"Generating: {pt} / {metric} ...")
            images = generate_individual_gif(df, pt, metric, title, transform)
            # Hold last frame longer
            durations = [FRAME_DURATION_MS] * len(images)
            durations[-1] = 1500

            out_path = OUT_DIR / f"{pt}_{metric}.gif"
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
