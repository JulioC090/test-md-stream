import { memo } from "react";
import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import type { StreamBlock } from "../useStreamEngine";

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

interface BlockStreamProps {
  blocks: StreamBlock[];
  isStreaming: boolean;
}

export function BlockStream({ blocks, isStreaming }: BlockStreamProps) {
  return (
    <div>
      {blocks.map((block) => {
        const isActive = !block.isComplete && isStreaming;
        return (
          <div key={block.id}>
            <StreamdownBlock content={block.content} isActive={isActive} />
          </div>
        );
      })}
    </div>
  );
}
