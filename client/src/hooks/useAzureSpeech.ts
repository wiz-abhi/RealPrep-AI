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

export const useAzureSpeech = () => {
    const [transcript, setTranscript] = useState<string>('');
    const [interimTranscript, setInterimTranscript] = useState<string>('');
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const recognizerRef = useRef<sdk.SpeechRecognizer | null>(null);
    const synthesizerRef = useRef<sdk.SpeechSynthesizer | null>(null);
    const playerRef = useRef<sdk.SpeakerAudioDestination | null>(null);
    // Resolver of the currently-playing TTS promise. stopSpeaking() calls this
    // so the sentence-chunked TTS queue in InterviewPage advances instead of hanging.
    const pendingTTSResolveRef = useRef<(() => void) | null>(null);

    // Accumulate all recognized segments
    const accumulatedTranscriptRef = useRef<string>('');

    // Auto-send timer - sends accumulated transcript after pause
    const autoSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Start continuous listening with streaming recognition
    const startListening = useCallback(async () => {
        try {
            setError(null);
            setTranscript('');
            setInterimTranscript('');
            accumulatedTranscriptRef.current = '';

            const config = getAzureConfig();
            if (!config.key) {
                setError('Azure Speech API key is missing');
                return;
            }

            const speechConfig = sdk.SpeechConfig.fromSubscription(config.key, config.region);
            speechConfig.speechRecognitionLanguage = 'en-US';
            speechConfig.setProperty(sdk.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs, '2000');

            const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
            const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
            recognizerRef.current = recognizer;

            recognizer.recognizing = (_, e) => {
                if (e.result.reason === sdk.ResultReason.RecognizingSpeech) {
                    setInterimTranscript(accumulatedTranscriptRef.current + ' ' + e.result.text);
                    if (autoSendTimerRef.current) {
                        clearTimeout(autoSendTimerRef.current);
                        autoSendTimerRef.current = null;
                    }
                }
            };

            recognizer.recognized = (_, e) => {
                if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
                    if (e.result.text.trim()) {
                        accumulatedTranscriptRef.current =
                            accumulatedTranscriptRef.current
                                ? accumulatedTranscriptRef.current + ' ' + e.result.text
                                : e.result.text;
                    }
                    setInterimTranscript(accumulatedTranscriptRef.current);

                    if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
                    autoSendTimerRef.current = setTimeout(() => {
                        if (accumulatedTranscriptRef.current.trim()) {
                            setTranscript(accumulatedTranscriptRef.current.trim());
                            setInterimTranscript('');
                            if (recognizerRef.current) {
                                recognizerRef.current.stopContinuousRecognitionAsync(() => {
                                    recognizerRef.current?.close();
                                    recognizerRef.current = null;
                                    setIsRecording(false);
                                }, () => { });
                            }
                        }
                    }, 1000);
                }
            };

            recognizer.canceled = (_s, e) => {
                if (e.reason === sdk.CancellationReason.Error) {
                    console.error('Recognition canceled:', e.errorDetails);
                    setError(e.errorDetails);
                }
                setIsRecording(false);
                setIsProcessing(false);
            };

            recognizer.sessionStopped = () => {
                setIsRecording(false);
                setIsProcessing(false);
            };

            await new Promise<void>((resolve, reject) => {
                recognizer.startContinuousRecognitionAsync(
                    () => { setIsRecording(true); resolve(); },
                    (err) => { console.error('Failed to start recognition:', err); setError('Failed to start recording'); reject(err); }
                );
            });
        } catch (err) {
            console.error('Failed to start recognition:', err);
            setError('Failed to start recording');
            setIsRecording(false);
        }
    }, []);

    const stopListening = useCallback(async () => {
        if (recognizerRef.current) {
            setIsProcessing(true);
            await new Promise<void>((resolve) => {
                recognizerRef.current!.stopContinuousRecognitionAsync(
                    () => {
                        recognizerRef.current?.close();
                        recognizerRef.current = null;
                        if (accumulatedTranscriptRef.current.trim()) {
                            setTranscript(accumulatedTranscriptRef.current.trim());
                        }
                        setInterimTranscript('');
                        setIsRecording(false);
                        setIsProcessing(false);
                        resolve();
                    },
                    (err) => {
                        console.error('Failed to stop recognition:', err);
                        setIsRecording(false);
                        setIsProcessing(false);
                        resolve();
                    }
                );
            });
        }
    }, []);

    const stopSpeaking = useCallback(() => {
        if (synthesizerRef.current) {
            try { synthesizerRef.current.close(); } catch { /* noop */ }
            synthesizerRef.current = null;
        }
        if (playerRef.current) {
            try { playerRef.current.pause(); } catch { /* noop */ }
            try { playerRef.current.close(); } catch { /* noop */ }
            playerRef.current = null;
        }
        setIsSpeaking(false);
        // Resolve any pending TTS promise so a queued caller advances.
        if (pendingTTSResolveRef.current) {
            const resolve = pendingTTSResolveRef.current;
            pendingTTSResolveRef.current = null;
            resolve();
        }
    }, []);

    /**
     * Plays a TTS chunk. Returns Promise<void> that resolves when Azure's
     * SpeakerAudioDestination fires onAudioEnd, when speak is canceled/errored,
     * or when stopSpeaking() is called mid-playback (barge-in / queue swap).
     */
    const playResponse = useCallback((text: string): Promise<void> => {
        const config = getAzureConfig();
        if (!config.key) {
            console.error('Azure Speech API key is missing');
            return Promise.resolve();
        }
        if (!text.trim()) return Promise.resolve();

        // Always cut off any prior playback — sequential awaited callers build the queue.
        stopSpeaking();
        setIsSpeaking(true);

        return new Promise<void>((resolve) => {
            let resolved = false;
            const finish = () => {
                if (resolved) return;
                resolved = true;
                if (pendingTTSResolveRef.current === resolve) {
                    pendingTTSResolveRef.current = null;
                }
                if (playerRef.current === player) {
                    setIsSpeaking(false);
                    playerRef.current = null;
                    synthesizerRef.current = null;
                }
                resolve();
            };

            pendingTTSResolveRef.current = resolve;

            let player: sdk.SpeakerAudioDestination;
            try {
                const speechConfig = sdk.SpeechConfig.fromSubscription(config.key, config.region);
                speechConfig.speechSynthesisVoiceName = 'en-US-JennyNeural';
                speechConfig.speechSynthesisOutputFormat =
                    sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

                player = new sdk.SpeakerAudioDestination();
                playerRef.current = player;
                player.onAudioEnd = () => finish();

                const audioConfig = sdk.AudioConfig.fromSpeakerOutput(player);
                const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);
                synthesizerRef.current = synthesizer;

                synthesizer.speakTextAsync(
                    text,
                    (result) => {
                        if (result.reason === sdk.ResultReason.Canceled) {
                            const cancellation = sdk.CancellationDetails.fromResult(result);
                            console.error('TTS canceled:', cancellation.reason, cancellation.errorDetails);
                            setError(`TTS failed: ${cancellation.errorDetails}`);
                            finish();
                        }
                        // Successful completion: wait for onAudioEnd instead of finishing here.
                    },
                    (err) => {
                        console.error('TTS error:', err);
                        setError('TTS failed');
                        finish();
                    }
                );
            } catch (err) {
                console.error('TTS setup error:', err);
                finish();
            }
        });
    }, [stopSpeaking]);

    return {
        transcript,
        interimTranscript,
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
