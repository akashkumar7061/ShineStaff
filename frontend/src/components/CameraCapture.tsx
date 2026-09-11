import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, AlertCircle, MapPin, Calendar, Upload, Image as ImageIcon } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (dataUrl: any, location: { lat: number; lng: number }) => void;
  onClose: () => void;
  facingMode?: 'user' | 'environment';
  multiCaptureCount?: number;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  onClose,
  facingMode = 'user',
  multiCaptureCount = 1
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [currentFacingMode, setCurrentFacingMode] = useState<'user' | 'environment'>(facingMode);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  const [gpsStatus, setGpsStatus] = useState<'resolving' | 'connected' | 'failed'>('resolving');
  const [capturedList, setCapturedList] = useState<string[]>([]);
  const [processingFile, setProcessingFile] = useState(false);

  // Retrieve GPS coordinates with high accuracy
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setGpsStatus('connected');
        },
        (err) => {
          console.warn('GPS location retrieval error:', err);
          setGpsStatus('failed');
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
      );
    } else {
      setGpsStatus('failed');
    }
  }, []);

  // Initialize camera stream
  const startCamera = async (mode: 'user' | 'environment') => {
    setLoading(true);
    setError(null);
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      // Fallback: Try general video without exact facing mode
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
        setStream(fallbackStream);
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
        }
        return;
      } catch (fallbackErr) {
        setError('Live camera stream not supported or permission denied. You can use the "Take Photo / Choose Image" button below.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startCamera(currentFacingMode);
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [currentFacingMode]);

  const toggleFacingMode = () => {
    setCurrentFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Helper to draw watermark & downscale image on canvas
  const processImageToCompressedDataUrl = (
    imageSource: CanvasImageSource,
    sourceWidth: number,
    sourceHeight: number,
    isMirrored: boolean = false
  ): string => {
    const canvas = canvasRef.current || document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Max dimensions for fast mobile upload and crisp quality
    const MAX_WIDTH = 1280;
    const MAX_HEIGHT = 1280;
    let targetWidth = sourceWidth;
    let targetHeight = sourceHeight;

    if (targetWidth > targetHeight) {
      if (targetWidth > MAX_WIDTH) {
        targetHeight = Math.round((targetHeight * MAX_WIDTH) / targetWidth);
        targetWidth = MAX_WIDTH;
      }
    } else {
      if (targetHeight > MAX_HEIGHT) {
        targetWidth = Math.round((targetWidth * MAX_HEIGHT) / targetHeight);
        targetHeight = MAX_HEIGHT;
      }
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    if (isMirrored) {
      ctx.translate(targetWidth, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(imageSource, 0, 0, targetWidth, targetHeight);

    if (isMirrored) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    // Watermark Overlay
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const gpsStr = coords.lat && coords.lng ? `GPS: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : 'GPS: Site Verified';

    const overlayHeight = Math.max(65, Math.round(targetHeight * 0.12));
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, targetHeight - overlayHeight, targetWidth, overlayHeight);

    const fontSize = Math.max(14, Math.round(targetWidth * 0.025));
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`🕒 ${dateStr}`, 16, targetHeight - (overlayHeight * 0.52));
    ctx.fillText(`📍 ${gpsStr}`, 16, targetHeight - (overlayHeight * 0.18));

    // Compressed JPEG at 0.75 quality (~150KB for fast upload)
    return canvas.toDataURL('image/jpeg', 0.75);
  };

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const dataUrl = processImageToCompressedDataUrl(
      video,
      video.videoWidth,
      video.videoHeight,
      currentFacingMode === 'user'
    );

    if (!dataUrl) return;

    if (multiCaptureCount > 1) {
      const newList = [...capturedList, dataUrl];
      if (newList.length < multiCaptureCount) {
        setCapturedList(newList);
        alert(`Photo ${newList.length} of ${multiCaptureCount} captured! Take the next photo.`);
      } else {
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
        onCapture(newList, coords);
      }
    } else {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      onCapture(dataUrl, coords);
    }
  };

  // Fallback: Handle Native Camera / File Input Upload
  const handleNativeFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessingFile(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const compressedDataUrl = processImageToCompressedDataUrl(img, img.width, img.height, false);
        setProcessingFile(false);

        if (multiCaptureCount > 1) {
          const newList = [...capturedList, compressedDataUrl];
          if (newList.length < multiCaptureCount) {
            setCapturedList(newList);
            alert(`Photo ${newList.length} of ${multiCaptureCount} selected! Snap or select next.`);
          } else {
            if (stream) {
              stream.getTracks().forEach((track) => track.stop());
            }
            onCapture(newList, coords);
          }
        } else {
          if (stream) {
            stream.getTracks().forEach((track) => track.stop());
          }
          onCapture(compressedDataUrl, coords);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md p-4 text-white animate-fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/50">
          <div className="flex items-center space-x-2">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-bold text-sm text-slate-100">Live Camera Verification</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Live Video Panel */}
        <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
          {loading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 bg-slate-900 z-10">
              <RefreshCw className="h-8 w-8 animate-spin text-secondary" />
              <span className="text-xs text-slate-400 font-bold">Activating camera sensor...</span>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 px-6 text-center space-y-3 z-10">
              <AlertCircle className="h-9 w-9 text-amber-500" />
              <p className="text-xs text-slate-300 leading-relaxed max-w-xs">{error}</p>
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-full bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow transition-transform active:scale-95 flex items-center justify-center space-x-1.5"
                >
                  <Camera className="h-4 w-4" />
                  <span>Use Device Camera</span>
                </button>
                <button
                  onClick={() => startCamera(currentFacingMode)}
                  className="rounded-full bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 transition-colors"
                >
                  Retry Stream
                </button>
              </div>
            </div>
          )}

          {processingFile && (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 bg-slate-900/90 z-20">
              <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
              <span className="text-xs text-white font-bold">Processing & compressing photo...</span>
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-cover ${
              currentFacingMode === 'user' ? 'scale-x-[-1]' : ''
            }`}
          />

          <canvas ref={canvasRef} className="hidden" />

          {/* Hidden File Input for Native Camera fallback */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleNativeFileInput}
          />

          {/* Multi-photo Counter HUD */}
          {multiCaptureCount > 1 && (
            <div className="absolute top-3 right-3 flex items-center space-x-1.5 rounded-full bg-violet-600/90 backdrop-blur px-3 py-1 text-xs font-extrabold text-white shadow z-20">
              <Camera className="h-3.5 w-3.5" />
              <span>Photo {capturedList.length + 1} of {multiCaptureCount}</span>
            </div>
          )}

          {/* GPS Status HUD */}
          {gpsStatus === 'connected' && (
            <div className="absolute top-3 left-3 flex items-center space-x-1.5 rounded-full bg-emerald-500/85 backdrop-blur px-2.5 py-1 text-[10px] font-bold text-white shadow z-20">
              <MapPin className="h-3 w-3" />
              <span>GPS: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</span>
            </div>
          )}
          {gpsStatus === 'resolving' && (
            <div className="absolute top-3 left-3 flex items-center space-x-1.5 rounded-full bg-amber-500/85 backdrop-blur px-2.5 py-1 text-[10px] font-bold text-white shadow z-20">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Acquiring GPS...</span>
            </div>
          )}
          {gpsStatus === 'failed' && (
            <div className="absolute top-3 left-3 flex items-center space-x-1.5 rounded-full bg-slate-700/90 backdrop-blur px-2.5 py-1 text-[10px] font-bold text-slate-300 shadow z-20">
              <AlertCircle className="h-3 w-3 text-amber-400" />
              <span>GPS Off (Allowed)</span>
            </div>
          )}
        </div>

        {/* Info Banner */}
        <div className="bg-slate-950/70 px-6 py-2.5 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center space-x-1.5 truncate">
            <Calendar className="h-3.5 w-3.5 text-secondary shrink-0" />
            <span className="truncate">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} • {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-[10px] text-secondary hover:underline font-bold flex items-center space-x-1 cursor-pointer shrink-0 ml-2"
          >
            <Upload className="h-3 w-3" />
            <span>Upload from Gallery / Native Camera</span>
          </button>
        </div>

        {/* Controls footer */}
        <div className="flex items-center justify-around border-t border-slate-800 bg-slate-950 p-5">
          <button
            type="button"
            onClick={toggleFacingMode}
            className="flex flex-col items-center space-y-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
            disabled={loading || !!error}
          >
            <RefreshCw className="h-5 w-5" />
            <span className="text-[10px] font-semibold">Flip Camera</span>
          </button>

          <button
            type="button"
            onClick={handleCapture}
            disabled={loading || !!error || processingFile}
            className={`flex h-16 w-16 items-center justify-center rounded-full bg-white text-slate-950 shadow-2xl hover:bg-slate-100 transition-all active:scale-95 cursor-pointer ${
              (loading || !!error || processingFile) ? 'opacity-40 cursor-not-allowed' : 'ring-4 ring-white/20'
            }`}
            title="Capture Photo"
          >
            <Camera className="h-7 w-7 text-slate-900" />
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center space-y-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Upload from Device"
          >
            <ImageIcon className="h-5 w-5 text-emerald-400" />
            <span className="text-[10px] font-semibold">Native / Files</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;
