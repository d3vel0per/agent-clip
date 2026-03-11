import type { Topic } from "../lib/types";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Plus, Settings, BookOpen, MessageSquare, MoreHorizontal } from "lucide-react";
import { useI18n } from "../lib/i18n";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

interface TopicListProps {
  topics: Topic[];
  currentTopicId: string | null;
  onSelectTopic: (id: string | null) => void;
  onOpenConfig: () => void;
  onOpenSkills: () => void;
  onCloseMobileNav?: () => void;
}

export function TopicList({
  topics,
  currentTopicId,
  onSelectTopic,
  onOpenConfig,
  onOpenSkills,
  onCloseMobileNav,
}: TopicListProps) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col h-full w-full bg-transparent overflow-hidden">
      <div className="p-4 flex-shrink-0" style={{ WebkitAppRegion: "drag" } as any}>
        <Button
          variant="outline"
          className="w-full justify-start h-11 text-text-main border-border-subtle bg-bg-surface shadow-sm hover:bg-bg-base hover:border-brand-primary/20 transition-all rounded-xl px-4 group"
          onClick={() => {
            onSelectTopic(null);
            onCloseMobileNav?.();
          }}
          style={{ WebkitAppRegion: "no-drag" } as any}
        >
          <Plus className="mr-2.5 h-4 w-4 shrink-0 text-brand-primary transition-transform group-hover:rotate-90" />
          <span className="text-[14px] font-bold tracking-tight">{t("New Chat")}</span>
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="pb-8 px-3 space-y-1">
          {topics.map((topic, i) => {
            const isActive = topic.id === currentTopicId;
            const ts = (topic.last_message_at || topic.created_at) * 1000;
            return (
              <motion.button
                key={topic.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => {
                  onSelectTopic(topic.id);
                  onCloseMobileNav?.();
                }}
                className={`
                  group relative flex flex-col w-full text-left px-4 py-3 rounded-xl transition-all duration-200 ease-out
                  ${
                    isActive
                      ? "bg-bg-surface text-text-main shadow-md ring-1 ring-border/20 translate-x-1"
                      : "text-text-mute hover:bg-bg-surface/60 hover:text-text-main"
                  }
                `}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`mt-0.5 shrink-0 ${isActive ? 'text-brand-primary' : 'text-text-mute/40 group-hover:text-text-mute/60'}`}>
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[13px] tracking-tight leading-snug truncate ${isActive ? 'font-bold' : 'font-semibold opacity-80'}`}>
                        {topic.name}
                      </span>
                      {topic.has_active_run && (
                        <span className="w-2 h-2 rounded-full bg-brand-primary shrink-0 animate-pulse shadow-glow" />
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1 min-w-0 opacity-50 group-hover:opacity-80 transition-opacity">
                      <span className="text-[10px] font-bold uppercase tracking-wider tabular-nums truncate">
                        {formatDistanceToNow(ts, { addSuffix: true })}
                      </span>
                      <span className="text-[10px] font-bold tabular-nums shrink-0 ml-2">
                        {topic.message_count}
                      </span>
                    </div>
                  </div>
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-bg-base rounded-md transition-all">
                    <MoreHorizontal className="w-3.5 h-3.5 text-text-mute/60" />
                  </button>
                </div>
              </motion.button>
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-3 mt-auto border-t border-border/40 bg-bg-sidebar/50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="flex-1 justify-start h-10 text-text-mute hover:text-text-main hover:bg-bg-surface transition-all rounded-xl px-3 group"
            onClick={onOpenSkills}
          >
            <div className="w-7 h-7 rounded-lg bg-muted/20 flex items-center justify-center mr-2 group-hover:bg-brand-primary/10 group-hover:text-brand-primary transition-colors">
              <BookOpen className="w-4 h-4 shrink-0" />
            </div>
            <span className="text-[13px] font-bold">{t("Skills")}</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-text-mute hover:text-text-main hover:bg-bg-surface transition-all rounded-xl shrink-0 group"
            onClick={onOpenConfig}
          >
            <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform duration-500" />
          </Button>
        </div>
      </div>
    </div>
  );
}
