/**
 * Agent service — all business logic for UI consumption.
 *
 * Every method maps to a backend command.
 * UI components should ONLY call functions from this module.
 */

import { invoke, invokeStream, type StreamEvent } from "./bridge";
import type { Topic, Run, SendOptions, HistoryMessage } from "./types";

// ─── Topics ───

export async function listTopics(): Promise<Topic[]> {
  return invoke<Topic[]>("list-topics");
}

export async function createTopic(name: string): Promise<Topic> {
  return invoke<Topic>("create-topic", {
    args: ["-n", name],
  });
}

export interface TopicResponse {
  messages: HistoryMessage[];
  active_run: {
    id: string;
    status: string;
    started_at: number;
    async: boolean;
    output?: string;
  } | null;
}

export async function getTopicData(topicId: string): Promise<TopicResponse> {
  return invoke<TopicResponse>("get-topic", { args: [topicId] });
}

// ─── Send (streaming) ───

export interface SendCallbacks {
  onInfo?: (message: string) => void;
  onText?: (token: string) => void;
  onThinking?: (token: string) => void;
  onToolCall?: (name: string, args: string) => void;
  onToolResult?: (content: string) => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Send a message and stream the agentic loop response.
 * Returns a cancel function.
 */
export function send(
  message: string,
  options: SendOptions = {},
  callbacks: SendCallbacks = {},
): () => void {
  const args: string[] = ["-p", message, "--output", "jsonl"];
  if (options.topicId) args.push("-t", options.topicId);
  if (options.runId) args.push("-r", options.runId);
  if (options.async) args.push("--async");

  return invokeStream(
    "send",
    { args },
    (event: StreamEvent) => {
      switch (event.type) {
        case "info":
          callbacks.onInfo?.(event.message);
          break;
        case "text":
          callbacks.onText?.(event.content);
          break;
        case "thinking":
          callbacks.onThinking?.(event.content);
          break;
        case "tool_call":
          callbacks.onToolCall?.(event.name, event.arguments);
          break;
        case "tool_result":
          callbacks.onToolResult?.(event.content);
          break;
        case "done":
          callbacks.onDone?.();
          break;
      }
    },
    (exitCode: number) => {
      if (exitCode !== 0) {
        callbacks.onError?.(new Error(`send exited with code ${exitCode}`));
      }
    },
  );
}

// ─── Runs ───

export async function getRun(runId: string): Promise<Run> {
  return invoke<Run>("get-run", { args: [runId] });
}

export async function cancelRun(runId: string): Promise<void> {
  await invoke("cancel-run", { args: [runId] });
}

// ─── Config ───

export async function getConfig(): Promise<string> {
  return invoke<string>("config");
}

export async function setConfig(key: string, value: string): Promise<string> {
  return invoke<string>("config", { args: ["set", key, value] });
}
