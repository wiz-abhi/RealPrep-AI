import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Webcam from 'react-webcam';
import { CodeEditor } from '../components/ui/CodeEditor';
import { useElevenLabs } from '../hooks/useElevenLabs';
import { useHumeVision } from '../hooks/useHumeVision';
import { Mic, Square, Code, MessageSquare, X } from 'lucide-react';

export const InterviewPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { sessionId, agentArgs } = location.state || {};
    const { user } = useAuth();

    const [showTranscript, setShowTranscript] = useState(false);
    const [showEditor, setShowEditor] = useState(false);
    const [hasPlayedInitial, setHasPlayedInitial] = useState(false);

    const isGridView = showTranscript && showEditor;

    const {
        transcript,
        isRecording,
        error: audioError,
        startRecording,
        stopRecording,
        playResponse,
        audioRef
    } = useElevenLabs();

    const {
        connect: connectVision,
        disconnect: disconnectVision,
        sendFrame,
        emotions,
        isConnected: isVisionConnected
    } = useHumeVision();

    const webcamRef = useRef<Webcam>(null);
    const [messages, setMessages] = useState<any[]>([]);

    // Auto-play AI's initial greeting when page loads
    useEffect(() => {
        if (agentArgs?.initialMessage && !hasPlayedInitial) {
            setHasPlayedInitial(true);
            setMessages([{ sender: 'ai', text: agentArgs.initialMessage }]);
            // Small delay to ensure audio context is ready
            setTimeout(() => {
                playResponse(agentArgs.initialMessage);
            }, 500);
        }
    }, [agentArgs, hasPlayedInitial, playResponse]);

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

    useEffect(() => {
        if (!isRecording && transcript) {
            handleSendMessage(transcript);
        }
    }, [isRecording]);

    const handleSendMessage = async (text: string) => {
        if (!text.trim()) return;
        setMessages(prev => [...prev, { sender: 'user', text }]);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:3000/api/interview/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ sessionId, message: text, emotions: emotions.slice(0, 3) })
            });

            const data = await res.json();
            if (data.success) {
                setMessages(prev => [...prev, { sender: 'ai', text: data.data.response }]);
                playResponse(data.data.response);
            }
        } catch (error) {
            console.error('Chat error:', error);
        }
    };

    const handleEndInterview = async () => {
        try {
            const token = localStorage.getItem('token');
            await fetch('http://localhost:3000/api/interview/end', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ sessionId })
            });
            navigate(`/report/${sessionId}`);
        } catch (error) {
            console.error('End interview error:', error);
        }
    };

    return (
        <div className="h-screen bg-black text-white flex flex-col">
            {/* Header */}
            <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-white/5">
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
                </div>
                <button onClick={handleEndInterview} className="px-3 py-1.5 text-xs text-white/50 hover:text-white border border-white/10 rounded hover:bg-white/5">
                    End Interview
                </button>
            </header>

            {audioError && (
                <div className="px-6 py-2 bg-white/5 text-xs text-white/50 border-b border-white/5">⚠ {audioError}</div>
            )}

            {/* Main Area - Fixed Height */}
            <div className="flex-1 flex overflow-hidden">
                {/* Content Area */}
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
                                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                                        {emotions.slice(0, 3).map((e: any, i) => (
                                            <div key={i} className="bg-black/70 px-2 py-0.5 rounded text-[9px] flex items-center gap-1.5 border border-white/10">
                                                <span className="text-white/50">{e.name}</span>
                                                <div className="w-8 h-0.5 bg-white/10 rounded"><div className="h-full bg-white/50 rounded" style={{ width: `${e.score * 100}%` }} /></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* AI Cam */}
                                <div className="relative bg-gradient-to-b from-[#0a0a0a] to-black border border-white/10 rounded-lg overflow-hidden flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="w-16 h-16 mx-auto rounded-full overflow-hidden border border-white/10 mb-2">
                                            <img src="https://img.freepik.com/free-photo/portrait-young-businesswoman-holding-eyeglasses-hand-against-gray-backdrop_23-2148029483.jpg" alt="AI" className="w-full h-full object-cover opacity-70" />
                                        </div>
                                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] border ${!isRecording ? 'bg-white/5 text-white/60 border-white/10' : 'text-white/30 border-white/5'}`}>
                                            <span className={`w-1 h-1 rounded-full ${!isRecording ? 'bg-white animate-pulse' : 'bg-white/20'}`} />
                                            {!isRecording ? 'Speaking' : 'Listening'}
                                        </div>
                                    </div>
                                    <audio ref={audioRef} className="hidden" />
                                    <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-0.5 rounded text-[10px] text-white/60">AI Interviewer</div>
                                </div>

                                {/* Transcript */}
                                <div className="bg-black/50 border border-white/10 rounded-lg overflow-hidden flex flex-col">
                                    <div className="h-10 shrink-0 flex items-center justify-between px-3 border-b border-white/5">
                                        <span className="text-[10px] uppercase tracking-wider text-white/40">Transcript</span>
                                        <button onClick={() => setShowTranscript(false)} className="text-white/30 hover:text-white/60"><X size={12} /></button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                        {messages.map((m, i) => (
                                            <div key={i} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                                <span className="text-[8px] mb-0.5 text-white/30">{m.sender === 'user' ? 'You' : 'AI'}</span>
                                                <div className={`max-w-[90%] px-2 py-1 rounded text-[10px] ${m.sender === 'user' ? 'bg-white/10 text-white/80' : 'bg-white/5 text-white/60'}`}>{m.text}</div>
                                            </div>
                                        ))}
                                    </div>
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
                        ) : (
                            /* Default View */
                            <div className="w-full h-full flex">
                                {/* Transcript Panel */}
                                {showTranscript && (
                                    <div className="w-72 shrink-0 mr-4 bg-black/50 border border-white/10 rounded-lg overflow-hidden flex flex-col">
                                        <div className="h-10 shrink-0 flex items-center justify-between px-3 border-b border-white/5">
                                            <span className="text-[10px] uppercase tracking-wider text-white/40">Transcript</span>
                                            <button onClick={() => setShowTranscript(false)} className="text-white/30 hover:text-white/60"><X size={12} /></button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                            {messages.map((m, i) => (
                                                <div key={i} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                                    <span className="text-[8px] mb-0.5 text-white/30">{m.sender === 'user' ? 'You' : 'AI'}</span>
                                                    <div className={`max-w-[90%] px-2 py-1 rounded text-[10px] ${m.sender === 'user' ? 'bg-white/10 text-white/80' : 'bg-white/5 text-white/60'}`}>{m.text}</div>
                                                </div>
                                            ))}
                                            {isRecording && (
                                                <div className="flex flex-col items-end animate-pulse">
                                                    <span className="text-[8px] mb-0.5 text-white/30">Speaking...</span>
                                                    <div className="max-w-[90%] px-2 py-1 rounded text-[10px] bg-white/5 border border-dashed border-white/10 text-white/30">{transcript || "..."}</div>
                                                </div>
                                            )}
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
                                    <button onClick={() => setShowTranscript(!showTranscript)} className={`p-2.5 rounded transition-all ${showTranscript ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white hover:bg-white/5'}`} title="Transcript">
                                        <MessageSquare size={16} />
                                    </button>
                                    <button onClick={() => setShowEditor(!showEditor)} className={`p-2.5 rounded transition-all ${showEditor ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white hover:bg-white/5'}`} title="Code Editor">
                                        <Code size={16} />
                                    </button>
                                </div>

                                {/* AI Cam */}
                                <div className="flex-1 relative bg-gradient-to-b from-[#0a0a0a] to-black border border-white/10 rounded-lg overflow-hidden flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border border-white/10 mb-4">
                                            <img src="https://img.freepik.com/free-photo/portrait-young-businesswoman-holding-eyeglasses-hand-against-gray-backdrop_23-2148029483.jpg" alt="AI" className="w-full h-full object-cover opacity-70" />
                                        </div>
                                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border ${!isRecording ? 'bg-white/5 text-white/60 border-white/10' : 'text-white/30 border-white/5'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${!isRecording ? 'bg-white animate-pulse' : 'bg-white/20'}`} />
                                            {!isRecording ? 'Speaking...' : 'Listening'}
                                        </div>
                                    </div>
                                    <audio ref={audioRef} className="hidden" />
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
                        <button
                            onClick={startRecording}
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

                        <div className="w-px h-8 bg-white/10 mx-2" />

                        <button
                            onClick={handleEndInterview}
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
