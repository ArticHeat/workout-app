# Workout App: Agent Harness Plan

This plan maps the harness diagram (Harness, Loop, Memory, LLM Ops) onto a
Vite + React app hosted on Cloudflare, with a LangGraph.js agent on the backend.

## 1. Stack decisions

| Concern | Choice | Why |
|---|---|---|
| Frontend | Vite + React + TypeScript, served as Worker static assets | Already chosen; one deploy for UI and API |
| Backend / harness | Cloudflare Worker running **LangGraph.js** (TypeScript) | Same language as the frontend, same host, no second server. LangGraph gives an explicit state graph that matches the diagram |
| Agent model | `claude-sonnet-5-5` (via `@langchain/anthropic`) | Strong tool use for the Q&A loop |
| Summarizer model | `claude-haiku-5-5` | The "cheaper model" box in the diagram |
| Structured data / episodic store | Cloudflare **D1** (SQLite) | Workout logs, chat history, dated events: queried by recency with SQL |
| Vector store | Cloudflare **Vectorize** | Semantic facts and past-chat search (top-k) |
| Embeddings | Workers AI `@cf/baai/bge-base-en-v1.5` | Anthropic has no embeddings API; this stays on Cloudflare |
| Procedural memory | `skills/*.md` files bundled with the Worker | Versioned in git, reviewed in PRs |
| Background jobs | Cloudflare **Queues** (or a Cron Trigger) | Runs memory consolidation off the request path |
| Tracing / evals | **LangSmith** (natural fit with LangGraph) or **Langfuse** (open source, self-hostable) | The "Trace" and "Eval/Observe" boxes |
| Auth | Cloudflare Access to start (just you), then Clerk or Auth.js when there are other users | Every memory row needs a `user_id` |
| CI/CD | GitHub Actions: lint, typecheck, test, evals, then `wrangler deploy` | The "Gate" and "Release" boxes |

Why not Python LangGraph? It works, but it needs a second host (Workers support for
Python is still limited for this kind of dependency tree). Using TypeScript keeps the
whole thing on one Cloudflare deploy. If you later want Python, the graph design below
carries over almost one-to-one.

## 2. How the diagram maps to code

```
User Prompt ─┐
Chat History ├─► buildContext() ─► agent node ⇄ tools node ─► guardrails node ─► Reply
System Prompt┘        ▲                                                       │
        skills/*.md ──┤  (procedural)                                         ▼
  Vectorize top-k ────┤  (semantic)                             saveMessages() → D1
 D1 recent + vector ──┘  (episodic)                                           │
                                                          every N chats → Queue
                                                                              ▼
                                                         summarizer (Haiku) → facts
                                                                              ▼
                                                                   Vectorize + D1
```

### 2.1 The LangGraph graph (the orange "Loop" box)

```ts
// worker/agent/graph.ts (sketch)
const graph = new StateGraph(AgentState)
  .addNode("load_context", loadContext)   // working memory assembly
  .addNode("agent", callModel)            // Claude with tools bound
  .addNode("tools", new ToolNode(tools))  // agentic tools
  .addNode("guardrails", checkReply)      // end-loop guardrails
  .addNode("persist", saveMessages)       // "Save the messages"
  .addEdge(START, "load_context")
  .addEdge("load_context", "agent")
  .addConditionalEdges("agent", hasToolCalls, { yes: "tools", no: "guardrails" })
  .addEdge("tools", "agent")
  .addConditionalEdges("guardrails", passed, { ok: "persist", retry: "agent" })
  .addEdge("persist", END)
  .compile();
```

Add a max-iterations cap (e.g. 8 tool rounds) so the loop cannot run away.

### 2.2 Working memory (`load_context`)

Built fresh on every request (the "everything inside the box is ephemeral" part):

1. System prompt (`prompts/system.v1.md`; start from your existing Claude chat app's instructions).
2. Relevant skills: pick `skills/*.md` by intent (keyword/router) rather than loading all.
3. User profile + top-k semantic facts from Vectorize (e.g. "left knee pain on deep squats", "trains 4x/week", "goal: first pull-up").
4. Episodic: last 7–14 days of workouts from D1 (SQL, recency) + top-k similar past chat summaries (vector, relevance).
5. Current chat history (last N turns; older turns get summarized).
6. The user's message.

Keep a token budget per section so context does not grow unbounded.

### 2.3 Agentic tools (workout versions of "schedule meeting / CRM / payment")

| Tool | Does |
|---|---|
| `log_workout` | Write sets/reps/weight/RPE to D1 |
| `get_workout_history` | Query D1 by exercise / date range |
| `get_personal_records` | Best lifts, estimated 1RM |
| `search_exercises` | Exercise library lookup (muscles, equipment, alternatives) |
| `create_plan` / `update_plan` | Write a structured multi-week program to D1 |
| `schedule_session` | (Later) add to Google Calendar |
| `remember_fact` | Let the agent store an explicit fact ("I'm vegetarian") right away |

Define every tool input with **Zod** so bad tool calls fail loudly.

Important for a workout app: most of the "episodic memory" is **structured
training data**, not chat. Logging should also be possible through normal UI forms,
not only through chat. The agent reads the same tables.

### 2.4 Guardrails (the "End Loop Guardrails" edge)

- Safety: injury/pain/medical red flags → advise seeing a professional, never diagnose.
- Plausibility: reject plans with absurd volume or load jumps (e.g. > 10% weekly load increase).
- Shape: when the reply contains a plan, validate it against the plan schema so the UI can render it.
- On failure: send one corrective message back to the agent node, then fall back to a safe reply.

## 3. Memory stores (bottom of the diagram)

### D1 schema (first pass)

```sql
users(id, created_at, profile_json)
exercises(id, name, muscle_groups, equipment)
workouts(id, user_id, date, notes)
workout_sets(id, workout_id, exercise_id, set_no, reps, weight, rpe)
plans(id, user_id, created_at, version, plan_json, active)
chats(id, user_id, started_at, summarized INTEGER DEFAULT 0)
messages(id, chat_id, role, content, created_at)
facts(id, user_id, text, source_chat_id, created_at, superseded_by)  -- mirrors Vectorize
```

### Vectorize indexes

- `facts`: semantic memory (metadata: `user_id`, `fact_id`)
- `chat_summaries`: episodic memory for relevance search (metadata: `user_id`, `chat_id`, `date`)

Always filter queries by `user_id` metadata.

### Procedural memory

```
skills/
  program-design.md       # how to build splits, periodization rules
  progression.md          # progressive overload, deloads
  injury-modification.md  # swaps and red flags
  form-cues.md
  nutrition-basics.md
```

## 4. Consolidation (the "Only consolidate after N new chats" diamond)

1. After `persist`, count chats where `summarized = 0` for the user.
2. If count ≥ N (start with N = 3), enqueue `{ user_id }` on a Cloudflare Queue.
3. The queue consumer runs a small summarizer graph on Haiku:
   - Summarize each chat → embed → `chat_summaries` index.
   - Extract durable facts as JSON → dedupe against existing facts (vector similarity
     above a threshold means update or supersede, not insert) → `facts`.
   - Mark the chats `summarized = 1`.

## 5. LLM Ops (blue box)

| Diagram box | Implementation |
|---|---|
| Trace | LangSmith or Langfuse callback on every graph run; tag with `prompt_version`, `model`, `user_id` (hashed) |
| Eval | `evals/` dataset of ~30–50 realistic prompts (beginner plan, knee pain, log this workout, PR question) with rubrics; LLM-as-judge scoring |
| Observe | Token, latency, error dashboards in the tracing tool + Workers Analytics |
| Diagnose | Open low-scoring traces, see which node or tool failed |
| Gate | GitHub Action runs evals on every PR that touches `prompts/`, `skills/`, `worker/agent/`; fails if the average score drops below the threshold or any safety case fails |
| Release | Prompts and config are versioned files (`prompts/system.v2.md`, `agent.config.ts` with model, top-k, N); deploy with `wrangler deploy`; roll back with git revert |

Add a thumbs-up/down button in the UI and attach the feedback to the trace.
That gives you real-world eval cases for free.

## 6. Repository layout

```
/                 Vite React app (src/)
src/
  pages/          Chat, Log Workout, History, Plan
  components/
  lib/api.ts      calls /api/*
worker/
  index.ts        routes: /api/chat (streaming), /api/workouts, /api/plans
  agent/          graph.ts, nodes/, tools/, guardrails.ts
  memory/         context.ts, episodic.ts, semantic.ts, consolidate.ts
  db/             migrations/*.sql
prompts/          system.v1.md
skills/           *.md
evals/            dataset.jsonl, judge.ts, run.ts
wrangler.jsonc    D1, Vectorize, Queue, AI bindings, assets
.github/workflows/ci.yml
```

## 7. Phased build

| Phase | Deliverable | Done when |
|---|---|---|
| 0. Skeleton | Vite React + Worker in one repo, `wrangler deploy` from GitHub Actions to your Cloudflare domain | Hello-world page + `/api/health` live |
| 1. Data first | D1 schema, workout logging forms, history page (no AI yet) | You can log and view workouts |
| 2. Basic loop | LangGraph agent + tools (`log_workout`, `get_workout_history`), streaming chat UI, system prompt ported from your current Claude app | Chat can log and answer questions about your training |
| 3. Memory | Messages saved to D1, skills loader, Vectorize facts + `remember_fact` | Agent remembers your injuries and goals across chats |
| 4. Consolidation | Queue + Haiku summarizer | Facts appear automatically after N chats |
| 5. LLM Ops | Tracing, eval dataset, CI gate, thumbs feedback | PRs show eval scores; a bad prompt change fails CI |
| 6. Polish | Plans UI, auth for other users, calendar tool, PWA install | Usable on your phone like an app |

Phases 0–1 are deliberately AI-free: a solid data model makes everything after it easier.

## 8. Secrets and config

- `ANTHROPIC_API_KEY`, `LANGSMITH_API_KEY` (or Langfuse keys): `wrangler secret put`, never in the frontend.
- GitHub Actions: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` as repository secrets.
- The browser only ever talks to `/api/*`; all LLM calls happen in the Worker.

## 9. Open questions

1. Is this just for you first, or for other users from day one? (Affects auth in phase 0 vs. phase 6.)
2. Can you share the system prompt / instructions from your current Claude chat app? It becomes `prompts/system.v1.md` and the first skills files.
3. LangSmith (hosted, best LangGraph integration) or Langfuse (open source)?

## 10. Cost

Everything except the Claude API fits in free tiers at personal scale (limits as of Oct 2026; re-check before relying on them):

| Service | Free allowance | Enough? |
|---|---|---|
| Workers | 100k requests/day, **10 ms CPU per request** | Yes. Time spent waiting on Claude does not count as CPU time. Watch the 10 ms limit with LangGraph.js; if it is hit, Workers Paid is $5/month |
| D1 | 5 GB, 5M rows read/day, 100k rows written/day | Yes |
| Vectorize | 30M queried / 5M stored dimensions per month | Yes (5M stored ≈ 6,500 vectors at 768 dims) |
| Workers AI (embeddings) | 10k neurons/day | Yes |
| Queues | 10k operations/day | Yes |
| Langfuse Cloud Hobby | ~50k units/month (LangSmith free: ~5k traces/month) | Yes |
| GitHub Actions | Unlimited on public repos, 2,000 min/month private | Yes |
| **Claude API** | **No ongoing free tier: pay per token** | Main cost |

Ways to keep Claude cost low: use Haiku for most turns and route only plan-building
to Sonnet; enable prompt caching on the system prompt and skills; trim context with
per-section token budgets; run CI evals only when `prompts/`, `skills/` or `worker/agent/`
change; set a monthly spend limit in the Anthropic Console.

### Free LLM option: Gemini

Keep the model provider swappable: `agent.config.ts` maps each role (`agent`,
`summarizer`, `judge`) to a provider and model, and LangChain's chat model interface
(`@langchain/anthropic`, `@langchain/google-genai`) means no graph code changes.

- Development and testing can run on Gemini's free tier (Flash models).
- Free-tier caveats: daily request caps are low and have been cut before; one agent turn
  costs several LLM calls (tool rounds, guardrail retry); and free-tier prompts may be used
  by Google to improve its products, which matters for injury and health details.
- On a 429 (quota hit), fall back to the next provider in the config.
