# RealPrep AI - Client

AI-powered interview preparation platform built with React, TypeScript, and Vite.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm or yarn

### Installation

```bash
cd client
npm install
```

### Running the App

| Command | Description |
|---------|-------------|
| `npm run dev` | Run the web app at http://localhost:5173 |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |

---

## ⚙️ Environment Variables

Create a `.env` file in the `client` directory:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_DEFAULT_SPEECH_PROVIDER` | ❌ | `sarvam` (default, server-proxied) or `azure` |
| `VITE_HUME_API_KEY` | ❌ | Hume AI key for real-time emotion detection |
| `VITE_AZURE_SPEECH_KEY` / `VITE_AZURE_SPEECH_REGION` | ❌ | Only if using the Azure provider |
| `VITE_API_URL` | ❌ | Backend API URL (production only) |

> With the default `sarvam` provider, **no client-side speech key is needed** — the server proxies STT/TTS with its own key.

> ⚠️ **Security Note**: All `VITE_*` variables are embedded in the client bundle and visible to users. Never put server secrets here.

---

## 📁 Project Structure

```
client/
├── public/            # Static assets (favicon, etc.)
├── src/
│   ├── components/    # UI components
│   ├── context/       # AuthContext
│   ├── hooks/         # useSpeech, useSarvamSpeech, useVAD, useHumeVision, …
│   └── pages/         # Interview, Report, Settings, … pages
├── .env.example       # Example environment file
└── package.json
```

---

## 🔧 Troubleshooting

**Environment variables not working**
- Ensure variable names start with `VITE_`
- Restart the dev server after changing `.env` (values are baked in at build time)

**Streaming voice / VAD not loading**
- The app auto-unregisters stale service workers on load; if VAD still fails, clear the site's service worker (DevTools → Application → Service Workers) and hard-refresh.
