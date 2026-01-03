import { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from '../config/api';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Webcam from 'react-webcam';
import { CodeEditor } from '../components/ui/CodeEditor';
import { useSpeech } from '../hooks/useSpeech';
import { useHumeVision } from '../hooks/useHumeVision';
import { Mic, MicOff, Square, Code, MessageSquare, X, Send, Clock, Bot } from 'lucide-react';

export const InterviewPage = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [showChat, setShowChat] = useState(false);
    const [showEditor, setShowEditor] = useState(false);
    const [voiceMode, setVoiceMode] = useState(true);
    const [_hasPlayedInitial, setHasPlayedInitial] = useState(false);
    const [textInput, setTextInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showEndModal, setShowEndModal] = useState(false);
    const [sessionLoading, setSessionLoading] = useState(true);
    const [sessionError, setSessionError] = useState<string | null>(null);

    // Timer state
    const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
    const [startedAt, setStartedAt] = useState<string>('');
    const [_durationMinutes, setDurationMinutes] = useState<number>(30);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const isGridView = showChat && showEditor;

    const {
        transcript,
        interimTranscript: _interimTranscript,
        isRecording,
        isProcessing: _isProcessing,
        isSpeaking: _isSpeaking,
        error: audioError,
        startRecording,
        stopRecording,
        playResponse,
        stopSpeaking,
        provider: _speechProvider
    } = useSpeech();

    const {
        connect: connectVision,
        disconnect: disconnectVision,
        sendFrame,
        emotions,
        isConnected: isVisionConnected
    } = useHumeVision();

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

                // Set timer values
                setStartedAt(session.startedAt);
                setDurationMinutes(session.durationMinutes);

                // Calculate remaining time
                let startTime = new Date(session.startedAt).getTime();
                if (isNaN(startTime)) {
                    console.warn('Invalid startedAt date, defaulting to now');
                    startTime = Date.now();
                }

                const endTime = startTime + (session.durationMinutes * 60 * 1000);
                const now = Date.now();
                const remaining = Math.max(0, Math.floor((endTime - now) / 1000));

                console.log('Timer Init:', { startedAt: session.startedAt, duration: session.durationMinutes, remaining, startTime, endTime, now });
                setRemainingSeconds(remaining);

                // Load existing transcript
                if (session.transcript && session.transcript.length > 0) {
                    setMessages(session.transcript.map((t: any) => ({
                        sender: t.sender,
                        text: t.text
                    })));

                    // Play the last AI message (greeting or continuation)
                    const lastMessage = session.transcript[session.transcript.length - 1];
                    if (lastMessage.sender === 'ai') {
                        console.log('Auto-playing last AI message');
                        setTimeout(() => {
                            // Use ref or just assume voiceMode is default true on load
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

    // Countdown timer
    useEffect(() => {
        if (remainingSeconds <= 0) return;

        const timer = setInterval(() => {
            setRemainingSeconds(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    // Auto-end session when time is up - will be handled after render
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [remainingSeconds]);

    // Auto-end when timer reaches 0
    useEffect(() => {
        if (remainingSeconds === 0 && startedAt && !sessionLoading) {
            // Timer has expired - auto-save and end
            handleAutoEnd();
        }
    }, [remainingSeconds, startedAt, sessionLoading]);

    const handleAutoEnd = async () => {
        // Stop any ongoing speech and recording when timer expires
        stopSpeaking();
        stopRecording();

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


    const handleSendMessage = useCallback(async (text: string) => {
        if (!text.trim() || isLoading) return;
        setMessages(prev => [...prev, { sender: 'user', text }]);
        setTextInput('');
        setIsLoading(true);

        try {
            const token = localStorage.getItem('token');
            const userGeminiKey = localStorage.getItem('user_gemini_api_key');
            const res = await fetch(`${API_BASE_URL}/api/interview/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    ...(userGeminiKey && { 'X-User-Gemini-Key': userGeminiKey })
                },
                body: JSON.stringify({ sessionId, message: text, emotions: emotions.slice(0, 3) })
            });

            const data = await res.json();
            if (data.success) {
                setMessages(prev => [...prev, { sender: 'ai', text: data.data.response }]);
                if (voiceMode) {
                    playResponse(data.data.response);
                }
            }
        } catch (error) {
            console.error('Chat error:', error);
        } finally {
            setIsLoading(false);
        }
    }, [sessionId, emotions, voiceMode, playResponse, isLoading]);

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
            // End session without generating AI report (saves Gemini tokens)
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

    // Cleanup on component unmount (tab close, navigation)
    useEffect(() => {
        return () => {
            stopSpeaking();
        };
    }, [stopSpeaking]);

    // Render messages list
    const renderMessages = () => (
        <>
            {messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    <span className="text-[8px] mb-0.5 text-white/30">{m.sender === 'user' ? 'You' : 'AI'}</span>
                    <div className={`max-w-[90%] px-2 py-1.5 rounded text-[11px] leading-relaxed ${m.sender === 'user' ? 'bg-white/10 text-white/80' : 'bg-white/5 text-white/60'}`}>{m.text}</div>
                </div>
            ))}
            {isRecording && voiceMode && (
                <div className="flex flex-col items-end animate-pulse">
                    <span className="text-[8px] mb-0.5 text-white/30">Speaking...</span>
                    <div className="max-w-[90%] px-2 py-1 rounded text-[10px] bg-white/5 border border-dashed border-white/10 text-white/30">{transcript || "..."}</div>
                </div>
            )}
            {isLoading && (
                <div className="flex flex-col items-start">
                    <span className="text-[8px] mb-0.5 text-white/30">AI</span>
                    <div className="px-2 py-1 rounded text-[10px] bg-white/5 text-white/30 animate-pulse">Thinking...</div>
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
            {/* FLOATING TIMER - Always visible in top-right */}
            <div className="fixed top-20 right-6 z-50">
                <div className="flex items-center gap-2 px-4 py-3 bg-zinc-900 rounded-xl border border-white/20 shadow-2xl">
                    <Clock className="w-5 h-5 text-white/70" />
                    <div className="flex flex-col leading-none">
                        <span className="text-[9px] text-white/50 uppercase tracking-wider">Time Left</span>
                        <span className={`text-xl font-mono font-bold ${timerColor}`}>
                            {formatTime(remainingSeconds)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Header with status indicators */}
            <header className="h-12 shrink-0 flex items-center justify-between px-6 border-b border-white/5 bg-black/50">
                <div className="flex items-center gap-4">
                    <h2 className="text-sm font-light text-white/70">
                        Technical Interview
                        <span className="ml-2 px-2 py-0.5 text-[10px] bg-white/5 text-white/40 rounded">
                            {sessionId?.slice(0, 8)}
                        </span>
                    </h2>
                    <span className="text-[10px] text-white/30">
                        {isVisionConnected ? '● Vision' : '○ Connecting'}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded ${voiceMode ? 'bg-white/10 text-white/60' : 'bg-white/5 text-white/40'}`}>
                        {voiceMode ? '🎤 Voice' : '⌨️ Text'}
                    </span>
                </div>
                <button onClick={handleEndInterviewClick} className="px-3 py-1.5 text-xs text-white/50 hover:text-white border border-white/10 rounded hover:bg-white/5 transition-colors">
                    End Interview
                </button>
            </header>

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
            )}

            {audioError && (
                <div className="px-6 py-2 bg-white/5 text-xs text-white/50 border-b border-white/5">⚠ {audioError}</div>
            )}

            {/* Main Area */}
            <div className="flex-1 flex overflow-hidden pt-2">
                <div className="flex-1 flex flex-col">
                    {/* Video/Grid Container */}
                    <div className="flex-1 p-4 overflow-hidden">
                        {isGridView ? (
                            /* 2x2 Grid View */
                            <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-3">
                                {/* User Cam */}
                                <div className="relative bg-black border border-white/10 rounded-lg overflow-hidden">
                                    <Webcam ref={webcamRef} audio={false} className="w-full h-full object-cover" />
                                    <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-0.5 rounded text-[10px] text-white/60">
                                        {(user as any)?.name || 'You'}
                                    </div>
                                </div>

                                {/* AI Cam */}
                                <div className="relative bg-gradient-to-b from-[#0a0a0a] to-black border border-white/10 rounded-lg overflow-hidden flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="w-16 h-16 mx-auto rounded-full overflow-hidden border border-white/10 mb-2 bg-zinc-900 flex items-center justify-center relative">
                                            <div className="absolute inset-0 bg-blue-500/10 animate-pulse" />
                                            <Bot size={32} className="text-white/80 relative z-10" />
                                        </div>
                                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] border ${!isRecording ? 'bg-white/5 text-white/60 border-white/10' : 'text-white/30 border-white/5'}`}>
                                            <span className={`w-1 h-1 rounded-full ${!isRecording ? 'bg-white animate-pulse' : 'bg-white/20'}`} />
                                            {!isRecording ? 'Speaking' : 'Listening'}
                                        </div>
                                    </div>
                                </div>

                                {/* Chat */}
                                <div className="bg-black/50 border border-white/10 rounded-lg overflow-hidden flex flex-col">
                                    <div className="h-10 shrink-0 flex items-center justify-between px-3 border-b border-white/5">
                                        <span className="text-[10px] uppercase tracking-wider text-white/40">{voiceMode ? 'Transcript' : 'Chat'}</span>
                                        <button onClick={() => setShowChat(false)} className="text-white/30 hover:text-white/60"><X size={12} /></button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                        {renderMessages()}
                                    </div>
                                    {!voiceMode && renderTextInput()}
                                </div>

                                {/* Code Editor */}
                                <div className="bg-black/50 border border-white/10 rounded-lg overflow-hidden flex flex-col">
                                    <div className="h-10 shrink-0 flex items-center justify-between px-3 border-b border-white/5">
                                        <span className="text-[10px] uppercase tracking-wider text-white/40">Code Editor</span>
                                        <button onClick={() => setShowEditor(false)} className="text-white/30 hover:text-white/60"><X size={12} /></button>
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <CodeEditor onCodeChange={() => { }} language="javascript" />
                                    </div>
                                </div>
                            </div>
                        ) : !voiceMode ? (
                            /* Text Mode - Chat alongside cam */
                            <div className="w-full h-full flex gap-4">
                                {/* User Cam - smaller */}
                                <div className="w-1/3 relative bg-black border border-white/10 rounded-lg overflow-hidden">
                                    <Webcam ref={webcamRef} audio={false} className="w-full h-full object-cover" />
                                    <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-0.5 rounded text-[10px] text-white/60">
                                        {(user as any)?.name || 'You'}
                                    </div>
                                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                                        {emotions.slice(0, 3).map((e: any, i) => (
                                            <div key={i} className="bg-black/70 px-2 py-0.5 rounded text-[9px] flex items-center gap-1.5 border border-white/10">
                                                <span className="text-white/50">{e.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Chat Panel - main focus */}
                                <div className="flex-1 bg-black/50 border border-white/10 rounded-lg overflow-hidden flex flex-col">
                                    <div className="h-10 shrink-0 flex items-center justify-between px-3 border-b border-white/5">
                                        <span className="text-[10px] uppercase tracking-wider text-white/40">Chat</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                        {renderMessages()}
                                    </div>
                                    {renderTextInput()}
                                </div>

                                {/* Center Icons */}
                                <div className="w-14 shrink-0 flex flex-col items-center justify-center gap-3">
                                    <button onClick={toggleVoiceMode} className={`p-2.5 rounded transition-all ${!voiceMode ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white hover:bg-white/5'}`} title="Toggle Voice/Text">
                                        {voiceMode ? <Mic size={16} /> : <MicOff size={16} />}
                                    </button>
                                    <button onClick={() => setShowEditor(!showEditor)} className={`p-2.5 rounded transition-all ${showEditor ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white hover:bg-white/5'}`} title="Code Editor">
                                        <Code size={16} />
                                    </button>
                                </div>

                                {/* Code Editor Panel */}
                                {showEditor && (
                                    <div className="w-[35%] shrink-0 bg-black/50 border border-white/10 rounded-lg overflow-hidden flex flex-col">
                                        <div className="h-10 shrink-0 flex items-center justify-between px-3 border-b border-white/5">
                                            <span className="text-[10px] uppercase tracking-wider text-white/40">Code Editor</span>
                                            <button onClick={() => setShowEditor(false)} className="text-white/30 hover:text-white/60"><X size={12} /></button>
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <CodeEditor onCodeChange={() => { }} language="javascript" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Voice Mode - Default View */
                            <div className="w-full h-full flex">
                                {/* Chat Panel */}
                                {showChat && (
                                    <div className="w-72 shrink-0 mr-4 bg-black/50 border border-white/10 rounded-lg overflow-hidden flex flex-col">
                                        <div className="h-10 shrink-0 flex items-center justify-between px-3 border-b border-white/5">
                                            <span className="text-[10px] uppercase tracking-wider text-white/40">Transcript</span>
                                            <button onClick={() => setShowChat(false)} className="text-white/30 hover:text-white/60"><X size={12} /></button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                            {renderMessages()}
                                        </div>
                                    </div>
                                )}

                                {/* User Cam */}
                                <div className="flex-1 relative bg-black border border-white/10 rounded-lg overflow-hidden">
                                    <Webcam ref={webcamRef} audio={false} className="w-full h-full object-cover" />
                                    <div className="absolute bottom-3 left-3 bg-black/70 px-2 py-1 rounded text-xs text-white/60">{(user as any)?.name || 'You'}</div>
                                    <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
                                        {emotions.slice(0, 3).map((e: any, i) => (
                                            <div key={i} className="bg-black/70 px-2.5 py-1 rounded text-[10px] flex items-center gap-2 border border-white/10">
                                                <span className="text-white/60">{e.name}</span>
                                                <div className="w-10 h-1 bg-white/10 rounded"><div className="h-full bg-white/60 rounded" style={{ width: `${e.score * 100}%` }} /></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Center Icons */}
                                <div className="w-14 shrink-0 flex flex-col items-center justify-center gap-3">
                                    <button onClick={() => setShowChat(!showChat)} className={`p-2.5 rounded transition-all ${showChat ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white hover:bg-white/5'}`} title="Transcript">
                                        <MessageSquare size={16} />
                                    </button>
                                    <button onClick={toggleVoiceMode} className={`p-2.5 rounded transition-all ${!voiceMode ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white hover:bg-white/5'}`} title="Toggle Voice/Text">
                                        {voiceMode ? <Mic size={16} /> : <MicOff size={16} />}
                                    </button>
                                    <button onClick={() => setShowEditor(!showEditor)} className={`p-2.5 rounded transition-all ${showEditor ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white hover:bg-white/5'}`} title="Code Editor">
                                        <Code size={16} />
                                    </button>
                                </div>

                                {/* AI Cam */}
                                <div className="flex-1 relative bg-gradient-to-b from-[#0a0a0a] to-black border border-white/10 rounded-lg overflow-hidden flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border border-white/10 mb-4 bg-zinc-900 flex items-center justify-center relative">
                                            <div className="absolute inset-0 bg-blue-500/20 animate-pulse" />
                                            <Bot size={48} className="text-white/80 relative z-10" />
                                        </div>
                                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border ${!isRecording ? 'bg-white/5 text-white/60 border-white/10' : 'text-white/30 border-white/5'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${!isRecording ? 'bg-white animate-pulse' : 'bg-white/20'}`} />
                                            {!isRecording ? 'Speaking...' : 'Listening'}
                                        </div>
                                    </div>
                                    <div className="absolute bottom-3 left-3 bg-black/70 px-2 py-1 rounded text-xs text-white/60">AI Interviewer</div>
                                </div>

                                {/* Code Editor Panel */}
                                {showEditor && (
                                    <div className="w-[40%] shrink-0 ml-4 bg-black/50 border border-white/10 rounded-lg overflow-hidden flex flex-col">
                                        <div className="h-10 shrink-0 flex items-center justify-between px-3 border-b border-white/5">
                                            <span className="text-[10px] uppercase tracking-wider text-white/40">Code Editor</span>
                                            <button onClick={() => setShowEditor(false)} className="text-white/30 hover:text-white/60"><X size={12} /></button>
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <CodeEditor onCodeChange={() => { }} language="javascript" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Controls Bar - Fixed at Bottom */}
                    <div className="h-16 shrink-0 flex items-center justify-center gap-4 border-t border-white/5">
                        {voiceMode ? (
                            <>
                                <button
                                    onClick={handleStartRecording}
                                    disabled={isRecording}
                                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-white/5 text-white/20' : 'bg-white/10 text-white hover:bg-white/15 border border-white/10'}`}
                                >
                                    <Mic size={20} />
                                </button>
                                <button
                                    onClick={stopRecording}
                                    disabled={!isRecording}
                                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${!isRecording ? 'bg-white/5 text-white/20' : 'bg-white/10 text-white hover:bg-white/15 border border-white/10'}`}
                                >
                                    <Square size={16} />
                                </button>
                            </>
                        ) : (
                            <div className="flex items-center gap-2 text-xs text-white/40">
                                <MicOff size={16} />
                                <span>Text mode active - use chat to respond</span>
                            </div>
                        )}

                        <div className="w-px h-8 bg-white/10 mx-2" />

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
        </div>
    );
};
