import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { Input } from "./ui/input";
import { getConfig, setConfig } from "../lib/agent";
import { useI18n } from "../lib/i18n";
import { ScrollArea } from "./ui/scroll-area";

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsPanel({ open, onOpenChange }: SettingsPanelProps) {
  const { t, locale, setLocale } = useI18n();
  const [, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [config, setConfigState] = useState<Record<string, string>>({});
  const [providers, setProviders] = useState<string[]>([]);

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const cfgText = await getConfig();
      const lines = cfgText.split("\n");
      const parsed: Record<string, string> = {};
      for (const line of lines) {
        if (line.includes(": ") && !line.startsWith(" ")) {
          const idx = line.indexOf(": ");
          parsed[line.substring(0, idx)] = line.substring(idx + 2).trim();
        }
      }
      setConfigState(parsed);
      if (parsed.providers) {
        setProviders(parsed.providers.split(",").map(s => s.trim()).filter(Boolean));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadConfig();
    }
  }, [open]);

  const handleChange = async (key: string, value: string) => {
    setConfigState((prev) => ({ ...prev, [key]: value }));
    try {
      await setConfig(key, value);
    } catch (err: any) {
      setError(err.message);
      await loadConfig(); // rollback
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>{t("Agent Configuration")}</SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="flex-1 px-6 py-4">
          {error && <div className="text-destructive text-sm mb-4 bg-destructive/10 p-2 rounded">{error}</div>}
          
          <div className="space-y-8 pb-8">
            {/* Language */}
            <section className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t("Language")}</h3>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">{t("Language")}</label>
                <select
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as any)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="en">English</option>
                  <option value="zh-CN">简体中文</option>
                </select>
              </div>
            </section>

            {/* Basic Info */}
            <section className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t("Basic Info")}</h3>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">{t("Agent Name")}</label>
                <Input
                  value={config.name || ""}
                  onChange={(e) => setConfigState({ ...config, name: e.target.value })}
                  onBlur={(e) => handleChange("name", e.target.value)}
                />
              </div>
            </section>

            {/* Model Config */}
            <section className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t("Model Config")}</h3>
              
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">{t("LLM Provider")}</label>
                <select
                  value={config.provider || ""}
                  onChange={(e) => handleChange("provider", e.target.value)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select Provider</option>
                  {providers.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">{t("LLM Model")}</label>
                <Input
                  value={config.model || ""}
                  onChange={(e) => setConfigState({ ...config, model: e.target.value })}
                  onBlur={(e) => handleChange("model", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">{t("Embedding Provider")}</label>
                <select
                  value={config.embedding_provider || ""}
                  onChange={(e) => handleChange("embedding_provider", e.target.value)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select Provider</option>
                  {providers.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">{t("Embedding Model")}</label>
                <Input
                  value={config.embedding_model || ""}
                  onChange={(e) => setConfigState({ ...config, embedding_model: e.target.value })}
                  onBlur={(e) => handleChange("embedding_model", e.target.value)}
                />
              </div>
            </section>

            {/* Connections */}
            <section className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t("Connections")}</h3>
              
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">{t("Browser Endpoint")}</label>
                <Input
                  value={config.browser || ""}
                  onChange={(e) => setConfigState({ ...config, browser: e.target.value })}
                  onBlur={(e) => handleChange("browser", e.target.value)}
                />
              </div>
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
