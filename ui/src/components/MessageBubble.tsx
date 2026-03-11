import type { ChatMessage, MessageBlock } from "../lib/types";
import { Streamdown, defaultRehypePlugins } from "streamdown";
import { harden } from "rehype-harden";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { code } from "@streamdown/code";
import { cjk } from "@streamdown/cjk";
import { createMathPlugin } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import "katex/dist/katex.min.css";
import { ThinkingBlock } from "./ThinkingBlock";
import { ToolCallBlock } from "./ToolCallBlock";
import { useI18n } from "../lib/i18n";

const sanitizeSchema: typeof defaultSchema = {
  ...defaultSchema,
  protocols: {
    ...defaultSchema.protocols,
    src: [...(defaultSchema.protocols?.src || []), "pinix-data", "pinix-web"],
  },
  attributes: {
    ...defaultSchema.attributes,
    code: [...((defaultSchema.attributes?.code as string[]) || []), "metastring"],
  },
};

const math = createMathPlugin({ singleDollarTextMath: true });

const customRehypePlugins: any[] = [
  defaultRehypePlugins.raw,
  [rehypeSanitize, sanitizeSchema],
  [harden, {
    allowedImagePrefixes: ["*"],
    allowedLinkPrefixes: ["*"],
    allowedProtocols: ["*"],
    defaultOrigin: undefined,
    allowDataImages: true,
  }],
];

interface MessageBubbleProps {
  message: ChatMessage;
  agentName?: string;
}

export function MessageBubble({ message, agentName }: MessageBubbleProps) {
  const { t } = useI18n();
  const isUser = message.role === "user";
  const isStreaming = message.status === "streaming";

  return (
    <div className="w-full border-b border-border bg-paper hover:bg-surface-hover/30 transition-colors">
      <div className="max-w-4xl mx-auto py-8 px-4 md:px-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className={`signature-label ${isUser ? 'text-muted' : 'text-ink'}`}>
              {isUser ? t("YOU") : (agentName || "AGENT")}
            </span>
            {isStreaming && (
              <span className="text-[10px] font-mono text-active font-bold animate-pulse uppercase tracking-widest">
                {t("Responding")}
              </span>
            )}
          </div>

          <div className="w-full space-y-6 overflow-hidden min-w-0">
            {message.blocks.map((block, idx) => (
              <BlockRenderer
                key={idx}
                block={block}
                isStreaming={isStreaming}
                isLastBlock={idx === message.blocks.length - 1}
              />
            ))}

            {isStreaming && message.blocks.length === 0 && (
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-active animate-pulse" />
                <span className="signature-label text-[8px] text-muted">{t("Initializing resonance...")}</span>
              </div>
            )}

            {message.status === "error" && (
              <div className="text-urgent text-[12px] font-mono p-4 border border-urgent/20 bg-urgent/5 flex gap-4 items-start">
                <div className="font-bold shrink-0">[!]</div>
                <div className="leading-relaxed">
                  {message.blocks.find(b => b.type === "text")?.content || "An error occurred during generation."}
                </div>
              </div>
            )}
          </div>
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
    case "image":
      return (
        <div className="border border-border p-2 bg-surface inline-block">
          <img
            src={block.url}
            alt={block.name}
            className="max-h-80 max-w-full object-contain"
          />
        </div>
      );
    case "text":
      return block.content ? (
        <div className="max-w-none break-words prose">
          <Streamdown
            plugins={{ code, cjk, math, mermaid }}
            rehypePlugins={customRehypePlugins}
            isAnimating={isStreaming && isLastBlock}
          >
            {block.content}
          </Streamdown>
        </div>
      ) : null;
  }
}
