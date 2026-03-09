import { useState, useEffect } from "react";
import { useChat } from "../lib/useChat";
import { TopicList } from "./TopicList";
import { MessageList } from "./MessageList";
import { ChatComposer } from "./ChatComposer";
import { SettingsPanel } from "./SettingsPanel";
import { Sheet, SheetContent } from "./ui/sheet";
import { Menu, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { useI18n } from "../lib/i18n";
import { getConfig } from "../lib/agent";

export function ChatLayout() {
  const chat = useChat();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [agentName, setAgentName] = useState("Clip");
  const { t } = useI18n();

  // Initial load
  useEffect(() => {
    chat.loadTopics();
    getConfig().then(cfg => {
      const match = cfg.match(/^name:\s*(.+)$/m);
      if (match) setAgentName(match[1].trim());
    }).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeTopic = chat.topics.find((t) => t.id === chat.currentTopicId);

  const sidebarContent = (
    <TopicList
      topics={chat.topics}
      currentTopicId={chat.currentTopicId}
      onSelectTopic={chat.selectTopic}
      onOpenConfig={() => setConfigOpen(true)}
      onCloseMobileNav={() => setMobileMenuOpen(false)}
    />
  );

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-[260px] flex-shrink-0 border-r">
        {sidebarContent}
      </div>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-[280px] sm:w-[320px]">
          {sidebarContent}
        </SheetContent>
      </Sheet>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-muted/20">
        {/* Header */}
        <header 
          className="flex-shrink-0 h-14 border-b flex items-center px-4 justify-between bg-background/80 backdrop-blur-md z-10 pt-[env(safe-area-inset-top)]"
          style={{ WebkitAppRegion: "drag" } as any}
        >
          <div className="flex items-center gap-3 w-full" style={{ WebkitAppRegion: "no-drag" } as any}>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden shrink-0 -ml-2"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <h1 className="font-semibold text-sm truncate flex-1 text-center md:text-left">
              {activeTopic ? activeTopic.name : t("New Chat")}
            </h1>
            
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden shrink-0 -mr-2"
              onClick={() => chat.selectTopic(null)}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Global Error Toast */}
        {chat.error && (
          <div className="bg-destructive/10 text-destructive px-4 py-2 text-sm text-center border-b border-destructive/20 z-20 shrink-0">
            {chat.error}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-hidden relative">
          <MessageList messages={chat.messages} isStreaming={chat.isStreaming} onSendPrompt={chat.send} agentName={agentName} />
        </div>

        {/* Input Composer */}
        <div className="flex-shrink-0">
          <ChatComposer 
            onSend={chat.send} 
            onCancel={chat.cancel} 
            isStreaming={chat.isStreaming} 
            agentName={agentName}
          />
        </div>
      </div>

      <SettingsPanel open={configOpen} onOpenChange={setConfigOpen} />
    </div>
  );
}
