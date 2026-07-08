import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, AlertCircle, MapPin, Calendar } from 'lucide-react';

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
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [currentFacingMode, setCurrentFacingMode] = useState<'user' | 'environment'>(facingMode);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  const [gpsStatus, setGpsStatus] = useState<'resolving' | 'connected' | 'failed'>('resolving');
  const [capturedList, setCapturedList] = useState<string[]>([]);

  // Retrieve GPS coordinates
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
          console.error('GPS error:', err);
          setGpsStatus('failed');
        },
        { enableHighAccuracy: true, timeout: 8000 }
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
      console.error('Camera stream error:', err);
      // Fallback if environment exact facing is not available
      if (mode === 'environment') {
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
          setError('Failed to open camera. Make sure camera permission is granted.');
        }
      } else {
        setError('Failed to open camera. Make sure camera permission is granted.');
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

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current || !coords) {
      if (!coords) {
        alert('Waiting for GPS coordinates... Please wait a second.');
      }
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas dimensions equal to the video feed size
    const width = video.videoWidth;
    const height = video.videoHeight;
    canvas.width = width;
    canvas.height = height;

    // Flip horizontally if front camera (user mode) to make it mirror natural view
    if (currentFacingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, width, height);

    // Reset transform matrix for drawing text overlay
    if (currentFacingMode === 'user') {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    // Stamp Location & Timestamp onto Canvas
    const now = new Date();
    const dateStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
    const gpsStr = `GPS: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;

    // Text box background overlay for readability
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)'; // primary-slate with opacity
    ctx.fillRect(0, height - 85, width, 85);

    // Write text
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(dateStr, 25, height - 50);
    ctx.fillText(gpsStr, 25, height - 20);

    // Capture base64 string
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    if (multiCaptureCount > 1) {
      const newList = [...capturedList, dataUrl];
      if (newList.length < multiCaptureCount) {
        setCapturedList(newList);
        alert(`Photo ${newList.length} of ${multiCaptureCount} captured successfully! Take next photo.`);
      } else {
        // Stop streams
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
        onCapture(newList, coords);
      }
    } else {
      // Stop streams
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      onCapture(dataUrl, coords);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 p-4 text-white">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <span className="font-semibold text-slate-200">Camera Verification</span>
          <button
            onClick={onClose}
            className="rounded-full bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Live Video Panel */}
        <div className="relative aspect-video w-full bg-black">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 bg-slate-900">
              <RefreshCw className="h-8 w-8 animate-spin text-secondary" />
              <span className="text-sm text-slate-400">Activating camera...</span>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 px-8 text-center space-y-3">
              <AlertCircle className="h-10 w-10 text-danger" />
              <p className="text-sm text-slate-300">{error}</p>
              <button
                onClick={() => startCamera(currentFacingMode)}
                className="btn-blue-gradient rounded-full px-5 py-2 text-xs font-semibold"
              >
                Retry Camera Connection
              </button>
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

          {/* Multi-photo Counter HUD */}
          {multiCaptureCount > 1 && (
            <div className="absolute top-4 right-4 flex items-center space-x-1.5 rounded-full bg-violet-600/90 backdrop-blur px-3 py-1.5 text-xs font-bold text-white shadow z-20">
              <Camera className="h-3.5 w-3.5" />
              <span>Captured: {capturedList.length} / {multiCaptureCount}</span>
            </div>
          )}

          {/* GPS Status HUD */}
          {gpsStatus === 'connected' && (
            <div className="absolute top-4 left-4 flex items-center space-x-1.5 rounded-full bg-emerald-500/85 backdrop-blur px-3 py-1 text-xs font-bold text-white shadow">
              <MapPin className="h-3 w-3" />
              <span>GPS Connected</span>
            </div>
          )}
          {gpsStatus === 'resolving' && (
            <div className="absolute top-4 left-4 flex items-center space-x-1.5 rounded-full bg-amber-500/85 backdrop-blur px-3 py-1 text-xs font-bold text-white shadow">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Resolving GPS...</span>
            </div>
          )}
          {gpsStatus === 'failed' && (
            <div className="absolute top-4 left-4 flex items-center space-x-1.5 rounded-full bg-slate-500/85 backdrop-blur px-3 py-1 text-xs font-bold text-white shadow">
              <AlertCircle className="h-3 w-3" />
              <span>GPS Off (Proceeding)</span>
            </div>
          )}
        </div>

        {/* Metadata HUD */}
        <div className="bg-slate-900 px-6 py-4 space-y-2 border-t border-slate-800 text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <Calendar className="h-3.5 w-3.5 text-secondary" />
            <span>Time: {new Date().toLocaleString()}</span>
          </div>
          <div className="flex items-center space-x-2">
            <MapPin className="h-3.5 w-3.5 text-secondary" />
            <span>
              GPS: {gpsStatus === 'connected' ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : gpsStatus === 'resolving' ? 'Locating...' : 'Not Available (Proceeding)'}
            </span>
          </div>
        </div>

        {/* Controls footer */}
        <div className="flex items-center justify-around border-t border-slate-800 bg-slate-950 p-6">
          <button
            onClick={toggleFacingMode}
            className="flex flex-col items-center space-y-1.5 text-slate-400 hover:text-white"
            disabled={loading || !!error}
          >
            <RefreshCw className="h-5 w-5" />
            <span className="text-[10px]">Flip Camera</span>
          </button>

          <button
            onClick={handleCapture}
            disabled={loading || !!error}
            className={`flex h-16 w-16 items-center justify-center rounded-full bg-white text-slate-950 shadow-lg hover:bg-slate-200 transition-transform active:scale-95 ${
              (loading || !!error) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Camera className="h-7 w-7" />
          </button>

          <div className="w-12" /> {/* Layout balancing spacer */}
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;
