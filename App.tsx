import { useState } from 'react';
import { Camera, Sparkles } from 'lucide-react';
import { useWebcam } from './hooks/useWebcam';
import { AppStatus, FILTERS, PhotoData } from './types';
import PhotoStrip from './components/PhotoStrip';

const CAPTURE_COUNT = 4;
const COUNTDOWN_TIME = 3;

// Synthesize sound effects to avoid external dependencies
const playSound = (type: 'beep' | 'shutter' | 'finish') => {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;
  if (type === 'beep') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === 'shutter') {
    // White noise burst for shutter
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
  } else if (type === 'finish') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.linearRampToValueAtTime(880, now + 0.2);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.4);
    osc.start(now);
    osc.stop(now + 0.4);
  }
};

export default function App() {
  const { videoRef, error } = useWebcam();
  const [status, setStatus] = useState<AppStatus>('idle');
  const [activeFilterId, setActiveFilterId] = useState<string>('normal');
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [countdown, setCountdown] = useState<number>(0);
  const [flash, setFlash] = useState(false);
  const [stripColor, setStripColor] = useState('white');

  const activeFilter = FILTERS.find(f => f.id === activeFilterId) || FILTERS[0];

  const captureFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // 1. Draw Video
      // Flip horizontally if it's the user camera to mirror expectation
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);

      // Apply CSS-like filters via context filter (supported in modern browsers)
      if (activeFilter.cssFilter !== 'none') {
        ctx.filter = activeFilter.cssFilter;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Reset transform for overlays
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.filter = 'none';

      // 2. Apply Canvas-based Overlays (Grain/Vignette) if filter requests it
      if (activeFilter.hasOverlay) {
        // Vignette
        const gradient = ctx.createRadialGradient(
          canvas.width / 2,
          canvas.height / 2,
          canvas.height / 3,
          canvas.width / 2,
          canvas.height / 2,
          canvas.height
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setPhotos(prev => [...prev, { id: Date.now().toString(), dataUrl, filterId: activeFilterId }]);
    }
  };

  const startPhotoboothSession = async () => {
    setPhotos([]);
    setStatus('countdown');

    for (let i = 0; i < CAPTURE_COUNT; i++) {
      // Countdown phase
      setStatus('countdown');
      for (let c = COUNTDOWN_TIME; c > 0; c--) {
        setCountdown(c);
        playSound('beep');
        await new Promise(r => setTimeout(r, 1000));
      }

      // Capture phase
      setStatus('capturing');
      setFlash(true);
      playSound('shutter');
      captureFrame();
      await new Promise(r => setTimeout(r, 100));

      setFlash(false);

      // Brief review/pause phase
      if (i < CAPTURE_COUNT - 1) {
        await new Promise(r => setTimeout(r, 800));
      }
    }
    playSound('finish');
    setStatus('review');
  };

  const reset = () => {
    setStatus('idle');
    setPhotos([]);
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-950 text-white p-4">
        <div className="bg-red-900/50 backdrop-blur-lg p-8 rounded-2xl shadow-2xl max-w-md text-center border border-red-800">
          <Camera className="w-16 h-16 mx-auto mb-6 opacity-50" />
          <h2 className="text-2xl font-bold mb-3">Camera Access Needed</h2>
          <p className="text-red-200">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center py-6 px-4 sm:px-6 relative overflow-x-hidden selection:bg-indigo-500/30">
      {/* Header */}
      <header className="mb-8 z-10 text-center relative group cursor-default">
        <div className="absolute inset-0 bg-indigo-500/20 blur-[50px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        <h1 className="relative text-5xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-indigo-200 to-white/50 drop-shadow-sm">
          LUMINA
        </h1>
        <p className="relative mt-2 text-indigo-200/50 font-medium tracking-[0.3em] text-xs uppercase">
          Studio Photobooth
        </p>
      </header>

      <main className="w-full max-w-6xl z-10 flex flex-col lg:flex-row gap-8 lg:gap-12 items-start justify-center">
        {/* Left Side: Viewfinder & Controls */}
        <div className={`flex flex-col gap-6 w-full lg:max-w-xl transition-all duration-700 ease-out transform ${status === 'review' ? 'hidden lg:flex lg:opacity-40 lg:pointer-events-none lg:scale-95 lg:blur-[2px]' : 'opacity-100 scale-100'}`}>
          {/* Viewfinder Container */}
          <div className="relative aspect-[4/3] w-full bg-gray-900 rounded-[2rem] overflow-hidden shadow-2xl ring-8 ring-white/5 group">
            {/* Live Video Feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1] transition-all duration-300"
              style={{ filter: activeFilter.cssFilter }}
            />

            {/* Vignette/Grain Overlay (Visual only, actual burned in canvas) */}
            {activeFilter.hasOverlay && (
              <div
                className="absolute inset-0 pointer-events-none z-0"
                style={{
                  background: 'radial-gradient(circle, transparent 50%, rgba(0,0,0,0.4) 100%)',
                  boxShadow: 'inset 0 0 50px rgba(0,0,0,0.5)',
                }}
              />
            )}

            {/* UI Overlays */}
            <div className="absolute inset-0 z-10 flex flex-col justify-between p-6">
              <div className="flex justify-between items-start">
                <div className="px-3 py-1 bg-black/40 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-wider text-white/70 border border-white/10 shadow-lg">
                  {activeFilter.name}
                </div>

                <div className="flex gap-1.5">
                  {Array.from({ length: CAPTURE_COUNT }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i < photos.length ? 'w-6 bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.5)]' : 'w-1.5 bg-white/20'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Status Layers */}
            {status === 'idle' && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 backdrop-blur-[2px] transition-all duration-500 group-hover:backdrop-blur-none group-hover:bg-black/10">
                <button
                  onClick={startPhotoboothSession}
                  className="group/btn relative flex items-center gap-3 px-10 py-5 bg-white text-black rounded-full overflow-hidden hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_0_50px_-10px_rgba(255,255,255,0.5)]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover/btn:opacity-10 transition-opacity duration-300" />
                  <Camera size={24} strokeWidth={2.5} />
                  <span className="font-bold text-lg tracking-tight">Start Booth</span>
                </button>
              </div>
            )}

            {status === 'countdown' && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
                <div
                  key={countdown}
                  className="text-[12rem] font-black text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-pop leading-none"
                >
                  {countdown}
                </div>
              </div>
            )}

            {/* Flash Effect */}
            <div
              className={`absolute inset-0 z-50 bg-white pointer-events-none mix-blend-overlay transition-opacity duration-100 ease-out ${
                flash ? 'opacity-100' : 'opacity-0'
              }`}
            />
            <div
              className={`absolute inset-0 z-50 bg-white pointer-events-none transition-opacity duration-75 ease-out ${
                flash ? 'opacity-40' : 'opacity-0'
              }`}
            />
          </div>

          {/* Filter Selection */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-3xl w-full shadow-xl">
            <div className="flex items-center gap-2 mb-4 px-1">
              <Sparkles size={14} className="text-indigo-300" />
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-100/60">Effect Library</span>
            </div>
            <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 px-1 snap-x">
              {FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilterId(filter.id)}
                  disabled={status !== 'idle'}
                  className={`relative flex flex-col items-center gap-2 min-w-[80px] snap-center transition-all duration-300 group ${
                    status !== 'idle' ? 'opacity-50 cursor-not-allowed grayscale' : 'opacity-100 hover:opacity-100'
                  }`}
                >
                  <div
                    className={`relative w-20 h-20 rounded-2xl shadow-lg border-2 transition-all duration-300 overflow-hidden ${
                      activeFilterId === filter.id ? 'border-indigo-400 scale-100 ring-4 ring-indigo-500/20' : 'border-transparent scale-95 opacity-70 group-hover:scale-100 group-hover:opacity-100'
                    }`}
                  >
                    {/* Preview Box Color */}
                    <div
                      className={`w-full h-full ${filter.previewColor}`}
                      style={{ filter: filter.cssFilter }}
                    />
                    {/* Active Indicator */}
                    {activeFilterId === filter.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="w-2 h-2 bg-white rounded-full shadow-[0_0_10px_white]" />
                      </div>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      activeFilterId === filter.id ? 'text-white' : 'text-white/40 group-hover:text-white/70'
                    }`}
                  >
                    {filter.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Result Strip */}
        {(status === 'review' || photos.length > 0) && (
          <div className="w-full lg:w-auto flex justify-center">
            <PhotoStrip photos={photos} selectedColorId={stripColor} onColorChange={setStripColor} onRetake={reset} />
          </div>
        )}
      </main>

      {/* Ambient Background Lights */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none -z-10 mix-blend-screen animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-fuchsia-600/10 rounded-full blur-[150px] pointer-events-none -z-10 mix-blend-screen" />
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-2" />
    </div>
  );
}