# RealPrep AI — Improvement Plan (v2.1+)

> Phases 0–5 (Sarvam migration, security, streaming voice, interview intelligence, UX, SaaS ops)
> plus streaming STT/TTS and a full four-agent codebase review are **done**. This file is the
> forward roadmap: what the review flagged that is not yet fixed, ranked by value. Items already
> applied are in the git history (commit `5322fbd` and earlier), not repeated here.

---

## P0 — Correctness / money / cost (do first)

These are the remaining "real bug" findings the review surfaced that were **not** safe to fix in a
sweep and need a focused change + test.

1. **Payment idempotency is racy** (`server/src/controllers/payment.controller.ts`).
   Two concurrent `/verify` calls with the same signature can both credit; if Razorpay's
   `orders.edit` marker write fails, a replay credits again. **Fix:** add a `Payment` table with
   `razorpayPaymentId @unique`; credit inside a transaction that `create`s the row (unique
   violation ⇒ already credited). Also gives you a payment audit trail (refunds are currently
   unlogged).

2. **Feedback JSON read-modify-write clobbering** (`interview.controller.ts`).
   Many writers (chat emotion+progress, `updateElapsedTime` every 30s, pause/resume, rolling
   summary, improvement plan) each do read→spread→write on the `Session.feedback` JSON column.
   A pause landing during an in-flight chat update can silently un-freeze the "server-authoritative"
   clock. **Fix (also solves the class):** promote hot fields to real `Session` columns —
   `startedAt`, `durationMinutes`, `elapsedSeconds`, `pausedAt`, `pausedMs`, `questionsAsked` —
   use atomic `increment` for progress; keep `feedback` for the final report only.

3. **Realtime relay has no usage metering** (`server/src/services/ttsStream.ts`).
   Authenticated sockets get unmetered Sarvam STT/TTS (Socket.io bypasses the Express
   `speechLimiter`, and there's no credit association). **Fix:** per-socket message/byte budget +
   tie streaming to the active session's remaining credits.

## P1 — Schema / data hygiene

4. **Drop the orphaned RAG remnants.** `ReferenceDoc` model is fully unused; `ResumeChunk.embedding`
   (`vector(3072)`) is never written/read (chunks are only read for the legacy content rebuild).
   **Plan:** one-off migration that (a) backfills `Resume.content` from chunks for every legacy
   resume, then (b) drops `ReferenceDoc`, `ResumeChunk.embedding`, and the `vector` Postgres
   extension. Removes the last reason the DB needs pgvector.

5. **Reference-doc upload is dead UX** (`client/src/pages/InterviewSetupPage.tsx`).
   The file picker still POSTs to a 501 stub (RAG removed) and silently proceeds. Either remove the
   upload UI until a local-embeddings path lands, or surface "reference docs coming soon". Decide
   with #4.

6. **Decide the `/chat` fallback story.** The non-streaming `POST /api/interview/chat` handler
   (~100 lines duplicating `chatStream`) has no client callers. Either delete it, or make the client
   fall back to it when the SSE stream fails mid-flight (right now a stream failure just drops the
   turn). Recommend: make it the fallback (more robust) rather than delete.

## P2 — Performance

7. **Chat turn does 5 sequential DB round-trips** (7+ on summary turns). The user-insert and
   history-fetch are serialized only so the fetch can exclude the just-inserted row — fetch 29 and
   run the insert concurrently instead. Meaningful on Neon where each round-trip is costly.

8. **Streaming LLM call has no retry.** `streamSarvamChat` lacks the 429/5xx retry that
   `callSarvamChat` has — one transient 429 kills the whole turn. Add a single pre-stream retry on
   the initial response status.

9. **Per-turn AudioContext + worklet compile in STT capture** (`sarvamSttStream.ts`). A fresh
   `AudioContext` + `addModule` every turn adds startup latency exactly when the user starts
   talking. Keep one context/worklet alive for the interview; connect/disconnect the source per turn.

10. **Binary Socket.io frames for PCM.** STT sends base64-in-JSON built with a per-batch
    `String.fromCharCode` loop 10×/s; TTS `atob`-loops on the client. Socket.io supports
    `ArrayBuffer` natively — moves encoding off the audio hot path and cuts wire size ~33%.

11. **Per-token full-page re-render.** `updateAiMessage` clones the whole messages array on every
    SSE delta, re-rendering the 1,200-line InterviewPage (Webcam, HUD, avatar) per token. Wrap
    `AIInterviewerAvatar`, the message list, and `CodeEditor` in `React.memo` and/or throttle delta
    flushes to ~50ms. Avatar also `setAudioLevel` at 60fps — write `transform` via refs instead.

12. **Route-level lazy loading.** Bundle is now split by vendor (done), but pages are still eagerly
    imported in `App.tsx`. `React.lazy` for `InterviewPage`/`ReportPage`/`AdminPage` behind one
    `<Suspense>` would drop the charts + speech SDK + code-editor off the landing/login path
    entirely.

## P3 — Robustness / DX

13. **Single shared mic stream.** VAD, streaming STT, and the REST recorder each call
    `getUserMedia` independently (three device paths; concurrent captures can make the browser AEC
    fight). Acquire once per interview and fan out.

14. **Turn ids on the TTS relay.** Have the server echo a client turn-id on `tts:audio`/`tts:final`
    so cancellation is airtight structurally (currently guarded by flags; a late buffered chunk can
    still blip after barge-in).

15. **Structured logging + request ids** (`pino`). Everything is `console.*` with no correlation —
    with SSE + socket relays + fire-and-forget updates, debugging a failed turn is guesswork.

16. **Clean up the ~50 ESLint findings** and re-enable `npm run lint` in CI (currently build-only).
    Mostly `react-hooks/exhaustive-deps`, `set-state-in-effect`, ref-in-render. Server has no lint
    config at all — add one.

17. **Avatar waveform is mostly fake.** Streaming TTS plays via Web Audio, so the avatar's
    `HTMLAudioElement` analyser rarely connects and bars are simulated. Either expose an
    `AnalyserNode` from `sarvamTtsStream` (real bars) or drop the `audioRef` chain and own the
    simulation.

18. **Server-authoritative elapsed time.** The client PUT/beacon plumbing for elapsed seconds is
    fragile (the beacon path never authenticated — now removed). The server already computes elapsed
    from `startedAt` minus paused time; lean on that and shed the client writes.

## P4 — Product features (from earlier phases, still worth doing)

19. **Adaptive difficulty.** The phase machine already tracks per-phase progress; a cheap per-answer
    1-line LLM grade appended to `progress` would let `buildPhaseContext` say "candidate is cruising
    — escalate / struggling — ease off." The rolling-summary plumbing is a template.

20. **Accessibility pass.** End/Pause modals lack `role="dialog"`, focus trap, Escape handling
    (Escape is globally bound to skip-voice); the chat region has no `aria-live`, so screen readers
    never hear AI replies.

21. **Interview replay.** Audio recording + emotion-timeline scrubber on the report.

22. **Multilingual / Hinglish interviews.** Sarvam is natively strong at code-mixed Indic languages
    — a real differentiator, nearly free now that the whole stack is on Sarvam.

---

### Suggested sequencing
- **v2.1 (stability):** P0 (payment ledger, feedback columns, relay metering) + P1 (drop RAG
  remnants, fix reference UX). This is the "safe to run for real users" milestone.
- **v2.2 (polish):** P2 perf (memoization, lazy routes, DB round-trips) + P3 (shared mic, logging,
  lint).
- **v2.3 (product):** adaptive difficulty, a11y, multilingual.
