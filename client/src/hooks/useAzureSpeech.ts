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
            accumulatedTranscriptRef.current = ''; // Reset accumulator

            const config = getAzureConfig();
            if (!config.key) {
                setError('Azure Speech API key is missing');
                return;
            }

            console.log('Starting Azure continuous recognition...');

            const speechConfig = sdk.SpeechConfig.fromSubscription(config.key, config.region);
            speechConfig.speechRecognitionLanguage = 'en-US';

            // Increase silence timeout to allow for longer pauses
            speechConfig.setProperty(sdk.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs, "2000");

            const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
            const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
            recognizerRef.current = recognizer;

            // Handle real-time partial results (streaming)
            recognizer.recognizing = (_, e) => {
                if (e.result.reason === sdk.ResultReason.RecognizingSpeech) {
                    console.log('Partial:', e.result.text);
                    // Show current accumulated + partial for real-time feedback
                    setInterimTranscript(accumulatedTranscriptRef.current + ' ' + e.result.text);

                    // Clear auto-send timer while user is speaking
                    if (autoSendTimerRef.current) {
                        clearTimeout(autoSendTimerRef.current);
                        autoSendTimerRef.current = null;
                    }
                }
            };

            // Handle final result - ACCUMULATE and start auto-send timer
            recognizer.recognized = (_, e) => {
                if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
                    console.log('Final segment:', e.result.text);
                    // Accumulate all segments
                    if (e.result.text.trim()) {
                        accumulatedTranscriptRef.current =
                            accumulatedTranscriptRef.current
                                ? accumulatedTranscriptRef.current + ' ' + e.result.text
                                : e.result.text;
                    }
                    setInterimTranscript(accumulatedTranscriptRef.current);

                    // Start auto-send timer - if no more speech for 1.5 seconds, send the transcript
                    if (autoSendTimerRef.current) {
                        clearTimeout(autoSendTimerRef.current);
                    }
                    autoSendTimerRef.current = setTimeout(() => {
                        if (accumulatedTranscriptRef.current.trim()) {
                            console.log('Auto-sending after pause:', accumulatedTranscriptRef.current);
                            setTranscript(accumulatedTranscriptRef.current.trim());
                            setInterimTranscript('');
                            // Stop recognition after auto-send
                            if (recognizerRef.current) {
                                recognizerRef.current.stopContinuousRecognitionAsync(() => {
                                    recognizerRef.current?.close();
                                    recognizerRef.current = null;
                                    setIsRecording(false);
                                }, () => { });
                            }
                        }
                    }, 1500); // 1.5 second pause triggers auto-send (reduced from 3s)
                } else if (e.result.reason === sdk.ResultReason.NoMatch) {
                    console.log('No speech recognized');
                }
            };

            recognizer.canceled = (s, e) => {
                if (e.reason === sdk.CancellationReason.Error) {
                    console.error('Recognition canceled:', e.errorDetails);
                    setError(e.errorDetails);
                }
                setIsRecording(false);
                setIsProcessing(false);
            };

            recognizer.sessionStopped = () => {
                console.log('Recognition session stopped');
                setIsRecording(false);
                setIsProcessing(false);
            };

            // Start continuous recognition
            await new Promise<void>((resolve, reject) => {
                recognizer.startContinuousRecognitionAsync(
                    () => {
                        console.log('Continuous recognition started');
                        setIsRecording(true);
                        resolve();
                    },
                    (err) => {
                        console.error('Failed to start recognition:', err);
                        setError('Failed to start recording');
                        reject(err);
                    }
                );
            });
        } catch (err) {
            console.error('Failed to start recognition:', err);
            setError('Failed to start recording');
            setIsRecording(false);
        }
    }, []);

    // Stop listening - set final accumulated transcript
    const stopListening = useCallback(async () => {
        if (recognizerRef.current) {
            console.log('Stopping continuous recognition...');
            setIsProcessing(true);

            await new Promise<void>((resolve) => {
                recognizerRef.current!.stopContinuousRecognitionAsync(
                    () => {
                        console.log('Recognition stopped');
                        recognizerRef.current?.close();
                        recognizerRef.current = null;

                        // Set the final accumulated transcript
                        if (accumulatedTranscriptRef.current.trim()) {
                            console.log('Final accumulated transcript:', accumulatedTranscriptRef.current);
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

    // Stop speaking
    const stopSpeaking = useCallback(() => {
        if (synthesizerRef.current) {
            synthesizerRef.current.close();
            synthesizerRef.current = null;
        }
        if (playerRef.current) {
            playerRef.current.pause();
            playerRef.current.close();
            playerRef.current = null;
        }
        setIsSpeaking(false);
    }, []);

    // Streaming TTS with SpeechSynthesizer
    const playResponse = useCallback(async (text: string) => {
        const config = getAzureConfig();

        if (!config.key) {
            console.error('Azure Speech API key is missing');
            return;
        }

        // Stop any previous speech
        stopSpeaking();

        setIsSpeaking(true);

        try {
            console.log('Starting streaming TTS...');

            const speechConfig = sdk.SpeechConfig.fromSubscription(config.key, config.region);
            speechConfig.speechSynthesisVoiceName = 'en-US-JennyNeural';

            // Create speaker output for streaming
            const player = new sdk.SpeakerAudioDestination();
            playerRef.current = player;

            player.onAudioEnd = () => {
                console.log('TTS playback finished');
                setIsSpeaking(false);
            };

            const audioConfig = sdk.AudioConfig.fromSpeakerOutput(player);
            const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);
            synthesizerRef.current = synthesizer;

            // Handle streaming events
            synthesizer.synthesizing = (s, e) => {
                // Audio data is being streamed
                console.log('TTS streaming chunk received:', e.result.audioData?.byteLength, 'bytes');
            };

            // Start streaming synthesis
            synthesizer.speakTextAsync(
                text,
                (result) => {
                    if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                        console.log('TTS synthesis completed, audio duration:', result.audioDuration);
                        // Estimate playback time based on audio duration
                        // audioDuration is in 100-nanosecond units
                        const durationMs = result.audioDuration ? Number(result.audioDuration) / 10000 : 0;

                        // Set timeout to ensure isSpeaking resets after playback
                        // Add small buffer to ensure audio has finished
                        setTimeout(() => {
                            console.log('TTS playback estimated complete, resetting isSpeaking');
                            setIsSpeaking(false);
                            // Clean up synthesizer
                            if (synthesizerRef.current) {
                                synthesizerRef.current.close();
                                synthesizerRef.current = null;
                            }
                        }, Math.max(durationMs + 500, 1000)); // At least 1 second, or duration + 500ms buffer
                    } else if (result.reason === sdk.ResultReason.Canceled) {
                        const cancellation = sdk.CancellationDetails.fromResult(result);
                        console.error('TTS canceled:', cancellation.reason, cancellation.errorDetails);
                        setError(`TTS failed: ${cancellation.errorDetails}`);
                        setIsSpeaking(false);
                    }
                },
                (err) => {
                    console.error('TTS error:', err);
                    setError('TTS failed');
                    setIsSpeaking(false);
                }
            );
        } catch (err) {
            console.error('TTS error:', err);
            setIsSpeaking(false);
        }
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
