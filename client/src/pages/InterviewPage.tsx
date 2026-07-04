import { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from '../config/api';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Webcam from 'react-webcam';
import { CodeEditor } from '../components/ui/CodeEditor';
import { useSpeech } from '../hooks/useSpeech';
import { useHumeVision } from '../hooks/useHumeVision';
import { useVAD } from '../hooks/useVAD';
import { Mic, MicOff, Square, Code, MessageSquare, X, Send, Clock, Radio } from 'lucide-react';
import { AIInterviewerAvatar } from '../components/ui/AIInterviewerAvatar';
import { SimpleMarkdown } from '../components/ui/SimpleMarkdown';

// Short persona-matched acknowledgements played instantly while the LLM thinks.
// Kept brief so they don't overrun the first real sentence of the response.
const FILLERS = {
    technical: ['Mm-hmm, let me think about that.', 'Right, okay.', 'Got it, one second.', 'Interesting, let me see.'],
    behavioral: ['Mm-hmm, thank you for sharing that.', 'I see, okay.', 'That makes sense, let me think.', 'Right, got it.'],
    systemDesign: ['Okay, interesting. Let me consider that.', 'Right, let me think.', 'Mm-hmm, I see.', 'Got it, one moment.'],
};

export const InterviewPage = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [showChat, setShowChat] = useState(true);
    const [showEditor, setShowEditor] = useState(false);
    const [voiceMode, setVoiceMode] = useState(true);
    // Hands-free (VAD-driven turn-taking). Persisted across sessions.
    const [handsFreeMode, setHandsFreeMode] = useState<boolean>(
        () => typeof window !== 'undefined' && localStorage.getItem('hands_free_mode') === '1'
    );
    // Pause/resume — freezes the (server-authoritative) clock and blocks input.
    const [isPaused, setIsPaused] = useState(false);
    const pausedRef = useRef(false);
    const fillerCountRef = useRef(0);
    // Phase 3: interview-plan progress chip + last code-execution result panel.
    const [phaseLabel, setPhaseLabel] = useState<string>('');
    const [codeExecution, setCodeExecution] = useState<any>(null);
    const [_hasPlayedInitial, setHasPlayedInitial] = useState(false);
    const [textInput, setTextInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCodeSubmitting, setIsCodeSubmitting] = useState(false);
    const [showEndModal, setShowEndModal] = useState(false);
    const [sessionLoading, setSessionLoading] = useState(true);
    const [sessionError, setSessionError] = useState<string | null>(null);
    const [interviewType, setInterviewType] = useState<string>('technical');

    // Timer state — tracks actual elapsed seconds (persisted to DB)
    const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
    const [totalDurationSeconds, setTotalDurationSeconds] = useState<number>(30 * 60);
    const elapsedRef = useRef<number>(0); // ref for use in effects/cleanup
    const timerActiveRef = useRef<boolean>(false);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    // Guards the greeting auto-play against React StrictMode double effects.
    const initialPlayedRef = useRef(false);

    const {
        transcript,
        interimTranscript: _interimTranscript,
        isRecording,
        isProcessing: _isProcessing,
        isSpeaking,
        error: audioError,
        startRecording,
        stopRecording,
        playResponse,
        enqueueSpeech,
        primeFillers,
        connectStreaming,
        flushSpeech,
        stopSpeaking,
        audioRef,
        provider: speechProvider
    } = useSpeech();

    const {
        connect: connectVision,
        disconnect: disconnectVision,
        sendFrame,
        emotions,
        isConnected: _isVisionConnected
    } = useHumeVision();

    // Voice Activity Detection — powers hands-free mode + barge-in.
    const {
        start: startVAD,
        stop: stopVAD,
        setCallbacks: setVADCallbacks,
        isUserSpeaking: vadUserSpeaking,
        isLoading: vadLoading,
    } = useVAD();

    const webcamRef = useRef<Webcam>(null);
    const [messages, setMessages] = useState<any[]>([]);

    // Scroll to bottom when messages change
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Fetch session details on mount
    useEffect(() => {
        const fetchSession = async () => {
            if (!sessionId) {
                setSessionError('No session ID provided');
                setSessionLoading(false);
                navigate('/dashboard');
                return;
            }

            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_BASE_URL}/api/interview/session/${sessionId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!res.ok) {
                    throw new Error('Session not found');
                }

                const data = await res.json();
                console.log('Session Loaded:', data);
                const session = data.data;

                // Set timer values from server
                const totalSecs = (session.durationMinutes || 30) * 60;
                const serverElapsed = session.elapsedSeconds || 0;
                setTotalDurationSeconds(totalSecs);
                setElapsedSeconds(serverElapsed);
                elapsedRef.current = serverElapsed;
                timerActiveRef.current = true;

                // Load interview details
                const serverType = session.type || session.interviewType || 'technical';
                const mappedType = serverType.toLowerCase().includes('behavioral') ? 'behavioral' :
                                   serverType.toLowerCase().includes('system') ? 'systemDesign' : 'technical';
                setInterviewType(mappedType);
                // Bridge for useSarvamSpeech — picks the persona-matched Bulbul voice
                localStorage.setItem('active_interview_persona', mappedType);
                if (session.phaseLabel) setPhaseLabel(session.phaseLabel);

                // Open the low-latency streaming-TTS connection for this persona.
                if (connectStreaming) connectStreaming(mappedType);
                // Pre-synthesize this persona's filler clips as a REST fallback
                // (used only if the stream isn't ready).
                if (primeFillers) {
                    const fillers = FILLERS[mappedType as keyof typeof FILLERS] || FILLERS.technical;
                    primeFillers(fillers).catch(() => { /* non-fatal */ });
                }

                // Load existing transcript
                if (session.transcript && session.transcript.length > 0) {
                    setMessages(session.transcript.map((t: any) => ({
                        sender: t.sender,
                        text: t.text,
                        timestamp: t.timestamp
                    })));

                    // Play the last AI message (greeting or continuation).
                    // initialPlayedRef guards against StrictMode's double effect
                    // run in dev — without it the greeting plays twice at once.
                    const lastMessage = session.transcript[session.transcript.length - 1];
                    if (lastMessage.sender === 'ai' && !initialPlayedRef.current) {
                        initialPlayedRef.current = true;
                        console.log('Auto-playing last AI message');
                        setTimeout(() => {
                            playResponse(lastMessage.text);
                        }, 1000);
                    }

                    setHasPlayedInitial(true);
                }

                setSessionLoading(false);
            } catch (error) {
                console.error('Failed to fetch session:', error);
                setSessionError('Failed to load session');
                setSessionLoading(false);
            }
        };

        fetchSession();
    }, [sessionId, navigate, playResponse]);

    // ── Elapsed-seconds timer ──
    // Ticks every second while the interview page is open
    useEffect(() => {
        if (sessionLoading) return;
        if (!timerActiveRef.current) return;

        const timer = setInterval(() => {
            if (pausedRef.current) return; // frozen while paused
            setElapsedSeconds(prev => {
                const next = prev + 1;
                elapsedRef.current = next;
                return next;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [sessionLoading]);

    // Persist elapsed to DB every 30 seconds
    useEffect(() => {
        if (sessionLoading) return;

        const persist = setInterval(() => {
            const token = localStorage.getItem('token');
            fetch(`${API_BASE_URL}/api/interview/session/${sessionId}/elapsed`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ elapsedSeconds: elapsedRef.current })
            }).catch(err => console.error('Failed to persist elapsed time:', err));
        }, 30000);

        return () => clearInterval(persist);
    }, [sessionId, sessionLoading]);

    // Persist elapsed on unmount and page close
    useEffect(() => {
        const saveElapsed = () => {
            const token = localStorage.getItem('token');
            if (token && sessionId) {
                // Use sendBeacon for reliable save on page close
                const data = JSON.stringify({ elapsedSeconds: elapsedRef.current });
                navigator.sendBeacon?.(
                    `${API_BASE_URL}/api/interview/session/${sessionId}/elapsed`,
                    new Blob([data], { type: 'application/json' })
                );
            }
        };

        window.addEventListener('beforeunload', saveElapsed);
        return () => {
            window.removeEventListener('beforeunload', saveElapsed);
            // Also persist on component unmount (navigation)
            const token = localStorage.getItem('token');
            if (token && sessionId) {
                fetch(`${API_BASE_URL}/api/interview/session/${sessionId}/elapsed`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ elapsedSeconds: elapsedRef.current })
                }).catch(() => { });
            }
        };
    }, [sessionId]);

    // Compute remaining from elapsed
    const remainingSeconds = Math.max(0, totalDurationSeconds - elapsedSeconds);

    // Force stop mic at 30 seconds — no more user input
    useEffect(() => {
        if (remainingSeconds <= 30 && remainingSeconds > 0 && timerActiveRef.current && !sessionLoading) {
            if (isRecording) {
                stopRecording();
            }
        }
    }, [remainingSeconds, sessionLoading, isRecording, stopRecording]);

    // Auto-end at 5 seconds — forcefully end interview
    useEffect(() => {
        if (remainingSeconds <= 5 && remainingSeconds > 0 && timerActiveRef.current && !sessionLoading) {
            timerActiveRef.current = false;
            handleAutoEnd();
        }
    }, [remainingSeconds, sessionLoading]);

    // Auto-end when timer reaches 0
    useEffect(() => {
        if (remainingSeconds === 0 && timerActiveRef.current && !sessionLoading) {
            timerActiveRef.current = false;
            handleAutoEnd();
        }
    }, [remainingSeconds, sessionLoading]);

    const handleAutoEnd = async () => {
        // Stop any ongoing speech and recording when timer expires
        stopSpeaking();
        stopRecording();

        // Small delay to ensure audio is fully stopped before navigation
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_BASE_URL}/api/interview/end`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ sessionId })
            });
            navigate(`/report/${sessionId}`);
        } catch (error) {
            console.error('Auto-end error:', error);
        }
    };

    useEffect(() => {
        connectVision();
        return () => disconnectVision();
    }, [connectVision, disconnectVision]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (webcamRef.current) {
                const imageSrc = webcamRef.current.getScreenshot();
                if (imageSrc) {
                    const base64 = imageSrc.split(',')[1];
                    sendFrame(base64);
                }
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [sendFrame]);


    const voiceModeRef = useRef(voiceMode);
    useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);

    const isRecordingRef = useRef(isRecording);
    useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

    const isSpeakingRef = useRef(isSpeaking);
    useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);

    const isLoadingRef = useRef(isLoading);
    useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);

    // ── Hands-free VAD wiring (Phase 2.2/2.3) ──
    // Uses refs (already maintained above) so the callback identity stays stable
    // — otherwise the effect would re-run and re-register on every render.
    useEffect(() => {
        setVADCallbacks({
            onSpeechStart: () => {
                // Barge-in: cut the AI off mid-sentence when the user starts talking.
                if (isSpeakingRef.current) {
                    stopSpeaking();
                }
                // Start capturing the user's turn if not already.
                if (!isRecordingRef.current && voiceModeRef.current && !isLoadingRef.current) {
                    startRecording();
                }
            },
            onSpeechEnd: () => {
                // Natural end-of-turn: hand off to STT → transcript effect → send.
                if (isRecordingRef.current) {
                    stopRecording();
                }
            },
        });
    }, [setVADCallbacks, stopSpeaking, startRecording, stopRecording]);

    // Start/stop VAD when the toggle flips (or the interview finishes loading).
    // Suspended while paused; resumeInterview() restarts it explicitly.
    useEffect(() => {
        if (handsFreeMode && !sessionLoading && !isPaused) {
            startVAD();
        } else {
            stopVAD();
        }
    }, [handsFreeMode, sessionLoading, isPaused, startVAD, stopVAD]);

    const toggleHandsFree = useCallback(() => {
        setHandsFreeMode(prev => {
            const next = !prev;
            try {
                localStorage.setItem('hands_free_mode', next ? '1' : '0');
            } catch { /* SSR / storage-disabled — safe to ignore */ }
            return next;
        });
    }, []);

    // ── Phase 3.4: repeat last question (no LLM call — just replay audio) ──
    const handleRepeat = useCallback(() => {
        const lastAi = [...messages].reverse().find(m => m.sender === 'ai' && m.text?.trim());
        if (lastAi) {
            stopSpeaking();
            void playResponse(lastAi.text);
        }
    }, [messages, playResponse, stopSpeaking]);

    // ── Phase 2.6: pause / resume ──
    const pauseInterview = useCallback(async () => {
        if (pausedRef.current) return;
        pausedRef.current = true;
        setIsPaused(true);
        // Kill all live audio + capture so nothing runs during the pause.
        stopSpeaking();
        if (isRecordingRef.current) stopRecording();
        stopVAD();
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_BASE_URL}/api/interview/pause`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ sessionId }),
            });
        } catch (err) {
            console.error('Pause failed:', err);
        }
    }, [sessionId, stopSpeaking, stopRecording, stopVAD]);

    const resumeInterview = useCallback(async () => {
        if (!pausedRef.current) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/interview/resume`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ sessionId }),
            });
            const data = await res.json().catch(() => null);
            // Re-sync the local clock to server truth (server excluded paused time).
            if (data?.success && typeof data.data?.remainingSeconds === 'number') {
                const serverElapsed = Math.max(0, totalDurationSeconds - data.data.remainingSeconds);
                setElapsedSeconds(serverElapsed);
                elapsedRef.current = serverElapsed;
            }
        } catch (err) {
            console.error('Resume failed:', err);
        } finally {
            pausedRef.current = false;
            setIsPaused(false);
            // Restore hands-free listening if it was on.
            if (handsFreeMode) startVAD();
        }
    }, [sessionId, totalDurationSeconds, handsFreeMode, startVAD]);

    // Keyboard Event Listener for Push-To-Talk (Hold Spacebar) and Skip (Escape)
    useEffect(() => {
        const spacePressed = { current: false };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                const target = e.target as HTMLElement;
                // Don't trigger if user is typing in inputs, textareas, or contenteditables
                if (
                    target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.isContentEditable
                ) {
                    return;
                }
                
                // Prevent page scroll
                e.preventDefault();

                if (!spacePressed.current && voiceModeRef.current && !isLoadingRef.current) {
                    spacePressed.current = true;
                    // Trigger recording start
                    stopSpeaking();
                    startRecording();
                }
            }

            if (e.key === 'Escape') {
                if (isSpeakingRef.current) {
                    console.log('Skipping AI speech via Escape key');
                    stopSpeaking();
                }
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                const target = e.target as HTMLElement;
                if (
                    target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.isContentEditable
                ) {
                    return;
                }

                e.preventDefault();

                if (spacePressed.current) {
                    spacePressed.current = false;
                    if (isRecordingRef.current) {
                        stopRecording();
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [startRecording, stopRecording, stopSpeaking]);

    const handleSendMessage = useCallback(async (text: string) => {
        if (!text.trim() || isLoading || pausedRef.current) return;

        // Clean slate: cut off any audio still playing from the previous turn
        // (e.g. user typed a new answer while the AI was still speaking).
        stopSpeaking();

        // Add user message + AI placeholder in one batched update.
        setMessages(prev => [
            ...prev,
            { sender: 'user', text, timestamp: new Date() },
            { sender: 'ai', text: '', timestamp: new Date(), streaming: true },
        ]);
        setTextInput('');
        setIsLoading(true);

        // Streaming accumulators (kept in closure to avoid stale React state).
        let aiFullText = '';
        let ttsBuffer = '';
        const ttsQueue: string[] = [];
        let ttsWorkerRunning = false;
        let ttsAborted = false;
        let firstChunkSpoken = false;

        // Speech strategy:
        //  - Sarvam → streaming pipeline (enqueueSpeech): synthesizes sentences
        //    ahead while the current one plays, so audio is gap-free and the
        //    first clip starts almost immediately. Fillers are pre-cached.
        //  - Azure  → sequential awaited playResponse (its SDK streams natively).
        const usePipeline = speechProvider === 'sarvam' && voiceMode && !!enqueueSpeech;
        const useChunkedTTS = speechProvider === 'azure' && voiceMode;
        const wantsTTS = usePipeline || useChunkedTTS;

        // Push a chunk of text into whichever TTS path is active.
        const speakChunk = (chunk: string) => {
            if (!chunk.trim()) return;
            if (usePipeline) {
                enqueueSpeech!(chunk);
            } else {
                ttsQueue.push(chunk);
                void drainTTS();
            }
        };

        // ── Phase 2.4: conversational filler ──
        // A short persona-matched acknowledgement the instant the user finishes,
        // so the AI "reacts" immediately while the LLM is still thinking. For
        // Sarvam this plays from cache (no network wait); it's first in order so
        // it never races the real response.
        if (wantsTTS) {
            const fillers = FILLERS[interviewType as keyof typeof FILLERS] || FILLERS.technical;
            const filler = fillers[fillerCountRef.current % fillers.length];
            fillerCountRef.current += 1;
            speakChunk(filler);
        }

        // Azure sequential worker: plays queued chunks one at a time.
        const drainTTS = async () => {
            if (ttsWorkerRunning || !voiceMode) return;
            ttsWorkerRunning = true;
            try {
                while (ttsQueue.length > 0 && !ttsAborted) {
                    const chunk = ttsQueue.shift()!;
                    try {
                        await playResponse(chunk);
                    } catch (e) {
                        console.error('TTS chunk failed:', e);
                        ttsAborted = true;
                        break;
                    }
                }
            } finally {
                ttsWorkerRunning = false;
            }
        };

        // Extract speakable chunks from ttsBuffer as text streams in.
        // The FIRST chunk breaks on the earliest clause boundary (comma/colon/
        // dash or sentence end) so audio starts as soon as possible; subsequent
        // chunks break on full sentences for natural prosody.
        const flushSentences = () => {
            if (!wantsTTS) return;
            if (!firstChunkSpoken) {
                const m = ttsBuffer.match(/^(.{6,}?[.?!,;:—-])\s/);
                if (m) {
                    firstChunkSpoken = true;
                    speakChunk(m[1].trim());
                    ttsBuffer = ttsBuffer.slice(m[0].length);
                }
            }
            const re = /^(.+?[.?!])\s+/;
            let m: RegExpMatchArray | null;
            // eslint-disable-next-line no-cond-assign
            while ((m = ttsBuffer.match(re))) {
                firstChunkSpoken = true;
                speakChunk(m[1].trim());
                ttsBuffer = ttsBuffer.slice(m[0].length);
            }
        };

        const updateAiMessage = (fullText: string) => {
            setMessages(prev => {
                const arr = [...prev];
                const last = arr[arr.length - 1];
                if (last && last.sender === 'ai') {
                    arr[arr.length - 1] = { ...last, text: fullText };
                }
                return arr;
            });
        };

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/interview/chat-stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ sessionId, message: text, emotions: emotions.slice(0, 5) }),
            });

            if (!res.ok || !res.body) {
                throw new Error(`Stream ${res.status}`);
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                let idx: number;
                // eslint-disable-next-line no-cond-assign
                while ((idx = buffer.indexOf('\n\n')) !== -1) {
                    const eventChunk = buffer.slice(0, idx).trim();
                    buffer = buffer.slice(idx + 2);
                    if (!eventChunk.startsWith('data:')) continue;
                    const dataStr = eventChunk.slice(5).trim();
                    if (!dataStr) continue;
                    try {
                        const evt = JSON.parse(dataStr);
                        if (evt.type === 'meta' && typeof evt.phaseLabel === 'string' && evt.phaseLabel) {
                            setPhaseLabel(evt.phaseLabel);
                        } else if (evt.type === 'delta' && typeof evt.text === 'string') {
                            aiFullText += evt.text;
                            updateAiMessage(aiFullText);
                            if (wantsTTS) {
                                ttsBuffer += evt.text;
                                flushSentences();
                            }
                        } else if (evt.type === 'done') {
                            if (typeof evt.response === 'string' && evt.response.length > 0) {
                                aiFullText = evt.response;
                                updateAiMessage(aiFullText);
                            }
                            if (wantsTTS) {
                                const remainder = ttsBuffer.trim();
                                if (remainder.length > 0) {
                                    speakChunk(remainder);
                                    ttsBuffer = '';
                                }
                                // Flush the streaming connection so Sarvam emits
                                // any remaining buffered audio for this turn.
                                if (usePipeline && flushSpeech) flushSpeech();
                            } else if (voiceMode && aiFullText.length > 0) {
                                // Fallback (no chunked path): play the whole thing at once.
                                void playResponse(aiFullText);
                            }
                        } else if (evt.type === 'error') {
                            console.error('Server stream error:', evt.message);
                        }
                    } catch (e) {
                        console.error('SSE parse error:', e, dataStr);
                    }
                }
            }
        } catch (error) {
            console.error('Streaming chat error:', error);
            // If we never got any text, remove the empty placeholder.
            if (aiFullText.length === 0) {
                setMessages(prev => prev.slice(0, -1));
            }
        } finally {
            setIsLoading(false);
        }
    }, [sessionId, emotions, voiceMode, playResponse, enqueueSpeech, flushSpeech, stopSpeaking, isLoading, speechProvider, interviewType]);

    // Track the last sent transcript to prevent duplicate sends
    const lastSentTranscript = useRef<string>('');

    // Handle voice transcript when user stops recording
    // With accumulation model, transcript only updates when stopListening is called
    useEffect(() => {
        console.log('Transcript effect:', { isRecording, transcript, voiceMode, lastSent: lastSentTranscript.current });

        // Send if we have a new transcript that's different from the last sent one
        // Transcript will only be set when user stops recording (accumulated result)
        if (transcript && voiceMode && transcript !== lastSentTranscript.current && !isRecording) {
            console.log('Sending complete transcribed message:', transcript);
            lastSentTranscript.current = transcript;
            handleSendMessage(transcript);
        }
    }, [transcript, voiceMode, handleSendMessage, isRecording]);

    const handleTextSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (textInput.trim()) {
            handleSendMessage(textInput);
        }
    };

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setTextInput(e.target.value);
    }, []);

    // Handle code submission to AI for evaluation
    const handleCodeSubmit = useCallback(async (code: string, language: string) => {
        if (!code.trim() || isCodeSubmitting) return;
        setIsCodeSubmitting(true);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/interview/code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ sessionId, code, language })
            });

            const data = await res.json();
            if (data.success) {
                // Surface the sandbox execution result (stdout/stderr/exit).
                if (data.data.execution) setCodeExecution(data.data.execution);
                // Add code submission message
                setMessages(prev => [...prev, {
                    sender: 'user',
                    text: `[CODE SUBMISSION - ${language.toUpperCase()}]\n\`\`\`${language}\n${code}\n\`\`\``,
                    timestamp: new Date()
                }]);
                // Add AI evaluation
                setMessages(prev => [...prev, { sender: 'ai', text: data.data.evaluation, timestamp: new Date() }]);

                // Play evaluation if in voice mode
                if (voiceMode) {
                    playResponse(data.data.evaluation);
                }
            }
        } catch (error) {
            console.error('Code submission error:', error);
        } finally {
            setIsCodeSubmitting(false);
        }
    }, [sessionId, voiceMode, playResponse, isCodeSubmitting]);

    // Auto-detect coding questions and open editor
    useEffect(() => {
        if (messages.length === 0) return;
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.sender === 'ai') {
            const codingKeywords = [
                'write a function', 'write code', 'write the code', 'write a program',
                'solve this problem', 'implement a solution', 'code this up',
                'use the code editor', 'open your code editor', 'coding problem',
                'here is the problem', 'here\'s the problem', 'solve the following'
            ];
            const lowerText = lastMessage.text.toLowerCase();
            const isCodingQuestion = codingKeywords.some(kw => lowerText.includes(kw));
            if (isCodingQuestion && !showEditor) {
                setShowEditor(true);
                setShowChat(true); // Show both for context
            }
        }
    }, [messages, showEditor]);

    // Show confirmation modal when clicking End Interview
    const handleEndInterviewClick = () => {
        stopSpeaking(); // Stop AI speech when ending
        setShowEndModal(true);
    };

    // Save transcript and generate report
    const handleSaveReport = async () => {
        stopSpeaking(); // Ensure speech stops
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_BASE_URL}/api/interview/end`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ sessionId })
            });
            navigate(`/report/${sessionId}`);
        } catch (error) {
            console.error('End interview error:', error);
        }
    };

    // Close immediately without saving
    const handleCloseImmediately = async () => {
        stopSpeaking(); // Ensure speech stops
        try {
            const token = localStorage.getItem('token');
            // End session without generating AI report (saves LLM tokens)
            await fetch(`${API_BASE_URL}/api/interview/end-quick`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ sessionId })
            });
            navigate('/dashboard');
        } catch (error) {
            console.error('Close interview error:', error);
            navigate('/dashboard');
        }
    };

    // Toggle between voice and text mode
    const toggleVoiceMode = () => {
        stopSpeaking(); // Stop AI speech when switching modes
        setVoiceMode(!voiceMode);
        if (voiceMode) {
            setShowChat(true);
        }
    };

    // Wrapper to stop AI speech when user starts recording
    const handleStartRecording = () => {
        stopSpeaking(); // Stop AI speech when user starts speaking
        startRecording();
    };

    // Cleanup on unmount - stop all audio/recording when leaving page
    useEffect(() => {
        return () => {
            stopSpeaking();
            stopRecording();
        };
    }, [stopSpeaking, stopRecording]);

    const formatMsgTime = (timestamp?: any) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Render messages list
    const renderMessages = () => (
        <>
            {messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'} mb-1`}>
                    <span className="text-[8px] mb-0.5 text-white/30">
                        {m.sender === 'user' ? 'You' : 'AI'} {m.timestamp ? `• ${formatMsgTime(m.timestamp)}` : ''}
                    </span>
                    <div className={`max-w-[90%] px-3 py-2 rounded text-[11px] leading-relaxed shadow-sm ${
                        m.sender === 'user' 
                            ? 'bg-zinc-800 text-white border border-white/5 rounded-tr-none' 
                            : 'bg-zinc-900 text-white/95 border border-white/5 rounded-tl-none'
                    }`}>
                        <SimpleMarkdown text={m.text} />
                    </div>
                </div>
            ))}
            {isRecording && voiceMode && (
                <div className="flex flex-col items-end animate-pulse">
                    <span className="text-[8px] mb-0.5 text-white/30">Speaking...</span>
                    <div className="max-w-[90%] px-3 py-2 rounded text-[10px] bg-white/5 border border-dashed border-white/10 text-white/30 rounded-tr-none">
                        {transcript || "..."}
                    </div>
                </div>
            )}
            {isLoading && (
                <div className="flex flex-col items-start space-y-1">
                    <span className="text-[8px] text-white/30">AI</span>
                    <div className="px-3 py-2 rounded bg-zinc-900 border border-white/5 flex items-center gap-1 rounded-tl-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-typing-dot" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-typing-dot" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-typing-dot" style={{ animationDelay: '300ms' }} />
                    </div>
                </div>
            )}
            <div ref={chatEndRef} />
        </>
    );

    // Render text input form
    const renderTextInput = () => (
        <form onSubmit={handleTextSubmit} className="shrink-0 p-2 border-t border-white/5">
            <div className="flex gap-2">
                <input
                    ref={inputRef}
                    type="text"
                    value={textInput}
                    onChange={handleInputChange}
                    placeholder="Type your response..."
                    className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/20"
                    disabled={isLoading}
                    autoFocus
                />
                <button
                    type="submit"
                    disabled={!textInput.trim() || isLoading}
                    className="px-3 py-2 bg-white/10 border border-white/10 rounded hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    <Send size={14} className="text-white/70" />
                </button>
            </div>
        </form>
    );

    // Format seconds to MM:SS
    const formatTime = (seconds: number) => {
        if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Determine timer color based on remaining time
    const timerColor = remainingSeconds < 60 ? 'text-red-500' :
        remainingSeconds < 300 ? 'text-yellow-400' : 'text-emerald-400';

    if (sessionLoading) {
        return (
            <div className="h-screen bg-black text-white flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white/50"></div>
                    <p className="text-xs text-white/50">Loading session...</p>
                </div>
            </div>
        );
    }

    if (sessionError) {
        return (
            <div className="h-screen bg-black text-white flex items-center justify-center">
                <div className="text-red-400 bg-red-500/10 border border-red-500/20 px-6 py-4 rounded-lg text-sm">
                    {sessionError}
                    <button onClick={() => navigate('/dashboard')} className="block mt-4 text-xs text-white/50 hover:text-white underline mx-auto">
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
            {/* Header with status indicators */}
            <header className="h-12 shrink-0 flex items-center justify-between px-6 border-b border-white/5 bg-black/50">
                <div className="flex items-center gap-4">
                    <span className="text-[10px] text-white/30">
                        Session: {sessionId?.slice(0, 8)}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded ${voiceMode ? 'bg-white/10 text-white/60' : 'bg-white/5 text-white/40'}`}>
                        {voiceMode ? '🎤 Voice' : '⌨️ Text'}
                    </span>
                    {phaseLabel && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/20" title="Interview progress">
                            {phaseLabel}
                        </span>
                    )}
                    <button
                        onClick={handleRepeat}
                        disabled={isSpeaking}
                        className="text-[10px] px-2 py-0.5 rounded text-white/40 hover:text-white hover:bg-white/5 border border-white/10 disabled:opacity-30 transition-colors"
                        title="Replay the interviewer's last message"
                    >
                        🔁 Repeat
                    </button>

                    {/* Visual Status Indicator */}
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/50 border border-white/10">
                        {isLoading ? (
                            <span className="flex items-center gap-2 text-xs text-yellow-400">
                                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                                Processing...
                            </span>
                        ) : isSpeaking ? (
                            <span className="flex items-center gap-2 text-xs text-blue-400">
                                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                                AI Speaking...
                            </span>
                        ) : isRecording ? (
                            <span className="flex items-center gap-2 text-xs text-green-400">
                                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                Listening...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2 text-xs text-white/40">
                                <span className="w-2 h-2 rounded-full bg-white/30" />
                                Ready
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Countdown timer — inline in the header (no more floating overlap) */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/15" title="Time remaining">
                        <Clock className="w-3.5 h-3.5 text-white/50" />
                        <span className={`text-sm font-mono font-bold tabular-nums ${timerColor}`}>
                            {formatTime(remainingSeconds)}
                        </span>
                    </div>
                    <button
                        onClick={isPaused ? resumeInterview : pauseInterview}
                        className={`px-3 py-1.5 text-xs border rounded transition-colors ${
                            isPaused
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                                : 'text-white/50 hover:text-white border-white/10 hover:bg-white/5'
                        }`}
                        title={isPaused ? 'Resume interview' : 'Pause interview (freezes the timer)'}
                    >
                        {isPaused ? '▶ Resume' : '⏸ Pause'}
                    </button>
                    <button onClick={handleEndInterviewClick} className="px-3 py-1.5 text-xs text-white/50 hover:text-white border border-white/10 rounded hover:bg-white/5 transition-colors">
                        End Interview
                    </button>
                </div>
            </header>

            {/* Paused overlay */}
            {isPaused && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-[60]">
                    <div className="flex flex-col items-center gap-5 text-center px-6">
                        <div className="w-16 h-16 rounded-full border border-white/20 flex items-center justify-center">
                            <span className="text-3xl">⏸</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-light text-white mb-1">Interview Paused</h3>
                            <p className="text-sm text-white/50">The timer is frozen. Take your time.</p>
                        </div>
                        <button
                            onClick={resumeInterview}
                            className="px-6 py-2.5 bg-white text-black rounded-full text-sm font-medium hover:bg-white/90 transition-colors"
                        >
                            ▶ Resume Interview
                        </button>
                    </div>
                </div>
            )}

            {/* End Interview Confirmation Modal */}
            {showEndModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="bg-zinc-900 border border-white/10 rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-medium text-white mb-2">End Interview?</h3>
                        <p className="text-sm text-white/60 mb-6">
                            Would you like to save your interview transcript and generate a performance report, or close immediately without saving?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleCloseImmediately}
                                className="flex-1 px-4 py-2 text-sm text-white/50 hover:text-white border border-white/10 rounded hover:bg-white/5 transition-colors"
                            >
                                Close Immediately
                            </button>
                            <button
                                onClick={handleSaveReport}
                                className="flex-1 px-4 py-2 text-sm bg-white text-black rounded hover:bg-white/90 transition-colors font-medium"
                            >
                                Save Report
                            </button>
                        </div>
                        <button
                            onClick={() => setShowEndModal(false)}
                            className="mt-4 w-full text-xs text-white/30 hover:text-white/50"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )
            }

            {
                audioError && (
                    <div className="px-6 py-2 bg-white/5 text-xs text-white/50 border-b border-white/5">⚠ {audioError}</div>
                )
            }

            {/* Main Area */}
            <div className="flex-1 flex overflow-hidden pt-2">
                <div className="flex-1 flex flex-col">
                    {/* Video/Grid Container — row on desktop, stacked column on mobile */}
                    <div className="flex-1 p-4 overflow-y-auto md:overflow-hidden">
                        <div className="w-full h-full flex flex-col md:flex-row gap-4">
                            {/* Transcript/Chat Panel - Optional */}
                            {showChat && (
                                <div className="w-full md:w-72 shrink-0 h-56 md:h-auto order-3 md:order-none bg-black/50 border border-white/10 rounded-lg overflow-hidden flex flex-col">
                                    <div className="h-10 shrink-0 flex items-center justify-between px-3 border-b border-white/5">
                                        <span className="text-[10px] uppercase tracking-wider text-white/40">{voiceMode ? 'Transcript' : 'Chat'}</span>
                                        <button onClick={() => setShowChat(false)} className="text-white/30 hover:text-white/60"><X size={12} /></button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                        {renderMessages()}
                                    </div>
                                    {!voiceMode && renderTextInput()}
                                </div>
                            )}

                            {/* User Cam */}
                            <div className="flex-1 relative bg-black border border-white/10 rounded-lg overflow-hidden min-h-44 md:min-h-0 order-2 md:order-none">
                                <Webcam ref={webcamRef} audio={false} className="w-full h-full object-cover" />
                                <div className="absolute bottom-3 left-3 bg-black/70 px-2 py-1 rounded text-xs text-white/60">{(user as any)?.name || 'You'}</div>
                                <div className="absolute top-3 right-3 hidden md:flex flex-col gap-1.5 items-end">
                                    {emotions.slice(0, 5).map((e: any, i: number) => (
                                        <div key={i} className="bg-black/70 px-2.5 py-1 rounded text-[10px] flex items-center gap-2 border border-white/10 backdrop-blur-sm">
                                            <span className="text-white/70 min-w-[72px] text-right">{e.name}</span>
                                            <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{ width: `${Math.max(e.score * 100, 2)}%`, backgroundColor: e.color || '#9ca3af' }}
                                                />
                                            </div>
                                            <span className="text-white/40 w-7 text-right font-mono">{Math.round(e.score * 100)}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Center Icons — column on desktop, horizontal bar on mobile */}
                            <div className="w-full md:w-14 shrink-0 flex flex-row md:flex-col items-center justify-center gap-3 order-4 md:order-none">
                                <button aria-label="Toggle transcript panel" onClick={() => setShowChat(!showChat)} className={`p-2.5 rounded transition-all ${showChat ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white hover:bg-white/5'}`} title="Transcript">
                                    <MessageSquare size={16} />
                                </button>
                                <button aria-label={voiceMode ? 'Switch to text mode' : 'Switch to voice mode'} onClick={toggleVoiceMode} className={`p-2.5 rounded transition-all ${!voiceMode ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white hover:bg-white/5'}`} title="Toggle Voice/Text">
                                    {voiceMode ? <Mic size={16} /> : <MicOff size={16} />}
                                </button>
                                <button
                                    aria-label={handsFreeMode ? 'Disable hands-free mode' : 'Enable hands-free mode'}
                                    onClick={toggleHandsFree}
                                    disabled={vadLoading}
                                    className={`p-2.5 rounded transition-all ${
                                        handsFreeMode
                                            ? 'bg-emerald-500/20 text-emerald-400'
                                            : 'text-white/30 hover:text-white hover:bg-white/5'
                                    } ${vadLoading ? 'opacity-50 cursor-wait' : ''}`}
                                    title={
                                        vadLoading
                                            ? 'Loading VAD model…'
                                            : handsFreeMode
                                                ? 'Hands-free ON — the AI listens for you and can be interrupted'
                                                : 'Enable hands-free mode (VAD)'
                                    }
                                >
                                    <Radio size={16} className={handsFreeMode && vadUserSpeaking ? 'animate-pulse' : ''} />
                                </button>
                                <button aria-label="Toggle code editor" onClick={() => setShowEditor(!showEditor)} className={`p-2.5 rounded transition-all ${showEditor ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white hover:bg-white/5'}`} title="Code Editor">
                                    <Code size={16} />
                                </button>
                            </div>

                            {/* AI Cam OR Code Editor - they swap places */}
                            {showEditor ? (
                                /* Code Editor replaces AI Cam */
                                <div className="flex-1 bg-black/50 border border-white/10 rounded-lg overflow-hidden flex flex-col min-h-80 md:min-h-0 order-1 md:order-none">
                                    <div className="h-10 shrink-0 flex items-center justify-between px-3 border-b border-white/5">
                                        <span className="text-[10px] uppercase tracking-wider text-white/40">Code Editor</span>
                                        <button aria-label="Close code editor" onClick={() => setShowEditor(false)} className="text-white/30 hover:text-white/60"><X size={12} /></button>
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <CodeEditor onSubmit={handleCodeSubmit} isSubmitting={isCodeSubmitting} executionResult={codeExecution} />
                                    </div>
                                </div>
                            ) : (
                                /* AI Cam - default view */
                                <div className="flex-1 relative flex min-h-56 md:min-h-0 order-1 md:order-none">
                                    <AIInterviewerAvatar
                                        isSpeaking={isSpeaking}
                                        isListening={isRecording}
                                        isProcessing={isLoading}
                                        interviewType={interviewType}
                                        audioRef={audioRef}
                                    />
                                    {isSpeaking && (
                                        <button
                                            onClick={stopSpeaking}
                                            className="absolute top-4 right-4 z-20 px-3 py-1.5 bg-black/60 hover:bg-black/80 text-white/85 hover:text-white border border-white/10 hover:border-white/20 rounded-lg text-xs backdrop-blur-sm shadow-xl flex items-center gap-1.5 transition-all glow-hover"
                                            title="Skip voice response (Esc)"
                                        >
                                            <Square size={10} className="fill-white" />
                                            <span>Skip Voice</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Controls Bar - Fixed at Bottom */}
                    <div className="h-16 shrink-0 flex items-center justify-center gap-4 border-t border-white/5 bg-black/20 backdrop-blur-md">
                        {voiceMode ? (
                            <div className="flex items-center gap-6">
                                <div className="relative">
                                    <button
                                        onClick={() => {
                                            if (isRecording) {
                                                stopRecording();
                                            } else {
                                                handleStartRecording();
                                            }
                                        }}
                                        className={`w-14 h-14 rounded-full flex flex-col items-center justify-center transition-all relative ${
                                            isRecording
                                                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                                                : 'bg-white/5 text-white/80 hover:bg-white/10 border border-white/10 hover:border-white/20'
                                        }`}
                                        title={isRecording ? 'Click to stop and send (or release Spacebar)' : 'Click to record / Hold Spacebar to speak'}
                                    >
                                        {isRecording ? <Square size={18} className="fill-red-400" /> : <Mic size={20} />}
                                        
                                        {isRecording && (
                                            <span className="absolute inset-0 rounded-full border-2 border-red-500/50 animate-ping opacity-75" />
                                        )}
                                    </button>
                                    <span className="absolute left-1/2 -translate-x-1/2 -bottom-6 text-[9px] text-white/40 whitespace-nowrap select-none">
                                        {isRecording ? 'Click to Send' : 'Hold Space to Talk'}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-xs text-white/40">
                                <MicOff size={16} />
                                <span>Text mode active - use chat to respond</span>
                            </div>
                        )}

                        <div className="w-px h-8 bg-white/10 mx-2" />

                        {isSpeaking && (
                            <button
                                onClick={stopSpeaking}
                                className="px-4 py-2 text-xs bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 hover:border-white/20 rounded-full flex items-center gap-1.5 transition-all"
                                title="Skip voice response (Esc)"
                            >
                                <Square size={10} className="fill-white" />
                                <span>Skip Voice</span>
                            </button>
                        )}

                        <button
                            onClick={toggleVoiceMode}
                            className={`px-4 py-2 text-xs border rounded-full transition-all ${voiceMode ? 'text-white/60 border-white/10 hover:bg-white/10' : 'bg-white/10 text-white border-white/20'}`}
                        >
                            {voiceMode ? 'Switch to Text' : 'Switch to Voice'}
                        </button>

                        <button
                            onClick={handleEndInterviewClick}
                            className="px-4 py-2 text-xs text-white/60 hover:text-white border border-white/10 rounded-full hover:bg-white/10 transition-all"
                        >
                            End Interview
                        </button>
                    </div>
                </div>
            </div>
        </div >
    );
};
