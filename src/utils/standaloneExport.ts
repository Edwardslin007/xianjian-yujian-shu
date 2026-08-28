export function generateStandaloneHTML(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>仙剑御剑术 - 手势御剑飞仙 (单文件纯净版)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=Noto+Serif+SC:wght@400;600;700;900&display=swap" rel="stylesheet">
  <!-- MediaPipe Hands & Camera CDN -->
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js" crossorigin="anonymous"></script>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      user-select: none;
    }
    body, html {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #020617;
      font-family: 'Noto Serif SC', 'PingFang SC', 'Microsoft YaHei', serif;
      color: #f8fafc;
    }
    #canvas {
      display: block;
      width: 100vw;
      height: 100vh;
      position: absolute;
      top: 0;
      left: 0;
      z-index: 1;
    }
    .hud {
      position: absolute;
      z-index: 10;
      pointer-events: none;
    }
    .interactive {
      pointer-events: auto;
    }
    /* Top Header */
    .top-header {
      top: 20px;
      left: 24px;
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .title-badge {
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 12px;
      padding: 10px 18px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }
    .app-title {
      font-family: 'Ma Shan Zheng', cursive;
      font-size: 26px;
      letter-spacing: 2px;
      color: #38bdf8;
      text-shadow: 0 0 12px rgba(56, 189, 248, 0.6);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .app-subtitle {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 2px;
      letter-spacing: 1px;
    }
    /* Top Right Camera & Status */
    .camera-box {
      top: 20px;
      right: 24px;
      width: 220px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(56, 189, 248, 0.35);
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }
    .camera-header {
      padding: 8px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 12px;
      color: #bae6fd;
    }
    .video-container {
      position: relative;
      width: 100%;
      height: 140px;
      background: #000;
    }
    #webcam {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scaleX(-1);
    }
    #skeleton-canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      transform: scaleX(-1);
    }
    .camera-status {
      padding: 8px 12px;
      font-size: 11px;
      display: flex;
      justify-content: space-between;
      color: #7dd3fc;
      background: rgba(8, 47, 73, 0.4);
    }
    /* Bottom Gesture Guide Cards */
    .gesture-bar {
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 12px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      padding: 10px 14px;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
    }
    .gesture-card {
      padding: 8px 14px;
      border-radius: 10px;
      border: 1px solid transparent;
      background: rgba(30, 41, 59, 0.5);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      min-width: 96px;
      cursor: pointer;
      transition: all 0.25s ease;
    }
    .gesture-card:hover {
      background: rgba(51, 65, 85, 0.8);
      border-color: rgba(56, 189, 248, 0.4);
    }
    .gesture-card.active {
      background: rgba(14, 116, 144, 0.35);
      border-color: #38bdf8;
      box-shadow: 0 0 16px rgba(56, 189, 248, 0.4);
    }
    .gesture-name {
      font-size: 13px;
      font-weight: 700;
      color: #f1f5f9;
    }
    .gesture-desc {
      font-size: 10px;
      color: #94a3b8;
    }
    /* Controls Drawer on Bottom Left */
    .controls-box {
      bottom: 24px;
      left: 24px;
      display: flex;
      gap: 8px;
    }
    .btn {
      background: rgba(15, 23, 42, 0.8);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #e2e8f0;
      padding: 8px 14px;
      border-radius: 10px;
      font-size: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .btn:hover {
      background: rgba(30, 41, 59, 0.95);
      border-color: #38bdf8;
      color: #38bdf8;
    }
    /* Notification Toast */
    .toast {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid #38bdf8;
      box-shadow: 0 0 30px rgba(56, 189, 248, 0.5);
      border-radius: 16px;
      padding: 24px 36px;
      text-align: center;
      display: none;
      z-index: 100;
    }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>

  <!-- HUD: Top Left -->
  <div class="hud top-header">
    <div class="title-badge">
      <div class="app-title">⚔️ 仙剑御剑术</div>
      <div class="app-subtitle">MediaPipe 手势识别 × Boids 剑阵飞仙</div>
    </div>
  </div>

  <!-- HUD: Top Right Camera PiP -->
  <div class="hud camera-box interactive">
    <div class="camera-header">
      <span>手势灵镜 (摄像头)</span>
      <span id="fps-counter" style="color: #38bdf8; font-family: monospace;">60 FPS</span>
    </div>
    <div class="video-container">
      <video id="webcam" playsinline autoplay muted></video>
      <canvas id="skeleton-canvas"></canvas>
    </div>
    <div class="camera-status">
      <span id="gesture-indicator">当前诀法: 自由漫游</span>
      <span id="confidence-val">99%</span>
    </div>
  </div>

  <!-- HUD: Bottom Center Gesture Guide -->
  <div class="hud gesture-bar interactive" id="gesture-bar">
    <div class="gesture-card active" data-gesture="FREE_FLIGHT" onclick="setSimulatedGesture('FREE_FLIGHT')">
      <span class="gesture-name">🍃 自由漫游</span>
      <span class="gesture-desc">自然灵韵飞舞</span>
    </div>
    <div class="gesture-card" data-gesture="TWO_FINGER_POINT" onclick="setSimulatedGesture('TWO_FINGER_POINT')">
      <span class="gesture-name">👉 双指·御剑诀</span>
      <span class="gesture-desc">剑指所向 破空疾驰</span>
    </div>
    <div class="gesture-card" data-gesture="OPEN_PALM_RING" onclick="setSimulatedGesture('OPEN_PALM_RING')">
      <span class="gesture-name">✋ 张开·混元环</span>
      <span class="gesture-desc">万剑化圆 旋转护体</span>
    </div>
    <div class="gesture-card" data-gesture="FIST_CLUSTER" onclick="setSimulatedGesture('FIST_CLUSTER')">
      <span class="gesture-name">✊ 握拳·凝剑核</span>
      <span class="gesture-desc">万剑归宗 聚拢如炽</span>
    </div>
    <div class="gesture-card" data-gesture="FOUR_FINGER_TRIANGLE" onclick="setSimulatedGesture('FOUR_FINGER_TRIANGLE')">
      <span class="gesture-name">🖖 四指·诛仙阵</span>
      <span class="gesture-desc">三才聚顶 化三角阵</span>
    </div>
  </div>

  <!-- HUD: Bottom Left Controls -->
  <div class="hud controls-box interactive">
    <button class="btn" id="btn-camera" onclick="toggleWebcam()">📹 启动/重启摄像头</button>
    <button class="btn" id="btn-audio" onclick="toggleAudio()">🔊 剑鸣音效: 开</button>
    <button class="btn" id="btn-theme" onclick="cycleTheme()">🎨 灵剑道韵</button>
    <button class="btn" id="btn-count" onclick="cycleCount()">⚔️ 仙剑数量: 120</button>
  </div>

  <!-- All Core Logic in One Clean Script Block -->
  <script>
    /* ============================================================
     * 仙剑御剑术 - 核心引擎逻辑 (纯脚本实现)
     * ============================================================ */

    // 1. 全局配置与状态
    const CONFIG = {
      swordCount: 120,
      maxSpeed: 8,
      minSpeed: 2.5,
      maxForce: 0.35,
      separationDistance: 32,
      neighborDistance: 70,
      separationWeight: 1.6,
      alignmentWeight: 1.0,
      cohesionWeight: 0.9,
      targetWeight: 1.8,
      trailLength: 16,
      glowIntensity: 1.2,
      themeIndex: 0,
      audioEnabled: true
    };

    const THEMES = [
      { name: '寒霜幽蓝', glow: '#38bdf8', blade: '#e0f2fe', trail: 'rgba(56, 189, 248, 0.4)', rune: '#7dd3fc', tassel: '#0284c7', bg: 'rgba(7, 16, 38, 0.6)' },
      { name: '青莲碧光', glow: '#34d399', blade: '#d1fae5', trail: 'rgba(52, 211, 153, 0.4)', rune: '#6ee7b7', tassel: '#059669', bg: 'rgba(6, 30, 22, 0.6)' },
      { name: '赤霄烈焰', glow: '#f97316', blade: '#ffedd5', trail: 'rgba(249, 115, 22, 0.4)', rune: '#fdba74', tassel: '#dc2626', bg: 'rgba(38, 12, 8, 0.6)' },
      { name: '紫霄神雷', glow: '#c084fc', blade: '#f3e8ff', trail: 'rgba(192, 132, 252, 0.4)', rune: '#d8b4fe', tassel: '#9333ea', bg: 'rgba(28, 10, 42, 0.6)' },
      { name: '金乌纯阳', glow: '#fbbf24', blade: '#fef3c7', trail: 'rgba(251, 191, 36, 0.4)', rune: '#fde68a', tassel: '#d97706', bg: 'rgba(38, 28, 6, 0.6)' }
    ];

    let canvas, ctx;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let swords = [];
    let formationTime = 0;
    let activeGesture = 'FREE_FLIGHT';
    let simulatedGesture = null;

    // 手势数据
    let handData = {
      present: false,
      palmX: 0.5,
      palmY: 0.5,
      dirX: 0,
      dirY: -1,
      angle: 0,
      gesture: 'FREE_FLIGHT',
      confidence: 0.9
    };

    // 鼠标模拟指针
    let mousePos = { x: width / 2, y: height / 2 };
    let isMouseDown = false;

    // 2. 音频合成器 (Web Audio API)
    class SoundEngine {
      constructor() {
        this.ctx = null;
        this.master = null;
      }
      init() {
        if (this.ctx) return;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();
        this.master = this.ctx.createGain();
        this.master.gain.setValueAtTime(0.18, this.ctx.currentTime);
        this.master.connect(this.ctx.destination);
      }
      playChime(freq = 880, dur = 1.2) {
        if (!this.ctx || !CONFIG.audioEnabled) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const t = this.ctx.currentTime;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        gain.connect(this.master);

        [1.0, 2.76, 5.4].forEach((ratio, i) => {
          const osc = this.ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq * ratio, t);
          osc.connect(gain);
          osc.start(t);
          osc.stop(t + dur);
        });
      }
    }
    const audio = new SoundEngine();

    // 3. 仙剑实体与 Boids 算法
    function initSwords(count) {
      swords = [];
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 3 + Math.random() * 2;
        swords.push({
          id: i,
          x: Math.random() * width,
          y: Math.random() * height,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          ax: 0,
          ay: 0,
          angle: ang,
          length: 26 + Math.random() * 8,
          width: 4 + Math.random() * 1.5,
          trail: [],
          targetX: width / 2,
          targetY: height / 2,
          targetAngle: ang,
          formationWeight: 0
        });
      }
    }

    function updateBoids(dt) {
      formationTime += dt;
      const currentG = simulatedGesture || (handData.present ? handData.gesture : 'FREE_FLIGHT');
      if (currentG !== activeGesture) {
        activeGesture = currentG;
        audio.playChime(activeGesture === 'TWO_FINGER_POINT' ? 1174 : activeGesture === 'FIST_CLUSTER' ? 587 : 880);
        updateGestureHUD();
      }

      const isFormation = activeGesture !== 'FREE_FLIGHT';
      const targetWeight = isFormation ? 1.0 : 0.0;

      const hX = handData.present ? (1 - handData.palmX) * width : mousePos.x;
      const hY = handData.present ? handData.palmY * height : mousePos.y;

      // 计算阵型坐标
      calculateFormationSlots(activeGesture, hX, hY);

      const N = swords.length;
      const sepDistSq = CONFIG.separationDistance ** 2;
      const neighDistSq = CONFIG.neighborDistance ** 2;

      for (let i = 0; i < N; i++) {
        const s = swords[i];
        s.formationWeight += (targetWeight - s.formationWeight) * Math.min(1, dt * 3.5);

        s.ax = 0;
        s.ay = 0;

        let sepX = 0, sepY = 0, sepC = 0;
        let aliX = 0, aliY = 0, aliC = 0;
        let cohX = 0, cohY = 0, cohC = 0;

        for (let j = 0; j < N; j++) {
          if (i === j) continue;
          const o = swords[j];
          const dx = s.x - o.x;
          const dy = s.y - o.y;
          const dSq = dx * dx + dy * dy;

          if (dSq > 0 && dSq < sepDistSq) {
            const d = Math.sqrt(dSq);
            sepX += (dx / d) * ((CONFIG.separationDistance - d) / d);
            sepY += (dy / d) * ((CONFIG.separationDistance - d) / d);
            sepC++;
          }
          if (dSq < neighDistSq) {
            aliX += o.vx; aliY += o.vy; aliC++;
            cohX += o.x; cohY += o.y; cohC++;
          }
        }

        if (sepC > 0) { sepX /= sepC; sepY /= sepC; }
        if (aliC > 0) { aliX = aliX / aliC - s.vx; aliY = aliY / aliC - s.vy; }
        if (cohC > 0) { cohX = cohX / cohC - s.x; cohY = cohY / cohC - s.y; }

        // 边界保护
        const m = 80;
        let bX = 0, bY = 0;
        if (s.x < m) bX = (m - s.x) * 0.08;
        else if (s.x > width - m) bX = (width - m - s.x) * 0.08;
        if (s.y < m) bY = (m - s.y) * 0.08;
        else if (s.y > height - m) bY = (height - m - s.y) * 0.08;

        // 阵型引力
        let formX = 0, formY = 0;
        if (s.formationWeight > 0.01) {
          const tdx = s.targetX - s.x;
          const tdy = s.targetY - s.y;
          const tDist = Math.sqrt(tdx * tdx + tdy * tdy);
          if (tDist > 1) {
            const desiredSpd = Math.min(CONFIG.maxSpeed * 1.5, tDist * 0.8);
            formX = (tdx / tDist) * desiredSpd - s.vx;
            formY = (tdy / tDist) * desiredSpd - s.vy;
          }
        }

        const wBoids = 1.0 - s.formationWeight * 0.85;
        const wForm = s.formationWeight * CONFIG.targetWeight;

        s.ax += sepX * CONFIG.separationWeight * (1 + s.formationWeight * 0.5);
        s.ax += aliX * CONFIG.alignmentWeight * wBoids + cohX * CONFIG.cohesionWeight * wBoids;
        s.ax += bX + formX * wForm;

        s.ay += sepY * CONFIG.separationWeight * (1 + s.formationWeight * 0.5);
        s.ay += aliY * CONFIG.alignmentWeight * wBoids + cohY * CONFIG.cohesionWeight * wBoids;
        s.ay += bY + formY * wForm;

        // 限制加速度与速度
        const acc = Math.sqrt(s.ax * s.ax + s.ay * s.ay);
        if (acc > CONFIG.maxForce * 2) {
          s.ax = (s.ax / acc) * CONFIG.maxForce * 2;
          s.ay = (s.ay / acc) * CONFIG.maxForce * 2;
        }

        s.vx += s.ax;
        s.vy += s.ay;

        const curSpd = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
        const maxS = activeGesture === 'TWO_FINGER_POINT' ? CONFIG.maxSpeed * 1.4 : CONFIG.maxSpeed;
        if (curSpd > maxS) {
          s.vx = (s.vx / curSpd) * maxS;
          s.vy = (s.vy / curSpd) * maxS;
        } else if (curSpd < CONFIG.minSpeed && curSpd > 0.001) {
          s.vx = (s.vx / curSpd) * CONFIG.minSpeed;
          s.vy = (s.vy / curSpd) * CONFIG.minSpeed;
        }

        s.x += s.vx;
        s.y += s.vy;

        // 边界循环
        if (s.x < -30) s.x = width + 30;
        else if (s.x > width + 30) s.x = -30;
        if (s.y < -30) s.y = height + 30;
        else if (s.y > height + 30) s.y = -30;

        // 角度平滑
        let desAngle = Math.atan2(s.vy, s.vx);
        if (s.formationWeight > 0.6 && s.targetAngle !== undefined) {
          desAngle = s.targetAngle;
        }
        let diff = desAngle - s.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        s.angle += diff * 0.22;

        // 尾迹更新
        s.trail.unshift({ x: s.x, y: s.y, alpha: 1.0 });
        if (s.trail.length > CONFIG.trailLength) s.trail.pop();
        for (let t = 0; t < s.trail.length; t++) {
          s.trail[t].alpha = (1 - t / s.trail.length) * 0.8;
        }
      }
    }

    function calculateFormationSlots(gesture, cx, cy) {
      const N = swords.length;
      if (gesture === 'TWO_FINGER_POINT') {
        const dx = handData.present ? -(handData.dirX) : (mousePos.x - cx || 1);
        const dy = handData.present ? handData.dirY : (mousePos.y - cy || 0);
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const ndx = dx / len;
        const ndy = dy / len;
        const perpX = -ndy;
        const perpY = ndx;
        const pAng = Math.atan2(ndy, ndx);

        const leadX = cx + ndx * 160;
        const leadY = cy + ndy * 160;

        for (let i = 0; i < N; i++) {
          const row = Math.floor(Math.sqrt(i));
          const col = i - row * row;
          swords[i].targetX = leadX - row * 34 * ndx + (col - row / 2) * 26 * perpX;
          swords[i].targetY = leadY - row * 34 * ndy + (col - row / 2) * 26 * perpY;
          swords[i].targetAngle = pAng;
        }
      } else if (gesture === 'OPEN_PALM_RING') {
        const r1 = 130, r2 = 210;
        const half = Math.floor(N * 0.45);
        for (let i = 0; i < N; i++) {
          if (i < half) {
            const ang = (i / half) * Math.PI * 2 + formationTime * 1.5;
            swords[i].targetX = cx + Math.cos(ang) * r1;
            swords[i].targetY = cy + Math.sin(ang) * r1;
            swords[i].targetAngle = ang + Math.PI / 2;
          } else {
            const ang = ((i - half) / (N - half)) * Math.PI * 2 - formationTime * 1.0;
            swords[i].targetX = cx + Math.cos(ang) * r2;
            swords[i].targetY = cy + Math.sin(ang) * r2;
            swords[i].targetAngle = ang - Math.PI / 2;
          }
        }
      } else if (gesture === 'FIST_CLUSTER') {
        const phi = (1 + Math.sqrt(5)) / 2;
        for (let i = 0; i < N; i++) {
          const theta = i * phi * Math.PI * 2 + formationTime * 3.8;
          const r = Math.sqrt(i / N) * 55 + Math.sin(formationTime * 6 + i) * 6;
          swords[i].targetX = cx + Math.cos(theta) * r;
          swords[i].targetY = cy + Math.sin(theta) * r;
          swords[i].targetAngle = theta + Math.PI * 0.65;
        }
      } else if (gesture === 'FOUR_FINGER_TRIANGLE') {
        const triSize = 210;
        const baseAng = (handData.present ? handData.angle : 0) + formationTime * 0.25;
        const v = [
          { x: Math.cos(baseAng) * triSize, y: Math.sin(baseAng) * triSize },
          { x: Math.cos(baseAng + Math.PI * 2 / 3) * triSize, y: Math.sin(baseAng + Math.PI * 2 / 3) * triSize },
          { x: Math.cos(baseAng + Math.PI * 4 / 3) * triSize, y: Math.sin(baseAng + Math.PI * 4 / 3) * triSize }
        ];
        for (let i = 0; i < N; i++) {
          const side = i % 3;
          const t = Math.floor(i / 3) / Math.max(1, Math.floor(N / 3));
          const p1 = v[side];
          const p2 = v[(side + 1) % 3];
          swords[i].targetX = cx + p1.x + (p2.x - p1.x) * t;
          swords[i].targetY = cy + p1.y + (p2.y - p1.y) * t;
          swords[i].targetAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        }
      }
    }

    // 4. 画面渲染
    function render() {
      const theme = THEMES[CONFIG.themeIndex];

      // 背景渐变
      const grad = ctx.createRadialGradient(width / 2, height * 0.45, 100, width / 2, height * 0.45, Math.max(width, height) * 0.8);
      grad.addColorStop(0, theme.bg);
      grad.addColorStop(0.6, '#090d16');
      grad.addColorStop(1, '#020408');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // 仙剑与尾迹绘制
      for (const s of swords) {
        // 尾迹
        if (s.trail.length > 2) {
          ctx.save();
          for (let i = 0; i < s.trail.length - 1; i++) {
            ctx.beginPath();
            ctx.moveTo(s.trail[i].x, s.trail[i].y);
            ctx.lineTo(s.trail[i + 1].x, s.trail[i + 1].y);
            ctx.strokeStyle = theme.glow;
            ctx.globalAlpha = s.trail[i].alpha * 0.4;
            ctx.lineWidth = Math.max(1, s.width * (1 - i / s.trail.length));
            ctx.stroke();
          }
          ctx.restore();
        }

        // 剑身
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.angle);

        ctx.shadowColor = theme.glow;
        ctx.shadowBlur = 10 * CONFIG.glowIntensity;

        const L = s.length;
        const W = s.width;

        ctx.beginPath();
        ctx.moveTo(L * 0.65, 0);
        ctx.lineTo(L * 0.2, -W * 0.5);
        ctx.lineTo(-L * 0.2, -W * 0.4);
        ctx.lineTo(-L * 0.22, -W * 1.1);
        ctx.lineTo(-L * 0.28, -W * 1.1);
        ctx.lineTo(-L * 0.26, -W * 0.35);
        ctx.lineTo(-L * 0.55, -W * 0.3);
        ctx.lineTo(-L * 0.65, 0);
        ctx.lineTo(-L * 0.55, W * 0.3);
        ctx.lineTo(-L * 0.26, W * 0.35);
        ctx.lineTo(-L * 0.28, W * 1.1);
        ctx.lineTo(-L * 0.22, W * 1.1);
        ctx.lineTo(-L * 0.2, W * 0.4);
        ctx.lineTo(L * 0.2, W * 0.5);
        ctx.closePath();

        const bGrad = ctx.createLinearGradient(-L * 0.3, 0, L * 0.65, 0);
        bGrad.addColorStop(0, '#64748b');
        bGrad.addColorStop(0.3, theme.blade);
        bGrad.addColorStop(1, '#ffffff');
        ctx.fillStyle = bGrad;
        ctx.fill();

        // 剑脊灵纹
        ctx.beginPath();
        ctx.moveTo(-L * 0.2, 0);
        ctx.lineTo(L * 0.52, 0);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.restore();
      }
    }

    // 5. MediaPipe 手势识别逻辑
    let cameraInstance = null;
    let handsInstance = null;

    function initMediaPipe() {
      if (!window.Hands || !window.Camera) {
        console.warn('MediaPipe library loading...');
        setTimeout(initMediaPipe, 500);
        return;
      }

      handsInstance = new Hands({
        locateFile: (file) => \`https://cdn.jsdelivr.net/npm/@mediapipe/hands/\${file}\`
      });

      handsInstance.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
      });

      handsInstance.onResults(onHandResults);

      const videoEl = document.getElementById('webcam');
      cameraInstance = new Camera(videoEl, {
        onFrame: async () => {
          if (handsInstance) await handsInstance.send({ image: videoEl });
        },
        width: 320,
        height: 240
      });

      cameraInstance.start().catch(err => {
        console.warn('Camera access denied or failed:', err);
        document.getElementById('gesture-indicator').innerText = '摄像头未启用 (可用下方按钮测试)';
      });
    }

    function onHandResults(results) {
      const skelCanvas = document.getElementById('skeleton-canvas');
      const skelCtx = skelCanvas.getContext('2d');
      skelCanvas.width = 320;
      skelCanvas.height = 240;
      skelCtx.clearRect(0, 0, 320, 240);

      if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        handData.present = false;
        return;
      }

      handData.present = true;
      const lm = results.multiHandLandmarks[0];

      // 绘制骨骼
      drawSkeleton(skelCtx, lm);

      // 计算手势
      recognizeGesture(lm);
    }

    function drawSkeleton(ctx, lm) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      const connections = [
        [0,1],[1,2],[2,3],[3,4],
        [0,5],[5,6],[6,7],[7,8],
        [5,9],[9,10],[10,11],[11,12],
        [9,13],[13,14],[14,15],[15,16],
        [13,17],[17,18],[18,19],[19,20],[0,17]
      ];
      for (const [i, j] of connections) {
        ctx.beginPath();
        ctx.moveTo(lm[i].x * 320, lm[i].y * 240);
        ctx.lineTo(lm[j].x * 320, lm[j].y * 240);
        ctx.stroke();
      }
      ctx.fillStyle = '#ffffff';
      for (const p of lm) {
        ctx.beginPath();
        ctx.arc(p.x * 320, p.y * 240, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function dist(p1, p2) {
      const dx = p1.x - p2.x, dy = p1.y - p2.y, dz = (p1.z || 0) - (p2.z || 0);
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    function recognizeGesture(lm) {
      const wrist = lm[0];
      const thumbTip = lm[4];
      const indexTip = lm[8], indexPip = lm[6], indexMcp = lm[5];
      const midTip = lm[12], midPip = lm[10], midMcp = lm[9];
      const ringTip = lm[16], ringPip = lm[14], ringMcp = lm[13];
      const pinkyTip = lm[20], pinkyPip = lm[18], pinkyMcp = lm[17];

      const palmScale = dist(wrist, midMcp) || 0.15;
      handData.palmX = (wrist.x + indexMcp.x + midMcp.x + ringMcp.x + pinkyMcp.x) / 5;
      handData.palmY = (wrist.y + indexMcp.y + midMcp.y + ringMcp.y + pinkyMcp.y) / 5;

      const isIdx = dist(indexTip, wrist) > dist(indexPip, wrist) * 1.1;
      const isMid = dist(midTip, wrist) > dist(midPip, wrist) * 1.1;
      const isRing = dist(ringTip, wrist) > dist(ringPip, wrist) * 1.1;
      const isPinky = dist(pinkyTip, wrist) > dist(pinkyPip, wrist) * 1.1;

      const dIdxMid = dist(indexTip, midTip) / palmScale;
      const dMidRing = dist(midTip, ringTip) / palmScale;
      const dRingPinky = dist(ringTip, pinkyTip) / palmScale;

      let g = 'FREE_FLIGHT';
      let rawName = '自由漫游';

      const folded = (!isIdx ? 1 : 0) + (!isMid ? 1 : 0) + (!isRing ? 1 : 0) + (!isPinky ? 1 : 0);

      if (folded >= 4) {
        g = 'FIST_CLUSTER';
        rawName = '握拳·凝剑核';
      } else if (isIdx && isMid && !isRing && !isPinky && dIdxMid < 0.45) {
        g = 'TWO_FINGER_POINT';
        rawName = '双指·御剑诀';
      } else if (isIdx && isMid && isRing && isPinky) {
        const avgSpread = (dIdxMid + dMidRing + dRingPinky) / 3;
        if (avgSpread < 0.38) {
          g = 'FOUR_FINGER_TRIANGLE';
          rawName = '四指·诛仙阵';
        } else {
          g = 'OPEN_PALM_RING';
          rawName = '张开·混元环';
        }
      }

      handData.gesture = g;
      handData.dirX = (indexTip.x + midTip.x) / 2 - handData.palmX;
      handData.dirY = (indexTip.y + midTip.y) / 2 - handData.palmY;
      handData.angle = Math.atan2(handData.dirY, handData.dirX);

      document.getElementById('gesture-indicator').innerText = '当前诀法: ' + rawName;
    }

    // 6. 交互 HUD 与按键
    function updateGestureHUD() {
      const cards = document.querySelectorAll('.gesture-card');
      cards.forEach(card => {
        if (card.dataset.gesture === activeGesture) {
          card.classList.add('active');
        } else {
          card.classList.remove('active');
        }
      });
    }

    function setSimulatedGesture(g) {
      audio.init();
      simulatedGesture = (simulatedGesture === g) ? null : g;
      if (!simulatedGesture) {
        activeGesture = 'FREE_FLIGHT';
      }
      updateGestureHUD();
    }

    function toggleWebcam() {
      audio.init();
      if (!cameraInstance) initMediaPipe();
    }

    function toggleAudio() {
      audio.init();
      CONFIG.audioEnabled = !CONFIG.audioEnabled;
      document.getElementById('btn-audio').innerText = CONFIG.audioEnabled ? '🔊 剑鸣音效: 开' : '🔇 剑鸣音效: 关';
    }

    function cycleTheme() {
      audio.init();
      CONFIG.themeIndex = (CONFIG.themeIndex + 1) % THEMES.length;
      document.getElementById('btn-theme').innerText = '🎨 灵剑: ' + THEMES[CONFIG.themeIndex].name;
    }

    function cycleCount() {
      audio.init();
      const counts = [60, 120, 180, 240];
      const curIdx = counts.indexOf(CONFIG.swordCount);
      CONFIG.swordCount = counts[(curIdx + 1) % counts.length];
      document.getElementById('btn-count').innerText = '⚔️ 仙剑数量: ' + CONFIG.swordCount;
      initSwords(CONFIG.swordCount);
    }

    // 7. 主循环与初始化
    let lastT = performance.now();
    let frameCount = 0;
    let fpsTime = performance.now();

    function loop(t) {
      const dt = Math.min(0.05, (t - lastT) / 1000);
      lastT = t;

      frameCount++;
      if (t - fpsTime > 1000) {
        document.getElementById('fps-counter').innerText = frameCount + ' FPS';
        frameCount = 0;
        fpsTime = t;
      }

      updateBoids(dt);
      render();

      requestAnimationFrame(loop);
    }

    window.addEventListener('resize', () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    });

    window.addEventListener('mousemove', (e) => {
      mousePos.x = e.clientX;
      mousePos.y = e.clientY;
    });

    window.addEventListener('click', () => {
      audio.init();
    });

    window.addEventListener('DOMContentLoaded', () => {
      canvas = document.getElementById('canvas');
      ctx = canvas.getContext('2d');
      canvas.width = width;
      canvas.height = height;

      initSwords(CONFIG.swordCount);
      initMediaPipe();

      requestAnimationFrame(loop);
    });
  </script>
</body>
</html>`;
}
