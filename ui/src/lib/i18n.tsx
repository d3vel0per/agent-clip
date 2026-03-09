import React, { createContext, useContext, useState } from "react";

type Locale = "en" | "zh-CN";

const translations: Record<Locale, Record<string, string>> = {
  en: {
    "New Chat": "New Chat",
    "Settings": "Settings",
    "You": "You",
    "Ask {name} anything...": "Ask {name} anything...",
    "Send": "Send",
    "Thought process": "Thought process",
    "Summarize text": "Summarize text",
    "Write code": "Write code",
    "Analyze data": "Analyze data",
    "Run sandbox": "Run sandbox",
    "Agent Name": "Agent Name",
    "LLM Provider": "LLM Provider",
    "LLM Model": "LLM Model",
    "Embedding Provider": "Embedding Provider",
    "Embedding Model": "Embedding Model",
    "Browser Endpoint": "Browser Endpoint",
    "Clips": "Clips",
    "Language": "Language",
    "Basic Info": "Basic Info",
    "Model Config": "Model Config",
    "Connections": "Connections",
    "Agent Configuration": "Agent Configuration",
    "No messages yet": "How can I help you today?", // Or custom
    "Thinking...": "Thinking...",
    "Initializing thought...": "Initializing thought...",
    "Arguments": "Arguments",
    "Result": "Result",
  },
  "zh-CN": {
    "New Chat": "新建对话",
    "Settings": "设置",
    "You": "你",
    "Ask {name} anything...": "向 {name} 提问...",
    "Send": "发送",
    "Thought process": "思考过程",
    "Summarize text": "总结一段文字",
    "Write code": "写一段代码",
    "Analyze data": "分析数据",
    "Run sandbox": "沙盒操作",
    "Agent Name": "智能体名称",
    "LLM Provider": "模型提供商",
    "LLM Model": "LLM 模型",
    "Embedding Provider": "向量模型提供商",
    "Embedding Model": "向量模型",
    "Browser Endpoint": "浏览器 Endpoint",
    "Clips": "剪辑 (Clips)",
    "Language": "语言",
    "Basic Info": "基本信息",
    "Model Config": "模型配置",
    "Connections": "连接",
    "Agent Configuration": "智能体设置",
    "No messages yet": "今天我能帮您什么？",
    "Thinking...": "思考中...",
    "Initializing thought...": "正在初始化思考...",
    "Arguments": "参数",
    "Result": "结果",
  },
};

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, values?: Record<string, string>) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof navigator !== "undefined") {
      const lang = navigator.language;
      if (lang.startsWith("zh")) return "zh-CN";
    }
    return "en";
  });

  const t = (key: string, values?: Record<string, string>) => {
    let str = translations[locale][key] || translations["en"][key] || key;
    if (values) {
      Object.entries(values).forEach(([k, v]) => {
        str = str.replace(new RegExp(`{${k}}`, "g"), v);
      });
    }
    return str;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
