# RealPrep AI — Improvement Plan

> Full-codebase audit done on 2026-07-03. Updated to replace Gemini with **Sarvam AI** (LLM + optional speech), per decision on 2026-07-03. Organized by priority. Each item names the files involved.

---

## Current State (honest assessment)

**What's genuinely strong:**
- Solid core loop: resume → context-aware persona-driven interview → emotion-aware report. Few competitors combine Hume emotion tracking + resume-personalized questions.
- Three well-written personas (Friday / Michael Torres / Alex Rivera) with time-management and emotion-adaptation directives in `server/src/services/gemini.ts`.
- Dual speech provider (ElevenLabs + Azure), credit system with Razorpay, admin panel, temporary resumes — real product thinking.

**What holds it back:**
1. **The conversation feels like a walkie-talkie, not an interview.** Push-to-talk spacebar, no barge-in, no streaming — every turn is: hold space → release → wait 3–6s of silence → AI speaks a full monologue.
2. **Several interview endpoints have no auth at all** — a dealbreaker for anything presented as SaaS.
3. **The AI can't be trusted with time or structure** — timer is client-controlled, there's no interview state machine, no adaptive difficulty.
4. **Code questions are "submit and get vibes"** — code is never executed.
5. **Zero tests, no email flows, console.log logging** — MVP-stage operations.

---

## Phase 0 — Sarvam AI Migration (replace Gemini entirely, ~2–4 days)

Gemini is currently used in **six places**: interview chat turns, initial greeting, skill extraction, code evaluation, report generation / improvement plans, and **RAG embeddings**. Sarvam replaces the first five directly; embeddings need a design change (0.3).

> 🔑 `SARVAM_API_KEY` goes in `server/.env` only — never in client code or git. (The key was pasted in chat once; **rotate it in the Sarvam dashboard** before shipping.)

### 0.1 New LLM service: `server/src/services/sarvam.ts`
- Sarvam's chat API is **OpenAI-compatible** (`https://api.sarvam.ai/v1/chat/completions`) and supports **SSE streaming** (`stream: true`) — this actually sets up Phase 2 streaming better than the current Gemini SDK code.
- Implement the same interface `GeminiService` exposes today so controllers swap cleanly: `generateInterviewResponse(systemInstruction, history, input)`, `generateInitialGreeting()`, `generateText()`. History maps 1:1 (`user`/`model` → `user`/`assistant`; `systemInstruction` → a `system` message).
- **Model choice:** `sarvam-m` is now legacy — use **Sarvam-30B for live interview turns** (latency matters) and **Sarvam-105B for report generation + improvement plans** (quality matters, called once per session). Make both configurable: `SARVAM_CHAT_MODEL`, `SARVAM_REPORT_MODEL`.
- Reports/plans currently rely on prompt-based JSON with fallback parsing (`interview.controller.ts` already has this) — keep that pattern; test JSON reliability on Sarvam-105B early, tighten the "respond with ONLY valid JSON" framing if needed.
- Port the existing retry/backoff logic (429/503) from `gemini.ts`.
- **Remove the `x-user-gemini-key` header path entirely** (`interview.controller.ts` lines ~361, ~489) — it was a security concern anyway; with Sarvam the key is server-managed only.
- Delete `@google/generative-ai` from `server/package.json` once everything is switched; drop `GEMINI_API_KEY` from `.env.example`.

### 0.2 Touch points to switch
| Call site | File |
|---|---|
| Interview chat turns | `server/src/controllers/interview.controller.ts` `chat()` |
| Initial greeting | `startSession()` |
| Skill extraction | `startSession()` |
| Code evaluation | `evaluateCode()` |
| Report generation | `endSession()` |
| Improvement plan | `generateImprovementPlan()` |
| Personas object | move `INTERVIEWER_PERSONAS` out of `gemini.ts` into its own `server/src/services/personas.ts` (it's prompt content, not Gemini-specific) |

### 0.3 Replace RAG embeddings (Sarvam has no embeddings API)
Recommendation: **drop vector RAG for resumes — inline the full resume text instead.** A resume is 1–2 pages (~1–2k tokens); chunking it into 500-word pieces and retrieving 5 of them was over-engineering — full text in the system prompt gives the interviewer *more* context, is simpler, and removes the pgvector + embedding dependency in one move. This also supersedes the 3072-vs-768 vector dimension bug found in the audit.
- Store extracted resume text in `Resume.content` (currently saved as an empty string — bug anyway) in `resume.controller.ts` `uploadResume()`.
- `startSession()`: replace `RAGService.retrieveContext()` with `resume.content` (cap at ~6k chars for safety).
- `ReferenceDoc` (JDs, sample papers): same treatment — inline, truncated to a budget. If you later need real retrieval over large doc sets, use a **local embedding model** (`@xenova/transformers`, e.g. `all-MiniLM-L6-v2`, 384-dim, free, runs in Node) and change the pgvector column to `vector(384)`.
- Clean up: `ResumeChunk` model, `rag.ts` chunk/ingest paths (keep the file if going the local-embeddings route for ReferenceDoc later).

### 0.4 Sarvam speech as a third switchable provider
The client already has a provider abstraction (`useSpeech.ts` wraps `useElevenLabs` / `useAzureSpeech`) — add `useSarvamSpeech.ts` as a third implementation, selected by `localStorage.speech_provider` or `VITE_DEFAULT_SPEECH_PROVIDER=sarvam`.

**Route it through the server** (new `server/src/routes/speech.routes.ts`), unlike ElevenLabs/Azure which call out from the browser — this keeps `SARVAM_API_KEY` off the client:
- `POST /api/speech/stt` → Sarvam STT REST (Saaras v3 / Saarika, `mode: transcribe`). **Limit: 30s audio per REST request** — record with `MediaRecorder` timeslices and send ≤25s segments, concatenating transcripts (answers routinely exceed 30s). The real fix is Sarvam's **streaming WebSocket STT** (WAV/PCM) — adopt it in Phase 2.2 where streaming STT is planned anyway.
- `POST /api/speech/tts` → Bulbul v3 (up to 2500 chars/request; also has HTTP-stream and WebSocket streaming modes — use streaming in Phase 2.1). 30+ voices with pace/pitch control → assign a **distinct voice per persona** (fixes the everyone-sounds-like-Rachel problem, see 2.5) at no extra cost.
- English support: use `en-IN` language code; Bulbul/Saaras handle English + code-mixed Hinglish well — actually a differentiator for Indian candidates who mix languages mid-answer.

### 0.5 Acceptance check for the migration
- Full interview end-to-end (start → 5+ turns → code submit → end → report → improvement plan) with `GEMINI_API_KEY` removed from the environment.
- Report JSON parses on 5 consecutive runs.
- Speech provider toggle: elevenlabs / azure / sarvam each complete a voice turn.

---

## Phase 1 — Security & Correctness Hotfixes (~1–2 days)

Quick, high-severity, mostly mechanical. Can be done before or in parallel with Phase 0.

| # | Fix | Files |
|---|-----|-------|
| 1.1 | Add `authenticateToken` to `/chat`, `/code`, `/end`, `/end-quick`, `/improvement-plan`, `/report/:id`, `/token` | `server/src/routes/interview.routes.ts` |
| 1.2 | Add **session ownership check**: every handler that takes `sessionId` must verify `session.userId === req.userId` | `server/src/controllers/interview.controller.ts` |
| 1.3 | Require auth on resume upload + reference upload; attach `userId` server-side | `server/src/routes/resume.routes.ts`, `reference.routes.ts` |
| 1.4 | Fail hard at boot if `JWT_SECRET` is unset in production (no `'dev_secret_do_not_use_in_prod'` fallback) | `server/src/middleware/auth.middleware.ts` |
| 1.5 | Add rate limiting (`express-rate-limit`): strict on `/auth/login`, `/auth/register`, `/interview/chat`, `/speech/*` | `server/index.ts` |
| 1.6 | ~~Fix pgvector dimension mismatch~~ → superseded by 0.3 (RAG removal) | — |
| 1.7 | Wrap credit deduction + session creation in a **Prisma transaction** (currently a failure mid-way eats credits) | `interview.controller.ts` `startSession()` |
| 1.8 | Sanitize `instructionPrompt` against prompt injection: length-cap it, wrap it in clearly delimited "untrusted user preference" framing rather than pasting raw into the system prompt | `interview.controller.ts` `buildSystemInstruction()` |
| 1.9 | **Server-authoritative timer**: compute `remainingSeconds` on the server from `startedAt + durationMinutes` instead of trusting the client body (client currently controls when the interview "ends") | `interview.controller.ts` `chat()` |
| 1.10 | Refund unused credits on early end (`end`/`end-quick`): refund `floor(remainingMinutes)` | `interview.controller.ts` |

---

## Phase 2 — Conversation Flow Overhaul (biggest realism win, ~1–2 weeks)

Goal: turn "walkie-talkie" into a natural conversation. This is the single highest-impact area for your demo/pitch.

### 2.1 Stream everything end-to-end
Right now: full LLM response → full JSON → then TTS starts. Perceived latency 3–6s per turn.

- **Server**: Sarvam chat completions with `stream: true` (SSE) — pipe the SSE stream through `/api/interview/chat` (or reuse the already-installed but unused Socket.io in `server/index.ts`).
- **Client**: as sentences arrive, feed them to TTS **sentence-by-sentence**. With Sarvam TTS use the streaming WebSocket/HTTP-stream mode; with ElevenLabs the existing streaming endpoint in `useElevenLabs.ts` — queue sentence chunks instead of one big block.
- Result: AI starts speaking ~1s after the user finishes, like a real person.

### 2.2 Hands-free voice with VAD (kill the spacebar)
- Add browser VAD via `@ricky0123/vad-web` (Silero VAD, runs as ONNX in-browser, no API cost). Auto-detect speech start/stop; auto-send after ~1.2s of silence.
- Keep push-to-talk as a fallback toggle ("Hands-free / Push-to-talk") for noisy environments.
- Streaming STT for live captions: **Sarvam streaming WebSocket STT** (proxied via server) or Azure continuous recognition (already has interim results in `useAzureSpeech.ts`) — surface interim transcripts as **live captions** under the mic so users see their words appear as they speak.

### 2.3 Barge-in (interruptibility)
- When VAD detects user speech while TTS is playing: pause/duck the audio, abort the remaining TTS stream, and append a marker to history (`[candidate interrupted]`) so the model reacts naturally ("Oh, go ahead—").
- Implementation point: the global audio element + `isPlayingLock` in `useElevenLabs.ts` (and equivalents in the Azure/Sarvam hooks) — expose a `stopPlayback()` that the VAD callback can call.

### 2.4 Mask latency with conversational fillers
- Pre-generate 8–10 short audio clips per persona ("Mm-hmm.", "Interesting…", "Okay, let me think about that.") with that persona's Bulbul voice, and play one instantly while the LLM streams. This alone makes it feel dramatically more human.

### 2.5 Per-persona voices
- All three interviewers currently speak with the same hardcoded ElevenLabs voice (`21m00Tcm4TlvDq8ikWAM` = Rachel) — so "Michael Torres" and "Alex Rivera" have a female voice. Map a distinct voice per persona per provider: Bulbul v3 speaker IDs (Sarvam), voice IDs (ElevenLabs), neural voices (Azure) in a config next to `INTERVIEWER_PERSONAS`, driven by `interviewType`.

### 2.6 Pause / resume
- Add `paused` status + `pausedAt` accounting to `Session`; pause button freezes timer (server-side), mutes mic, greys the room. Also enables crash recovery: on reload of an `active` session, resume where you left off (transcript restore already exists in `InterviewPage.tsx`).

---

## Phase 3 — Interview Intelligence (~1 week)

Make the interviewer *smart about the interview*, not just about answers.

### 3.1 Server-side interview state machine
- At `startSession()`, have the LLM generate a structured **interview plan** (JSON: phases, planned question topics, target counts) and store it in `session.feedback.plan`.
- Each `chat()` call includes current phase + coverage ("You are in CODING phase, 2 of 3 topics covered, 12 min left") in the system context. This stops the interviewer from rambling, repeating follow-ups, or never reaching the coding phase in short interviews.

### 3.2 Adaptive difficulty
- After each candidate answer, run a cheap side-evaluation (Sarvam-30B, tiny prompt) scoring the answer 1–5; keep a rolling skill estimate in session state and tell the interviewer "candidate is performing above/below expectations — adjust difficulty." The personas already have emotion-adaptation language; this adds competence-adaptation.

### 3.3 Real code execution
- Code is currently reviewed by the LLM but never run. Integrate **Judge0** (free/self-hostable) or **Piston** API: run submitted code against 2–3 test cases the interviewer generated with the problem. Feed pass/fail results into the evaluation prompt.
- Files: `server/src/controllers/interview.controller.ts` `evaluateCode()`, new `server/src/services/executor.ts`, client `CodeEditor.tsx` (show stdout/test results panel).

### 3.4 Question-of-N progress + repeat button
- Show "Phase: Technical · Question 4" chip from the state machine; add a "🔁 Repeat question" button that replays the last AI audio from cache (no LLM/TTS call needed).

### 3.5 Richer context memory
- `chat()` truncates to last 30 messages — long interviews forget the start. Add a running summary: every ~10 turns, compress older history into a summary block stored in session, prepended to context.

---

## Phase 4 — Visual & UX Polish (~1 week, parallelizable with Phase 3)

### 4.1 Interview room redesign (`InterviewPage.tsx`, 893 lines — split it up)
- Extract components: `InterviewTimer`, `ChatPanel`, `ControlBar`, `EmotionMeter`, `VideoTile`. Easier to maintain + enables mobile layout.
- **Mobile layout**: single-column stack (AI avatar → user cam thumbnail → captions → controls). Currently broken under 768px.
- Live captions strip (from 2.2) under the avatar, like Google Meet.
- Subtle "recording" ring on the user tile while VAD detects speech.
- Replace the 5 stacked emotion bars with one compact "composure" indicator (expandable on click) — current version is cluttered and distracting mid-interview.

### 4.2 Avatar upgrade
- `AIInterviewerAvatar.tsx` waveform is decent; add per-persona identity: distinct color accent, initials/photo-style portrait, and idle micro-animations (blink/breathe via Framer Motion — already installed). Optionally a Lottie/Rive character with mouth-open-while-speaking state for a big demo-wow at low cost.

### 4.3 Report page (`ReportPage.tsx`)
- Add score-over-time line across past sessions (data already in `/api/user/stats` + history).
- Emotion timeline chart (emotionHistory has timestamps — plot confidence/anxiety across the interview, marking stress points).
- **PDF export** of the report (react-to-print or server-side) — users will share this; it's free marketing.
- Persist the improvement plan to the session (currently regenerated on every click and never stored).

### 4.4 Pre-join polish (`PreJoinPage.tsx`)
- Replace the fake `setTimeout` checks with real ones: actual mic level meter (user speaks, sees the bar move), speaker test button, camera preview (exists). Add a short "how it works" card: hands-free mode, repeat button, pause.

### 4.5 Onboarding + empty states
- First-interview coach marks (3-step overlay on the interview room). Skeleton loaders instead of spinners on dashboard/history/report. Proper empty-state illustrations.

### 4.6 Accessibility quick pass
- `aria-label` on mic/cam/end buttons, visible keyboard hint on first load, bump muted text from 40% opacity to pass WCAG AA.

---

## Phase 5 — SaaS Operations (~1 week)

| # | Item | Notes |
|---|------|-------|
| 5.1 | Email verification + password reset | Resend or Nodemailer + SMTP; tokens table in Prisma |
| 5.2 | Align pricing page with reality | `PricingPage.tsx` shows Free/Pro/Enterprise subscriptions that don't exist; either build Razorpay subscriptions or rewrite the page around credit packs (honest > aspirational for demos) |
| 5.3 | Structured logging + error tracking | pino + Sentry (server & client); replace console.log |
| 5.4 | Input validation | Zod schemas on every endpoint body (zod already a transitive dep) |
| 5.5 | Tests for the money paths | Vitest + supertest: auth, credit deduction/refund, session ownership, payment verify signature |
| 5.6 | CI | GitHub Actions: typecheck + test + prisma validate on PR |
| 5.7 | Analytics dashboard | Sessions/week, completion rate, avg score trend — data is already in DB |
| 5.8 | Legal/trust pages | Privacy policy, ToS, data-deletion (deleteAccount exists — verify it cascades to sessions/resumes/chunks) |

---

## Nice-to-have backlog (post-roadmap ideas)

- **Full voice-agent pipeline on Sarvam**: streaming STT WebSocket → streaming chat → streaming Bulbul TTS in one server-orchestrated loop (Sarvam's stack is built for this; removes most client-side audio complexity).
- **Multilingual interviews**: Sarvam is natively strong in 11+ Indic languages + code-mixed Hinglish — "interview me in Hindi/Hinglish" is a real differentiator for the Indian market and nearly free to add now.
- Prosody analysis: words-per-minute, filler-word count ("um", "like") from transcripts — cheap to compute, very valuable in reports.
- Job-description mode: paste a JD → interview tailored to it (ReferenceDoc infra already exists, needs UI).
- Interview replay: audio recording + emotion timeline scrubber.
- Leaderboard / percentile ("You scored better than 72% of candidates on System Design").

---

## Suggested order of execution

```
Week 1:    Phase 0 (Sarvam migration) + Phase 1 (security hotfixes) → deploy
Weeks 2–3: Phase 2 (streaming, VAD, barge-in, voices) → this is your demo moment
Week 4:    Phase 3 (state machine, adaptive difficulty, code execution)
Week 5:    Phase 4 (visual polish, mobile, report upgrades)
Week 6:    Phase 5 (email, tests, CI, analytics)
```
