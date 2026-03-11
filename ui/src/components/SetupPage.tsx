import { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { setConfig, type AgentConfig } from "../lib/agent";
import { useI18n } from "../lib/i18n";
import { Sparkles } from "lucide-react";

const PROVIDER_PRESETS: Record<string, { label: string; base_url: string; protocol: string; models: string[] }> = {
  openrouter: {
    label: "OpenRouter",
    base_url: "https://openrouter.ai/api/v1",
    protocol: "openai",
    models: [
      "anthropic/claude-3.5-sonnet",
      "anthropic/claude-3.5-haiku",
      "openai/gpt-4o",
      "openai/gpt-4o-mini",
      "google/gemini-2.0-flash",
      "deepseek/deepseek-chat",
    ],
  },
  openai: {
    label: "OpenAI",
    base_url: "https://api.openai.com/v1",
    protocol: "openai",
    models: ["gpt-4o", "gpt-4o-mini"],
  },
  anthropic: {
    label: "Anthropic",
    base_url: "https://api.anthropic.com",
    protocol: "anthropic",
    models: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"],
  },
  dashscope: {
    label: "DashScope (Qwen)",
    base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    protocol: "openai",
    models: ["qwen-max", "qwen-plus"],
  },
  deepseek: {
    label: "DeepSeek",
    base_url: "https://api.deepseek.com/v1",
    protocol: "openai",
    models: ["deepseek-chat", "deepseek-reasoner"],
  },
  custom: {
    label: "Custom",
    base_url: "",
    protocol: "openai",
    models: [],
  },
};

interface SetupPageProps {
  config: AgentConfig;
  onComplete: () => void;
}

export function SetupPage({ config, onComplete }: SetupPageProps) {
  const { t } = useI18n();
  const [name, setName] = useState(config.name || "pi");
  const [providerKey, setProviderKey] = useState(config.llm_provider || "openrouter");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(config.llm_model || "");
  const [customUrl, setCustomUrl] = useState("");
  const [customProtocol, setCustomProtocol] = useState("openai");
  const [customModel, setCustomModel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preset = PROVIDER_PRESETS[providerKey] || PROVIDER_PRESETS.custom;
  const isCustom = providerKey === "custom";
  const finalModel = isCustom ? customModel : model;

  const canSubmit = apiKey.trim() && finalModel.trim() && (!isCustom || customUrl.trim());

  const handleProviderChange = (key: string) => {
    setProviderKey(key);
    setModel("");
    setCustomModel("");
    setError(null);
    const p = PROVIDER_PRESETS[key];
    if (p?.models.length) setModel(p.models[0]);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);

    try {
      const pName = isCustom ? "custom" : providerKey;
      const baseUrl = isCustom ? customUrl : preset.base_url;
      const protocol = isCustom ? customProtocol : preset.protocol;

      await setConfig(`providers.${pName}.base_url`, baseUrl);
      await setConfig(`providers.${pName}.api_key`, apiKey);
      await setConfig(`providers.${pName}.protocol`, protocol);
      await setConfig("llm_provider", pName);
      await setConfig("llm_model", finalModel);
      if (name.trim() && name !== config.name) {
        await setConfig("name", name.trim());
      }
      onComplete();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[100dvh] bg-paper p-6 relative">
      <div className="w-full max-w-lg space-y-12">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 border-2 border-ink text-ink mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-5xl font-serif font-bold tracking-tight text-ink">{t("Setup Agent")}</h1>
          <p className="signature-label text-muted">{t("Configure your AI provider to get started")}</p>
        </div>

        {error && (
          <div className="text-urgent text-[12px] font-mono border border-urgent/20 bg-urgent/5 p-4 uppercase tracking-widest text-center">
            {error}
          </div>
        )}

        <div className="border border-border p-8 space-y-8 bg-surface">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Identity */}
            <div className="space-y-3">
              <label className="signature-label text-muted">{t("Agent Name")}</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="pi"
                className="h-10 border border-border px-3 bg-paper"
              />
            </div>

            {/* Provider */}
            <div className="space-y-3">
              <label className="signature-label text-muted">{t("AI Provider")}</label>
              <select
                value={providerKey}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="flex h-10 w-full border border-border bg-paper px-3 py-2 text-sm transition-colors focus:outline-none focus:border-ink appearance-none cursor-pointer"
              >
                {Object.entries(PROVIDER_PRESETS).map(([key, p]) => (
                  <option key={key} value={key}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-8 pt-6 border-t border-border">
            {/* Custom URL + Protocol */}
            {isCustom && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="signature-label text-muted">Base URL</label>
                  <Input
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://api.example.com/v1"
                    className="h-10 border border-border px-3 font-mono text-xs bg-paper"
                  />
                </div>
                <div className="space-y-3">
                  <label className="signature-label text-muted">Protocol</label>
                  <select
                    value={customProtocol}
                    onChange={(e) => setCustomProtocol(e.target.value)}
                    className="flex h-10 w-full border border-border bg-paper px-3 py-2 text-sm transition-colors focus:outline-none focus:border-ink appearance-none cursor-pointer"
                  >
                    <option value="openai">OpenAI Compatible</option>
                    <option value="anthropic">Anthropic</option>
                  </select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* API Key */}
              <div className="space-y-3">
                <label className="signature-label text-muted">API Key</label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="h-10 border border-border px-3 font-mono text-xs bg-paper"
                />
              </div>

              {/* Model */}
              <div className="space-y-3">
                <label className="signature-label text-muted">{t("Model")}</label>
                {!isCustom && preset.models.length > 0 ? (
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="flex h-10 w-full border border-border bg-paper px-3 py-2 text-sm font-mono transition-colors focus:outline-none focus:border-ink appearance-none cursor-pointer"
                  >
                    {preset.models.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    placeholder="model-name"
                    className="h-10 border border-border px-3 font-mono text-xs bg-paper"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Submit */}
          <Button
            className="w-full h-12 text-[14px] font-bold"
            disabled={!canSubmit || saving}
            onClick={handleSubmit}
          >
            {saving ? t("Saving...") : t("Start Session")}
          </Button>
        </div>

        <p className="text-center signature-label text-muted opacity-40">
          Powered by Gemini Resonance Engine
        </p>
      </div>
    </div>
  );
}
