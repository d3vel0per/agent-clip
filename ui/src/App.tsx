import { useEffect, useRef, useState } from "react"
import { useChat } from "@/lib/useChat"
import type { ChatMessage } from "@/lib/types"

function App() {
  const chat = useChat()
  const [input, setInput] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chat.loadTopics()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chat.messages])

  const handleSend = () => {
    const text = input.trim()
    if (!text || chat.isStreaming) return
    setInput("")
    chat.send(text)
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <div className="w-56 border-r border-border flex flex-col">
        <div className="p-3 border-b border-border font-semibold text-sm">
          Topics
        </div>
        <div className="flex-1 overflow-y-auto">
          {chat.topics.map((t) => (
            <button
              key={t.id}
              onClick={() => chat.selectTopic(t.id)}
              className={`w-full text-left px-3 py-2 text-sm truncate hover:bg-accent ${
                chat.currentTopicId === t.id ? "bg-accent" : ""
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
        <button
          onClick={() => chat.selectTopic(null)}
          className="p-3 border-t border-border text-sm text-muted-foreground hover:bg-accent"
        >
          + New Chat
        </button>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {chat.messages.length === 0 && (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Send a message to start
            </div>
          )}
          {chat.messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Error */}
        {chat.error && (
          <div className="px-4 py-2 text-sm text-destructive bg-destructive/10">
            {chat.error}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border p-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-muted px-3 py-2 rounded-md text-sm outline-none"
          />
          {chat.isStreaming ? (
            <button
              onClick={chat.cancel}
              className="px-4 py-2 rounded-md text-sm bg-destructive text-destructive-foreground"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={handleSend}
              className="px-4 py-2 rounded-md text-sm bg-primary text-primary-foreground"
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user"

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        }`}
      >
        {/* Thinking */}
        {message.thinking && (
          <div className="text-xs text-muted-foreground italic mb-1 whitespace-pre-wrap">
            {message.thinking}
          </div>
        )}

        {/* Content */}
        <div className="whitespace-pre-wrap">{message.content}</div>

        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.toolCalls.map((tc, i) => (
              <div key={i} className="text-xs text-muted-foreground font-mono">
                <span className="text-accent-foreground">{tc.name}</span>
                ({tc.arguments.length > 60 ? tc.arguments.slice(0, 60) + "..." : tc.arguments})
                {tc.result && (
                  <div className="ml-2 mt-0.5 text-foreground/60">
                    → {tc.result.length > 100 ? tc.result.slice(0, 100) + "..." : tc.result}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Streaming indicator */}
        {message.status === "streaming" && !message.content && (
          <span className="text-muted-foreground">...</span>
        )}
      </div>
    </div>
  )
}

export default App
