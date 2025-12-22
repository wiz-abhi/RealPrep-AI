import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import { GlassCard } from '../components/ui/GlassCard';
import { Clock } from 'lucide-react';

export const PreJoinPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { sessionId, agentArgs } = location.state || {};

    const [duration, setDuration] = useState(15); // Default 15 minutes
    const durationOptions = [10, 15, 20, 30, 45, 60];

    const [checks, setChecks] = useState([
        { id: 'init', label: 'Initializing AI process', status: 'pending' },
        { id: 'session', label: 'Creating interview session', status: 'pending' },
        { id: 'env', label: 'Setting up environment', status: 'pending' },
        { id: 'camera', label: 'Camera permission', status: 'pending' },
        { id: 'mic', label: 'Microphone permission', status: 'pending' },
        { id: 'final', label: 'Finalizing setup', status: 'pending' }
    ]);

    const [allChecksPassed, setAllChecksPassed] = useState(false);
    const [cameraReady, setCameraReady] = useState(false);
    const webcamRef = useRef<Webcam>(null);

    useEffect(() => {
        runChecks();
    }, []);

    const updateCheck = (id: string, status: 'running' | 'completed' | 'error') => {
        setChecks(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    };

    const runChecks = async () => {
        updateCheck('init', 'running');
        await new Promise(r => setTimeout(r, 600));
        updateCheck('init', 'completed');

        updateCheck('session', 'running');
        await new Promise(r => setTimeout(r, 600));
        updateCheck('session', 'completed');

        updateCheck('env', 'running');
        await new Promise(r => setTimeout(r, 600));
        updateCheck('env', 'completed');

        try {
            updateCheck('camera', 'running');
            updateCheck('mic', 'running');
            await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            updateCheck('camera', 'completed');
            updateCheck('mic', 'completed');
            setCameraReady(true);
        } catch (err) {
            console.error("Permission denied", err);
            updateCheck('camera', 'error');
            updateCheck('mic', 'error');
            return;
        }

        updateCheck('final', 'running');
        await new Promise(r => setTimeout(r, 800));
        updateCheck('final', 'completed');

        setAllChecksPassed(true);
    };

    const handleBegin = () => {
        navigate('/interview', { state: { sessionId, agentArgs, duration } });
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
                                <span className="text-white/40">Ready</span>
                            </div>
                        </GlassCard>

                        {/* Duration Selector */}
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

                        <div className="flex justify-between text-xs text-white/30 px-1">
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

                        <div className="pt-4">
                            {allChecksPassed ? (
                                <button
                                    onClick={handleBegin}
                                    className="btn-primary w-full text-sm tracking-wide"
                                >
                                    Begin Interview ({duration} min)
                                </button>
                            ) : (
                                <div className="h-12" />
                            )}
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};
