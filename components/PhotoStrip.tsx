import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download } from 'lucide-react';
import { PhotoData, STRIP_COLORS } from '../types';
import { cn } from '../lib/utils';

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
  const [isDownloading, setIsDownloading] = useState(false);
  const activeColor = STRIP_COLORS.find(c => c.id === selectedColorId) || STRIP_COLORS[0];

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High Res Print Specs
    const w = 800;
    const h = 2400; // Tall strip
    canvas.width = w;
    canvas.height = h;

    // Background
    ctx.fillStyle = activeColor.value;
    ctx.fillRect(0, 0, w, h);

    // Photos
    const photoH = 450;
    const photoW = 600;
    const startY = 150;
    const gap = 50;

    const promises = photos.map(p => {
       const img = new Image();
       img.crossOrigin = "anonymous";
       img.src = p.dataUrl;
       return new Promise<HTMLImageElement>(r => img.onload = () => r(img));
    });

    const imgs = await Promise.all(promises);

    imgs.forEach((img, i) => {
       const y = startY + (i * (photoH + gap));
       const x = (w - photoW) / 2;
       
       // Drop shadow for depth
       ctx.shadowColor = "rgba(0,0,0,0.1)";
       ctx.shadowBlur = 15;
       ctx.shadowOffsetY = 5;
       
       ctx.drawImage(img, x, y, photoW, photoH);
       ctx.shadowColor = "transparent";
       
       // Minimal border around photo
       ctx.strokeStyle = "rgba(0,0,0,0.05)";
       ctx.lineWidth = 1;
       ctx.strokeRect(x, y, photoW, photoH);
    });

    // Typography
    ctx.fillStyle = activeColor.text;
    ctx.textAlign = 'center';
    
    // Header
    ctx.font = 'italic 300 40px "Cormorant Garamond", serif';
    ctx.fillText("Lumina Studio", w/2, 100);

    // Footer
    const footerY = h - 100;
    ctx.font = '700 16px "Inter", sans-serif';
    ctx.letterSpacing = "4px";
    ctx.fillText("COLLECTION NO. " + Math.floor(Math.random() * 1000), w/2, footerY);
    
    ctx.font = '400 14px "Inter", sans-serif';
    ctx.fillStyle = activeColor.text;
    ctx.globalAlpha = 0.6;
    ctx.fillText(new Date().toLocaleDateString().toUpperCase(), w/2, footerY + 30);
    ctx.globalAlpha = 1.0;

    // Grain
    const id = ctx.getImageData(0,0,w,h);
    for(let i=0; i<id.data.length; i+=4) {
       const n = (Math.random()-0.5)*10;
       id.data[i]+=n; id.data[i+1]+=n; id.data[i+2]+=n;
    }
    ctx.putImageData(id, 0, 0);

    const link = document.createElement('a');
    link.download = `Lumina-Print-${Date.now()}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.9);
    link.click();
    setIsDownloading(false);
  };

  return (
    <div className="flex flex-col lg:flex-row items-start justify-center gap-16 w-full max-w-6xl">
      
      {/* Visual Strip */}
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="shadow-2xl order-2 lg:order-1"
      >
         <div 
           className="w-[320px] py-12 px-8 flex flex-col gap-8 items-center transition-colors duration-500"
           style={{ backgroundColor: activeColor.value }}
         >
            <h2 className="font-serif italic text-2xl opacity-80" style={{ color: activeColor.text }}>Lumina Studio</h2>
            
            <div className="flex flex-col gap-6 w-full">
               {photos.map(p => (
                 <img key={p.id} src={p.dataUrl} className="w-full aspect-[4/3] object-cover shadow-sm grayscale-[0.1]" />
               ))}
            </div>

            <div className="text-center space-y-2 mt-4" style={{ color: activeColor.text }}>
               <p className="font-sans text-[10px] font-bold tracking-[0.3em] uppercase opacity-40">
                 {new Date().toLocaleDateString()}
               </p>
               <div className="w-8 h-[1px] bg-current opacity-20 mx-auto" />
            </div>
         </div>
      </motion.div>

      {/* Controls */}
      <div className="order-1 lg:order-2 flex flex-col gap-8 pt-10">
         <div className="space-y-2">
            <h1 className="font-serif text-5xl italic text-gray-900">Your Print.</h1>
            <p className="font-sans text-xs uppercase tracking-widest text-gray-500">Ready for download</p>
         </div>

         <div className="flex gap-3">
            {STRIP_COLORS.map(c => (
               <button
                 key={c.id}
                 onClick={() => onColorChange(c.id)}
                 className={cn(
                    "w-8 h-8 rounded-full border border-gray-200 transition-all flex items-center justify-center",
                    selectedColorId === c.id ? "ring-1 ring-offset-2 ring-gray-900 scale-110" : "hover:scale-110"
                 )}
                 style={{ backgroundColor: c.value }}
               />
            ))}
         </div>

         <div className="flex gap-4">
            <button 
              onClick={onRetake}
              className="h-12 px-6 rounded-none border border-gray-300 text-xs font-bold uppercase tracking-widest hover:bg-gray-50 transition-colors"
            >
              Retake
            </button>
            <button 
              onClick={handleDownload}
              disabled={isDownloading}
              className="h-12 px-8 bg-gray-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors flex items-center gap-2"
            >
              {isDownloading ? 'Processing...' : 'Download'}
              {!isDownloading && <Download size={14} />}
            </button>
         </div>
      </div>

    </div>
  );
};

export default PhotoStrip;