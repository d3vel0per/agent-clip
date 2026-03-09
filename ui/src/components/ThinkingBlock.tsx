import { useState, useEffect } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useI18n } from "../lib/i18n";

interface ThinkingBlockProps {
  content?: string;
  isStreaming: boolean;
}

export function ThinkingBlock({ content, isStreaming }: ThinkingBlockProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useI18n();

  // Auto-open while streaming, auto-close when done
  useEffect(() => {
    if (isStreaming) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [isStreaming]);

  if (!content && !isStreaming) return null;

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="mb-2 rounded-lg border border-border/50 bg-muted/30"
    >
      <CollapsibleTrigger className="flex w-full items-center px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 rounded-lg transition-colors">
        {isOpen ? (
          <ChevronDown className="h-4 w-4 mr-2" />
        ) : (
          <ChevronRight className="h-4 w-4 mr-2" />
        )}
        <span className="font-medium">
          {isStreaming ? t("Thinking...") : t("Thought process")}
        </span>
        {isStreaming && <Loader2 className="ml-2 h-3 w-3 animate-spin" />}
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="p-3 pt-1 text-sm text-muted-foreground whitespace-pre-wrap font-mono opacity-80 border-t border-border">
          {content ? (
            <ReactMarkdown>{content}</ReactMarkdown>
          ) : (
            t("Initializing thought...")
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
