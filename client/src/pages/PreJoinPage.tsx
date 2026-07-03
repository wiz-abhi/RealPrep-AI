import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config/api';
import { useLocation, useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import { GlassCard } from '../components/ui/GlassCard';
import { Clock, Mic } from 'lucide-react';

export const PreJoinPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { sessionId, agentArgs, durationMinutes: initialDuration } = location.state || {};

    // Use duration from setup page, or default to 15
    const [duration, setDuration] = useState(initialDuration || 15);
    const durationOptions = [5, 10, 15, 30];

    const [checks, setChecks] = useState([
        { id: 'init', label: 'Initializing AI process', status: 'pending' },
        { id: 'session', label: 'Creating interview session', status: 'pending' },
        { id: 'camera', label: 'Camera permission', status: 'pending' },
        { id: 'mic', label: 'Microphone — say something to test', status: 'pending' },
    ]);

    const [allChecksPassed, setAllChecksPassed] = useState(false);
    const [cameraReady, setCameraReady] = useState(false);
    const [micLevel, setMicLevel] = useState(0);      // 0-100 live level
    const [micHeard, setMicHeard] = useState(false);  // true once real sound detected
    const webcamRef = useRef<Webcam>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);
    const rafRef = useRef<number>(0);
    const micHeardRef = useRef(false);

    useEffect(() => {
        runChecks();
        return () => {
            // Release mic + audio context on unmount.
            cancelAnimationFrame(rafRef.current);
            micStreamRef.current?.getTracks().forEach(t => t.stop());
            audioContextRef.current?.close().catch(() => { });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const updateCheck = (id: string, status: 'running' | 'completed' | 'error') => {
        setChecks(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    };

    // Real mic test: analyse the live input; the check passes when actual
    // sound is detected (user speaks / claps), not merely when permission is granted.
    const startMicMeter = (stream: MediaStream) => {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
            analyser.getByteTimeDomainData(data);
            // RMS of the waveform, scaled to 0-100.
            let sum = 0;
            for (let i = 0; i < data.length; i++) {
                const v = (data[i] - 128) / 128;
                sum += v * v;
            }
            const rms = Math.sqrt(sum / data.length);
            const level = Math.min(100, Math.round(rms * 300));
            setMicLevel(level);

            if (level > 12 && !micHeardRef.current) {
                micHeardRef.current = true;
                setMicHeard(true);
                updateCheck('mic', 'completed');
            }
            rafRef.current = requestAnimationFrame(tick);
        };
        tick();
    };

    const runChecks = async () => {
        updateCheck('init', 'running');
        await new Promise(r => setTimeout(r, 400));
        updateCheck('init', 'completed');

        updateCheck('session', 'running');
        await new Promise(r => setTimeout(r, 400));
        updateCheck('session', 'completed');

        try {
            updateCheck('camera', 'running');
            updateCheck('mic', 'running');
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            micStreamRef.current = stream;
            updateCheck('camera', 'completed');
            setCameraReady(true);
            // Mic stays 'running' until we actually hear the user.
            startMicMeter(stream);
        } catch (err) {
            console.error("Permission denied", err);
            updateCheck('camera', 'error');
            updateCheck('mic', 'error');
        }
    };

    // All passed = every check completed (mic requires real sound).
    useEffect(() => {
        setAllChecksPassed(checks.every(c => c.status === 'completed'));
    }, [checks]);

    const handleBegin = async () => {
        // Update session duration before starting
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_BASE_URL}/api/interview/session/${sessionId}/duration`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ durationMinutes: duration })
            });
        } catch (error) {
            console.error('Failed to update duration:', error);
        }
        // Release the test stream before the interview page grabs its own.
        micStreamRef.current?.getTracks().forEach(t => t.stop());
        // Navigate with sessionId in URL for persistence on reload
        navigate(`/interview/${sessionId}`);
    };

    return (
        <div className="flex min-h-screen bg-black text-white">
            <main className="flex-1 flex items-center justify-center p-8 pt-20">
                <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

                    {/* Left: Camera */}
                    <div className="space-y-4">
                        <div className="mb-6">
                            <h2 className="text-2xl font-light text-white">System Check</h2>
                            <p className="text-white/40 text-sm mt-1">Verify your environment before starting</p>
                        </div>

                        <GlassCard className="aspect-video relative overflow-hidden rounded-lg p-0 bg-black">
                            {cameraReady ? (
                                <Webcam
                                    ref={webcamRef}
                                    audio={false}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-white/5">
                                    <span className="text-white/20 text-sm">Waiting for camera...</span>
                                </div>
                            )}

                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-between text-xs">
                                <span className="text-white/60">Candidate</span>
                                <span className="text-white/40">{cameraReady ? 'Ready' : 'Waiting'}</span>
                            </div>
                        </GlassCard>

                        {/* Live mic level meter */}
                        <GlassCard className="p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <Mic size={16} className={micHeard ? 'text-emerald-400' : 'text-white/40'} />
                                <span className="text-sm text-white/70">Microphone Test</span>
                                {micHeard ? (
                                    <span className="text-[10px] text-emerald-400 ml-auto">✓ Sound detected</span>
                                ) : (
                                    <span className="text-[10px] text-white/30 ml-auto">Say "hello" or clap</span>
                                )}
                            </div>
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-75 ${micHeard ? 'bg-emerald-400' : 'bg-white/40'}`}
                                    style={{ width: `${micLevel}%` }}
                                />
                            </div>
                        </GlassCard>

                        {/* Duration Selector - Override if needed */}
                        <GlassCard className="p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <Clock size={16} className="text-white/40" />
                                <span className="text-sm text-white/70">Interview Duration</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {durationOptions.map((d) => (
                                    <button
                                        key={d}
                                        onClick={() => setDuration(d)}
                                        className={`px-3 py-1.5 rounded text-xs transition-all ${duration === d
                                            ? 'bg-white/10 text-white border border-white/20'
                                            : 'bg-white/5 text-white/40 border border-white/5 hover:bg-white/10'
                                            }`}
                                    >
                                        {d} min
                                    </button>
                                ))}
                            </div>
                        </GlassCard>

                        <div className="flex justify-between text-xs text-white/30 px-1 mt-2">
                            <span>Position: {agentArgs?.jobTitle || 'Software Developer'}</span>
                            <span>Duration: {duration} min</span>
                        </div>
                    </div>

                    {/* Right: Checklist */}
                    <div className="space-y-6">
                        <div className="space-y-0">
                            {checks.map((check) => (
                                <div key={check.id} className="flex items-center gap-4 py-4 border-b border-white/5 last:border-0">
                                    <div className={`w-3 h-3 rounded-full border flex items-center justify-center
                                        ${check.status === 'completed' ? 'bg-white border-white' :
                                            check.status === 'running' ? 'bg-transparent border-white/40 animate-pulse' :
                                                check.status === 'error' ? 'bg-transparent border-white/20' : 'bg-transparent border-white/10'}
                                    `}>
                                        {check.status === 'completed' && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
                                    </div>
                                    <span className={`text-sm ${check.status === 'pending' ? 'text-white/20' : check.status === 'error' ? 'text-white/40' : 'text-white/70'}`}>
                                        {check.label}
                                        {check.status === 'error' && <span className="text-white/30 ml-2">(Failed)</span>}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Quick how-it-works card */}
                        <GlassCard className="p-4">
                            <p className="text-[10px] uppercase tracking-wider text-white/30 mb-2">How it works</p>
                            <ul className="space-y-1.5 text-xs text-white/50">
                                <li>🎙 <strong className="text-white/70">Hands-free</strong> — toggle the radio icon and just talk; interrupt the AI anytime</li>
                                <li>⌨️ <strong className="text-white/70">Push-to-talk</strong> — hold Spacebar as a fallback</li>
                                <li>🔁 <strong className="text-white/70">Repeat</strong> — replay the last question from the header</li>
                                <li>⏸ <strong className="text-white/70">Pause</strong> — freezes the timer if you need a break</li>
                            </ul>
                        </GlassCard>

                        <div className="pt-2">
                            {allChecksPassed ? (
                                <button
                                    onClick={handleBegin}
                                    className="btn-primary w-full text-sm tracking-wide"
                                >
                                    Begin Interview
                                </button>
                            ) : (
                                <div className="h-12 flex items-center justify-center text-xs text-white/30">
                                    {checks.find(c => c.id === 'mic')?.status === 'running'
                                        ? 'Waiting for your voice — say something!'
                                        : 'Running checks...'}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};
