import { useAzureSpeech } from './useAzureSpeech';
import { useSarvamSpeech } from './useSarvamSpeech';

export type SpeechProvider = 'azure' | 'sarvam';

// Helper to get the current speech provider
export const getSpeechProvider = (): SpeechProvider => {
    // User's localStorage choice takes priority
    const userChoice = localStorage.getItem('speech_provider');
    if (userChoice === 'azure' || userChoice === 'sarvam') {
        return userChoice;
    }

    // Fall back to developer's .env default
    const envDefault = import.meta.env.VITE_DEFAULT_SPEECH_PROVIDER;
    if (envDefault === 'azure') return 'azure';

    // Ultimate default — Sarvam (server-proxied, streaming).
    return 'sarvam';
};

// Get provider once at module level to ensure consistency
const SPEECH_PROVIDER = getSpeechProvider();

// Unified speech hook that uses the selected provider (Azure or Sarvam)
export const useSpeech = () => {
    // Initialize both hooks (React requires consistent hook calls)
    const azureSpeech = useAzureSpeech();
    const sarvamSpeech = useSarvamSpeech();

    // Optional streaming-TTS pipeline — only Sarvam implements it; Azure falls
    // back to whole-response playResponse (these fields are undefined for it).
    type EnqueueFn = ((text: string) => void) | undefined;
    type PrimeFn = ((texts: string[]) => Promise<void>) | undefined;
    type ConnectFn = ((persona: string) => void) | undefined;
    type FlushFn = (() => void) | undefined;
    type DisconnectFn = (() => void) | undefined;

    if (SPEECH_PROVIDER === 'azure') {
        return {
            transcript: azureSpeech.transcript,
            interimTranscript: azureSpeech.interimTranscript || '',
            isRecording: azureSpeech.isRecording,
            isProcessing: azureSpeech.isProcessing,
            isSpeaking: azureSpeech.isSpeaking,
            error: azureSpeech.error,
            startRecording: azureSpeech.startListening,
            stopRecording: azureSpeech.stopListening,
            playResponse: azureSpeech.playResponse,
            enqueueSpeech: undefined as EnqueueFn,
            primeFillers: undefined as PrimeFn,
            connectStreaming: undefined as ConnectFn,
            flushSpeech: undefined as FlushFn,
            disconnectStreaming: undefined as DisconnectFn,
            stopSpeaking: azureSpeech.stopSpeaking,
            audioRef: (azureSpeech as any).audioRef || { current: null },
            provider: 'azure' as const,
        };
    }

    // Default: Sarvam (streaming pipeline + server-proxied STT/TTS).
    return {
        transcript: sarvamSpeech.transcript,
        interimTranscript: sarvamSpeech.interimTranscript || '',
        isRecording: sarvamSpeech.isRecording,
        isProcessing: sarvamSpeech.isProcessing,
        isSpeaking: sarvamSpeech.isSpeaking,
        error: sarvamSpeech.error,
        startRecording: sarvamSpeech.startRecording,
        stopRecording: sarvamSpeech.stopRecording,
        playResponse: sarvamSpeech.playResponse,
        enqueueSpeech: sarvamSpeech.enqueueSpeech as EnqueueFn,
        primeFillers: sarvamSpeech.primeFillers as PrimeFn,
        connectStreaming: sarvamSpeech.connectStreaming as ConnectFn,
        flushSpeech: sarvamSpeech.flushSpeech as FlushFn,
        disconnectStreaming: sarvamSpeech.disconnectStreaming as DisconnectFn,
        stopSpeaking: sarvamSpeech.stopSpeaking,
        audioRef: sarvamSpeech.audioRef,
        provider: 'sarvam' as const,
    };
};
