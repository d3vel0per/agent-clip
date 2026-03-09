# Agent Clip

AI Agent as a [Pinix Clip](https://github.com/epiral/pinix) — agentic loop with memory, tool use, and async execution.

## Quick Start

```bash
# Build
make build

# Initialize data from seed
make dev

# Add your API key to data/config.yaml
# api_key: sk-or-v1-xxx

# Chat
commands/send -p "hello"

# Multi-turn
commands/send -p "remember my name is Alice" -t <topic-id>
commands/send -p "what's my name?" -t <topic-id>
```

## Architecture

```
Agent Clip (this repo)
  │
  ├─ commands/          External interface (Pinix ClipService.Invoke)
  │   send, create-topic, list-topics, get-run, cancel-run
  │
  ├─ run(cmd, stdin?)   Single LLM function call
  │   ├─ Internal:  memory, topic, time, help, echo, grep, head, tail, wc
  │   ├─ Chaining:  cmd1 | cmd2 && cmd3 ; cmd4
  │   └─ Clips:     clip <name> <command> [args...]
  │
  ├─ Topics             Named conversation namespaces (SQLite)
  ├─ Runs               One agentic loop per send (runtime concept)
  ├─ Memory             Summaries + embeddings + facts + semantic search
  └─ Output             CLI (raw) / Web (jsonl) dual interface
```

## Core Concepts

### Topic

A named conversation namespace. All messages belong to a topic. Created automatically on first `send`, or explicitly via `create-topic`.

### Run

A single agentic loop cycle — from user message to LLM's `finish_reason: "stop"`. A Run may involve multiple LLM calls and tool executions. Runs within a topic form the conversation history.

### Memory

Three layers:
- **Facts** — persistent knowledge (`memory store/facts/forget`)
- **Summaries** — LLM-generated per-Run summary + OpenRouter embedding
- **Semantic search** — cosine similarity over summary embeddings

### Clip

External capabilities invoked via `run("clip <name> <command> [args...]")`. Each Clip is a separate service registered in `data/config.yaml`. Uses Pinix ClipService.Invoke protocol.

## Commands

### External (Pinix interface)

| Command | Usage | Description |
|---------|-------|-------------|
| `send` | `-p "msg" [-t topic] [-r run] [--async]` | Send message, run agentic loop |
| `create-topic` | `-n "name"` | Create a conversation topic |
| `list-topics` | | List all topics |
| `get-run` | `<run-id>` | Show run status and output |
| `cancel-run` | `<run-id>` | Cancel an active run |

### Internal (LLM tools via `run`)

| Command | Description |
|---------|-------------|
| `memory search <query> [-t id] [-k keyword]` | Semantic + keyword search |
| `memory recent [n]` | Recent conversation summaries |
| `memory store <note>` | Store a persistent fact |
| `memory facts` | List all facts |
| `memory forget <id>` | Delete a fact |
| `topic list [limit]` | List topics (default 10, newest first) |
| `topic info <id>` | Topic details + run history |
| `topic runs <id> [limit]` | List runs with summaries |
| `topic run <run-id>` | Show run's full messages |
| `topic search <id> <query>` | Search within a topic |
| `topic rename <id> <name>` | Rename a topic |
| `clip list` | List connected clips |
| `clip <name> <command> [args]` | Invoke a clip |
| `echo`, `time`, `help` | Utilities |
| `grep [-i] [-v] [-c] <pattern>` | Filter lines |
| `head [n]`, `tail [n]` | First/last N lines |
| `wc [-l\|-w\|-c]` | Count lines/words/chars |

### Command Chaining

```bash
clip sandbox bash ls /etc | grep conf | head 5    # pipe
topic list | grep Go                                # filter
echo hello && echo world                            # sequential
memory recent ; topic list                          # independent
```

## Async Runs

```bash
# Start in background
commands/send -p "complex task" --async
# → [run] a1b2c3 started (async, pid 12345)

# Watch progress
commands/get-run a1b2c3

# Inject mid-run
commands/send -p "also check X" -r a1b2c3

# Cancel
commands/cancel-run a1b2c3
```

Defense: `send -t <topic>` errors if topic has an active run — must explicitly inject via `-r`.

## Context Management

### Run Window (3→7)

- ≤7 completed Runs in topic: all loaded as full messages
- \>7 Runs: last 3 full, older as summaries in topic history
- ~80% prompt cache hit rate (prefix stable between compressions)

### Message Structure

```
[system: base prompt + facts]          ← stable, cacheable
[user: topic history summaries]        ← changes at compression boundary
[assistant: "了解"]                    ← stable
[recent Run messages...]               ← prefix grows, stable
[user: <user>msg</user>               ← new, at end
       <recall>semantic search</recall>
       <environment>time, clips</environment>]
```

### XML User Message

```xml
<user>
actual user message
</user>

<recall>
- [03-09 15:04] (72%) topic="Go讨论" run=a1b2 — relevant past conversation...
</recall>

<environment>
<time>2026-03-09 15:30:00 CST</time>
<clips>
  <clip name="sandbox" commands="bash, read, write, edit" />
</clips>
</environment>
```

## Output Formats

```bash
# CLI (default) — human-readable
commands/send -p "hello"

# JSONL — for web/programmatic consumption
commands/send -p "hello" --output jsonl
# → {"type":"info","message":"[topic] abc (hello)"}
# → {"type":"text","content":"Hi"}
# → {"type":"tool_call","name":"run","arguments":"..."}
# → {"type":"tool_result","content":"..."}
# → {"type":"done"}
```

## Configuration

`data/config.yaml` (initialized from `seed/config.yaml`):

```yaml
model: anthropic/claude-3.5-haiku
llm_base_url: https://openrouter.ai/api/v1
api_key: <your-key>          # or set OPENROUTER_API_KEY env var
system_prompt: |
  你是 pi，一个智能助手。

clips:
  - name: sandbox
    url: http://localhost:9875
    token: <clip-token>
    commands: [bash, read, write, edit]
```

## Database

SQLite with WAL mode. Schema in `seed/schema.sql`.

| Table | Purpose |
|-------|---------|
| `topics` | Conversation namespaces |
| `messages` | Flat message stream (tagged with run_id) |
| `runs` | Run lifecycle tracking |
| `run_inbox` | Atomic inject messages (SQLite transactions) |
| `summaries` | Per-Run summaries + embedding BLOBs |
| `summaries_fts` | FTS5 keyword search index |
| `facts` | Persistent user knowledge |

## Directory Structure

```
agent-clip/
├── clip.yaml              # Pinix Clip metadata
├── Makefile               # build / dev / clean
├── commands/              # External interface (shell wrappers → bin/agent)
├── seed/                  # Template for data/ (schema + default config)
├── cmd/agent/main.go      # CLI entry point (cobra)
├── internal/
│   ├── chain.go           # Command chaining parser (&&, ;, |)
│   ├── clip.go            # Clip invocation via pinix CLI
│   ├── config.go          # Config loading (data/config.yaml)
│   ├── context.go         # Context building (Run Window, XML wrapping)
│   ├── db.go              # SQLite operations (topics, messages)
│   ├── embed.go           # OpenRouter embedding API + cosine similarity
│   ├── llm.go             # LLM API call with tool support + streaming
│   ├── loop.go            # Agentic loop engine
│   ├── memory.go          # Summary generation, search, facts
│   ├── output.go          # CLI/JSONL dual output interface
│   ├── run.go             # Run lifecycle (create, finish, inject, inbox)
│   └── tools.go           # Command registry + builtins
├── bin/agent              # Compiled binary (gitignored)
└── data/                  # Runtime data (gitignored)
    ├── agent.db           # SQLite database
    └── config.yaml        # User config (from seed/)
```
