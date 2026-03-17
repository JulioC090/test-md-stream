import { useState, useEffect, memo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import type { StreamBlock } from "./useStreamEngine";

const OVERSCAN = 5;
const ESTIMATED_BLOCK_HEIGHT = 120;

/**
 * Memoized per-block Streamdown renderer.
 *
 * Props are primitives so React.memo shallow-compare prevents re-renders
 * for completed blocks even when the parent list re-renders.
 */
const StreamdownBlock = memo(function StreamdownBlock({
  content,
  isActive,
}: {
  content: string;
  isActive: boolean;
}) {
  return (
    <Streamdown
      plugins={{ code, math }}
      isAnimating={isActive}
      animated={isActive ? true : undefined}
      caret={isActive ? "block" : undefined}
      mode={isActive ? "streaming" : "static"}
    >
      {content}
    </Streamdown>
  );
});

/**
 * Wrapper that shows a loading spinner on first mount (1-2 frames),
 * then renders the real Streamdown content. This gives the browser
 * a painted placeholder when the user scrolls fast and virtualised
 * items mount in rapid succession.
 */
const BlockItem = memo(function BlockItem({
  content,
  isComplete,
  isActive,
}: {
  content: string;
  isComplete: boolean;
  isActive: boolean;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Two rAF frames ≈ 32 ms — long enough to paint the skeleton,
    // short enough to be invisible during normal scrolling.
    const outer = requestAnimationFrame(() => {
      const inner = requestAnimationFrame(() => setReady(true));
      // Store inner id so we can cancel properly
      frameRef = inner;
    });
    let frameRef = 0;
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(frameRef);
    };
  }, []);

  // Never delay the active (currently streaming) block
  if (!ready && isComplete) {
    return (
      <div className="block-loading">
        <div className="block-loading-spinner" />
      </div>
    );
  }

  return <StreamdownBlock content={content} isActive={isActive} />;
});

// ─── Public component ──────────────────────────────────────────────

interface VirtualizedStreamProps {
  blocks: StreamBlock[];
  isStreaming: boolean;
  scrollElementRef: React.RefObject<HTMLDivElement | null>;
}

export function VirtualizedStream({
  blocks,
  isStreaming,
  scrollElementRef,
}: VirtualizedStreamProps) {
  const virtualizer = useVirtualizer({
    count: blocks.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => ESTIMATED_BLOCK_HEIGHT,
    overscan: OVERSCAN,
  });

  return (
    <div
      style={{
        height: virtualizer.getTotalSize(),
        width: "100%",
        position: "relative",
      }}
    >
      {virtualizer.getVirtualItems().map((item) => {
        const block = blocks[item.index];
        const isActive = !block.isComplete && isStreaming;

        return (
          <div
            key={item.index}
            data-index={item.index}
            ref={virtualizer.measureElement}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${item.start}px)`,
            }}
          >
            <BlockItem
              content={block.content}
              isComplete={block.isComplete}
              isActive={isActive}
            />
          </div>
        );
      })}
    </div>
  );
}
