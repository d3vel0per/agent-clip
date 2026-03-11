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
import { motion, AnimatePresence } from "framer-motion";
import { User, Sparkles } from "lucide-react";

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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className={`w-full py-6 px-4 md:px-8 group transition-colors ${
        isUser ? "bg-transparent" : "bg-bg-surface/40 backdrop-blur-[2px]"
      }`}
    >
      <div className="max-w-3xl mx-auto flex gap-4 md:gap-6">
        <div className="flex-shrink-0 pt-1">
          {isUser ? (
            <div className="h-8 w-8 rounded-full bg-border/40 flex items-center justify-center text-text-mute ring-1 ring-border/20">
              <User className="h-4 w-4" />
            </div>
          ) : (
            <div className="h-8 w-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary ring-1 ring-brand-primary/20">
              <Sparkles className="h-4 w-4" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[12px] font-bold tracking-tight uppercase ${isUser ? 'text-text-main' : 'text-brand-primary'}`}>
              {isUser ? t("YOU") : (agentName || "AGENT")}
            </span>
            {!isUser && isStreaming && (
              <div className="flex items-center gap-1.5 ml-1">
                <span className="flex h-1.5 w-1.5 rounded-full bg-brand-primary animate-pulse" />
                <span className="text-[11px] text-brand-primary/60 font-medium tracking-wide animate-pulse">
                  {t("Responding...")}
                </span>
              </div>
            )}
          </div>

          <div className="w-full space-y-4 overflow-hidden min-w-0">
            <AnimatePresence mode="popLayout">
              {message.blocks.map((block, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <BlockRenderer
                    block={block}
                    isStreaming={isStreaming}
                    isLastBlock={idx === message.blocks.length - 1}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {isStreaming && message.blocks.length === 0 && (
              <div className="flex h-6 items-center gap-1.5 ml-1">
                <span className="w-1.5 h-1.5 bg-brand-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-brand-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-brand-primary/60 rounded-full animate-bounce" />
              </div>
            )}

            {message.status === "error" && (
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-destructive text-[13px] p-4 bg-destructive/5 border border-destructive/10 rounded-xl flex gap-3 items-start"
              >
                <div className="h-5 w-5 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="font-bold text-[10px]">!</span>
                </div>
                <div>{message.blocks.find(b => b.type === "text")?.content || "An error occurred during generation."}</div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
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
        <div className="inline-block group/img relative">
          <img
            src={block.url}
            alt={block.name}
            className="max-h-80 max-w-full rounded-2xl border border-border/40 object-contain shadow-sm transition-transform hover:scale-[1.01]"
          />
        </div>
      );
    case "text":
      return block.content ? (
        <div className="max-w-none break-words selection:bg-brand-primary/20 prose">
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
