import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import type { ChatMessage } from "../lib/types";
import { MessageBubble } from "./MessageBubble";
import { Code, Sparkles, Terminal, FileText, Zap, ChevronDown } from "lucide-react";
import { useI18n } from "../lib/i18n";

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  onSendPrompt?: (msg: string) => void;
  agentName?: string;
  onScrollButtonChange?: (show: boolean) => void;
}

export interface MessageListHandle {
  scrollToBottom: () => void;
  showScrollButton: boolean;
}

export const MessageList = forwardRef<MessageListHandle, MessageListProps>(function MessageList({ messages, isStreaming, onSendPrompt, agentName, onScrollButtonChange }, ref) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);
  const { t } = useI18n();

  // Scroll to bottom logic
  const scrollToBottom = () => {
    if (scrollRef.current) {
      const { scrollHeight, clientHeight } = scrollRef.current;
      scrollRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior: "smooth",
      });
      setUserHasScrolledUp(false);
      setShowScrollButton(false);
    }
  };

  useImperativeHandle(ref, () => ({
    scrollToBottom,
    showScrollButton,
  }), [showScrollButton]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    
    // If user scrolled up more than 100px from bottom
    if (distanceToBottom > 100) {
      setUserHasScrolledUp(true);
      setShowScrollButton(true);
      onScrollButtonChange?.(true);
    } else {
      setUserHasScrolledUp(false);
      setShowScrollButton(false);
      onScrollButtonChange?.(false);
    }
  };

  // Auto-scroll when streaming if user hasn't scrolled up
  useEffect(() => {
    if (isStreaming && !userHasScrolledUp) {
      const timeout = setTimeout(() => {
        if (scrollRef.current) {
          const { scrollHeight, clientHeight } = scrollRef.current;
          scrollRef.current.scrollTo({
            top: scrollHeight - clientHeight,
            behavior: "instant"
          });
        }
      }, 30);
      return () => clearTimeout(timeout);
    }
  }, [messages, isStreaming, userHasScrolledUp]);

  // Initial scroll on load
  useEffect(() => {
    if (messages.length > 0 && !userHasScrolledUp) {
      scrollToBottom();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 h-full w-full bg-paper overflow-y-auto no-scrollbar">
        <div className="max-w-2xl w-full space-y-12">
          <div className="space-y-4">
            <div className="w-12 h-12 border border-ink flex items-center justify-center mb-8">
              <Sparkles className="w-6 h-6 text-ink" />
            </div>
            <h2 className="text-5xl md:text-6xl font-serif font-bold tracking-tight text-ink leading-tight">
              {t("How can I help you today?")}
            </h2>
            <p className="text-muted font-serif italic text-lg opacity-80 border-l border-border pl-6 py-2">
              {t("I'm your AI assistant, ready to help with code, analysis, writing, and more.")}
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px border border-border bg-border">
            {[
              { icon: FileText, label: t("Summarize text"), desc: "Get the gist of any document" },
              { icon: Code, label: t("Write code"), desc: "Build components or solve bugs" },
              { icon: Terminal, label: t("Run sandbox"), desc: "Execute scripts in a safe env" },
              { icon: Zap, label: t("Analyze data"), desc: "Find patterns and insights" },
            ].map((item) => (
              <button 
                key={item.label}
                onClick={() => onSendPrompt?.(item.label)}
                className="group flex items-start gap-4 p-6 bg-paper hover:bg-surface-hover transition-colors text-left"
              >
                <div className="w-10 h-10 border border-border flex items-center justify-center group-hover:border-ink transition-colors shrink-0">
                  <item.icon className="w-5 h-5 text-muted group-hover:text-ink transition-colors" />
                </div>
                <div className="flex flex-col">
                  <span className="signature-label text-ink">{item.label}</span>
                  <span className="text-[11px] text-muted font-mono uppercase tracking-tight mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    {item.desc}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative overflow-hidden flex flex-col h-full">
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto w-full scroll-smooth no-scrollbar"
      >
        <div className="pb-32">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} agentName={agentName} />
          ))}
        </div>
      </div>

      {showScrollButton && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={scrollToBottom}
            className="ink-button flex items-center gap-3 px-6 h-12 transition-all active:scale-95"
          >
            <ChevronDown className="w-4 h-4" />
            <span>{t("New messages")}</span>
          </button>
        </div>
      )}
    </div>
  );
});
