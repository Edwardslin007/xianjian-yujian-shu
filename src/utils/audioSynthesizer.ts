import { HandGesture } from '../types';

export class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientOsc1: OscillatorNode | null = null;
  private ambientOsc2: OscillatorNode | null = null;
  private isMuted: boolean = false;
  private lastGesture: HandGesture = 'FREE_FLIGHT';
  private lastWhooshTime: number = 0;

  constructor() {
    // Lazy initialized on first user interaction
  }

  public init() {
    if (this.ctx) return;
    try {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.startAmbient();
    } catch {
      // Audio might be blocked until user gesture
    }
  }

  public setVolume(vol: number) {
    if (!this.masterGain || !this.ctx) return;
    const clamped = Math.max(0, Math.min(1, vol));
    this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : clamped * 0.25, this.ctx.currentTime, 0.05);
  }

  public toggleMute(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.18, this.ctx.currentTime, 0.05);
    }
  }

  private startAmbient() {
    if (!this.ctx || !this.masterGain) return;

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.04, this.ctx.currentTime);
    this.ambientGain.connect(this.masterGain);

    // Deep drone 108Hz & 162Hz (Pure harmonic 5th chord)
    this.ambientOsc1 = this.ctx.createOscillator();
    this.ambientOsc1.type = 'sine';
    this.ambientOsc1.frequency.setValueAtTime(108, this.ctx.currentTime);

    this.ambientOsc2 = this.ctx.createOscillator();
    this.ambientOsc2.type = 'sine';
    this.ambientOsc2.frequency.setValueAtTime(162, this.ctx.currentTime);

    this.ambientOsc1.connect(this.ambientGain);
    this.ambientOsc2.connect(this.ambientGain);

    this.ambientOsc1.start();
    this.ambientOsc2.start();
  }

  // Play metallic sword ringing / 剑鸣 resonance
  public playSwordChime(freq: number = 880, duration: number = 1.2) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const t = this.ctx.currentTime;
    const chimeGain = this.ctx.createGain();
    chimeGain.gain.setValueAtTime(0.12, t);
    chimeGain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    chimeGain.connect(this.masterGain);

    // Fundamental + metallic overtone harmonics (Inharmonic ratios for metal blade)
    const ratios = [1.0, 2.76, 5.4, 8.9];
    const amps = [0.6, 0.3, 0.15, 0.05];

    ratios.forEach((ratio, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * ratio, t);
      // Slight pitch vibrato / sword vibration
      osc.frequency.linearRampToValueAtTime(freq * ratio * 0.995, t + duration);

      const partialGain = this.ctx.createGain();
      partialGain.gain.setValueAtTime(amps[i], t);
      partialGain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      osc.connect(partialGain);
      partialGain.connect(chimeGain);

      osc.start(t);
      osc.stop(t + duration);
    });
  }

  // Play formation transition sound
  public onGestureChange(newGesture: HandGesture) {
    if (newGesture === this.lastGesture) return;
    this.lastGesture = newGesture;

    if (!this.ctx || !this.masterGain || this.isMuted) return;

    switch (newGesture) {
      case 'TWO_FINGER_POINT':
        // Piercing supersonic sword beam sound: fast upward chirp + chime
        this.playWhoosh(1.4, 0.4);
        this.playSwordChime(1174.66, 1.0); // D6 note
        break;

      case 'OPEN_PALM_RING':
        // Celestial circulating resonance
        this.playSwordChime(783.99, 1.8); // G5 note
        this.playSwordChime(1567.98, 1.5); // G6 note
        break;

      case 'FIST_CLUSTER':
        // Heavy condensing pulse
        this.playHeavyClang();
        this.playSwordChime(587.33, 1.6); // D5 note
        break;

      case 'FOUR_FINGER_TRIANGLE':
        // Powerful triangular formation chime (triad: C5, E5, G5)
        this.playSwordChime(523.25, 1.5);
        this.playSwordChime(659.25, 1.5);
        this.playSwordChime(783.99, 1.8);
        break;

      case 'FREE_FLIGHT':
        this.playSwordChime(440, 1.0);
        break;
    }
  }

  public playWhoosh(speedFactor: number = 1.0, duration: number = 0.35) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = Date.now();
    if (now - this.lastWhooshTime < 180) return; // Throttle
    this.lastWhooshTime = now;

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Pink/bandpass filtered noise
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99 * b0 + white * 0.05;
      b1 = 0.95 * b1 + white * 0.1;
      b2 = 0.85 * b2 + white * 0.2;
      data[i] = (b0 + b1 + b2) * 0.3;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400 * speedFactor, t);
    filter.frequency.exponentialRampToValueAtTime(1600 * speedFactor, t + duration * 0.4);
    filter.frequency.exponentialRampToValueAtTime(300, t + duration);
    filter.Q.setValueAtTime(3, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.08, t + duration * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
  }

  private playHeavyClang() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.5);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.6);
  }
}
