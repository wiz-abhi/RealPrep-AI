# RealPrep AI 🚀

RealPrep AI is an advanced, AI-powered interview preparation platform designed to help candidates practice and improve their interview skills through realistic, interactive simulations.

![RealPrep AI](https://via.placeholder.com/800x400?text=RealPrep+AI+Banner)

> **Note:** This project uses cutting-edge AI models for voice, vision, and text generation. Please ensure you have the necessary API keys as detailed in [API_SETUP.md](./API_SETUP.md).

## ✨ Features

### Core Interview Experience
- **🤖 AI Interviewer**: Conducts realistic interviews with varying personas (Technical, Behavioral, System Design)
- **🗣️ Voice & Text Modes**: Choose between speaking naturally with the AI or typing your responses
- **💻 Coding Challenges**: Integrated code editor for technical interviews
- **📄 Resume Analysis**: Upload your resume for personalized questions and skill-based deep dives

### Emotional Intelligence (USP)
- **👀 Real-time Emotion Detection**: Facial expression analysis using Hume AI throughout the interview
- **💪 Confidence Tracking**: Monitors your confidence levels during responses
- **😰 Stress Detection**: Identifies high-stress moments and tracks nervousness
- **📈 Emotion Trends**: Analyzes if your emotional state improved or declined

### Reports & Improvement
- **📊 Comprehensive Reports**: Detailed feedback with scoring after each session
- **❤️ Emotional Analysis**: See your confidence %, nervousness %, stress points, and dominant emotions
- **🎯 Personalized Improvement Plan**: AI-generated coaching covering:
  - Technical skill gaps with learning resources
  - Communication skill improvements
  - Stress management & confidence building tips
  - Prioritized action items with deadlines

## 🛠️ Tech Stack

### Frontend
- **React** (Vite) + **TypeScript**
- **TailwindCSS** (Styling)
- **Framer Motion** (Animations)
- **Lucide React** (Icons)

### Backend
- **Node.js** & **Express**
- **Prisma** (ORM) + **PostgreSQL**
- **PGVector** (Vector Search for RAG)

### AI Services
- **Google Gemini** (`gemini-1.5-flash`) - Chat, Reports, Improvement Plans
- **ElevenLabs** - Speech-to-Text (Scribe v1) & Text-to-Speech (Streaming)
- **Hume AI** - Real-time Emotion/Vision Analysis

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **PostgreSQL** database (local or cloud like Neon/Supabase)
- **npm** or **yarn**

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/realprep-ai.git
   cd realprep-ai
   ```

2. **Install Dependencies**
   ```bash
   # Client
   cd client && npm install
   
   # Server
   cd ../server && npm install
   ```

3. **Database Setup**
   ```bash
   cd server
   npx prisma generate
   npx prisma db push
   ```

## ⚙️ Configuration

Create `.env` files in both `client` and `server` directories. See [API_SETUP.md](./API_SETUP.md) for details.

**Server (`server/.env`):**
```env
DATABASE_URL="postgresql://..."
GEMINI_API_KEY="..."
HUME_API_KEY="..."
HUME_SECRET_KEY="..."
JWT_SECRET="..."
PORT=3000
```

**Client (`client/.env`):**
```env
VITE_ELEVENLABS_API_KEY="..."
VITE_HUME_API_KEY="..."
```

## 🏃‍♂️ Running the Application

```bash
# Terminal 1 - Server (http://localhost:3000)
cd server && npm run dev

# Terminal 2 - Client (http://localhost:5173)
cd client && npm run dev
```

## 📂 Project Structure

```
realprep-ai/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/     # UI components (GlassCard, CodeEditor)
│   │   ├── pages/          # Interview, Dashboard, Report pages
│   │   ├── hooks/          # useElevenLabs, useHumeVision
│   │   └── context/        # AuthContext
├── server/                 # Node.js Backend
│   ├── src/
│   │   ├── controllers/    # Interview, Resume, Auth logic
│   │   ├── services/       # Gemini, RAG services
│   │   └── routes/         # API routes
│   └── prisma/             # Database schema
```

## 🔑 Key API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/interview/start` | POST | Start new interview session |
| `/api/interview/chat` | POST | Send message (+ emotions) to AI |
| `/api/interview/end` | POST | End session & generate report |
| `/api/interview/improvement-plan` | POST | Generate personalized coaching plan |
| `/api/interview/report/:id` | GET | Get session report |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
