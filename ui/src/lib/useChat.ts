/**
 * useChat — React hook encapsulating the full chat lifecycle.
 *
 * Handles: message accumulation, streaming state, topic management.
 * UI components just render what this hook returns.
 *
 * Usage:
 *   const chat = useChat()
 *   chat.send("hello")                    // new topic
 *   chat.send("follow up", topicId)       // continue topic
 *   chat.cancel()                         // cancel streaming
 *   chat.selectTopic(topicId)             // switch topic
 *   chat.messages                         // ChatMessage[] to render
 *   chat.isStreaming                      // show loading indicator
 *   chat.topics                           // Topic[] for sidebar
 *   chat.currentTopicId                   // active topic
 */

import { useState, useCallback, useRef } from "react";
import * as agent from "./agent";
import type { Topic, ChatMessage, ToolCallEntry } from "./types";

let msgCounter = 0;
function nextId() {
  return `msg-${++msgCounter}`;
}

export function useChat() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [currentTopicId, setCurrentTopicId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  // ─── Load topics ───

  const loadTopics = useCallback(async () => {
    try {
      const list = await agent.listTopics();
      setTopics(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // ─── Select topic + load history ───

  const selectTopic = useCallback(async (topicId: string | null) => {
    setCurrentTopicId(topicId);
    setError(null);

    if (!topicId) {
      setMessages([]);
      return;
    }

    try {
      const history = await agent.getTopicMessages(topicId);
      const chatMsgs: ChatMessage[] = [];
      for (const msg of history) {
        if (msg.role === "user" || msg.role === "assistant") {
          chatMsgs.push({
            id: nextId(),
            role: msg.role,
            content: msg.content ?? "",
            thinking: msg.reasoning,
            status: "done",
          });
        }
      }
      setMessages(chatMsgs);
    } catch (e) {
      setMessages([]);
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // ─── Send message ───

  const send = useCallback((message: string, topicId?: string) => {
    const targetTopicId = topicId ?? currentTopicId ?? undefined;

    // Add user message immediately
    const userMsg: ChatMessage = {
      id: nextId(),
      role: "user",
      content: message,
      status: "done",
    };

    // Placeholder for assistant response
    const assistantMsg: ChatMessage = {
      id: nextId(),
      role: "assistant",
      content: "",
      thinking: "",
      toolCalls: [],
      status: "streaming",
    };

    const assistantId = assistantMsg.id;

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);
    setError(null);

    // Mutable accumulator (updated via setMessages functional updates)
    let text = "";
    let thinking = "";
    const toolCalls: ToolCallEntry[] = [];

    const updateAssistant = (patch: Partial<ChatMessage>) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, ...patch } : m)),
      );
    };

    const cancel = agent.send(message, { topicId: targetTopicId }, {
      onInfo: (info) => {
        // Parse topic ID from "[topic] abc123 (name)"
        const match = info.match(/\[topic\]\s+(\S+)/);
        if (match && !targetTopicId) {
          setCurrentTopicId(match[1]);
        }
      },
      onText: (token) => {
        text += token;
        updateAssistant({ content: text });
      },
      onThinking: (token) => {
        thinking += token;
        updateAssistant({ thinking });
      },
      onToolCall: (name, args) => {
        toolCalls.push({ name, arguments: args });
        updateAssistant({ toolCalls: [...toolCalls] });
      },
      onToolResult: (content) => {
        if (toolCalls.length > 0) {
          toolCalls[toolCalls.length - 1].result = content;
          updateAssistant({ toolCalls: [...toolCalls] });
        }
      },
      onDone: () => {
        updateAssistant({ status: "done" });
        setIsStreaming(false);
        cancelRef.current = null;
        loadTopics(); // refresh topic list (new topic may have been created)
      },
      onError: (err) => {
        updateAssistant({ status: "error", content: text || err.message });
        setIsStreaming(false);
        setError(err.message);
        cancelRef.current = null;
      },
    });

    cancelRef.current = cancel;
  }, [currentTopicId, loadTopics]);

  // ─── Cancel streaming ───

  const cancel = useCallback(() => {
    cancelRef.current?.();
    cancelRef.current = null;
    setIsStreaming(false);
    setMessages((prev) =>
      prev.map((m) =>
        m.status === "streaming" ? { ...m, status: "done" as const } : m,
      ),
    );
  }, []);

  return {
    // State
    topics,
    currentTopicId,
    messages,
    isStreaming,
    error,

    // Actions
    loadTopics,
    selectTopic,
    send,
    cancel,
  };
}
