import { useRef, useEffect, useState } from 'react';

export const useWebcam = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const initWebcam = async () => {
      try {
        setIsLoading(true);
        if (videoRef.current) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { 
              facingMode: 'user',
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false
          });
          
          videoRef.current.srcObject = stream;
          // Wait for video to actually start playing
          videoRef.current.onloadedmetadata = () => {
             videoRef.current?.play().catch(e => console.error("Play error:", e));
             setIsLoading(false);
          };
        }
      } catch (err) {
        console.error('Error accessing webcam:', err);
        setError('Could not access the camera. Please ensure you have granted permission.');
        setIsLoading(false);
      }
    };

    initWebcam();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return { videoRef, error, isLoading };
};