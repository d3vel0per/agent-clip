import { useState, useEffect } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { ChevronRight, BrainCircuit } from "lucide-react";
import { Streamdown } from "streamdown";
import { useI18n } from "../lib/i18n";
import { motion, AnimatePresence } from "framer-motion";

interface ThinkingBlockProps {
  content?: string;
  isStreaming: boolean;
}

export function ThinkingBlock({ content, isStreaming }: ThinkingBlockProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    if (isStreaming) {
      setIsOpen(true);
    }
  }, [isStreaming]);

  if (!content && !isStreaming) return null;

  return (
    <div className="mb-4">
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="overflow-hidden"
      >
        <CollapsibleTrigger className="flex items-center gap-2.5 py-1.5 px-3 rounded-lg bg-muted/20 hover:bg-muted/30 text-[11px] text-text-mute hover:text-text-main transition-all group border border-border/10">
          <div className={`transition-transform duration-300 ${isOpen ? "rotate-90" : ""}`}>
            <ChevronRight className="h-3.5 w-3.5 text-text-mute/40" />
          </div>
          <div className="flex items-center gap-2 flex-1">
            <BrainCircuit className={`h-3.5 w-3.5 ${isStreaming ? 'text-brand-primary animate-pulse' : 'text-text-mute/60'}`} />
            <span className="font-bold uppercase tracking-wider opacity-60 group-hover:opacity-100 transition-opacity">
              {isStreaming ? t("RESONATING") : t("PROCESS_TRACED")}
            </span>
          </div>
          
          <AnimatePresence>
            {isStreaming && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1"
              >
                <span className="h-1 w-1 bg-brand-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="h-1 w-1 bg-brand-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="h-1 w-1 bg-brand-primary rounded-full animate-bounce" />
              </motion.div>
            )}
          </AnimatePresence>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <motion.div 
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 pl-4 py-3 font-mono text-[12px] leading-relaxed text-text-main/70 border-l-2 border-brand-primary/20 bg-muted/5 rounded-r-lg"
          >
            {content ? (
              <Streamdown>{content}</Streamdown>
            ) : (
              <span className="italic opacity-30 font-sans tracking-tight">{t("Initializing resonance...")}</span>
            )}
          </motion.div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
