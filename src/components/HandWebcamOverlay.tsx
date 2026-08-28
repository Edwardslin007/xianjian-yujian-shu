import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Eye, EyeOff, RefreshCw, Sparkles } from 'lucide-react';
import { RecognizedHand } from '../types';

interface Props {
  onHandDetected: (hand: RecognizedHand | null) => void;
  recognizer: { recognize: (landmarks: any) => RecognizedHand };
  cameraMirrored: boolean;
  onToggleMirror: () => void;
  fps: number;
}

export const HandWebcamOverlay: React.FC<Props> = ({
  onHandDetected,
  recognizer,
  cameraMirrored,
  onToggleMirror,
  fps,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'starting' | 'running' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [activeGestureName, setActiveGestureName] = useState<string>('自由漫游');
  const [confidence, setConfidence] = useState<number>(0);

  const cameraInstanceRef = useRef<any>(null);
  const handsInstanceRef = useRef<any>(null);
  const lastSendTimeRef = useRef<number>(0);

  const startCamera = async () => {
    setCameraStatus('starting');
    setErrorMessage('');

    try {
      // Check if MediaPipe is available from global window
      const win = window as any;
      if (!win.Hands || !win.Camera) {
        // Wait briefly for CDN scripts to initialize
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      if (!win.Hands || !win.Camera) {
        throw new Error('正在加载 MediaPipe 视觉模型，请稍候点击重试...');
      }

      // Initialize Hands
      if (!handsInstanceRef.current) {
        // 资源基址由 index.html 注入：本地/静态部署为 './mediapipe/'，
        // 妙搭等平台可注入完整 URL 映射（window.MEDIAPIPE_BASE 为对象时按文件名查表）
        const mpBase = (win.MEDIAPIPE_BASE as string | Record<string, string> | undefined) ?? './mediapipe/';
        const hands = new win.Hands({
          locateFile: (file: string) =>
            typeof mpBase === 'string' ? mpBase + file : mpBase[file] ?? './mediapipe/' + file,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 0,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });

        hands.onResults((results: any) => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          canvas.width = 240;
          canvas.height = 180;
          ctx.clearRect(0, 0, 240, 180);

          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];

            // Recognize gesture
            const recognized = recognizer.recognize(landmarks);
            setActiveGestureName(recognized.rawGesture);
            setConfidence(Math.round(recognized.confidence * 100));
            onHandDetected(recognized);

            // Draw Hand Skeleton Landmarks
            drawHandSkeleton(ctx, landmarks, recognized.gesture);
          } else {
            const emptyHand = recognizer.recognize(null);
            setActiveGestureName(emptyHand.rawGesture);
            setConfidence(0);
            onHandDetected(null);
          }
        });

        handsInstanceRef.current = hands;
      }

      const videoElement = videoRef.current;
      if (!videoElement) return;

      const camera = new win.Camera(videoElement, {
        onFrame: async () => {
          if (!handsInstanceRef.current || videoElement.videoWidth === 0) return;
          // 识别降频到 ~15Hz：手势控制足够流畅，推理不再阻塞渲染主线程
          const now = performance.now();
          if (now - lastSendTimeRef.current < 66) return;
          lastSendTimeRef.current = now;
          try {
            await handsInstanceRef.current.send({ image: videoElement });
          } catch {
            // 模型未就绪或初始化失败时静默跳过，等下一帧重试
          }
        },
        width: 320,
        height: 240,
      });

      await camera.start();
      cameraInstanceRef.current = camera;
      setCameraStatus('running');
    } catch (err: any) {
      console.warn('Camera initiation failed:', err);
      setCameraStatus('error');
      setErrorMessage(err.message || '无法访问摄像头，请检查浏览器权限');
      onHandDetected(null);
    }
  };

  const stopCamera = () => {
    if (cameraInstanceRef.current) {
      try {
        cameraInstanceRef.current.stop();
      } catch {}
      cameraInstanceRef.current = null;
    }
    setCameraStatus('idle');
    onHandDetected(null);
  };

  // Auto start on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      startCamera();
    }, 600);
    return () => {
      clearTimeout(timer);
      stopCamera();
    };
  }, []);

  const drawHandSkeleton = (ctx: CanvasRenderingContext2D, lm: any[], gesture: string) => {
    const w = 240;
    const h = 180;

    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [5, 9], [9, 10], [10, 11], [11, 12],
      [9, 13], [13, 14], [14, 15], [15, 16],
      [13, 17], [17, 18], [18, 19], [19, 20],
      [0, 17],
    ];

    // Bone lines
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = gesture === 'TWO_FINGER_POINT' ? '#38bdf8' : gesture === 'OPEN_PALM_RING' ? '#34d399' : gesture === 'FIST_CLUSTER' ? '#f97316' : '#c084fc';

    for (const [i, j] of connections) {
      ctx.beginPath();
      ctx.moveTo(lm[i].x * w, lm[i].y * h);
      ctx.lineTo(lm[j].x * w, lm[j].y * h);
      ctx.stroke();
    }

    // Joint landmarks
    for (let i = 0; i < lm.length; i++) {
      const p = lm[i];
      const isTip = [4, 8, 12, 16, 20].includes(i);
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, isTip ? 4.5 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = isTip ? '#ffffff' : '#7dd3fc';
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  };

  return (
    <div
      id="hand-webcam-card"
      className={`fixed top-4 right-4 z-40 transition-all duration-300 rounded-2xl overflow-hidden border shadow-2xl backdrop-blur-xl ${
        cameraStatus === 'running'
          ? 'border-sky-500/40 bg-slate-900/85 shadow-sky-950/40'
          : 'border-slate-800 bg-slate-900/90'
      }`}
      style={{ width: isMinimized ? '190px' : '250px' }}
    >
      {/* Card Header */}
      <div className="px-3.5 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              cameraStatus === 'running'
                ? 'bg-emerald-400 animate-pulse'
                : cameraStatus === 'starting'
                ? 'bg-amber-400 animate-ping'
                : 'bg-slate-500'
            }`}
          />
          <span className="text-xs font-semibold text-sky-200 tracking-wide">手势灵镜</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-sky-400 bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-800/40">
            {fps} FPS
          </span>
          <button
            id="btn-toggle-minimize"
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-slate-400 hover:text-slate-200 p-1 rounded transition-colors"
            title={isMinimized ? '展开灵镜' : '折叠灵镜'}
          >
            {isMinimized ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>
        </div>
      </div>

      {/* Video & Skeleton Canvas Body */}
      {!isMinimized && (
        <div className="relative w-full h-[175px] bg-slate-950 overflow-hidden group">
          {/* video/canvas 常驻挂载：startCamera 在状态变为 running 之前就需要 videoRef */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover ${cameraMirrored ? 'scale-x-[-1]' : ''} ${
              cameraStatus === 'running' ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <canvas
            ref={canvasRef}
            className={`absolute top-0 left-0 w-full h-full pointer-events-none ${
              cameraMirrored ? 'scale-x-[-1]' : ''
            } ${cameraStatus === 'running' ? 'opacity-100' : 'opacity-0'}`}
          />

          {cameraStatus === 'starting' && (
            <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-4 text-center bg-slate-950/90">
              <RefreshCw className="animate-spin text-sky-400 mb-2" size={24} />
              <p className="text-xs text-sky-200 font-medium">正在唤醒摄像头与模型...</p>
              <p className="text-[10px] text-slate-400 mt-1">请在浏览器弹出窗口允许摄像头权限</p>
            </div>
          )}

          {cameraStatus !== 'running' && cameraStatus !== 'starting' && (
            <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-4 text-center bg-slate-950/90">
              <CameraOff className="text-slate-500 mb-2" size={28} />
              <p className="text-xs text-slate-300 font-medium">摄像头已关闭</p>
              {errorMessage && <p className="text-[10px] text-rose-400 mt-1 leading-tight">{errorMessage}</p>}
              <button
                id="btn-start-camera"
                onClick={startCamera}
                className="mt-2.5 px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-md"
              >
                <Camera size={13} /> 开启摄像头
              </button>
            </div>
          )}

          {/* Mirror toggle button overlay on hover */}
          {cameraStatus === 'running' && (
            <button
              id="btn-toggle-mirror"
              onClick={onToggleMirror}
              className="absolute bottom-2 right-2 bg-slate-900/80 hover:bg-slate-800 text-[10px] text-sky-300 px-2 py-1 rounded-md backdrop-blur border border-sky-800/40 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {cameraMirrored ? '镜像: 开' : '镜像: 关'}
            </button>
          )}
        </div>
      )}

      {/* Card Footer Status */}
      <div className="px-3.5 py-2 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <Sparkles size={12} className="text-sky-400 animate-pulse" />
          <span className="text-slate-300 font-medium text-[11px] truncate max-w-[140px]">
            {activeGestureName}
          </span>
        </div>
        {confidence > 0 && (
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
            {confidence}%
          </span>
        )}
      </div>
    </div>
  );
};
