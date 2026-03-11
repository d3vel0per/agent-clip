import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import type { ChatMessage } from "../lib/types";
import { MessageBubble } from "./MessageBubble";
import { motion, AnimatePresence } from "framer-motion";
import { Code, Sparkles, Terminal, FileText, Zap, ChevronDown } from "lucide-react";
import { useI18n } from "../lib/i18n";
import { Button } from "./ui/button";

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

  return (
    <div className="flex-1 relative overflow-hidden flex flex-col h-full bg-transparent">
      <AnimatePresence mode="wait">
        {messages.length === 0 ? (
          <motion.div 
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex flex-col items-center justify-center p-8 h-full w-full"
          >
            <div className="max-w-2xl w-full space-y-12">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center space-y-4"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-primary/10 text-brand-primary mb-2 ring-1 ring-brand-primary/20 shadow-glow">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h2 className="text-4xl font-bold tracking-tight text-text-main sm:text-5xl">
                  {t("How can I help you today?")}
                </h2>
                <p className="text-text-mute text-lg max-w-md mx-auto leading-relaxed">
                  {t("I'm your AI assistant, ready to help with code, analysis, writing, and more.")}
                </p>
              </motion.div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: FileText, label: t("Summarize text"), color: "blue" },
                  { icon: Code, label: t("Write code"), color: "orange" },
                  { icon: Terminal, label: t("Run sandbox"), color: "green" },
                  { icon: Zap, label: t("Analyze data"), color: "purple" },
                ].map((item, i) => (
                  <motion.button 
                    key={item.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    onClick={() => onSendPrompt?.(item.label)}
                    className="flex items-center gap-4 p-4 bg-bg-surface/50 hover:bg-bg-surface border border-border/40 hover:border-brand-primary/30 rounded-2xl transition-all text-left group shadow-sm hover:shadow-md active:scale-[0.98]"
                  >
                    <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center group-hover:bg-brand-primary/10 group-hover:text-brand-primary transition-colors border border-border/10">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-sm text-text-main/90">{item.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 overflow-hidden relative h-full"
          >
            <div 
              ref={scrollRef}
              onScroll={handleScroll}
              className="h-full overflow-y-auto w-full scroll-smooth no-scrollbar"
            >
              <div className="pb-40 pt-4 min-h-full">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} agentName={agentName} />
                ))}
              </div>
            </div>

            <AnimatePresence>
              {showScrollButton && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
                >
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={scrollToBottom}
                    className="rounded-full shadow-lg border border-border/40 bg-bg-surface/80 backdrop-blur-md px-4 py-5 flex gap-2 font-semibold text-text-main hover:bg-bg-surface transition-all group"
                  >
                    <ChevronDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
                    {t("New messages")}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
