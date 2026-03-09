import { useState, useEffect } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { ChevronDown, ChevronRight, Check } from "lucide-react";
import { useI18n } from "../lib/i18n";

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
    // Open when running, close when done
    if (!isDone) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [isDone]);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="mb-2 rounded-lg border border-border/50 bg-muted/30 text-sm overflow-hidden"
    >
      <CollapsibleTrigger className="flex w-full items-center px-3 py-2.5 hover:bg-muted/40 transition-colors group">
        <div className="flex-1 flex items-center min-w-0 gap-2">
          {!isDone ? (
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse ml-1 shrink-0" />
          ) : (
            <Check className="h-3.5 w-3.5 text-success ml-0.5 shrink-0" />
          )}
          <span className="font-mono text-xs font-semibold text-foreground/80 truncate">
            {name}
          </span>
          <span className="text-muted-foreground text-xs truncate max-w-[200px]">
            {argumentsText && argumentsText.length > 50 
              ? `{...}` 
              : argumentsText.replace(/\n/g, ' ')}
          </span>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground opacity-50 group-hover:opacity-100" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-50 group-hover:opacity-100" />
        )}
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="border-t border-border/50 bg-muted/20">
          <div className="p-3">
            <div className="text-xs text-muted-foreground mb-1 font-semibold">{t("Arguments")}</div>
            <pre className="font-mono text-xs text-foreground bg-muted/50 p-2 rounded overflow-x-auto whitespace-pre-wrap mb-3">
              {argumentsText}
            </pre>
            
            {result && (
              <>
                <div className="text-xs text-muted-foreground mb-1 font-semibold">{t("Result")}</div>
                <pre className="font-mono text-xs text-foreground bg-muted/50 p-2 rounded overflow-x-auto whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                  {result}
                </pre>
              </>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
