import { Streamdown } from "streamdown";
import { useI18n } from "../lib/i18n";

interface ThinkingBlockProps {
  content?: string;
  isStreaming: boolean;
}

export function ThinkingBlock({ content, isStreaming }: ThinkingBlockProps) {
  const { t } = useI18n();

  if (!content && !isStreaming) return null;

  return (
    <details className="mb-4 group" open={isStreaming}>
      <summary className="list-none cursor-pointer flex items-center gap-2 py-1 signature-label text-muted hover:text-ink transition-colors">
        <span className="text-[8px] transition-transform group-open:rotate-90">▶</span>
        <span>{isStreaming ? t("RESONATING") : t("PROCESS_TRACED")}</span>
        {isStreaming && <span className="w-1.5 h-1.5 bg-active animate-pulse" />}
      </summary>
      
      <div className="mt-2 ml-1.5 pl-4 border-l border-border font-serif italic text-muted leading-relaxed text-[13px]">
        {content ? (
          <Streamdown>{content}</Streamdown>
        ) : (
          <span className="opacity-30">
            {t("Initializing resonance...")}
          </span>
        )}
      </div>
    </details>
  );
}
