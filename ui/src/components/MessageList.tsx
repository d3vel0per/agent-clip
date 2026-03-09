import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "../lib/types";
import { MessageBubble } from "./MessageBubble";

import { ArrowDown, Code, Sparkles, Binary, PenSquare } from "lucide-react";
import { Button } from "./ui/button";
import { useI18n } from "../lib/i18n";

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  onSendPrompt?: (msg: string) => void;
  agentName?: string;
}

export function MessageList({ messages, isStreaming, onSendPrompt, agentName }: MessageListProps) {
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

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    
    // If user scrolled up more than 50px from bottom
    if (distanceToBottom > 50) {
      setUserHasScrolledUp(true);
      setShowScrollButton(true);
    } else {
      setUserHasScrolledUp(false);
      setShowScrollButton(false);
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
          });
        }
      }, 50); // slight delay to allow render
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

  return (
    <div className="flex-1 relative overflow-hidden flex flex-col h-full bg-transparent">
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 h-full max-w-3xl mx-auto w-full">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-primary/20">
             <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-semibold mb-8">{t("No messages yet")}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
            <button 
              onClick={() => onSendPrompt?.(t("Summarize text"))}
              className="flex flex-col items-start p-4 bg-background rounded-xl border border-border shadow-sm hover:shadow-md hover:border-primary/50 transition-all text-left group"
            >
              <PenSquare className="w-5 h-5 mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="font-medium">{t("Summarize text")}</span>
            </button>
            <button 
              onClick={() => onSendPrompt?.(t("Write code"))}
              className="flex flex-col items-start p-4 bg-background rounded-xl border border-border shadow-sm hover:shadow-md hover:border-primary/50 transition-all text-left group"
            >
              <Code className="w-5 h-5 mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="font-medium">{t("Write code")}</span>
            </button>
            <button 
              onClick={() => onSendPrompt?.(t("Analyze data"))}
              className="flex flex-col items-start p-4 bg-background rounded-xl border border-border shadow-sm hover:shadow-md hover:border-primary/50 transition-all text-left group"
            >
              <Binary className="w-5 h-5 mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="font-medium">{t("Analyze data")}</span>
            </button>
            <button 
              onClick={() => onSendPrompt?.(t("Run sandbox"))}
              className="flex flex-col items-start p-4 bg-background rounded-xl border border-border shadow-sm hover:shadow-md hover:border-primary/50 transition-all text-left group"
            >
              <Sparkles className="w-5 h-5 mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="font-medium">{t("Run sandbox")}</span>
            </button>
          </div>
        </div>
      ) : (
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto w-full h-full"
        >
          <div className="pb-4 min-h-full">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} agentName={agentName} />
            ))}
          </div>
        </div>
      )}

      {showScrollButton && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full shadow-md w-8 h-8 opacity-80 hover:opacity-100"
            onClick={scrollToBottom}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
