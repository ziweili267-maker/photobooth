import React, { useRef, useState, useEffect } from 'react';
import { PhotoData, STRIP_COLORS } from '../types';
import { Download, RefreshCw, Check } from 'lucide-react';

interface PhotoStripProps {
  photos: PhotoData[];
  selectedColorId: string;
  onColorChange: (id: string) => void;
  onRetake: () => void;
}

const PhotoStrip: React.FC<PhotoStripProps> = ({
  photos,
  selectedColorId,
  onColorChange,
  onRetake,
}) => {
  const stripRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [developed, setDeveloped] = useState(0);
  const [printed, setPrinted] = useState(false);

  // 1. Printing Animation Trigger
  useEffect(() => {
    const timer = setTimeout(() => setPrinted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // 2. Developing Logic (Time + Shake/Mouse)
  useEffect(() => {
    let velocity = 0;
    let lastX = 0;
    let lastY = 0;
    let lastTime = Date.now();
    let animationFrame: number;

    const handleMotion = (e: DeviceMotionEvent) => {
      if (e.acceleration) {
        const { x, y, z } = e.acceleration;
        const mag = Math.abs(x || 0) + Math.abs(y || 0) + Math.abs(z || 0);
        velocity = Math.min(velocity + mag * 0.05, 1.0);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      const dt = now - lastTime;
      if (dt > 16) {
        const dist = Math.sqrt(Math.pow(e.clientX - lastX, 2) + Math.pow(e.clientY - lastY, 2));
        velocity = Math.min(velocity + dist * 0.002, 1.0);
        lastX = e.clientX;
        lastY = e.clientY;
        lastTime = now;
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    window.addEventListener('mousemove', handleMouseMove);

    const tick = () => {
      setDeveloped((prev) => {
        if (prev >= 1) return 1;
        // Base development speed (slow)
        let increment = 0.0005; 
        // Add shake/movement boost
        increment += velocity * 0.02;
        
        // Decay velocity
        velocity *= 0.92;
        
        return Math.min(prev + increment, 1);
      });
      animationFrame = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  const activeColor = STRIP_COLORS.find(
    (c) => c.id === selectedColorId
  ) || STRIP_COLORS[0];

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Config for High-Res Output
    const padding = 60;
    const photoWidth = 800;
    const photoHeight = 600; // 4:3
    const gap = 40;
    const bottomLabelHeight = 180;

    const totalWidth = photoWidth + (padding * 2);
    const totalHeight = (padding * 2) + (photoHeight * photos.length) + (gap * (photos.length - 1)) + bottomLabelHeight;

    canvas.width = totalWidth;
    canvas.height = totalHeight;

    // 1. Background
    ctx.fillStyle = activeColor.value;
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    // 2. Photos
    const imagePromises = photos.map((p) => {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = p.dataUrl;
      });
    });

    try {
      const images = await Promise.all(imagePromises);

      images.forEach((img, index) => {
        const y = padding + index * (photoHeight + gap);

        // Shadow for photos
        ctx.shadowColor = "rgba(0, 0, 0, 0.1)";
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 5;
        ctx.drawImage(img, padding, y, photoWidth, photoHeight);

        // Reset shadow
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
      });

      // 3. Text Branding
      ctx.fillStyle = activeColor.text;
      ctx.textAlign = 'center';

      // Main Logo
      ctx.font = '900 60px "Inter", sans-serif';
      ctx.letterSpacing = '10px';
      const textY = totalHeight - (bottomLabelHeight / 2) - 20;
      ctx.fillText('LUMINA', totalWidth / 2, textY);

      // Date
      ctx.font = '400 24px "Inter", sans-serif';
      ctx.globalAlpha = 0.6;
      const date = new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      ctx.fillText(date.toUpperCase(), totalWidth / 2, textY + 50);
      ctx.globalAlpha = 1.0;

      // 4. Subtle Grain Overlay on the whole strip for realism
      // We simulate grain by drawing random noise with low opacity
      /* Simplified noise generation on canvas for performance instead of loading an external image */
      const imageData = ctx.getImageData(0, 0, totalWidth, totalHeight);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 10;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));
        data[i+1] = Math.max(0, Math.min(255, data[i+1] + noise));
        data[i+2] = Math.max(0, Math.min(255, data[i+2] + noise));
      }
      ctx.putImageData(imageData, 0, 0);

      // Download
      const link = document.createElement('a');
      link.download = `lumina-strip-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (err) {
      console.error("Failed to generate strip", err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div 
      className={`flex flex-col items-center gap-6 w-full max-w-[320px] sm:max-w-md transform transition-all duration-1000 ease-out ${
        printed ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}
    >
      {/* Action Bar */}
      <div className="flex items-center justify-between w-full bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-lg">
        <button
          onClick={onRetake}
          className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          title="Retake"
        >
          <RefreshCw size={20} />
        </button>

        <div className="flex gap-2">
          {STRIP_COLORS.map((color) => (
            <button
              key={color.id}
              onClick={() => onColorChange(color.id)}
              className={`w-6 h-6 rounded-full border border-white/10 shadow-sm transition-transform hover:scale-110 relative ${
                selectedColorId === color.id ? 'scale-110 ring-2 ring-white/50' : ''
              }`}
              style={{ backgroundColor: color.value }}
              title={color.label}
            >
              {selectedColorId === color.id && activeColor.id === 'black' && (
                <Check size={12} className="text-white absolute inset-0 m-auto" />
              )}
              {selectedColorId === color.id && activeColor.id !== 'black' && (
                <Check size={12} className="text-black absolute inset-0 m-auto" />
              )}
            </button>
          ))}
        </div>

        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-indigo-50 transition-colors shadow-lg disabled:opacity-50"
        >
          {isDownloading ? 'Saving...' : 'Save'}
          {!isDownloading && <Download size={14} />}
        </button>
      </div>

      {/* The Visual Strip (HTML Representation) */}
      <div
        ref={stripRef}
        className="relative w-full shadow-2xl transition-all duration-500 ease-in-out p-6 sm:p-8"
        style={{
          backgroundColor: activeColor.value,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E")`,
        }}
      >
        {developed < 0.9 && (
          <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <span className="text-white/80 text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse drop-shadow-md whitespace-nowrap bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">
              Shake to Develop
            </span>
          </div>
        )}
        
        <div className="flex flex-col gap-4 sm:gap-6">
          {photos.map((photo) => (
            <div key={photo.id} className="relative shadow-md overflow-hidden">
              <img
                src={photo.dataUrl}
                alt="Booth Capture"
                className="w-full aspect-[4/3] object-cover grayscale-0 block"
              />
              {/* Developing Overlay */}
              <div 
                className="absolute inset-0 bg-[#050505] pointer-events-none"
                style={{ opacity: 1 - developed }}
              />
            </div>
          ))}
        </div>
        <div
          className="mt-12 text-center"
          style={{ color: activeColor.text }}
        >
          <h2 className="font-black tracking-[0.3em] text-xl sm:text-2xl uppercase opacity-90">
            LUMINA
          </h2>
          <p className="text-[10px] sm:text-xs font-medium opacity-50 mt-2 uppercase tracking-widest">
            {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PhotoStrip;