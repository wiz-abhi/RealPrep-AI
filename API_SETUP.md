# API Configuration Guide

## Required API Keys

This platform requires three API services to function fully:

### 1. Gemini API (Google AI)
**Purpose**: Resume analysis, interview question generation, RAG embeddings

**Setup**:
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add to `server/.env`:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

**Free Tier**: 
- 60 requests per minute
- 1,500 requests per day

---

### 2. ElevenLabs API
**Purpose**: Speech-to-Text (STT) and Text-to-Speech (TTS) for voice interviews

**Setup**:
1. Visit [ElevenLabs](https://elevenlabs.io/)
2. Sign up for an account
3. Go to Profile → API Keys
4. Create a new API key
5. Add to `client/.env`:
   ```
   VITE_ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   ```

**Free Tier**:
- 10,000 characters per month
- Voice synthesis
- Speech recognition

**Current Error**: `401 Unauthorized` - Invalid or missing API key

---

### 3. Hume AI API
**Purpose**: Facial expression analysis and emotion detection

**Setup**:
1. Visit [Hume AI](https://www.hume.ai/)
2. Sign up for an account
3. Get API Key and Secret Key
4. Add to `server/.env`:
   ```
   HUME_API_KEY=your_hume_api_key_here
   HUME_SECRET_KEY=your_hume_secret_key_here
   ```
5. Add to `client/.env`:
   ```
   VITE_HUME_API_KEY=your_hume_api_key_here
   ```

**Free Tier**:
- Limited requests per month
- Real-time emotion detection

**Current Error**: `WebSocket connection failed` - Invalid API key or connection issue

---

## Environment File Setup

### Server `.env` file
Location: `server/.env`

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/interview_db?schema=public"

# Gemini AI
GEMINI_API_KEY=your_gemini_key_here

# Hume AI
HUME_API_KEY=your_hume_api_key_here
HUME_SECRET_KEY=your_hume_secret_key_here

# JWT
JWT_SECRET=your_super_secret_jwt_key_here

# Server
PORT=3000
```

### Client `.env` file
Location: `client/.env`

```env
# ElevenLabs
VITE_ELEVENLABS_API_KEY=your_elevenlabs_key_here

# Hume AI
VITE_HUME_API_KEY=your_hume_api_key_here
```

---

## Testing Without API Keys

The platform can still function with limited features:

### ✅ Works Without APIs:
- User registration/login
- Resume upload (text extraction)
- Dashboard navigation
- Profile management
- Settings

### ⚠️ Limited Without APIs:
- **No Gemini**: Resume analysis will use fallback skills
- **No ElevenLabs**: Voice interaction won't work (buttons disabled)
- **No Hume**: Emotion analysis won't display

### ❌ Requires APIs:
- Full interview with voice
- Real-time emotion tracking
- AI-generated questions

---

## Troubleshooting

### Error: "401 Unauthorized" (ElevenLabs)
**Cause**: Invalid or missing API key

**Fix**:
1. Check `client/.env` has `VITE_ELEVENLABS_API_KEY`
2. Verify key is valid on ElevenLabs dashboard
3. Restart client dev server: `npm run dev`

### Error: "WebSocket connection failed" (Hume)
**Cause**: Invalid API key or network issue

**Fix**:
1. Check both `client/.env` and `server/.env` have Hume keys
2. Verify keys on Hume dashboard
3. Check firewall/network allows WebSocket connections
4. Restart both servers

### Error: "Access to storage is not allowed"
**Cause**: Browser security restriction

**Fix**:
- This is a browser warning, not critical
- Occurs when trying to access localStorage in certain contexts
- Can be safely ignored for development

### Error: "Gemini API quota exceeded"
**Cause**: Free tier limit reached (60 req/min or 1,500 req/day)

**Fix**:
1. Wait for quota to reset (daily)
2. Use fallback analysis (automatic)
3. Upgrade to paid tier if needed

---

## Development Mode (No APIs)

To run the platform without API keys for testing:

1. **Comment out API calls** in:
   - `useElevenLabs.ts` - Disable STT/TTS
   - `useHumeVision.ts` - Disable emotion tracking
   - `interview.controller.ts` - Use mock responses

2. **Use mock data**:
   - Resume analysis returns default skills
   - Interview uses pre-written questions
   - Emotions show placeholder data

---

## Production Checklist

Before deploying to production:

- [ ] All API keys configured
- [ ] Environment variables secured (not in git)
- [ ] API rate limits understood
- [ ] Error handling for API failures
- [ ] Fallback mechanisms tested
- [ ] CORS configured for production domains
- [ ] WebSocket connections allowed through firewall

---

## Cost Estimates (Monthly)

### Free Tier (All APIs):
- **Gemini**: Free (1,500 req/day)
- **ElevenLabs**: Free (10,000 chars)
- **Hume**: Free tier available
- **Total**: $0/month

### Light Usage (~100 interviews/month):
- **Gemini**: Free
- **ElevenLabs**: ~$5-10
- **Hume**: ~$10-20
- **Total**: ~$15-30/month

### Heavy Usage (~1000 interviews/month):
- **Gemini**: ~$10-20
- **ElevenLabs**: ~$50-100
- **Hume**: ~$100-200
- **Total**: ~$160-320/month

---

## Support

If you encounter issues:

1. Check API dashboard for quota/status
2. Verify environment variables are loaded
3. Check browser console for detailed errors
4. Review server logs for backend issues
5. Test API keys with curl/Postman
