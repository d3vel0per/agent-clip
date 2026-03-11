import { useState, useEffect, useRef } from "react";
import { useChat } from "../lib/useChat";
import { TopicList } from "./TopicList";
import { MessageList, type MessageListHandle } from "./MessageList";
import { ChatComposer } from "./ChatComposer";
import { SettingsPanel } from "./SettingsPanel";
import { SkillPanel } from "./SkillPanel";
import { SetupPage } from "./SetupPage";
import { Sheet, SheetContent } from "./ui/sheet";
import { Menu, Plus, Sidebar as SidebarIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useI18n } from "../lib/i18n";
import { getConfig, isConfigReady, type AgentConfig } from "../lib/agent";
import { motion, AnimatePresence } from "framer-motion";

export function ChatLayout() {
  const chat = useChat();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [agentName, setAgentName] = useState("Clip");
  const messageListRef = useRef<MessageListHandle>(null);
  const { t } = useI18n();

  // Config state: null = loading, false = not ready, true = ready
  const [configState, setConfigState] = useState<null | false | true>(null);
  const [agentConfig, setAgentConfig] = useState<AgentConfig | null>(null);

  const loadConfig = async () => {
    try {
      const cfg = await getConfig();
      setAgentConfig(cfg);
      setAgentName(cfg.name || "Clip");
      setConfigState(isConfigReady(cfg));
    } catch {
      setConfigState(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (configState === true) {
      chat.loadTopics();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configState]);

  // Show loading while checking config
  if (configState === null) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-bg-base">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-brand-primary font-bold tracking-[0.2em] text-xs uppercase"
        >
          Initializing Resonance...
        </motion.div>
      </div>
    );
  }

  // Show setup page if not configured
  if (configState === false && agentConfig) {
    return (
      <SetupPage
        config={agentConfig}
        onComplete={() => loadConfig()}
      />
    );
  }

  const activeTopic = chat.topics.find((t) => t.id === chat.currentTopicId);

  const sidebarContent = (
    <TopicList
      topics={chat.topics}
      currentTopicId={chat.currentTopicId}
      onSelectTopic={chat.selectTopic}
      onOpenConfig={() => setConfigOpen(true)}
      onOpenSkills={() => setSkillsOpen(true)}
      onCloseMobileNav={() => setMobileMenuOpen(false)}
    />
  );

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-bg-base text-text-main selection:bg-brand-primary/20 relative">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-brand-primary/5 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-brand-primary/3 rounded-full blur-[100px]" />
      </div>

      {/* Desktop Sidebar */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="hidden md:flex flex-shrink-0 glass-sidebar z-30 overflow-hidden"
          >
            <div className="w-[280px] h-full">
              {sidebarContent}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-[280px] border-r-0 glass-sidebar">
          {sidebarContent}
        </SheetContent>
      </Sheet>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Header */}
        <header
          className="flex-shrink-0 h-14 border-b border-border/40 flex items-center px-4 md:px-6 justify-between bg-bg-surface/40 backdrop-blur-md z-20 pt-[env(safe-area-inset-top)]"
          style={{ WebkitAppRegion: "drag" } as any}
        >
          <div className="flex items-center gap-4 w-full" style={{ WebkitAppRegion: "no-drag" } as any}>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden shrink-0 -ml-2 text-text-mute hover:text-text-main hover:bg-bg-base/50 rounded-xl"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex shrink-0 -ml-2 text-text-mute hover:text-text-main hover:bg-bg-base/50 rounded-xl transition-transform"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <SidebarIcon className={`h-5 w-5 transition-transform duration-300 ${!sidebarOpen ? 'rotate-180' : ''}`} />
            </Button>

            <div className="flex flex-col min-w-0 flex-1 md:text-left text-center">
              <h1 className="font-bold text-[11px] tracking-[0.3em] truncate text-text-mute uppercase opacity-60">
                {activeTopic ? activeTopic.name : t("New Chat")}
              </h1>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 -mr-2 text-text-mute hover:text-text-main hover:bg-bg-base/50 rounded-xl"
              onClick={() => chat.selectTopic(null)}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Global Error Toast */}
        <AnimatePresence>
          {chat.error && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-destructive/5 text-destructive px-6 py-2.5 text-[12px] font-bold text-center border-b border-destructive/10 z-30 shrink-0 uppercase tracking-wider"
            >
              {chat.error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div className="flex-1 overflow-hidden relative">
          <MessageList 
            ref={messageListRef} 
            messages={chat.messages} 
            isStreaming={chat.isStreaming} 
            onSendPrompt={chat.send} 
            agentName={agentName} 
          />
        </div>

        {/* Input Composer (Floating) */}
        <div className="relative z-20">
          <ChatComposer
            onSend={(msg, topicId, files) => chat.send(msg, topicId ?? chat.currentTopicId ?? undefined, files)}
            onCancel={chat.cancel}
            isStreaming={chat.isStreaming}
            agentName={agentName}
          />
        </div>
      </div>

      <SettingsPanel open={configOpen} onOpenChange={setConfigOpen} />
      <SkillPanel open={skillsOpen} onOpenChange={setSkillsOpen} />
    </div>
  );
}
