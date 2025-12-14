import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Webcam from 'react-webcam';
import Sidebar from '../components/layout/Sidebar';
import { GlassCard } from '../components/ui/GlassCard';
import { useElevenLabs } from '../hooks/useElevenLabs';
import { useHumeVision } from '../hooks/useHumeVision';
import { motion } from 'framer-motion';

export const InterviewPage = () => {
    const location = useLocation();
    const { sessionId, agentArgs } = location.state || {}; // Passed from Landing/Setup

    // --- Hooks ---
    const {
        transcript,
        isRecording,
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

    // --- Lifecycle ---
    useEffect(() => {
        // Start Vision
        connectVision();
        return () => disconnectVision();
    }, [connectVision, disconnectVision]);

    // Frame Loop for Vision
    useEffect(() => {
        const interval = setInterval(() => {
            if (isVisionConnected && webcamRef.current) {
                const imageSrc = webcamRef.current.getScreenshot();
                if (imageSrc) {
                    // Remove data:image/jpeg;base64, prefix if needed by API
                    sendFrame(imageSrc);
                }
            }
        }, 1000); // 1 FPS needed for simple emotion tracking to save bandwidth
        return () => clearInterval(interval);
    }, [isVisionConnected, sendFrame]);

    // --- Interaction Loop ---

    // 1. Initial Greeting
    useEffect(() => {
        if (agentArgs?.initialMessage) {
            setMessages([{ sender: 'ai', text: agentArgs.initialMessage }]);
            playResponse(agentArgs.initialMessage);
        }
    }, [agentArgs, playResponse]);

    // 2. Handle User Transcript (Final)
    const handleSendMessage = async (text: string) => {
        if (!text) return;

        // Add User Message
        setMessages(prev => [...prev, { sender: 'user', text }]);

        // Call Backend
        try {
            const res = await fetch('http://localhost:3000/api/interview/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, message: text })
            });

            const data = await res.json();
            const aiMessage = data.data?.message || data.message;

            // Add AI Message
            setMessages(prev => [...prev, { sender: 'ai', text: aiMessage }]);

            // Play AI Response
            playResponse(aiMessage);

        } catch (error) {
            console.error('Chat error:', error);
        }
    };

    // 3. Handle Stop Speaking - Send transcript when user stops
    const handleStopSpeaking = () => {
        stopRecording();
        // Wait a moment for final transcript to update
        setTimeout(() => {
            if (transcript && transcript.trim()) {
                handleSendMessage(transcript);
            }
        }, 500);
    };

    // 4. Handle End Interview
    const handleEndInterview = async () => {
        try {
            const token = localStorage.getItem('token');
            await fetch('http://localhost:3000/api/interview/end', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ sessionId })
            });

            // Navigate to report
            window.location.href = `/report/${sessionId}`;
        } catch (error) {
            console.error('End interview error:', error);
        }
    };

    return (
        <div className="flex bg-[#050505] min-h-screen text-white font-sans selection:bg-cyan-500/30">
            <Sidebar />

            <main className="flex-1 p-6 flex gap-6 h-screen overflow-hidden">
                {/* Left: Avatar & AI State */}
                <div className="flex-[2] flex flex-col gap-6">
                    <GlassCard className="flex-1 flex items-center justify-center relative overflow-hidden">
                        {/* 3D Avatar Placeholder */}
                        <div className="w-64 h-64 rounded-full bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 animate-pulse flex items-center justify-center border border-white/10 backdrop-blur-md">
                            <span className="text-3xl font-thin tracking-widest opacity-50">AVATAR</span>
                        </div>

                        {/* Audio Player (Hidden) */}
                        <audio ref={audioRef} className="hidden" />

                        {/* Transcript Overlay */}
                        <div className="absolute bottom-10 left-10 right-10 text-center">
                            <p className="text-cyan-400 font-mono text-sm mb-2">{isRecording ? "Listening..." : "Processing..."}</p>
                            <p className="text-xl font-light glass-text">{transcript}</p>
                        </div>
                    </GlassCard>

                    {/* Chat History / Control Panel */}
                    <GlassCard className="h-48 p-4 overflow-y-auto">
                        {messages.map((m, i) => (
                            <div key={i} className={`mb-2 ${m.sender === 'user' ? 'text-right text-gray-300' : 'text-left text-cyan-300'}`}>
                                <span className="text-xs opacity-50 block">{m.sender === 'user' ? 'YOU' : 'SARAH'}</span>
                                {m.text}
                            </div>
                        ))}
                    </GlassCard>
                </div>

                {/* Right: User Camera & Vision Metrics */}
                <div className="flex-1 flex flex-col gap-6">
                    <GlassCard className="relative aspect-video rounded-2xl overflow-hidden border-2 border-white/10">
                        <Webcam
                            ref={webcamRef}
                            audio={false}
                            screenshotFormat="image/jpeg"
                            className="w-full h-full object-cover opacity-80"
                        />
                        {/* Vision Overlay */}
                        <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                            {emotions.map((e: any, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="bg-black/60 backdrop-blur px-3 py-1 rounded-full border border-white/10 text-xs flex items-center gap-2"
                                >
                                    <span className="text-gray-300">{e.name}</span>
                                    <div className="w-16 h-1 bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-cyan-400 to-purple-400"
                                            style={{ width: `${e.score * 100}%` }}
                                        />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </GlassCard>

                    <GlassCard className="flex-1 p-6">
                        <h3 className="text-lg font-light mb-4 text-white/50">Controls</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={startRecording}
                                disabled={isRecording}
                                className={`p-4 rounded-xl border border-white/10 transition-all ${isRecording ? 'bg-red-500/20 text-red-300 cursor-not-allowed' : 'bg-white/5 hover:bg-white/10'}`}
                            >
                                {isRecording ? '🎤 Recording...' : '🎤 Start Speaking'}
                            </button>
                            <button
                                onClick={handleStopSpeaking}
                                disabled={!isRecording}
                                className={`p-4 rounded-xl border border-white/10 transition-all ${!isRecording ? 'opacity-50 cursor-not-allowed' : 'bg-white/5 hover:bg-white/10'}`}
                            >
                                ⏹️ Stop Speaking
                            </button>
                            <button
                                onClick={handleEndInterview}
                                className="col-span-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-300 transition-all"
                            >
                                🏁 End Interview
                            </button>
                        </div>
                    </GlassCard>
                </div>
            </main>
        </div>
    );
};
