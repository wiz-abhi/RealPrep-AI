# RealPrep AI 🚀 — v2.0

An advanced, AI-powered mock-interview platform with **real-time streaming voice**, **hands-free conversation**, and **live emotion detection**. Candidates practice realistic interviews with an AI interviewer that streams its responses as natural speech, runs their code for real, and adapts to how they're doing.

> **v2.0** is a major rebuild: the LLM and speech stack moved from Google Gemini to **Sarvam AI**, the conversation loop became fully streaming (SSE + sentence-pipelined TTS + in-browser VAD + barge-in), and the platform was hardened for production (auth on every route, server-authoritative timing, tests, CI, password reset).

---

## ✨ Features

### 🎙️ Real-time Conversational Interview
- **Streaming responses** — The AI's reply streams token-by-token (SSE) and is spoken as it's generated, sentence by sentence — no waiting for the full answer.
- **Hands-free mode (VAD)** — In-browser Voice Activity Detection (Silero) auto-detects when you start and stop talking. No push-to-talk needed.
- **Barge-in** — Interrupt the AI mid-sentence just by speaking; it stops and listens.
- **Conversational fillers** — Pre-cached persona acknowledgements ("Mm-hmm, let me think…") play instantly so the AI reacts the moment you finish.
- **Pause / Resume** — Freeze the interview (and its timer) any time; resume exactly where you left off.
- **Multiple personas** — Technical (Friday), Behavioral (Michael Torres), System Design (Alex Rivera) — each with a distinct voice.

### 🧠 Interview Intelligence
- **Interview state machine** — A resume-tailored plan (phases + question targets) keeps the interviewer on track instead of rambling; a live progress chip shows the current phase.
- **Real code execution** — Submitted code actually runs in a sandbox (Piston); the interviewer evaluates the *real* stdout/stderr, not a guess.
- **Running memory** — Long interviews are periodically summarized so the AI never forgets the early context.
- **Resume-personalized questions** — The full resume is inlined into the interviewer's context for specific, tailored questions.

### 😐 Emotional Intelligence (USP)
- **Real-time emotion detection** — Facial-expression analysis via Hume AI (client-side) throughout the interview.
- **Confidence & stress tracking** — Confidence %, nervousness %, stress-point count, and an improving/declining trend.
- **Emotion timeline** — Charted across the session in the report.

### 📊 Reports & Improvement
- **Comprehensive reports** — Overall score, skill radar (technical / communication / problem-solving), per-question analysis, and full transcript.
- **Personalized improvement plan** — AI coaching on skill gaps, communication, stress management, and prioritized action items (persisted, not regenerated each visit).
- **Printable / PDF export** — Share your report.

### 🔐 Account & Billing
- **Secure auth** — JWT + bcrypt, with **password reset** via email (SMTP; falls back to console links in dev).
- **Credit system** — 1 credit = 1 minute; ₹1 = 2 credits via Razorpay. Unused whole minutes are **refunded** on early exit.
- **Switchable speech provider** — Sarvam (default, server-proxied) or Azure.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 19 (Vite), TypeScript, TailwindCSS, Framer Motion, Recharts |
| **Backend** | Node.js, Express 5, Prisma ORM |
| **Database** | PostgreSQL (Neon) |
| **LLM** | **Sarvam AI** (`sarvam-30b` for turns, `sarvam-105b` for reports) |
| **Speech** | **Sarvam** Saaras (STT) + Bulbul (TTS), server-proxied · Azure optional |
| **Voice UX** | Silero VAD (`@ricky0123/vad-web`), SSE streaming, sentence-pipelined TTS |
| **Emotion** | Hume AI (client WebSocket) |
| **Code exec** | Piston API |
| **Payments** | Razorpay |
| **Auth / Validation** | JWT, bcrypt, Zod |
| **Quality** | Vitest, GitHub Actions CI |

---

## 📋 Prerequisites

- **Node.js** v20 or higher
- **PostgreSQL** database (local or cloud: Neon, Supabase, etc.)
- A **Sarvam AI** API key ([dashboard.sarvam.ai](https://dashboard.sarvam.ai))
- (Optional) Hume AI key for emotion detection, Razorpay keys for payments, SMTP for password-reset emails

---

## 🚀 Quick Start

### 1. Clone & install
```bash
git clone https://github.com/wiz-abhi/RealPrep-AI.git
cd RealPrep-AI

cd client && npm install
cd ../server && npm install
```

### 2. Configure environment
```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
# edit both .env files (see tables below)
```

### 3. Database setup
```bash
cd server
npx prisma generate
npx prisma db push
```

### 4. Run
```bash
# Terminal 1 — Server (http://localhost:3000)
cd server && npm run dev

# Terminal 2 — Client (http://localhost:5173)
cd client && npm run dev
```

### 5. Tests (optional)
```bash
cd server && npm test        # Vitest: timer/pause math, phase machine, payments
```

---

## ⚙️ Environment Variables

### Server (`server/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (Neon: add `?pgbouncer=true&connect_timeout=15`) |
| `JWT_SECRET` | ✅ | Secret for JWT signing (server refuses to start in prod without a real one) |
| `SARVAM_API_KEY` | ✅ | Sarvam AI key — powers LLM + STT/TTS |
| `SARVAM_CHAT_MODEL` | ❌ | Interview-turn model (default `sarvam-30b`) |
| `SARVAM_REPORT_MODEL` | ❌ | Report/plan model (default `sarvam-105b`; set to `sarvam-30b` on starter tier) |
| `SARVAM_MAX_TOKENS` | ❌ | Per-request cap (default 4000; starter tier max is 4096) |
| `PORT` | ❌ | Server port (default 3000) |
| `FRONTEND_URL` | ❌ | Frontend URL for CORS + reset links (production) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | ❌ | Password-reset email; if unset, reset links are logged to the server console |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | ❌ | Payments |

> **Note:** Hume keys are **not** needed server-side — emotion detection runs entirely in the client.

### Client (`client/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_DEFAULT_SPEECH_PROVIDER` | ❌ | `sarvam` (default, server-proxied) or `azure` |
| `VITE_HUME_API_KEY` | ❌ | Hume AI key for real-time emotion detection |
| `VITE_AZURE_SPEECH_KEY` / `VITE_AZURE_SPEECH_REGION` | ❌ | Only if using the Azure provider |
| `VITE_API_URL` | ❌ | Backend URL (production only) |

> With `sarvam` as the provider, **no client-side speech key is required** — the server proxies STT/TTS with its own `SARVAM_API_KEY`.

---

## 📂 Project Structure

```
RealPrep-AI/
├── .github/workflows/ci.yml      # Typecheck + tests on push/PR
├── client/                       # React frontend
│   └── src/
│       ├── components/           # UI (GlassCard, CodeEditor, AIInterviewerAvatar)
│       ├── context/              # AuthContext
│       ├── hooks/                # useSpeech, useSarvamSpeech (pipelined TTS),
│       │                         #   useVAD, useAzureSpeech, useHumeVision
│       └── pages/                # Interview, Report, PreJoin, Settings, Pricing, Reset/Forgot…
├── server/                       # Node/Express backend
│   ├── prisma/schema.prisma      # User, Resume, Session, Transcript, PasswordResetToken
│   └── src/
│       ├── controllers/          # interview, speech, auth, payment, resume, user
│       ├── middleware/           # auth, validate (Zod)
│       ├── routes/               # API routes (all interview routes authenticated)
│       ├── services/             # sarvam (LLM + streaming), executor (Piston),
│       │                         #   personas, mailer
│       ├── schemas.ts            # Zod request schemas
│       ├── utils/payment.ts      # Razorpay signature + credit math
│       └── __tests__/            # Vitest suite
└── IMPROVEMENT_PLAN.md           # Full 6-phase roadmap
```

---

## 🔑 API Endpoints (selected)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/register` · `/login` | POST | — | Account create / login |
| `/api/auth/forgot-password` · `/reset-password` | POST | — | Password reset flow |
| `/api/resume/upload` · `/list` | POST · GET | ✅ | Resume management |
| `/api/interview/start` | POST | ✅ | Start session (generates plan, deducts credits) |
| `/api/interview/chat-stream` | POST (SSE) | ✅ | **Streaming** interview turn |
| `/api/interview/chat` | POST | ✅ | Non-streaming turn |
| `/api/interview/pause` · `/resume` | POST | ✅ | Freeze / resume the clock |
| `/api/interview/code` | POST | ✅ | Run + evaluate submitted code |
| `/api/interview/end` · `/end-quick` | POST | ✅ | End session (+ report, + refund) |
| `/api/interview/report/:id` | GET | ✅ | Session report |
| `/api/interview/improvement-plan` | POST | ✅ | Coaching plan |
| `/api/speech/stt` · `/speech/tts` | POST | ✅ | Server-proxied Sarvam speech |
| `/api/payment/create-order` · `/verify` | POST | ✅ | Razorpay (server-verified credits) |

---

## 🌐 Deployment

**Frontend (Vercel):** root `client`, set `VITE_API_URL` to your backend URL.
**Backend (Render):** root `server`, build `npm install && npm run build`, start `npm run start`. Set all server env vars, `NODE_ENV=production`, and `FRONTEND_URL`.

> In production, set a strong `JWT_SECRET` — the server intentionally refuses to boot with the dev fallback.

---

## 🔒 Security

- Every interview endpoint requires auth **and** verifies session ownership.
- Server-authoritative interview timer (client cannot extend its own time); credits deducted in a transaction and refunded on early exit.
- Rate limiting on auth, chat, and speech routes.
- Zod validation on request bodies; prompt-injection hardening on user focus text.
- Razorpay payments verified server-side from the order amount (not client-supplied).
- Passwords hashed (bcrypt); reset tokens stored as SHA-256 hashes with 30-min single-use expiry.

---

## 🗺️ Roadmap

See [`IMPROVEMENT_PLAN.md`](./IMPROVEMENT_PLAN.md). Phases 0–5 are implemented in v2.0. Next up: true low-latency streaming voice (Sarvam Bulbul WebSocket → progressive playback, and a full duplex STT-WS → LLM → TTS pipeline).

---

## 📄 License

MIT.

## 🙏 Acknowledgments

- [Sarvam AI](https://www.sarvam.ai/) — LLM + Indian-language speech
- [Hume AI](https://hume.ai/) — emotion detection
- [Piston](https://github.com/engineering-online/piston) — code execution
- [Silero VAD](https://github.com/ricky0123/vad) · [Prisma](https://prisma.io/) · [Razorpay](https://razorpay.com/)
