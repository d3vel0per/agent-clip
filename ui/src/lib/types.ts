/** Data types matching backend Go structs */

export interface Topic {
  id: string;
  name: string;
  message_count: number;
  created_at: number;
}

export interface Run {
  id: string;
  topic_id: string;
  status: "running" | "done" | "error" | "cancelled";
  pid: number;
  async: boolean;
  started_at: number;
  finished_at?: number;
}

export interface SendOptions {
  topicId?: string;
  runId?: string;
  async?: boolean;
}

/** Raw message from backend get-topic */
export interface HistoryMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_call_id?: string;
  reasoning?: string;
}

/** A tool call within an assistant message */
export interface ToolCallEntry {
  name: string;
  arguments: string;
  result?: string;
}

/** A single chat message for rendering */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  toolCalls?: ToolCallEntry[];
  status: "done" | "streaming" | "error";
}
