# RealPrep AI 🚀

RealPrep AI is an advanced, AI-powered interview preparation platform designed to help candidates practice and improve their interview skills through realistic, interactive simulations.

![RealPrep AI](https://via.placeholder.com/800x400?text=RealPrep+AI+Banner)

> **Note:** This project uses cutting-edge AI models for voice, vision, and text generation. Please ensure you have the necessary API keys as detailed in [API_SETUP.md](./API_SETUP.md).

## ✨ Features

- **🤖 AI Interviewer**: Conducts realistic interviews with varying personas (Technical, Behavioral, System Design).
- **🗣️ Voice & Text Modes**: Choose between speaking naturally with the AI or typing your responses.
- **👀 Emotion Detection**: Real-time facial expression analysis using Hume AI to adapt the interview flow based on your confidence and stress levels.
- **💻 Coding Challenges**: Integrated code editor for technical interviews, allowing you to solve problems individually.
- **📄 Resume Analysis**: Upload your resume for personalized questions and skill-based technical deep dives.
- **📊 Comprehensive Reports**: Receive detailed feedback, scoring, and improvement suggestions after each session.
- **🧠 Adaptive Memory**: The AI remembers context from your resume and previous responses throughout the interview.

## 🛠️ Tech Stack

### Frontend
- **React** (Vite)
- **TypeScript**
- **TailwindCSS** (Styling)
- **Framer Motion** (Animations)
- **Lucide React** (Icons)

### Backend
- **Node.js** & **Express**
- **Prisma** (ORM)
- **PostgreSQL** (Database)
- **Pinecone / PGVector** (Vector Search for RAG)

### AI Services
- **Google Gemini** (LLM for Chat, Logic, & Reports) - *Using `gemini-3-flash`*
- **ElevenLabs** (Text-to-Speech & Speech-to-Text)
- **Hume AI** (Emotion/Vision Analysis)

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **PostgreSQL** database (local or cloud like Neon/Supabase)
- **npm** or **yarn**

## 🚀 Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/realprep-ai.git
    cd realprep-ai
    ```

2.  **Install Dependencies**
    
    *Client:*
    ```bash
    cd client
    npm install
    ```

    *Server:*
    ```bash
    cd ../server
    npm install
    ```

3.  **Database Setup**
    Ensure your PostgreSQL database is running and the `DATABASE_URL` is set in `server/.env`.
    
    ```bash
    cd server
    npx prisma generate
    npx prisma db push
    ```

## ⚙️ Configuration

Create `.env` files in both `client` and `server` directories. Refer to [API_SETUP.md](./API_SETUP.md) for detailed instructions on obtaining API keys.

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

You need to run both the client and server concurrently.

1.  **Start the Server**
    ```bash
    cd server
    npm run dev
    ```
    *Server runs on http://localhost:3000*

2.  **Start the Client**
    ```bash
    cd client
    npm run dev
    ```
    *Client runs on http://localhost:5173*

## 📂 Project Structure

```
realprep-ai/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Application pages (Interview, Dashboard, etc.)
│   │   ├── hooks/          # Custom hooks (useElevenLabs, useHumeVision)
│   │   └── context/        # Global state (AuthContext)
│   └── ...
├── server/                 # Node.js Backend
│   ├── src/
│   │   ├── controllers/    # Route logic (Interview, Resume, Auth)
│   │   ├── services/       # External APIs (Gemini, RAG)
│   │   └── routes/         # API route definitions
│   ├── prisma/             # Database schema
│   └── ...
└── ...
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
