# RealPrep AI 🚀

An advanced, AI-powered interview preparation platform with **real-time emotion detection** that helps candidates practice and improve their interview skills through realistic, interactive simulations.

![RealPrep AI](https://via.placeholder.com/800x400?text=RealPrep+AI+Banner)

## ✨ Features

### 🎙️ Core Interview Experience
- **AI Interviewer** — Conducts realistic interviews with varying personas (Technical, Behavioral, System Design)
- **Voice & Text Modes** — Speak naturally with the AI or type your responses
- **Integrated Code Editor** — Monaco-based editor for technical/coding interviews
- **Resume Analysis** — Upload your resume for personalized questions and skill-based deep dives
- **Flexible Duration** — Choose interview length (5, 10, 15, or 30 minutes)

### 🧠 Emotional Intelligence (USP)
- **Real-time Emotion Detection** — Facial expression analysis using Hume AI throughout the interview
- **Confidence Tracking** — Monitors your confidence levels during responses
- **Stress Detection** — Identifies high-stress moments and tracks nervousness
- **Emotion Trends** — Analyzes if your emotional state improved or declined

### 📊 Reports & Improvement
- **Comprehensive Reports** — Detailed feedback with scoring after each session
- **Emotional Analysis** — See your confidence %, nervousness %, stress points, and dominant emotions
- **Personalized Improvement Plan** — AI-generated coaching covering:
  - Technical skill gaps with learning resources
  - Communication skill improvements
  - Stress management & confidence building tips
  - Prioritized action items with deadlines

### 🔐 User Experience
- **Secure Authentication** — JWT-based auth with password hashing
- **Resume Management** — Upload, view, and manage multiple resumes
- **Interview History** — Track all past sessions and scores
- **Custom API Keys** — Optionally use your own API keys (stored locally in browser)
- **Speech Provider Choice** — Switch between ElevenLabs and Azure Speech

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React (Vite), TypeScript, TailwindCSS, Framer Motion |
| **Backend** | Node.js, Express, Prisma ORM |
| **Database** | PostgreSQL with PGVector (semantic search) |
| **AI/ML** | Google Gemini, ElevenLabs (STT/TTS), Hume AI (Emotion) |
| **Auth** | JWT, bcrypt |

---

## 📋 Prerequisites

- **Node.js** v18 or higher
- **PostgreSQL** database (local or cloud: Neon, Supabase, etc.)
- **npm** or **yarn**

---

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/wiz-abhi/RealPrep-AI.git
cd RealPrep-AI
```

### 2. Install Dependencies
```bash
# Client
cd client && npm install

# Server
cd ../server && npm install
```

### 3. Configure Environment Variables
```bash
# Copy example files
cp server/.env.example server/.env
cp client/.env.example client/.env

# Edit the .env files with your API keys
```

### 4. Database Setup
```bash
cd server
npx prisma generate
npx prisma db push
```

### 5. Run the Application
```bash
# Terminal 1 - Server (http://localhost:3000)
cd server && npm run dev

# Terminal 2 - Client (http://localhost:5173)
cd client && npm run dev
```

---

## ⚙️ Environment Variables

### Server (`server/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Secret for JWT token signing |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key for AI chat |
| `HUME_API_KEY` | ✅ | Hume AI API key for emotion detection |
| `HUME_SECRET_KEY` | ✅ | Hume AI secret key |
| `PORT` | ❌ | Server port (default: 3000) |
| `FRONTEND_URL` | ❌ | Frontend URL for CORS (production) |

### Client (`client/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_ELEVENLABS_API_KEY` | ✅ | ElevenLabs API for STT/TTS |
| `VITE_AZURE_SPEECH_KEY` | ❌ | Azure Speech API key (alternative) |
| `VITE_AZURE_SPEECH_REGION` | ❌ | Azure region (e.g., `eastus`) |
| `VITE_DEFAULT_SPEECH_PROVIDER` | ❌ | `elevenlabs` or `azure` |
| `VITE_HUME_API_KEY` | ❌ | Hume AI key (client-side, optional) |
| `VITE_API_URL` | ❌ | Backend URL (production only) |

> 💡 See [API_SETUP.md](./API_SETUP.md) for detailed instructions on obtaining API keys.

---

## 🌐 Deployment

### Deploy to Vercel (Frontend) + Render (Backend)

#### Frontend (Vercel)
1. Import your GitHub repo to Vercel
2. Set root directory to `client`
3. Add environment variable:
   - `VITE_API_URL` = `https://your-app.onrender.com`

#### Backend (Render)
1. Create a new Web Service from your GitHub repo
2. Set root directory to `server`
3. Build command: `npm install && npm run build`
4. Start command: `npm run start`
5. Add environment variables (all server vars above)
6. Add: `FRONTEND_URL` = `https://your-app.vercel.app`

---

## 📂 Project Structure

```
realprep-ai/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/     # UI components (GlassCard, CodeEditor, ScannerOverlay)
│   │   ├── config/         # API configuration
│   │   ├── context/        # AuthContext
│   │   ├── hooks/          # useSpeech, useHumeVision, useAzureSpeech
│   │   └── pages/          # Interview, Dashboard, Report, Settings pages
│   └── .env.example        # Example environment variables
├── server/                 # Node.js Backend
│   ├── src/
│   │   ├── controllers/    # Interview, Resume, Auth, User controllers
│   │   ├── middleware/     # Auth middleware
│   │   ├── routes/         # API routes
│   │   ├── services/       # Gemini, RAG services
│   │   └── utils/          # Auth utilities
│   ├── prisma/             # Database schema
│   └── .env.example        # Example environment variables
└── README.md
```

---

## 🔑 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Create new account |
| `/api/auth/login` | POST | User login |
| `/api/resume/upload` | POST | Upload resume (PDF/TXT) |
| `/api/resume/list` | GET | List user's resumes |
| `/api/interview/start` | POST | Start new interview session |
| `/api/interview/chat` | POST | Send message + emotions to AI |
| `/api/interview/end` | POST | End session & generate report |
| `/api/interview/report/:id` | GET | Get session report |
| `/api/interview/improvement-plan` | POST | Generate coaching plan |
| `/api/interview/history` | GET | Get interview history |
| `/api/user/stats` | GET | Get user statistics |

---

## 🎨 UI Features

- **Glassmorphism Design** — Modern frosted glass UI with blur effects
- **Dark Mode** — Sleek dark theme throughout
- **Responsive Layout** — Works on desktop and tablets
- **Real-time Feedback** — Live transcription, typing animations
- **Floating Timer** — Countdown timer during interviews

---

## 🔒 Security

- JWT-based authentication with httpOnly consideration
- Passwords hashed with bcrypt
- User API keys stored **only in browser localStorage** (never sent to server)
- CORS configured for production origins

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- [Google Gemini](https://ai.google.dev/) for AI chat capabilities
- [ElevenLabs](https://elevenlabs.io/) for speech synthesis
- [Hume AI](https://hume.ai/) for emotion detection
- [Prisma](https://prisma.io/) for database ORM
