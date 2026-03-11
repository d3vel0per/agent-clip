import { useI18n } from "../lib/i18n";
import { Check, Loader2, Wrench } from "lucide-react";

interface ToolCallBlockProps {
  name: string;
  argumentsText: string;
  result?: string;
  isStreaming: boolean;
}

export function ToolCallBlock({ name, argumentsText, result, isStreaming }: ToolCallBlockProps) {
  const { t } = useI18n();
  const isDone = result !== undefined || (!isStreaming && result === undefined);

  return (
    <details className="mb-4 group border border-border bg-surface" open={!isDone}>
      <summary className="list-none cursor-pointer flex items-center gap-3 p-3 hover:bg-surface-hover transition-colors">
        <div className="flex shrink-0 items-center justify-center w-5 h-5 border border-ink">
          {!isDone ? (
            <Loader2 className="h-3 w-3 animate-spin text-ink" />
          ) : (
            <Check className="h-3 w-3 text-ink" strokeWidth={4} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-mono text-[11px] font-bold text-ink uppercase tracking-wider flex items-center gap-2">
            <Wrench className="w-3 h-3" />
            {name}
          </span>
        </div>
        <span className="text-[8px] transition-transform group-open:rotate-90">▶</span>
      </summary>
      
      <div className="p-4 border-t border-border bg-paper space-y-4">
        <div className="space-y-1">
          <span className="signature-label text-[8px] text-muted">{t("INPUT_PARAMETERS")}</span>
          <pre className="font-mono text-[11px] p-3 border border-border bg-surface overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {argumentsText}
          </pre>
        </div>
        
        {result && (
          <div className="space-y-1">
            <span className="signature-label text-[8px] text-muted">{t("EXECUTION_RESULT")}</span>
            <pre className="font-mono text-[11px] p-3 border border-border bg-surface overflow-x-auto whitespace-pre-wrap max-h-80 overflow-y-auto leading-relaxed">
              {result}
            </pre>
          </div>
        )}
      </div>
    </details>
  );
}
