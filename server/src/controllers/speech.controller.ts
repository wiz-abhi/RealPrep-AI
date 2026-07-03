import { Request, Response } from 'express';

const SARVAM_STT_URL = 'https://api.sarvam.ai/speech-to-text';
const SARVAM_TTS_URL = 'https://api.sarvam.ai/text-to-speech';

// Map interview persona → Bulbul v3 speaker.
// Bulbul v3 speakers (partial): shubh, aditya, ritu, priya, neha, rahul, pooja, rohan,
// simran, kavya, amit, dev, ishita, shreya, ratan, varun, manan, kabir, ashutosh, advait,
// tanya, tarun, sunny, mani, gokul, vijay, shruti, suhani, mohit, kavitha, rehan, soham, rupali
const PERSONA_SPEAKERS: Record<string, string> = {
    technical: 'priya',       // Friday — female technical voice
    behavioral: 'rahul',      // Michael Torres — male HR voice
    systemDesign: 'aditya',   // Alex Rivera — male principal engineer voice
};
const DEFAULT_SPEAKER = 'priya';

/**
 * POST /api/speech/stt
 * Body: { audio: base64String, mimeType?: string, languageCode?: string }
 * Client base64-encodes the audio blob so the server can proxy it as multipart
 * to Sarvam without needing multer. Sarvam REST caps at 30s per request.
 */
export const speechSTT = async (req: Request, res: Response) => {
    try {
        const apiKey = process.env.SARVAM_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Sarvam API key not configured on server' });
        }

        const { audio, mimeType, languageCode = 'en-IN' } = (req.body || {}) as {
            audio?: string;
            mimeType?: string;
            languageCode?: string;
        };

        if (!audio || typeof audio !== 'string') {
            return res.status(400).json({ error: 'Missing audio (base64 string)' });
        }

        // Accept either a raw base64 or a data URL (strip the prefix).
        const base64Data = audio.includes(',') ? audio.split(',')[1] : audio;
        const audioBuffer = Buffer.from(base64Data, 'base64');

        if (audioBuffer.length < 500) {
            return res.status(400).json({ error: 'Recording too short' });
        }

        const cleanMime = (mimeType || 'audio/webm').split(';')[0];
        const ext = cleanMime.includes('mp4') ? 'm4a'
            : cleanMime.includes('ogg') ? 'ogg'
            : cleanMime.includes('wav') ? 'wav'
            : cleanMime.includes('mpeg') ? 'mp3'
            : 'webm';

        // Node 18+ has global FormData / Blob for fetch multipart.
        const formData = new FormData();
        const blob = new Blob([audioBuffer], { type: cleanMime });
        formData.append('file', blob, `audio.${ext}`);
        formData.append('model', 'saaras:v3');
        formData.append('language_code', languageCode);

        const sarvamRes = await fetch(SARVAM_STT_URL, {
            method: 'POST',
            headers: { 'api-subscription-key': apiKey },
            body: formData as any,
        });

        if (!sarvamRes.ok) {
            const errText = await sarvamRes.text();
            console.error('Sarvam STT error:', sarvamRes.status, errText);
            return res.status(502).json({ error: 'Sarvam STT failed', status: sarvamRes.status });
        }

        const data: any = await sarvamRes.json();
        res.json({
            success: true,
            data: {
                transcript: data?.transcript || '',
                languageCode: data?.language_code || languageCode,
            },
        });
    } catch (err) {
        console.error('STT handler error:', err);
        res.status(500).json({ error: 'Speech-to-text failed' });
    }
};

/**
 * POST /api/speech/tts
 * Body: { text: string, persona?: string, speaker?: string, languageCode?: string, pace?: number }
 * Returns: { audioBase64: string, mimeType: 'audio/mp3', speaker: string }
 * Bulbul v3 caps at 2500 chars per request — we trim to 2400 for safety.
 */
export const speechTTS = async (req: Request, res: Response) => {
    try {
        const apiKey = process.env.SARVAM_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Sarvam API key not configured on server' });
        }

        const {
            text,
            persona,
            speaker,
            languageCode = 'en-IN',
            pace = 1.0,
        } = (req.body || {}) as {
            text?: string;
            persona?: string;
            speaker?: string;
            languageCode?: string;
            pace?: number;
        };

        if (!text || typeof text !== 'string' || !text.trim()) {
            return res.status(400).json({ error: 'Missing text' });
        }

        const safeText = text.length > 2400 ? text.slice(0, 2400) : text;
        const finalSpeaker =
            (speaker && typeof speaker === 'string' && speaker.trim()) ||
            (persona && PERSONA_SPEAKERS[persona]) ||
            DEFAULT_SPEAKER;

        const sarvamRes = await fetch(SARVAM_TTS_URL, {
            method: 'POST',
            headers: {
                'api-subscription-key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: safeText,
                target_language_code: languageCode,
                speaker: finalSpeaker,
                model: 'bulbul:v3',
                pace,
                output_audio_codec: 'mp3',
            }),
        });

        if (!sarvamRes.ok) {
            const errText = await sarvamRes.text();
            console.error('Sarvam TTS error:', sarvamRes.status, errText);
            return res.status(502).json({ error: 'Sarvam TTS failed', status: sarvamRes.status });
        }

        const data: any = await sarvamRes.json();
        const audioBase64: string | null = Array.isArray(data?.audios) ? data.audios[0] : null;

        if (!audioBase64) {
            return res.status(502).json({ error: 'No audio returned from Sarvam' });
        }

        res.json({
            success: true,
            data: {
                audioBase64,
                mimeType: 'audio/mp3',
                speaker: finalSpeaker,
            },
        });
    } catch (err) {
        console.error('TTS handler error:', err);
        res.status(500).json({ error: 'Text-to-speech failed' });
    }
};
