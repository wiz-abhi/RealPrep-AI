import { useState, useCallback, useRef } from 'react';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

// Get Azure config - user's localStorage takes priority, then env
const getAzureConfig = () => {
    const userKey = localStorage.getItem('user_azure_speech_key');
    const userRegion = localStorage.getItem('user_azure_speech_region');

    return {
        key: userKey || import.meta.env.VITE_AZURE_SPEECH_KEY || '',
        region: userRegion || import.meta.env.VITE_AZURE_SPEECH_REGION || 'eastus'
    };
};

// Global audio element for TTS
let globalAudio: HTMLAudioElement | null = null;
let isPlayingLock = false;

export const useAzureSpeech = () => {
    const [transcript, setTranscript] = useState<string>('');
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const recognizerRef = useRef<sdk.SpeechRecognizer | null>(null);

    // Start listening with Azure Speech SDK
    const startListening = useCallback(async () => {
        try {
            setError(null);
            setTranscript('');

            const config = getAzureConfig();
            if (!config.key) {
                setError('Azure Speech API key is missing');
                return;
            }

            console.log('Starting Azure Speech recognition with SDK...');
            console.log('Region:', config.region);

            const speechConfig = sdk.SpeechConfig.fromSubscription(config.key, config.region);
            speechConfig.speechRecognitionLanguage = 'en-US';

            const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
            const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
            recognizerRef.current = recognizer;

            setIsRecording(true);

            // Start continuous recognition
            recognizer.recognizeOnceAsync(
                (result) => {
                    console.log('Recognition result:', result);
                    setIsRecording(false);
                    setIsProcessing(false);

                    if (result.reason === sdk.ResultReason.RecognizedSpeech) {
                        console.log('Recognized:', result.text);
                        setTranscript(result.text);
                    } else if (result.reason === sdk.ResultReason.NoMatch) {
                        console.log('No speech recognized');
                        setError('No speech detected. Please speak louder or longer.');
                    } else if (result.reason === sdk.ResultReason.Canceled) {
                        const cancellation = sdk.CancellationDetails.fromResult(result);
                        console.error('Recognition canceled:', cancellation.reason, cancellation.errorDetails);
                        if (cancellation.reason === sdk.CancellationReason.Error) {
                            setError(`Error: ${cancellation.errorDetails}`);
                        }
                    }

                    recognizer.close();
                    recognizerRef.current = null;
                },
                (err) => {
                    console.error('Recognition error:', err);
                    setError('Speech recognition failed');
                    setIsRecording(false);
                    setIsProcessing(false);
                    recognizer.close();
                    recognizerRef.current = null;
                }
            );
        } catch (err) {
            console.error('Failed to start recognition:', err);
            setError('Failed to start recording');
            setIsRecording(false);
        }
    }, []);

    // Stop listening
    const stopListening = useCallback(() => {
        if (recognizerRef.current) {
            console.log('Stopping recognition...');
            setIsProcessing(true);
            // The recognizeOnceAsync will complete when speech ends or timeout
            // We can't really "stop" it early with recognizeOnceAsync
            // For now, just let it complete
        }
        setIsRecording(false);
    }, []);

    // Stop any currently playing audio
    const stopSpeaking = useCallback(() => {
        if (globalAudio) {
            globalAudio.pause();
            globalAudio.currentTime = 0;
            globalAudio = null;
        }
        isPlayingLock = false;
        setIsSpeaking(false);
    }, []);

    // Play TTS response using Azure REST API (TTS works fine with REST)
    const playResponse = useCallback(async (text: string) => {
        const config = getAzureConfig();

        if (!config.key) {
            console.error('Azure Speech API key is missing');
            return;
        }

        // Prevent multiple simultaneous playbacks
        if (isPlayingLock) {
            console.log('Audio already playing, stopping previous...');
            stopSpeaking();
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        isPlayingLock = true;
        setIsSpeaking(true);

        try {
            // Azure TTS REST API endpoint
            const endpoint = `https://${config.region}.tts.speech.microsoft.com/cognitiveservices/v1`;

            // SSML for more natural speech
            const ssml = `
                <speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>
                    <voice name='en-US-JennyNeural'>
                        ${text.replace(/[<>&'"]/g, c => ({
                '<': '&lt;',
                '>': '&gt;',
                '&': '&amp;',
                "'": '&apos;',
                '"': '&quot;'
            }[c] || c))}
                    </voice>
                </speak>
            `;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Ocp-Apim-Subscription-Key': config.key,
                    'Content-Type': 'application/ssml+xml',
                    'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3'
                },
                body: ssml
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Azure TTS error:', response.status, errorText);
                throw new Error(`Azure TTS failed: ${response.status}`);
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);

            // Stop any previous audio
            if (globalAudio) {
                globalAudio.pause();
                URL.revokeObjectURL(globalAudio.src);
            }

            globalAudio = new Audio(audioUrl);

            globalAudio.onended = () => {
                isPlayingLock = false;
                setIsSpeaking(false);
                URL.revokeObjectURL(audioUrl);
                globalAudio = null;
            };

            globalAudio.onerror = (e) => {
                console.error('Audio playback error:', e);
                isPlayingLock = false;
                setIsSpeaking(false);
                URL.revokeObjectURL(audioUrl);
                globalAudio = null;
            };

            await globalAudio.play();
        } catch (err) {
            console.error('Azure TTS error:', err);
            isPlayingLock = false;
            setIsSpeaking(false);
        }
    }, [stopSpeaking]);

    return {
        transcript,
        isRecording,
        isProcessing,
        isSpeaking,
        error,
        startListening,
        stopListening,
        playResponse,
        stopSpeaking
    };
};
