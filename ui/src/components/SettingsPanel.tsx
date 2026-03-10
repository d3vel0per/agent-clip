import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { getConfig, setConfig, deleteConfig, addClip, removeClip, type AgentConfig } from "../lib/agent";
import { useI18n } from "../lib/i18n";
import { ScrollArea } from "./ui/scroll-area";
import { Trash2, Plus, Circle, Search } from "lucide-react";

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsPanel({ open, onOpenChange }: SettingsPanelProps) {
  const { t, locale, setLocale } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [config, setConfigState] = useState<AgentConfig | null>(null);

  // Add provider form
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [newProviderName, setNewProviderName] = useState("");
  const [newProviderUrl, setNewProviderUrl] = useState("");
  const [newProviderProtocol, setNewProviderProtocol] = useState("openai");

  // Add clip form
  const [showAddClip, setShowAddClip] = useState(false);
  const [newClipName, setNewClipName] = useState("");
  const [newClipUrl, setNewClipUrl] = useState("");
  const [newClipToken, setNewClipToken] = useState("");

  // Browser auto-detect
  const [browserDetecting, setBrowserDetecting] = useState(false);
  const [newClipCommands, setNewClipCommands] = useState("");

  const loadConfig = async () => {
    setError(null);
    try {
      const cfg = await getConfig();
      setConfigState(cfg);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (open) loadConfig();
  }, [open]);

  const handleSet = async (key: string, value: string) => {
    try {
      await setConfig(key, value);
      await loadConfig();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteProvider = async (name: string) => {
    try {
      await deleteConfig(`providers.${name}`);
      // If deleted provider was active, clear llm_provider
      if (config?.llm_provider === name) {
        await setConfig("llm_provider", "");
      }
      await loadConfig();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddProvider = async () => {
    if (!newProviderName.trim() || !newProviderUrl.trim()) return;
    try {
      await setConfig(`providers.${newProviderName}.base_url`, newProviderUrl);
      await setConfig(`providers.${newProviderName}.protocol`, newProviderProtocol);
      await setConfig(`providers.${newProviderName}.api_key`, "");
      setShowAddProvider(false);
      setNewProviderName("");
      setNewProviderUrl("");
      setNewProviderProtocol("openai");
      await loadConfig();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddClip = async () => {
    if (!newClipName.trim() || !newClipUrl.trim()) return;
    try {
      await addClip({
        name: newClipName,
        url: newClipUrl,
        token: newClipToken,
        commands: newClipCommands.split(",").map(s => s.trim()).filter(Boolean),
      });
      setShowAddClip(false);
      setNewClipName("");
      setNewClipUrl("");
      setNewClipToken("");
      setNewClipCommands("");
      await loadConfig();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemoveClip = async (name: string) => {
    try {
      await removeClip(name);
      await loadConfig();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleBrowserDetect = async () => {
    setBrowserDetecting(true);
    try {
      // Probe common bb-browser daemon ports
      for (const port of [19824, 19825]) {
        try {
          const resp = await fetch(`http://localhost:${port}/`, { method: "GET", signal: AbortSignal.timeout(2000) });
          if (resp.ok || resp.status === 404) {
            await setConfig("browser.endpoint", `http://localhost:${port}`);
            await loadConfig();
            return;
          }
        } catch { /* try next */ }
      }
      setError(t("Browser daemon not detected. Make sure bb-browser daemon is running."));
    } finally {
      setBrowserDetecting(false);
    }
  };

  if (!config) return null;

  const providerNames = Object.keys(config.providers);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col glass-sidebar border-l border-border/40 animate-in-up">
        <SheetHeader className="border-b border-border/40 px-6 py-4 bg-bg-surface/50">
          <SheetTitle className="text-[11px] font-bold text-text-mute opacity-80 uppercase tracking-tight">
            {t("Agent Configuration")}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-6">
          {error && <div className="text-destructive text-xs bg-destructive/10 p-3 rounded-lg border border-destructive/20 mb-4">{error}</div>}

          <div className="space-y-8 pb-12">
            {/* Language */}
            <Section title={t("Language")}>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as any)}
                className="select-field"
              >
                <option value="en">English</option>
                <option value="zh-CN">简体中文</option>
              </select>
            </Section>

            {/* Identity */}
            <Section title={t("Agent Name")}>
              <SettingInput
                value={config.name}
                onSave={(v) => handleSet("name", v)}
              />
            </Section>

            {/* LLM Config */}
            <Section title={t("LLM Provider")}>
              <select
                value={config.llm_provider}
                onChange={(e) => handleSet("llm_provider", e.target.value)}
                className="select-field"
              >
                <option value="">--</option>
                {providerNames.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Section>

            <Section title={t("LLM Model")}>
              <SettingInput
                value={config.llm_model}
                onSave={(v) => handleSet("llm_model", v)}
                mono
              />
            </Section>

            {/* Embedding */}
            <Section title={t("Embedding Provider")}>
              <select
                value={config.embedding_provider}
                onChange={(e) => handleSet("embedding_provider", e.target.value)}
                className="select-field"
              >
                <option value="">--</option>
                {providerNames.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Section>

            <Section title={t("Embedding Model")}>
              <SettingInput
                value={config.embedding_model}
                onSave={(v) => handleSet("embedding_model", v)}
                mono
              />
            </Section>

            {/* Providers */}
            <Section title="Providers" action={
              <button onClick={() => setShowAddProvider(!showAddProvider)} className="text-brand-primary hover:text-brand-primary/80 transition-colors">
                <Plus className="h-3.5 w-3.5" />
              </button>
            }>
              {showAddProvider && (
                <div className="space-y-2 p-3 rounded-lg bg-bg-surface border border-border mb-3">
                  <Input placeholder="name (e.g. deepseek)" value={newProviderName} onChange={e => setNewProviderName(e.target.value)} className="h-9 text-xs font-mono" />
                  <Input placeholder="https://api.example.com/v1" value={newProviderUrl} onChange={e => setNewProviderUrl(e.target.value)} className="h-9 text-xs font-mono" />
                  <select value={newProviderProtocol} onChange={e => setNewProviderProtocol(e.target.value)} className="select-field text-xs">
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                  </select>
                  <Button size="sm" onClick={handleAddProvider} disabled={!newProviderName.trim() || !newProviderUrl.trim()} className="w-full h-8 text-xs">Add</Button>
                </div>
              )}

              {providerNames.map(name => (
                <div key={name} className="p-3 rounded-lg bg-bg-surface border border-border space-y-2 mb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-main">{name}</span>
                    <button onClick={() => handleDeleteProvider(name)} className="text-text-mute hover:text-destructive transition-colors">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <FieldRow label="URL">
                      <SettingInput value={config.providers[name].base_url} onSave={v => handleSet(`providers.${name}.base_url`, v)} mono small />
                    </FieldRow>
                    <FieldRow label="Key">
                      <SettingInput value={config.providers[name].api_key} onSave={v => handleSet(`providers.${name}.api_key`, v)} mono small password />
                    </FieldRow>
                    <FieldRow label="Protocol">
                      <select value={config.providers[name].protocol || "openai"} onChange={e => handleSet(`providers.${name}.protocol`, e.target.value)} className="select-field text-xs h-7 py-0">
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic</option>
                      </select>
                    </FieldRow>
                  </div>
                </div>
              ))}
            </Section>

            {/* Capabilities */}
            <Section title={t("CAPABILITIES")}>
              {/* Sandbox */}
              <CapabilityCard
                name={t("Sandbox")}
                desc={t("sandbox_desc")}
                commands="bash, read, write, edit"
                configured={config.clips.some(c => c.commands?.includes("bash"))}
                t={t}
              >
                {config.clips.some(c => c.commands?.includes("bash")) ? (
                  <div className="space-y-1">
                    {config.clips.filter(c => c.commands?.includes("bash")).map(clip => (
                      <div key={clip.name} className="flex items-center justify-between text-[11px]">
                        <span className="font-mono text-text-mute truncate">{clip.name} — {clip.url}</span>
                        <button onClick={() => handleRemoveClip(clip.name)} className="text-text-mute hover:text-destructive ml-2 shrink-0"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2 text-[11px] text-text-mute">
                    <p>{t("sandbox_step1")}</p>
                    <code className="block bg-bg-base rounded px-2 py-1 font-mono text-[10px] select-all">pinix clip install sandbox.clip</code>
                    <p>{t("sandbox_step2")}</p>
                    <div className="space-y-1.5 pt-1">
                      <Input placeholder="http://host:9875" value={newClipUrl} onChange={e => setNewClipUrl(e.target.value)} className="h-8 text-[11px] font-mono" />
                      <Input placeholder="clip token" type="password" value={newClipToken} onChange={e => setNewClipToken(e.target.value)} className="h-8 text-[11px] font-mono" />
                      <Button size="sm" onClick={async () => {
                        if (!newClipUrl.trim() || !newClipToken.trim()) return;
                        try {
                          await addClip({ name: "sandbox", url: newClipUrl.trim(), token: newClipToken.trim(), commands: ["bash", "read", "write", "edit"] });
                          setNewClipUrl(""); setNewClipToken("");
                          await loadConfig();
                        } catch (err: any) { setError(err.message); }
                      }} disabled={!newClipUrl.trim() || !newClipToken.trim()} className="w-full h-7 text-[11px]">{t("Connect")}</Button>
                    </div>
                  </div>
                )}
              </CapabilityCard>

              {/* Browser */}
              <CapabilityCard
                name={t("Browser")}
                desc={t("browser_desc")}
                commands="snapshot, click, fill, eval"
                configured={!!config.browser?.endpoint}
                t={t}
              >
                {config.browser?.endpoint ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-text-mute">{config.browser.endpoint}</span>
                      <button onClick={() => { handleSet("browser.endpoint", ""); }} className="text-text-mute hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-[11px] text-text-mute">
                    <p>{t("browser_step1")}</p>
                    <code className="block bg-bg-base rounded px-2 py-1 font-mono text-[10px] select-all">npm install -g bb-browser</code>

                    <p>{t("browser_step2")}</p>
                    <p className="text-[10px]">{t("browser_ext_detail")}</p>
                    <code className="block bg-bg-base rounded px-2 py-1 font-mono text-[10px] select-all break-all">node_modules/bb-browser/extension/</code>
                    <p className="text-[10px] text-text-mute/60">
                      GitHub: <span className="font-mono select-all">github.com/nicknisi/bb-browser</span>
                    </p>

                    <p>{t("browser_step3")}</p>
                    <code className="block bg-bg-base rounded px-2 py-1 font-mono text-[10px] select-all">bb-browser daemon</code>

                    <p>{t("browser_step4")}</p>
                    <div className="flex gap-1.5 pt-1">
                      <SettingInput
                        value=""
                        onSave={(v) => handleSet("browser.endpoint", v)}
                        placeholder="http://localhost:19824"
                        mono small
                      />
                      <Button size="sm" variant="outline" onClick={handleBrowserDetect} disabled={browserDetecting} className="h-7 text-[10px] shrink-0 px-2">
                        <Search className="h-3 w-3 mr-1" />
                        {browserDetecting ? t("Detecting...") : t("Auto-detect")}
                      </Button>
                    </div>
                  </div>
                )}
              </CapabilityCard>

              {/* Built-in */}
              <div className="flex gap-4 text-[11px] text-text-mute pt-1">
                <span className="flex items-center gap-1.5"><Circle className="h-2 w-2 fill-green-500 text-green-500" />{t("Memory")} — {t("built-in")}</span>
                <span className="flex items-center gap-1.5"><Circle className="h-2 w-2 fill-green-500 text-green-500" />{t("Events")} — {t("built-in")}</span>
              </div>
            </Section>

            {/* Extra Clips */}
            <Section title={t("Clips")} action={
              <button onClick={() => setShowAddClip(!showAddClip)} className="text-brand-primary hover:text-brand-primary/80 transition-colors">
                <Plus className="h-3.5 w-3.5" />
              </button>
            }>
              {showAddClip && (
                <div className="space-y-2 p-3 rounded-lg bg-bg-surface border border-border mb-3">
                  <Input placeholder="name" value={newClipName} onChange={e => setNewClipName(e.target.value)} className="h-9 text-xs font-mono" />
                  <Input placeholder="http://host:port" value={newClipUrl} onChange={e => setNewClipUrl(e.target.value)} className="h-9 text-xs font-mono" />
                  <Input placeholder="token" type="password" value={newClipToken} onChange={e => setNewClipToken(e.target.value)} className="h-9 text-xs font-mono" />
                  <Input placeholder="commands (comma-sep)" value={newClipCommands} onChange={e => setNewClipCommands(e.target.value)} className="h-9 text-xs font-mono" />
                  <Button size="sm" onClick={handleAddClip} disabled={!newClipName.trim() || !newClipUrl.trim()} className="w-full h-8 text-xs">Add</Button>
                </div>
              )}

              {config.clips.filter(c => !c.commands?.includes("bash")).length === 0 && !showAddClip && (
                <p className="text-xs text-text-mute">No extra clips</p>
              )}

              {config.clips.filter(c => !c.commands?.includes("bash")).map(clip => (
                <div key={clip.name} className="p-3 rounded-lg bg-bg-surface border border-border mb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-main">{clip.name}</span>
                    <button onClick={() => handleRemoveClip(clip.name)} className="text-text-mute hover:text-destructive transition-colors">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="text-[10px] text-text-mute mt-1 font-mono truncate">{clip.url}</div>
                  {clip.commands?.length > 0 && (
                    <div className="text-[10px] text-text-mute mt-0.5">{clip.commands.join(", ")}</div>
                  )}
                </div>
              ))}
            </Section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// --- Helper components ---

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-text-mute uppercase tracking-wider">{title}</label>
        {action}
      </div>
      {children}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-text-mute w-12 shrink-0">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function CapabilityCard({ name, desc, commands, configured, t, children }: {
  name: string; desc: string; commands: string; configured: boolean;
  t: (key: string) => string; children: React.ReactNode;
}) {
  return (
    <div className="p-3 rounded-lg bg-bg-surface border border-border mb-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Circle className={`h-2.5 w-2.5 ${configured ? "fill-green-500 text-green-500" : "fill-red-400 text-red-400"}`} />
          <span className="text-xs font-semibold text-text-main">{name}</span>
        </div>
        <span className={`text-[10px] ${configured ? "text-green-600" : "text-text-mute"}`}>
          {configured ? t("Configured") : t("Not configured")}
        </span>
      </div>
      <p className="text-[10px] text-text-mute mb-1">{desc}</p>
      <p className="text-[10px] text-text-mute/60 font-mono mb-2">{commands}</p>
      {children}
    </div>
  );
}

function SettingInput({
  value,
  onSave,
  placeholder,
  mono,
  small,
  password,
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  small?: boolean;
  password?: boolean;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);

  return (
    <Input
      type={password ? "password" : "text"}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => { if (local !== value) onSave(local); }}
      onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur(); } }}
      placeholder={placeholder}
      className={`rounded-lg border-border bg-bg-surface transition-all ${mono ? "font-mono" : ""} ${small ? "h-7 text-[11px] px-2" : "h-10 text-sm px-3"}`}
    />
  );
}
