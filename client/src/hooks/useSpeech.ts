import { useElevenLabs } from './useElevenLabs';
import { useAzureSpeech } from './useAzureSpeech';

// Helper to get the current speech provider
export const getSpeechProvider = (): 'elevenlabs' | 'azure' => {
    // User's localStorage choice takes priority
    const userChoice = localStorage.getItem('speech_provider');
    if (userChoice === 'elevenlabs' || userChoice === 'azure') {
        return userChoice;
    }

    // Fall back to developer's .env default
    const envDefault = import.meta.env.VITE_DEFAULT_SPEECH_PROVIDER;
    if (envDefault === 'azure') {
        return 'azure';
    }

    // Ultimate default
    return 'elevenlabs';
};

// Get provider once at module level to ensure consistency
const SPEECH_PROVIDER = getSpeechProvider();

// Unified speech hook that uses the selected provider
export const useSpeech = () => {
    // Initialize both hooks (React requires consistent hook calls)
    const elevenLabs = useElevenLabs();
    const azureSpeech = useAzureSpeech();

    // Use the provider determined at load time for consistency
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
            stopSpeaking: azureSpeech.stopSpeaking,
            provider: 'azure' as const
        };
    }

    return {
        transcript: elevenLabs.transcript,
        interimTranscript: '', // ElevenLabs doesn't have interim transcripts
        isRecording: elevenLabs.isRecording,
        isProcessing: elevenLabs.isProcessing,
        isSpeaking: elevenLabs.isSpeaking,
        error: elevenLabs.error,
        startRecording: elevenLabs.startRecording,
        stopRecording: elevenLabs.stopRecording,
        playResponse: elevenLabs.playResponse,
        stopSpeaking: elevenLabs.stopSpeaking,
        provider: 'elevenlabs' as const
    };
};
