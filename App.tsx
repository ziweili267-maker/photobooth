import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useWebcam } from './hooks/useWebcam';
import { AppStatus, FILTERS, PhotoData } from './types';
import PhotoStrip from './components/PhotoStrip';
import { cn } from './lib/utils';

// Elegant Sound Engine
const playSound = (type: 'tick' | 'shutter' | 'start') => {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  switch (type) {
    case 'tick':
      // Soft, wood-block tick
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.05);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
      osc.start(t);
      osc.stop(t + 0.05);
      break;
    case 'shutter':
      // Crisp mechanical shutter
      const bufSize = ctx.sampleRate * 0.1;
      const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() - 0.5) * 0.5;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.8, t);
      nGain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
      noise.connect(nGain);
      nGain.connect(ctx.destination);
      noise.start(t);
      break;
  }
};

export default function App() {
  const { videoRef, isLoading } = useWebcam();
  const [status, setStatus] = useState<AppStatus>('idle');
  const [activeFilterId, setActiveFilterId] = useState<string>('normal');
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [countdown, setCountdown] = useState<number>(0);
  const [flash, setFlash] = useState(false);
  const [stripColor, setStripColor] = useState('white');

  const activeFilter = FILTERS.find(f => f.id === activeFilterId) || FILTERS[0];
  const CAPTURE_TOTAL = 4;

  const capture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    
    if (activeFilter.cssFilter !== 'none') {
      ctx.filter = activeFilter.cssFilter;
    }
    
    ctx.drawImage(video, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = 'none';

    // Always add subtle grain for "Editorial" look
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 15;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i+1] = Math.max(0, Math.min(255, data[i+1] + noise));
      data[i+2] = Math.max(0, Math.min(255, data[i+2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);

    setPhotos(prev => [...prev, { id: Date.now().toString(), dataUrl: canvas.toDataURL('image/jpeg', 0.98), filterId: activeFilterId }]);
  };

  const startSession = async () => {
    setPhotos([]);
    setStatus('countdown');

    for (let i = 0; i < CAPTURE_TOTAL; i++) {
      setStatus('countdown');
      for (let c = 3; c > 0; c--) {
        setCountdown(c);
        playSound('tick');
        await new Promise(r => setTimeout(r, 900));
      }
      
      setStatus('capturing');
      setFlash(true);
      playSound('shutter');
      capture();
      await new Promise(r => setTimeout(r, 100));
      setFlash(false);

      if (i < CAPTURE_TOTAL - 1) {
        await new Promise(r => setTimeout(r, 800));
      }
    }
    
    setStatus('review');
  };

  return (
    <div className="min-h-screen bg-[#080808] text-[#f4f4f0] font-serif overflow-x-hidden selection:bg-white/20">
      
      {/* Noise Texture Background */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.04] mix-blend-overlay z-0" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
      </div>

      <AnimatePresence mode="wait">
        
        {/* === IDLE SCREEN: Minimal Editorial === */}
        {status === 'idle' && (
          <motion.div 
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
            transition={{ duration: 0.8 }}
            className="relative z-10 min-h-screen flex flex-col items-center justify-between py-12 px-6"
          >
            <div className="w-full max-w-7xl flex justify-between items-start border-b border-white/10 pb-6">
              <span className="text-xs uppercase tracking-[0.3em] opacity-40 font-sans">Est. 2026</span>
              <span className="text-xs uppercase tracking-[0.3em] opacity-40 font-sans">Lumina Studio</span>
            </div>

            <div className="flex flex-col items-center gap-8">
              <motion.h1 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="text-8xl md:text-[10rem] font-light leading-none tracking-tighter italic mix-blend-difference"
              >
                Lumina
              </motion.h1>
              
              <motion.button
                onClick={startSession}
                disabled={isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group flex items-center gap-4 px-8 py-4 bg-[#f4f4f0] text-black rounded-sm transition-all hover:bg-white disabled:opacity-50"
              >
                <span className="font-sans text-xs font-bold uppercase tracking-[0.2em]">{isLoading ? 'Loading...' : 'Start Capture'}</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </motion.button>
            </div>

            <div className="w-full max-w-7xl border-t border-white/10 pt-6 flex justify-between">
              <span className="text-[10px] font-sans uppercase tracking-widest opacity-30">Web Camera Access Required</span>
              <span className="text-[10px] font-sans uppercase tracking-widest opacity-30">v3.0 Editorial</span>
            </div>
          </motion.div>
        )}

        {/* === SHOOTING UI: Clean & Distraction Free === */}
        {(status === 'countdown' || status === 'capturing') && (
          <motion.div
            key="camera"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 h-screen flex flex-col bg-black"
          >
             {/* Flash Layer */}
             <div className={cn(
               "absolute inset-0 bg-white z-50 pointer-events-none transition-opacity duration-[50ms]",
               flash ? "opacity-100" : "opacity-0"
             )} />

             {/* The Viewfinder */}
             <div className="relative flex-1 flex items-center justify-center overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute min-w-full min-h-full object-cover transform scale-x-[-1]"
                  style={{ filter: activeFilter.cssFilter }}
                />
                
                {/* Guide Lines (Rule of Thirds) - Very faint */}
                <div className="absolute inset-0 border-[0.5px] border-white/5 pointer-events-none grid grid-cols-3 grid-rows-3">
                   <div className="border-r border-white/5 h-full" />
                   <div className="border-r border-white/5 h-full" />
                   <div className="col-span-3 border-b border-white/5 w-full h-px absolute top-1/3" />
                   <div className="col-span-3 border-b border-white/5 w-full h-px absolute top-2/3" />
                </div>

                {/* Big Minimal Countdown */}
                <AnimatePresence>
                  {status === 'countdown' && (
                    <motion.div 
                      key={countdown}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.2 }}
                      className="absolute z-20 text-[15rem] font-light italic text-white mix-blend-difference font-serif"
                    >
                      {countdown}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Shot Counter */}
                <div className="absolute bottom-8 right-8 font-sans text-xs font-bold tracking-[0.2em] uppercase text-white/50">
                  {photos.length + 1} / {CAPTURE_TOTAL}
                </div>
             </div>

             {/* Minimal Filter Bar */}
             <div className="h-24 bg-black flex items-center justify-center gap-8 border-t border-white/10">
                {FILTERS.map(f => (
                   <button 
                     key={f.id}
                     onClick={() => setActiveFilterId(f.id)}
                     className={cn(
                       "font-sans text-[10px] uppercase tracking-widest transition-all",
                       activeFilterId === f.id ? "text-white border-b border-white pb-1" : "text-white/40 hover:text-white/70"
                     )}
                   >
                     {f.name}
                   </button>
                ))}
             </div>
          </motion.div>
        )}

        {/* === RESULT: Gallery View === */}
        {status === 'review' && (
          <motion.div
            key="review"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-10 min-h-screen bg-[#f4f4f0] text-black flex flex-col"
          >
             <div className="flex-1 flex flex-col items-center justify-center p-8">
                <PhotoStrip 
                  photos={photos} 
                  selectedColorId={stripColor}
                  onColorChange={setStripColor}
                  onRetake={startSession}
                />
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}