# Agent Clip

AI Agent as a [Pinix Clip](https://github.com/epiral/pinix) — agentic loop with memory, tool use, and async execution.

## Quick Start

```bash
# Local development
make dev                              # build macOS binary + init data/
cd ui && pnpm install && cd ..        # install frontend deps (first time)

# Add your API key to data/config.yaml

# Chat
bin/agent-local send -p "hello"

# Build frontend
make ui                               # ui/ → web/
```

## Build & Deploy

```bash
# Development (workdir mode — Pinix reads repo directly)
make deploy                           # cross-compile linux/arm64 + build frontend

# Production (package for remote install)
make package                          # → dist/agent.clip
pinix clip install dist/agent.clip    # first time
pinix clip upgrade dist/agent.clip    # update (preserves data/)
```

| Make target | What it does |
|-------------|-------------|
| `make build-local` | Go binary for macOS |
| `make build` | Go binary for BoxLite VM (linux/arm64) |
| `make ui` | Build frontend `ui/` → `web/` |
| `make dev` | `build-local` + init `data/` from `seed/` |
| `make deploy` | `build` + `ui` (workdir mode, changes are live) |
| `make package` | ZIP → `dist/agent.clip` for `pinix clip install/upgrade` |
| `make clean` | Remove `bin/` `data/` `web/` `dist/` |

## Architecture

```
Agent Clip (this repo)
  │
  ├─ commands/          External interface (Pinix ClipService.Invoke)
  │   send, create-topic, list-topics, get-run, cancel-run, config
  │
  ├─ run(cmd, stdin?)   Single LLM function call
  │   ├─ Internal:  memory, topic, config, time, help, echo, grep, head, tail, wc
  │   ├─ Chaining:  cmd1 | cmd2 && cmd3 ; cmd4
  │   ├─ Clips:     clip <name> <command> [args...]
  │   └─ Browser:   browser <action> [params...]
  │
  ├─ Topics             Named conversation namespaces (SQLite)
  ├─ Runs               One agentic loop per send (sync / async)
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
- **Summaries** — LLM-generated per-Run summary + embedding
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
| `config` | `[set <key> <value>]` | View or update config |

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
| `browser <action> [params]` | Control remote browser |
| `config [set <key> <value>]` | View/update agent config |
| `echo`, `time`, `help` | Utilities |
| `grep`, `head`, `tail`, `wc` | Text processing (pipe-friendly) |

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

## Configuration

`data/config.yaml` — multi-provider, managed via `config` command:

```yaml
name: pi
providers:
  openrouter:
    base_url: https://openrouter.ai/api/v1
    api_key: <key>
  bailian:
    base_url: https://dashscope.aliyuncs.com/compatible-mode/v1
    api_key: <key>

llm_provider: openrouter
llm_model: anthropic/claude-3.5-haiku
embedding_provider: openrouter
embedding_model: openai/text-embedding-3-small

system_prompt: |
  你是 pi，一个智能助手。

clips:
  - name: sandbox
    url: http://localhost:9875
    token: <clip-token>
    commands: [bash, read, write, edit]

browser:
  endpoint: http://localhost:19824
```

## Directory Structure

```
agent-clip/
├── clip.yaml              # Pinix Clip metadata
├── Makefile               # build / build-local / dev / clean
│
├── commands/              # External interface (shell wrappers → bin/agent)
│   ├── send
│   ├── create-topic
│   ├── list-topics
│   ├── get-run
│   ├── cancel-run
│   └── config
│
├── seed/                  # Template for data/ (schema + default config)
│   ├── schema.sql
│   └── config.yaml
│
├── cmd/agent/main.go      # CLI entry point (cobra)
├── internal/              # Go packages
│   ├── browser.go         # bb-browser HTTP client
│   ├── chain.go           # Command chaining (&&, ;, |)
│   ├── clip.go            # Clip-to-Clip invocation
│   ├── config.go          # Multi-provider config + CLI
│   ├── context.go         # Context building (Run Window, XML)
│   ├── db.go              # SQLite operations
│   ├── embed.go           # Embedding API + cosine similarity
│   ├── llm.go             # LLM streaming + tool calls + thinking
│   ├── loop.go            # Agentic loop engine
│   ├── memory.go          # Summary, search, facts
│   ├── output.go          # CLI / JSONL dual output
│   ├── run.go             # Run lifecycle + atomic inject
│   └── tools.go           # Command registry + builtins
│
├── ui/                    # Frontend source (Vite + React + Tailwind v4 + shadcn/ui)
│   ├── src/
│   ├── vite.config.ts     # builds to ../web/
│   └── package.json
│
├── web/                   # Build output (Pinix ReadFile serves this, gitignored)
│
├── docs/                  # Design docs
│   ├── architecture.md
│   ├── context.md
│   ├── memory.md
│   ├── runs.md
│   ├── commands.md
│   └── clips.md
│
├── bin/                   # Compiled Go binary (gitignored)
└── data/                  # Runtime data (gitignored)
    ├── agent.db
    └── config.yaml
```

### Three-layer model

| Layer | What | Mutable |
|-------|------|---------|
| **Workspace** (this repo) | Source code, build tools | dev time |
| **Package** (`.clip` ZIP) | `clip.yaml` + `commands/` + `bin/` + `seed/` + `web/` | immutable |
| **Instance** (on Pinix Server) | Package extracted + `data/` from `seed/` | `data/` only |

`seed/` initializes `data/` on install; `clip upgrade` replaces everything except `data/`.
