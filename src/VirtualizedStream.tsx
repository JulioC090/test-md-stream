import { memo } from "react";
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
            <StreamdownBlock
              content={block.content}
              isActive={isActive}
            />
          </div>
        );
      })}
    </div>
  );
}
