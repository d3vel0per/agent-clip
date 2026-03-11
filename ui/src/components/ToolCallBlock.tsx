import { useState, useEffect } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { ChevronRight, Check, Wrench, Loader2 } from "lucide-react";
import { useI18n } from "../lib/i18n";
import { motion } from "framer-motion";

interface ToolCallBlockProps {
  name: string;
  argumentsText: string;
  result?: string;
  isStreaming: boolean;
}

export function ToolCallBlock({ name, argumentsText, result, isStreaming }: ToolCallBlockProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useI18n();

  const isDone = result !== undefined || (!isStreaming && result === undefined);

  useEffect(() => {
    if (!isDone) {
      setIsOpen(true);
    }
  }, [isDone]);

  return (
    <div className="mb-4">
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="overflow-hidden"
      >
        <CollapsibleTrigger className="flex w-full items-center gap-3 py-2 px-3 rounded-lg bg-brand-primary/5 hover:bg-brand-primary/10 border border-brand-primary/10 transition-all group">
          <div className="flex-1 flex items-center min-w-0 gap-3">
            <div className={`flex items-center justify-center h-6 w-6 rounded-md ${isDone ? 'bg-brand-primary/20 text-brand-primary' : 'bg-brand-primary text-white shadow-glow'}`}>
              {!isDone ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5 stroke-[3px]" />
              )}
            </div>
            <div className="flex flex-col items-start min-w-0">
              <span className="font-mono text-[11px] font-bold text-text-main uppercase tracking-wider opacity-80 flex items-center gap-1.5">
                <Wrench className="w-3 h-3" />
                {name}
              </span>
              <span className="text-text-mute/60 text-[10px] truncate max-w-[200px] font-mono mt-0.5">
                {argumentsText && argumentsText.length > 30 
                  ? `${argumentsText.slice(0, 30)}...` 
                  : argumentsText.replace(/\s+/g, ' ')}
              </span>
            </div>
          </div>
          <div className={`transition-transform duration-300 ${isOpen ? "rotate-90" : ""}`}>
            <ChevronRight className="h-4 w-4 text-text-mute/30" />
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-2 ml-3 pl-6 py-4 border-l-2 border-brand-primary/20 bg-muted/5 rounded-r-xl overflow-hidden"
          >
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="text-[10px] tracking-widest text-text-mute uppercase font-bold opacity-60">{t("INPUT_PARAMETERS")}</div>
                <pre className="font-mono text-[11px] leading-relaxed text-text-main/80 bg-bg-surface/50 p-3 rounded-lg border border-border/20 overflow-x-auto whitespace-pre-wrap shadow-sm">
                  {argumentsText}
                </pre>
              </div>
              
              {result && (
                <div className="space-y-2">
                  <div className="text-[10px] tracking-widest text-brand-primary uppercase font-bold opacity-80">{t("EXECUTION_RESULT")}</div>
                  <pre className="font-mono text-[11px] leading-relaxed text-text-main/70 bg-bg-surface/50 p-3 rounded-lg border border-brand-primary/10 overflow-x-auto whitespace-pre-wrap max-h-[400px] overflow-y-auto shadow-sm">
                    {result}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
