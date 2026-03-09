import type { ChatMessage, MessageBlock } from "../lib/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ThinkingBlock } from "./ThinkingBlock";
import { ToolCallBlock } from "./ToolCallBlock";
import { useI18n } from "../lib/i18n";

interface MessageBubbleProps {
  message: ChatMessage;
  agentName?: string;
}

export function MessageBubble({ message, agentName }: MessageBubbleProps) {
  const { t } = useI18n();
  const isUser = message.role === "user";
  const isStreaming = message.status === "streaming";

  return (
    <div className={`w-full text-foreground ${isUser ? "bg-muted/30" : ""}`}>
      <div className="p-4 max-w-3xl mx-auto md:px-6 md:py-5">
        <div className="mb-1.5">
          <span className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground">
            {isUser ? t("you") : (agentName || "Clip")}
          </span>
        </div>

        <div className="w-full space-y-3 overflow-hidden min-w-0">
          {message.blocks.map((block, idx) => (
            <BlockRenderer
              key={idx}
              block={block}
              isStreaming={isStreaming}
              isLastBlock={idx === message.blocks.length - 1}
            />
          ))}

          {isStreaming && message.blocks.length === 0 && (
            <span className="text-muted-foreground animate-pulse flex h-6 items-center gap-1">
              <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
          )}

          {message.status === "error" && (
            <div className="text-destructive text-sm mt-2 p-3 bg-destructive/10 rounded-md border border-destructive/20">
              {message.blocks.find(b => b.type === "text")?.content || "An error occurred."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BlockRenderer({ block, isStreaming, isLastBlock }: {
  block: MessageBlock;
  isStreaming: boolean;
  isLastBlock: boolean;
}) {
  switch (block.type) {
    case "thinking":
      // A thinking block is only "actively streaming" if the message is streaming
      // AND this is the last block (no subsequent tool_call/text has appeared yet)
      return (
        <ThinkingBlock
          content={block.content}
          isStreaming={isStreaming && isLastBlock}
        />
      );
    case "tool_call":
      return (
        <ToolCallBlock
          name={block.name}
          argumentsText={block.arguments}
          result={block.result}
          isStreaming={block.status === "running"}
        />
      );
    case "text":
      return block.content ? (
        <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none break-words">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {block.content}
          </ReactMarkdown>
        </div>
      ) : null;
  }
}
