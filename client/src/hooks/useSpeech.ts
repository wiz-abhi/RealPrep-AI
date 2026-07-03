import { useElevenLabs } from './useElevenLabs';
import { useAzureSpeech } from './useAzureSpeech';
import { useSarvamSpeech } from './useSarvamSpeech';

export type SpeechProvider = 'elevenlabs' | 'azure' | 'sarvam';

// Helper to get the current speech provider
export const getSpeechProvider = (): SpeechProvider => {
    // User's localStorage choice takes priority
    const userChoice = localStorage.getItem('speech_provider');
    if (userChoice === 'elevenlabs' || userChoice === 'azure' || userChoice === 'sarvam') {
        return userChoice;
    }

    // Fall back to developer's .env default
    const envDefault = import.meta.env.VITE_DEFAULT_SPEECH_PROVIDER;
    if (envDefault === 'azure') return 'azure';
    if (envDefault === 'sarvam') return 'sarvam';

    // Ultimate default
    return 'elevenlabs';
};

// Get provider once at module level to ensure consistency
const SPEECH_PROVIDER = getSpeechProvider();

// Unified speech hook that uses the selected provider
export const useSpeech = () => {
    // Initialize all hooks (React requires consistent hook calls)
    const elevenLabs = useElevenLabs();
    const azureSpeech = useAzureSpeech();
    const sarvamSpeech = useSarvamSpeech();

    // Optional streaming-TTS pipeline — only Sarvam implements it; other
    // providers fall back to whole-response playResponse (fields undefined).
    type EnqueueFn = ((text: string) => void) | undefined;
    type PrimeFn = ((texts: string[]) => Promise<void>) | undefined;
    type ConnectFn = ((persona: string) => void) | undefined;
    type FlushFn = (() => void) | undefined;

    if (SPEECH_PROVIDER === 'sarvam') {
        return {
            transcript: sarvamSpeech.transcript,
            interimTranscript: '',
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
            stopSpeaking: sarvamSpeech.stopSpeaking,
            audioRef: sarvamSpeech.audioRef,
            provider: 'sarvam' as const,
        };
    }

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
            stopSpeaking: azureSpeech.stopSpeaking,
            audioRef: (azureSpeech as any).audioRef || { current: null },
            provider: 'azure' as const,
        };
    }

    return {
        transcript: elevenLabs.transcript,
        interimTranscript: '',
        isRecording: elevenLabs.isRecording,
        isProcessing: elevenLabs.isProcessing,
        isSpeaking: elevenLabs.isSpeaking,
        error: elevenLabs.error,
        startRecording: elevenLabs.startRecording,
        stopRecording: elevenLabs.stopRecording,
        playResponse: elevenLabs.playResponse,
        enqueueSpeech: undefined as EnqueueFn,
        primeFillers: undefined as PrimeFn,
        connectStreaming: undefined as ConnectFn,
        flushSpeech: undefined as FlushFn,
        stopSpeaking: elevenLabs.stopSpeaking,
        audioRef: elevenLabs.audioRef,
        provider: 'elevenlabs' as const,
    };
};
