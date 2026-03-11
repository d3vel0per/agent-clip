import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "./ui/sheet";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { getConfig, setConfig, type AgentConfig } from "../lib/agent";
import { useI18n } from "../lib/i18n";

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsPanel({ open, onOpenChange }: SettingsPanelProps) {
  const { t } = useI18n();
  const [config, setLocalConfig] = useState<AgentConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      getConfig().then(setLocalConfig);
    }
  }, [open]);

  const handleSave = async (key: string, value: string) => {
    setSaving(true);
    try {
      await setConfig(key as any, value);
      const updated = await getConfig();
      setLocalConfig(updated);
    } catch (err) {
      console.error("Failed to save config:", err);
    } finally {
      setSaving(false);
    }
  };

  if (!config) return null;

  const currentProvider = config.llm_provider || "openrouter";
  const providerConfig = config.providers[currentProvider] || {};

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader>
          <SheetTitle>{t("Settings")}</SheetTitle>
          <SheetDescription>{t("Configure your agent's core parameters")}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-10">
          <section className="space-y-6">
            <h3 className="signature-label text-muted">{t("Identity")}</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase text-muted tracking-tight">{t("Agent Name")}</label>
                <Input
                  defaultValue={config.name}
                  onBlur={(e) => handleSave("name", e.target.value)}
                  placeholder="pi"
                  className="bg-paper"
                />
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h3 className="signature-label text-muted">{t("Language Model")}</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase text-muted tracking-tight">{t("Provider")}</label>
                <select
                  value={currentProvider}
                  onChange={(e) => handleSave("llm_provider", e.target.value)}
                  className="flex h-10 w-full border border-border bg-paper px-3 py-2 text-sm transition-colors focus:outline-none focus:border-ink appearance-none cursor-pointer"
                >
                  {Object.keys(config.providers).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase text-muted tracking-tight">{t("Model")}</label>
                <Input
                  defaultValue={config.llm_model}
                  onBlur={(e) => handleSave("llm_model", e.target.value)}
                  placeholder="gpt-4o"
                  className="bg-paper"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase text-muted tracking-tight">API Key</label>
                <Input
                  type="password"
                  defaultValue={providerConfig.api_key}
                  onBlur={(e) => handleSave(`providers.${currentProvider}.api_key` as any, e.target.value)}
                  placeholder="sk-..."
                  className="font-mono text-xs bg-paper"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase text-muted tracking-tight">Base URL</label>
                <Input
                  defaultValue={providerConfig.base_url}
                  onBlur={(e) => handleSave(`providers.${currentProvider}.base_url` as any, e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="font-mono text-xs bg-paper"
                />
              </div>
            </div>
          </section>

          <section className="space-y-6 pt-4 border-t border-border">
            <h3 className="signature-label text-muted">{t("System Prompt")}</h3>
            <textarea
              defaultValue={config.system_prompt}
              onBlur={(e) => handleSave("system_prompt", e.target.value)}
              className="w-full min-h-[200px] border border-border bg-paper p-4 text-sm font-serif italic leading-relaxed focus:outline-none focus:border-ink"
              placeholder={t("Instructions for the agent...")}
            />
          </section>
        </div>

        <div className="p-6 border-t border-border bg-surface">
          <Button
            className="w-full h-12"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {saving ? t("Saving...") : t("Done")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
