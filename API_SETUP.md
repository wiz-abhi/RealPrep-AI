# API Configuration Guide

RealPrep AI (v2.0) uses **Sarvam AI** for the LLM and speech, with **Hume AI**
for emotion detection and optional **Azure Speech** as an alternative voice
provider. Payments (optional) use **Razorpay**, and password-reset emails use
any SMTP server.

---

## 1. Sarvam AI  (required)

**Purpose**: LLM (interview turns, reports, plans) **and** speech (Saaras STT +
Bulbul TTS, proxied through the server).

**Setup**
1. Get a key from the [Sarvam dashboard](https://dashboard.sarvam.ai).
2. Add to `server/.env`:
   ```
   SARVAM_API_KEY=sk_your_key_here
   # optional overrides:
   SARVAM_CHAT_MODEL=sarvam-30b
   SARVAM_REPORT_MODEL=sarvam-30b   # use sarvam-105b if your tier includes it
   SARVAM_MAX_TOKENS=4000           # starter tier caps at 4096
   ```

> The Sarvam key stays **server-side only** — the client never sees it. With the
> default `sarvam` speech provider, no client-side speech key is needed.

---

## 2. Hume AI  (optional — emotion detection)

**Purpose**: Real-time facial-expression / emotion analysis during interviews.
Runs entirely in the client via a WebSocket.

**Setup**
1. Get a key from [Hume AI](https://platform.hume.ai/settings/keys).
2. Add to `client/.env`:
   ```
   VITE_HUME_API_KEY=your_hume_api_key_here
   ```

Without it, the interview works normally — just no emotion bars/report section.

---

## 3. Azure Speech  (optional — alternative voice provider)

Only needed if you switch the speech provider to `azure` (Settings → Speech
Provider, or `VITE_DEFAULT_SPEECH_PROVIDER=azure`). Otherwise Sarvam handles STT/TTS.

```
# client/.env
VITE_AZURE_SPEECH_KEY=your_azure_key
VITE_AZURE_SPEECH_REGION=eastus
```

---

## 4. Razorpay  (optional — payments)

Only needed if you want the credit-purchase flow.

```
# server/.env
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
```

---

## 5. SMTP  (optional — password-reset emails)

If unset, reset links are printed to the **server console** so the flow is still
testable in development.

```
# server/.env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_user
SMTP_PASS=your_pass
SMTP_FROM="RealPrep AI <no-reply@realprep.ai>"
```

---

## Minimal `.env` to get running

**`server/.env`**
```env
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
JWT_SECRET="a-long-random-string"
SARVAM_API_KEY="sk_your_key_here"
PORT=3000
```

**`client/.env`**
```env
VITE_DEFAULT_SPEECH_PROVIDER="sarvam"
VITE_HUME_API_KEY=""   # optional, for emotion detection
```

That's enough for a full voice interview (emotion detection off until you add a
Hume key).

---

## Troubleshooting

- **`max_tokens exceeds ... 4096`** — lower `SARVAM_MAX_TOKENS` (starter tier caps at 4096).
- **Reports fail / `Report model failed`** — your tier may not include `sarvam-105b`; set `SARVAM_REPORT_MODEL=sarvam-30b`.
- **Hume WebSocket fails** — check `VITE_HUME_API_KEY`; if the key is invalid the interview still runs without emotions.
- **VAD / streaming voice won't load** — clear a stale service worker (DevTools → Application → Service Workers) and hard-refresh.
- **Neon `P1001` / can't reach DB** — add `?pgbouncer=true&connect_timeout=15` to `DATABASE_URL` (serverless cold starts).
