import React, { useEffect, useRef, useState, useCallback } from 'react';

interface AIInterviewerAvatarProps {
    isSpeaking: boolean;
    isListening: boolean;
    isProcessing: boolean;
    interviewerName?: string;
    interviewType?: string;
    audioRef?: React.RefObject<HTMLAudioElement | null>;
}

// Map interview type to interviewer name
const getInterviewerName = (type?: string, name?: string) => {
    if (name) return name;
    switch (type) {
        case 'behavioral': return 'Michael Torres';
        case 'systemDesign': return 'Alex Rivera';
        default: return 'Friday';
    }
};

const getInterviewerRole = (type?: string) => {
    switch (type) {
        case 'behavioral': return 'HR Manager';
        case 'systemDesign': return 'Principal Engineer';
        default: return 'Technical Interviewer';
    }
};

export const AIInterviewerAvatar: React.FC<AIInterviewerAvatarProps> = ({
    isSpeaking,
    isListening,
    isProcessing,
    interviewerName,
    interviewType,
    audioRef
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const animFrameRef = useRef<number>(0);
    const drawFrameRef = useRef<number>(0);
    const [audioLevel, setAudioLevel] = useState(0);

    const name = getInterviewerName(interviewType, interviewerName);
    const role = getInterviewerRole(interviewType);
    const initials = name.split(' ').map(n => n[0]).join('');

    // Connect to audio element for waveform analysis
    const connectAnalyser = useCallback(() => {
        const audio = audioRef?.current;
        if (!audio) return;

        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new AudioContext();
            }
            const ctx = audioContextRef.current;

            // Only create a new source if we haven't connected this element before
            if (!sourceRef.current) {
                sourceRef.current = ctx.createMediaElementSource(audio);
            }

            if (!analyserRef.current) {
                analyserRef.current = ctx.createAnalyser();
                analyserRef.current.fftSize = 256;
                analyserRef.current.smoothingTimeConstant = 0.7;
            }

            sourceRef.current.connect(analyserRef.current);
            analyserRef.current.connect(ctx.destination);
        } catch (e) {
            // Already connected or browser doesn't support — silent fail
            console.debug('Audio analyser connection skipped:', e);
        }
    }, [audioRef]);

    // Monitor audio levels when speaking
    useEffect(() => {
        if (!isSpeaking) {
            setAudioLevel(0);
            return;
        }

        connectAnalyser();

        const tick = () => {
            if (analyserRef.current) {
                const data = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(data);
                const avg = data.reduce((a, b) => a + b, 0) / data.length;
                setAudioLevel(avg / 255); // Normalize to 0-1
            } else {
                // Fallback: simulate audio level with a sine wave
                setAudioLevel(0.3 + 0.3 * Math.sin(Date.now() / 200));
            }
            animFrameRef.current = requestAnimationFrame(tick);
        };

        animFrameRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animFrameRef.current);
    }, [isSpeaking, connectAnalyser]);

    // Draw waveform bars on canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const draw = () => {
            const w = canvas.width;
            const h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            if (!isSpeaking && !isProcessing) {
                return;
            }

            const barCount = 32;
            const barWidth = w / barCount * 0.6;
            const gap = w / barCount * 0.4;

            if (analyserRef.current && isSpeaking) {
                const data = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(data);

                for (let i = 0; i < barCount; i++) {
                    const dataIdx = Math.floor(i * data.length / barCount);
                    const barH = (data[dataIdx] / 255) * h * 0.8;
                    const x = i * (barWidth + gap) + gap / 2;
                    const y = (h - barH) / 2;

                    const gradient = ctx.createLinearGradient(x, y, x, y + barH);
                    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.8)');
                    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.2)');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(x, y, barWidth, barH);
                }
            } else {
                // Simulated bars for processing state
                for (let i = 0; i < barCount; i++) {
                    const phase = Date.now() / 300 + i * 0.3;
                    const barH = (0.15 + 0.15 * Math.sin(phase)) * h;
                    const x = i * (barWidth + gap) + gap / 2;
                    const y = (h - barH) / 2;

                    ctx.fillStyle = isProcessing
                        ? `rgba(250, 204, 21, ${0.3 + 0.2 * Math.sin(phase)})`
                        : `rgba(16, 185, 129, ${0.2 + 0.15 * Math.sin(phase)})`;
                    ctx.fillRect(x, y, barWidth, barH);
                }
            }

            // Store EACH rescheduled frame id — cancelling only the first left
            // the loop running forever (stacking a new loop per state flip).
            drawFrameRef.current = requestAnimationFrame(draw);
        };

        drawFrameRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(drawFrameRef.current);
    }, [isSpeaking, isProcessing]);

    // Status text and colors
    const getStatusConfig = () => {
        if (isSpeaking) return { text: 'Speaking', color: 'emerald', dotClass: 'bg-emerald-400 animate-pulse' };
        if (isProcessing) return { text: 'Thinking...', color: 'yellow', dotClass: 'bg-yellow-400 animate-pulse' };
        if (isListening) return { text: 'Listening', color: 'blue', dotClass: 'bg-blue-400 animate-pulse' };
        return { text: 'Ready', color: 'white', dotClass: 'bg-white/30' };
    };

    const status = getStatusConfig();
    const ringScale = isSpeaking ? 1 + audioLevel * 0.25 : 1;

    return (
        <div className="flex-1 relative bg-gradient-to-b from-[#0a0a0a] to-black border border-white/10 rounded-lg overflow-hidden flex flex-col items-center justify-center">
            {/* Animated background rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* Outer ring 3 */}
                <div
                    className={`absolute w-48 h-48 rounded-full border transition-all duration-300 ${
                        isSpeaking ? 'border-emerald-500/15' :
                        isProcessing ? 'border-yellow-400/10' :
                        'border-white/5'
                    }`}
                    style={{ transform: `scale(${isSpeaking ? ringScale * 1.15 : 1})` }}
                />
                {/* Outer ring 2 */}
                <div
                    className={`absolute w-40 h-40 rounded-full border transition-all duration-200 ${
                        isSpeaking ? 'border-emerald-500/20' :
                        isProcessing ? 'border-yellow-400/15' :
                        'border-white/5'
                    }`}
                    style={{ transform: `scale(${isSpeaking ? ringScale * 1.08 : 1})` }}
                />
                {/* Inner ring */}
                <div
                    className={`absolute w-32 h-32 rounded-full border transition-all duration-150 ${
                        isSpeaking ? 'border-emerald-500/30' :
                        isProcessing ? 'border-yellow-400/20' :
                        isListening ? 'border-blue-400/20' :
                        'border-white/5'
                    }`}
                    style={{ transform: `scale(${isSpeaking ? ringScale : 1})` }}
                />
            </div>

            {/* Avatar circle */}
            <div className="relative z-10 flex flex-col items-center">
                <div
                    className={`w-24 h-24 rounded-full overflow-hidden border-2 mb-3 flex items-center justify-center relative transition-all duration-300 ${
                        isSpeaking ? 'border-emerald-500/60 shadow-lg shadow-emerald-500/20' :
                        isProcessing ? 'border-yellow-400/40 shadow-lg shadow-yellow-400/10' :
                        isListening ? 'border-blue-400/40' :
                        'border-white/15'
                    }`}
                >
                    {/* Animated background glow */}
                    <div className={`absolute inset-0 transition-all duration-300 ${
                        isSpeaking ? 'bg-emerald-500/20' :
                        isProcessing ? 'bg-yellow-400/10' :
                        isListening ? 'bg-blue-500/10' :
                        'bg-gradient-to-b from-zinc-800 to-zinc-900'
                    }`} />

                    {/* Initials or Bot icon */}
                    <div className="relative z-10 flex flex-col items-center justify-center">
                        <span className="text-2xl font-light text-white/90 tracking-wider">{initials}</span>
                    </div>
                </div>

                {/* Name & Role */}
                <div className="text-center mb-3">
                    <p className="text-sm font-medium text-white/80">{name}</p>
                    <p className="text-[10px] text-white/35 uppercase tracking-wider">{role}</p>
                </div>

                {/* Status badge */}
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border transition-all duration-300 ${
                    isSpeaking ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' :
                    isProcessing ? 'bg-yellow-400/15 text-yellow-400 border-yellow-400/25' :
                    isListening ? 'bg-blue-500/15 text-blue-400 border-blue-500/25' :
                    'text-white/30 border-white/5 bg-white/5'
                }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass}`} />
                    {status.text}
                </div>
            </div>

            {/* Waveform canvas — shown when speaking or processing */}
            {(isSpeaking || isProcessing) && (
                <canvas
                    ref={canvasRef}
                    width={280}
                    height={40}
                    className="relative z-10 mt-4 opacity-80"
                />
            )}

            {/* Idle breathing animation */}
            {!isSpeaking && !isProcessing && !isListening && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-28 h-28 rounded-full border border-white/5 animate-[breathe_4s_ease-in-out_infinite]" />
                </div>
            )}

            {/* Bottom label */}
            <div className="absolute bottom-3 left-3 bg-black/70 px-2 py-1 rounded text-xs text-white/60">
                AI Interviewer
            </div>
        </div>
    );
};
