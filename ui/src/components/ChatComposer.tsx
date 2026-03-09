import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { ArrowUp, Square } from "lucide-react";
import { useI18n } from "../lib/i18n";

interface ChatComposerProps {
  onSend: (message: string) => void;
  onCancel: () => void;
  isStreaming: boolean;
  agentName?: string;
}

export function ChatComposer({ onSend, onCancel, isStreaming, agentName }: ChatComposerProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { t } = useI18n();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    onSend(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      // Prevent newline on Enter, but allow Shift+Enter for newline
      // Note: On mobile we might want to let Enter just add newline.
      // But for a hybrid app, we usually use Enter to send unless shift is pressed.
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 bg-transparent pb-[env(safe-area-inset-bottom)] z-10 w-full max-w-3xl mx-auto">
      <div className="flex items-end gap-2 bg-background p-2 rounded-3xl border border-input shadow-sm focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary/30 transition-all duration-300 hover:shadow-md">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("Ask {name} anything...", { name: agentName || "Clip" })}
          className="min-h-[44px] max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-4 py-3 overflow-y-auto text-base"
          rows={1}
        />
        {isStreaming ? (
          <Button
            size="icon"
            variant="destructive"
            onClick={onCancel}
            className="shrink-0 h-[44px] w-[44px] rounded-2xl shadow-sm transition-transform active:scale-95"
          >
            <Square className="h-5 w-5 fill-current" />
            <span className="sr-only">Cancel</span>
          </Button>
        ) : (
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim()}
            className="shrink-0 h-[44px] w-[44px] rounded-2xl bg-primary hover:bg-primary/90 shadow-sm transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          >
            <ArrowUp className="h-5 w-5" />
            <span className="sr-only">{t("Send")}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
