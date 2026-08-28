import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  HandGesture,
  RecognizedHand,
  SimulationConfig,
} from './types';
import { GestureRecognizer } from './utils/gestureRecognizer';
import { BoidsEngine } from './utils/boidsEngine';
import { CanvasRenderer, SWORD_THEMES } from './utils/canvasRenderer';
import { AudioSynthesizer } from './utils/audioSynthesizer';
import { HandWebcamOverlay } from './components/HandWebcamOverlay';
import { GestureGuide } from './components/GestureGuide';
import { ControlPanel } from './components/ControlPanel';

const INITIAL_CONFIG: SimulationConfig = {
  swordCount: 120,
  maxSpeed: 8.5,
  minSpeed: 2.2,
  maxForce: 0.35,
  separationDistance: 34,
  neighborDistance: 75,
  separationWeight: 1.6,
  alignmentWeight: 1.0,
  cohesionWeight: 0.9,
  targetWeight: 1.8,
  trailLength: 16,
  glowIntensity: 1.2,
  themeId: 'frost_azure',
  soundEnabled: true,
  soundVolume: 0.8,
  showLandmarks: true,
  showBackgroundRune: true,
  showEnergyLines: true,
  cameraMirrored: true,
  formationTransitionSpeed: 3.8,
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [config, setConfig] = useState<SimulationConfig>(INITIAL_CONFIG);
  const [activeGesture, setActiveGesture] = useState<HandGesture>('FREE_FLIGHT');
  const [simulatedGesture, setSimulatedGesture] = useState<HandGesture | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(60);

  // Engines refs
  const recognizerRef = useRef<GestureRecognizer>(new GestureRecognizer());
  const boidsRef = useRef<BoidsEngine | null>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const audioRef = useRef<AudioSynthesizer>(new AudioSynthesizer());
  const detectedHandRef = useRef<RecognizedHand | null>(null);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const isMouseDownRef = useRef<boolean>(false);

  // Initialize Canvas & Boids Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    const boids = new BoidsEngine(config);
    const renderer = new CanvasRenderer(ctx, w, h);

    boidsRef.current = boids;
    rendererRef.current = renderer;

    const handleResize = () => {
      const nw = window.innerWidth;
      const nh = window.innerHeight;
      canvas.width = nw;
      canvas.height = nh;
      boids.resize(nw, nh);
      renderer.resize(nw, nh);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update sword count when changed in config
  useEffect(() => {
    if (boidsRef.current) {
      boidsRef.current.updateCount(config.swordCount);
    }
  }, [config.swordCount]);

  // Audio mute/unmute sync
  useEffect(() => {
    audioRef.current.toggleMute(!config.soundEnabled);
    audioRef.current.setVolume(config.soundVolume);
  }, [config.soundEnabled, config.soundVolume]);

  // Handle hand detection from webcam
  const handleHandDetected = useCallback((hand: RecognizedHand | null) => {
    if (hand && config.cameraMirrored) {
      // Mirror X coordinates for natural interaction
      const mirroredHand: RecognizedHand = {
        ...hand,
        palmCenter: { x: 1.0 - hand.palmCenter.x, y: hand.palmCenter.y },
        pointDirection: { x: -hand.pointDirection.x, y: hand.pointDirection.y },
        handAngle: Math.atan2(hand.pointDirection.y, -hand.pointDirection.x),
      };
      detectedHandRef.current = mirroredHand;
    } else {
      detectedHandRef.current = hand;
    }
  }, [config.cameraMirrored]);

  // Handle gesture manual click toggle
  const handleSelectGesture = (gesture: HandGesture) => {
    audioRef.current.init();
    if (simulatedGesture === gesture) {
      setSimulatedGesture(null);
    } else {
      setSimulatedGesture(gesture);
    }
  };

  // Main Render & Physics Animation Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();
    let frameCounter = 0;
    let lastFpsUpdate = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min(0.05, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      // FPS tracking
      frameCounter++;
      if (currentTime - lastFpsUpdate >= 1000) {
        setFps(frameCounter);
        frameCounter = 0;
        lastFpsUpdate = currentTime;
      }

      // Determine active hand state (either simulated or detected from webcam)
      let effectiveHand = detectedHandRef.current;

      if (simulatedGesture) {
        // Create synthetic hand target at mouse position
        const mx = mousePosRef.current.x / window.innerWidth;
        const my = mousePosRef.current.y / window.innerHeight;
        effectiveHand = {
          landmarks: [],
          gesture: simulatedGesture,
          confidence: 1.0,
          palmCenter: { x: mx, y: my },
          pointDirection: { x: 0, y: -1 },
          handAngle: -Math.PI / 2,
          rawGesture: '模拟诀法',
          fingerDistances: [],
          extendedFingers: [true, true, true, true, true],
        };
      }

      const curGesture = effectiveHand ? effectiveHand.gesture : 'FREE_FLIGHT';
      setActiveGesture((prev) => {
        if (prev !== curGesture) {
          audioRef.current.onGestureChange(curGesture);
        }
        return curGesture;
      });

      // Update Boids simulation
      if (boidsRef.current) {
        boidsRef.current.update(effectiveHand, config, dt);
      }

      // Render Canvas frame
      if (rendererRef.current && boidsRef.current) {
        rendererRef.current.render(
          boidsRef.current.swords,
          effectiveHand,
          config,
          currentTime / 1000
        );
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [config, simulatedGesture]);

  // Mouse / Pointer interactive events
  const handlePointerDown = (e: React.PointerEvent) => {
    audioRef.current.init();
    isMouseDownRef.current = true;
    mousePosRef.current = { x: e.clientX, y: e.clientY };

    if (rendererRef.current) {
      const theme = SWORD_THEMES.find((t) => t.id === config.themeId) || SWORD_THEMES[0];
      rendererRef.current.addSparks(e.clientX, e.clientY, theme.glowColor, 12);
      audioRef.current.playSwordChime(660, 0.8);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    mousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = () => {
    isMouseDownRef.current = false;
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      audioRef.current.init();
      switch (e.key) {
        case '1':
          setSimulatedGesture(null);
          break;
        case '2':
          setSimulatedGesture('TWO_FINGER_POINT');
          break;
        case '3':
          setSimulatedGesture('OPEN_PALM_RING');
          break;
        case '4':
          setSimulatedGesture('FIST_CLUSTER');
          break;
        case '5':
          setSimulatedGesture('FOUR_FINGER_TRIANGLE');
          break;
        case 'm':
        case 'M':
          setConfig((c) => ({ ...c, soundEnabled: !c.soundEnabled }));
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const currentTheme = SWORD_THEMES.find((t) => t.id === config.themeId) || SWORD_THEMES[0];

  return (
    <div
      id="main-applet-container"
      className="relative w-screen h-screen overflow-hidden select-none bg-slate-950"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Background & Interactive Canvas */}
      <canvas
        ref={canvasRef}
        id="sword-flock-canvas"
        className="absolute inset-0 w-full h-full block cursor-crosshair z-0"
      />

      {/* Top Left: Title & Aesthetic Badge */}
      <div className="fixed top-5 left-6 z-20 pointer-events-none flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-slate-950/80 backdrop-blur-xl border border-sky-500/30 rounded-2xl shadow-2xl flex items-center gap-2.5">
            <span className="text-xl">⚔️</span>
            <div>
              <h1 className="font-serif text-xl md:text-2xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-sky-200 via-sky-400 to-indigo-300">
                仙剑御剑术
              </h1>
              <p className="text-[10px] text-slate-400 font-serif tracking-wider">
                MediaPipe 手势识别 × Boids 鸟群剑阵飞仙
              </p>
            </div>
          </div>

          {/* Current Active Formation Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-xl text-xs text-sky-300 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            <span className="font-serif font-semibold">
              {activeGesture === 'FREE_FLIGHT'
                ? '自由漫游'
                : activeGesture === 'TWO_FINGER_POINT'
                ? '双指·御剑诀'
                : activeGesture === 'OPEN_PALM_RING'
                ? '张开·混元剑环'
                : activeGesture === 'FIST_CLUSTER'
                ? '握拳·凝剑成核'
                : '四指·三才诛仙阵'}
            </span>
          </div>
        </div>
      </div>

      {/* Top Right: Webcam Hand Tracker HUD */}
      <HandWebcamOverlay
        onHandDetected={handleHandDetected}
        recognizer={recognizerRef.current}
        cameraMirrored={config.cameraMirrored}
        onToggleMirror={() => setConfig((c) => ({ ...c, cameraMirrored: !c.cameraMirrored }))}
        fps={fps}
      />

      {/* Bottom Center: Gesture Guide & Simulator */}
      <GestureGuide
        activeGesture={activeGesture}
        simulatedGesture={simulatedGesture}
        onSelectGesture={handleSelectGesture}
      />

      {/* Bottom Left: Controls & Export Drawer */}
      <ControlPanel
        config={config}
        onChangeConfig={(newCfg) => setConfig((c) => ({ ...c, ...newCfg }))}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />
    </div>
  );
}
