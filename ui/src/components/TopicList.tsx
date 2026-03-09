import type { Topic } from "../lib/types";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Plus, Settings } from "lucide-react";
import { useI18n } from "../lib/i18n";

interface TopicListProps {
  topics: Topic[];
  currentTopicId: string | null;
  onSelectTopic: (id: string | null) => void;
  onOpenConfig: () => void;
  onCloseMobileNav?: () => void;
}

export function TopicList({
  topics,
  currentTopicId,
  onSelectTopic,
  onOpenConfig,
  onCloseMobileNav,
}: TopicListProps) {
  const { t } = useI18n();
  
  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      <div className="p-4 flex-shrink-0" style={{ WebkitAppRegion: "drag" } as any}>
        <Button
          variant="outline"
          className="w-full justify-start text-sidebar-foreground shadow-sm hover:shadow-md transition-shadow"
          onClick={() => {
            onSelectTopic(null);
            onCloseMobileNav?.();
          }}
          style={{ WebkitAppRegion: "no-drag" } as any}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t("New Chat")}
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3 min-h-0 overflow-y-auto">
        <div className="space-y-1 py-2">
          {topics.map((topic) => {
            const isActive = topic.id === currentTopicId;
            return (
              <button
                key={topic.id}
                onClick={() => {
                  onSelectTopic(topic.id);
                  onCloseMobileNav?.();
                }}
                className={`
                  relative w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ease-in-out
                  ${
                    isActive
                      ? "bg-sidebar-accent/30 text-sidebar-accent-foreground font-medium translate-x-1"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/40 hover:translate-x-1"
                  }
                `}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-2/3 bg-primary rounded-r-md" />
                )}
                <div className="truncate flex items-center gap-1.5">
                  {topic.has_active_run && (
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                  )}
                  {topic.name}
                </div>
                <div className="text-xs opacity-50 mt-1 flex justify-between font-normal">
                  <span>{new Date(topic.created_at * 1000).toLocaleDateString()}</span>
                  <span>{topic.message_count} msgs</span>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-sidebar-border flex-shrink-0">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          onClick={onOpenConfig}
        >
          <Settings className="mr-2 h-4 w-4" />
          {t("Settings")}
        </Button>
      </div>
    </div>
  );
}
