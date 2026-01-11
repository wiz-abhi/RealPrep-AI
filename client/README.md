# RealPrep AI - Client

AI-powered interview preparation platform built with React, TypeScript, and Vite.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
cd client
npm install
```

### Running the App

| Command | Description |
|---------|-------------|
| `npm run dev` | Run as **web app** at http://localhost:5173 |
| `npm run electron:dev` | Run as **Windows desktop app** |
| `npm run electron:build` | Build Windows installer (.exe) |

---

## ⚙️ Environment Variables

Create a `.env` file in the `client` directory:

```bash
cp .env.example .env
```

### Required Variables

| Variable | Description | Get From |
|----------|-------------|----------|
| `VITE_ELEVENLABS_API_KEY` | ElevenLabs API key for speech | [ElevenLabs](https://elevenlabs.io/docs/api-reference) |
| `VITE_API_URL` | Backend API URL (production) | Your Render/Railway deployment |

### Optional Variables

| Variable | Description | Get From |
|----------|-------------|----------|
| `VITE_AZURE_SPEECH_KEY` | Azure Speech API key (alternative) | [Azure Portal](https://portal.azure.com) |
| `VITE_AZURE_SPEECH_REGION` | Azure Speech region | Azure Portal |
| `VITE_HUME_API_KEY` | Hume AI API key (emotion analysis) | [Hume Platform](https://platform.hume.ai/settings/keys) |
| `VITE_DEFAULT_SPEECH_PROVIDER` | `elevenlabs` or `azure` | - |

### Example `.env`

```env
VITE_ELEVENLABS_API_KEY="sk-your-elevenlabs-key"
VITE_API_URL="https://your-backend.onrender.com"
VITE_DEFAULT_SPEECH_PROVIDER="elevenlabs"
```

> ⚠️ **Security Note**: All `VITE_*` variables are embedded in the client-side code and visible to users. Never put sensitive secrets here.

---

## 🖥️ Desktop App (Electron)

### Development Mode

```bash
npm run electron:dev
```

This runs both:
- Vite dev server (hot reload)
- Electron window loading from localhost

### Building the Installer

```bash
npm run electron:build
```

**Output location**: `client/electron-dist/`
- `RealPrep AI Setup 1.0.0.exe` - Windows installer
- `win-unpacked/` - Portable version

### Adding a Custom App Icon

1. Create a 256x256 pixel `.ico` file
2. Place it at `client/public/icon.ico`
3. Rebuild: `npm run electron:build`

**Tools to create `.ico` files:**
- [Favicon.io](https://favicon.io/favicon-converter/) - Upload PNG, download ICO
- [ConvertICO](https://convertico.com/) - Online converter
- [GIMP](https://www.gimp.org/) - Free image editor with ICO export

### Code Signing (Optional)

The app is currently unsigned. Users will see a "Windows protected your PC" message on first run (click "More info" → "Run anyway").

For official distribution, you can purchase a code signing certificate from:
- [DigiCert](https://www.digicert.com/signing/code-signing-certificates) (~$400/year)
- [Sectigo](https://sectigo.com/ssl-certificates-tls/code-signing) (~$200/year)

---

## 📁 Project Structure

```
client/
├── electron/
│   ├── main.cjs      # Electron main process
│   └── preload.cjs   # Secure context bridge
├── public/
│   └── icon.ico      # App icon (add this)
├── src/              # React application
├── dist/             # Built web app
├── electron-dist/    # Built Electron app
├── .env              # Environment variables (create this)
├── .env.example      # Example environment file
└── package.json
```

---

## 🔧 Troubleshooting

### "Cannot create symbolic link" error during build
Run as Administrator, or the fix is already applied (code signing disabled).

### Electron window shows blank screen
Make sure the Vite dev server is running on port 5173.

### Environment variables not working
- Ensure variables start with `VITE_`
- Restart the dev server after changing `.env`
- Variables are baked in at build time - rebuild after changes

---

## 📝 Scripts Reference

| Script | What it does |
|--------|--------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production (web) |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run electron:dev` | Run desktop app (development) |
| `npm run electron:build` | Build Windows installer |
