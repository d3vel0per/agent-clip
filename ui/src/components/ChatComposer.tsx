import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { ArrowUp, Square, Paperclip, X, Image as ImageIcon, Terminal } from "lucide-react";
import { useI18n } from "../lib/i18n";
import type { FileAttachment } from "../lib/types";
import { motion, AnimatePresence } from "framer-motion";

interface ChatComposerProps {
  onSend: (message: string, topicId?: string, files?: File[]) => void;
  onCancel: () => void;
  isStreaming: boolean;
  agentName?: string;
}

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function ChatComposer({ onSend, onCancel, isStreaming, agentName }: ChatComposerProps) {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        240
      )}px`;
    }
  }, [input]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      attachments.forEach(a => URL.revokeObjectURL(a.preview));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = useCallback((files: FileList | File[]) => {
    const newAttachments: FileAttachment[] = [];
    for (const file of Array.from(files)) {
      if (!IMAGE_TYPES.includes(file.type)) continue;
      if (file.size > MAX_FILE_SIZE) continue;
      newAttachments.push({
        file,
        preview: URL.createObjectURL(file),
      });
    }
    if (newAttachments.length > 0) {
      setAttachments(prev => [...prev, ...newAttachments]);
    }
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleSend = () => {
    if ((!input.trim() && attachments.length === 0) || isStreaming) return;
    const files = attachments.map(a => a.file);
    onSend(input.trim() || "(image)", undefined, files.length > 0 ? files : undefined);
    setInput("");
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const imageFiles: File[] = [];
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      addFiles(imageFiles);
    }
  }, [addFiles]);

  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  const hasContent = input.trim() || attachments.length > 0;

  return (
    <div
      className="w-full max-w-3xl mx-auto px-4 pb-6"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={`relative flex flex-col bg-bg-surface border-2 rounded-2xl transition-all duration-300 shadow-xl overflow-hidden ${
        isDragging ? "border-brand-primary bg-brand-primary/5 scale-[1.01]" : "border-border/60 focus-within:border-brand-primary/40 focus-within:ring-4 focus-within:ring-brand-primary/5"
      }`}>
        <AnimatePresence>
          {attachments.length > 0 && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex gap-3 px-4 pt-4 overflow-x-auto no-scrollbar"
            >
              {attachments.map((att, i) => (
                <motion.div 
                  key={att.preview} 
                  layout
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="relative shrink-0 group/thumb"
                >
                  <img
                    src={att.preview}
                    alt={att.file.name}
                    className="h-20 w-20 object-cover rounded-xl border border-border/40 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeAttachment(i)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-bg-surface border border-border rounded-full flex items-center justify-center shadow-md opacity-0 group-hover/thumb:opacity-100 transition-opacity hover:bg-destructive hover:text-white hover:border-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end p-2">
          <div className="flex items-center h-[44px] ml-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              className="h-9 w-9 text-text-mute/60 hover:text-brand-primary hover:bg-brand-primary/5 rounded-xl transition-all"
              disabled={isStreaming}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={t("Ask {name} anything...", { name: agentName || "Agent" })}
            className="flex-1 min-h-[44px] max-h-[240px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-3 py-3 text-[15px] leading-relaxed placeholder:text-text-mute/40 font-medium no-scrollbar"
            rows={1}
          />

          <div className="flex items-center h-[44px] mr-1">
            <AnimatePresence mode="wait">
              {isStreaming ? (
                <motion.div
                  key="cancel"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                >
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={onCancel}
                    className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                  >
                    <Square className="h-3 w-3 fill-current" />
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="send"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                >
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!hasContent}
                    className={`h-9 w-9 rounded-xl transition-all duration-300 ${
                      hasContent
                        ? "bg-brand-primary text-white shadow-glow hover:brightness-110 active:scale-90"
                        : "bg-muted/50 text-text-mute/20"
                    }`}
                  >
                    <ArrowUp className="h-5 w-5 stroke-[3]" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-text-mute/30 font-bold tracking-wider uppercase transition-opacity duration-500">
        <span className="flex items-center gap-1.5"><Terminal className="w-3 h-3" /> Transmit (Enter)</span>
        <span className="flex items-center gap-1.5"><ImageIcon className="w-3 h-3" /> Multi-line (Shift+Enter)</span>
      </div>
    </div>
  );
}
