import { BoidSword, HandGesture, RecognizedHand, SimulationConfig, SwordTheme } from '../types';

export const SWORD_THEMES: SwordTheme[] = [
  {
    id: 'frost_azure',
    name: '寒霜幽蓝',
    pinyin: 'Han Shuang You Lan',
    glowColor: '#38bdf8',
    bladeColor: '#e0f2fe',
    coreColor: '#ffffff',
    trailColor: 'rgba(56, 189, 248, 0.45)',
    runeColor: '#7dd3fc',
    tasselColor: '#0284c7',
    bgAtmosphere: 'rgba(7, 16, 38, 0.6)',
    description: '九霄玄冰凝剑气，寒芒彻骨映星河',
  },
  {
    id: 'emerald_lotus',
    name: '青莲碧光',
    pinyin: 'Qing Lian Bi Guang',
    glowColor: '#34d399',
    bladeColor: '#d1fae5',
    coreColor: '#ffffff',
    trailColor: 'rgba(52, 211, 153, 0.45)',
    runeColor: '#6ee7b7',
    tasselColor: '#059669',
    bgAtmosphere: 'rgba(6, 30, 22, 0.6)',
    description: '造化青莲生太虚，生生不息仙道长',
  },
  {
    id: 'crimson_flame',
    name: '赤霄烈焰',
    pinyin: 'Chi Xiao Lie Yan',
    glowColor: '#f97316',
    bladeColor: '#ffedd5',
    coreColor: '#ffffff',
    trailColor: 'rgba(249, 115, 22, 0.45)',
    runeColor: '#fdba74',
    tasselColor: '#dc2626',
    bgAtmosphere: 'rgba(38, 12, 8, 0.6)',
    description: '南离真火铸赤霄，焚尽妖邪断红尘',
  },
  {
    id: 'violet_thunder',
    name: '紫霄神雷',
    pinyin: 'Zi Xiao Shen Lei',
    glowColor: '#c084fc',
    bladeColor: '#f3e8ff',
    coreColor: '#ffffff',
    trailColor: 'rgba(192, 132, 252, 0.45)',
    runeColor: '#d8b4fe',
    tasselColor: '#9333ea',
    bgAtmosphere: 'rgba(28, 10, 42, 0.6)',
    description: '九天神雷听吾号，天道雷劫化锋芒',
  },
  {
    id: 'solar_gold',
    name: '金乌纯阳',
    pinyin: 'Jin Wu Chun Yang',
    glowColor: '#fbbf24',
    bladeColor: '#fef3c7',
    coreColor: '#ffffff',
    trailColor: 'rgba(251, 191, 36, 0.45)',
    runeColor: '#fde68a',
    tasselColor: '#d97706',
    bgAtmosphere: 'rgba(38, 28, 6, 0.6)',
    description: '纯阳浩气贯日月，神光万丈照大千',
  },
  {
    id: 'obsidian_shadow',
    name: '墨玉玄光',
    pinyin: 'Mo Yu Xuan Guang',
    glowColor: '#cbd5e1',
    bladeColor: '#f8fafc',
    coreColor: '#ffffff',
    trailColor: 'rgba(203, 213, 225, 0.35)',
    runeColor: '#94a3b8',
    tasselColor: '#475569',
    bgAtmosphere: 'rgba(15, 23, 42, 0.6)',
    description: '水墨丹青藏古剑，天地无极任逍遥',
  },
];

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private stars: Array<{ x: number; y: number; size: number; alpha: number; speed: number }> = [];
  private particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number }> = [];

  // --- 性能缓存：背景渐变 / 远山 / 剑精灵图 ---
  private bgKey = '';
  private bgGrad: CanvasGradient | null = null;
  private mtnKey = '';
  private mountainCanvas: HTMLCanvasElement | null = null;
  private spriteKey = '';
  private swordSprite: HTMLCanvasElement | null = null;
  private readonly SPRITE_L = 30;   // 精灵图烘焙参考剑长
  private readonly SPRITE_W = 5;    // 精灵图烘焙参考剑宽
  private readonly SPRITE_PAD = 34; // 烘焙时为辉光预留的边距
  private readonly SPRITE_SS = 2;   // 精灵图超采样倍率（保证清晰度）

  // 能量连线分桶（避免每帧分配数组）
  private pairsNear: number[] = [];
  private pairsFar: number[] = [];

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.resize(width, height);
    this.initStars(80);
  }

  public resize(w: number, h: number) {
    this.width = w;
    this.height = h;
  }

  private initStars(count: number) {
    this.stars = [];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * (this.width || 1000),
        y: Math.random() * (this.height || 800),
        size: 0.8 + Math.random() * 1.8,
        alpha: 0.2 + Math.random() * 0.7,
        speed: 0.2 + Math.random() * 0.5,
      });
    }
  }

  public render(
    swords: BoidSword[],
    hand: RecognizedHand | null,
    config: SimulationConfig,
    time: number
  ) {
    const ctx = this.ctx;
    const theme = SWORD_THEMES.find((t) => t.id === config.themeId) || SWORD_THEMES[0];

    // 1. Clear background with atmospheric gradient
    this.renderBackground(theme, time);

    // 2. Render stars & background mist
    this.renderAtmosphere(theme, time);

    // 3. Render Hand / Gesture Formation Array
    if (hand && hand.landmarks.length > 0) {
      this.renderHandAura(hand, theme, config, time);
    }

    // 4. Render Formation Energy Lines
    if (config.showEnergyLines && hand && hand.gesture !== 'FREE_FLIGHT') {
      this.renderEnergyLines(swords, hand.gesture, theme);
    }

    // 5. Render Particle Sparks
    this.renderParticles(dt => {});

    // 6. Render Swords & Sword Trails
    this.renderSwords(swords, theme, config, time);
  }

  private renderBackground(theme: SwordTheme, _time: number) {
    const ctx = this.ctx;
    const key = `${theme.id}|${this.width}|${this.height}`;
    if (key !== this.bgKey || !this.bgGrad) {
      this.bgKey = key;
      const bgGrad = ctx.createRadialGradient(
        this.width / 2,
        this.height * 0.45,
        100,
        this.width / 2,
        this.height * 0.45,
        Math.max(this.width, this.height) * 0.8
      );
      bgGrad.addColorStop(0, theme.bgAtmosphere);
      bgGrad.addColorStop(0.6, '#090d16');
      bgGrad.addColorStop(1, '#020408');
      this.bgGrad = bgGrad;
    }

    ctx.fillStyle = this.bgGrad;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private ensureMountainCanvas() {
    const key = `${this.width}|${this.height}`;
    if (key === this.mtnKey && this.mountainCanvas) return;

    const m = document.createElement('canvas');
    m.width = this.width;
    m.height = this.height;
    const mctx = m.getContext('2d');
    if (!mctx) return;

    mctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    mctx.beginPath();
    mctx.moveTo(0, this.height);
    const mHeight = this.height * 0.85;
    mctx.lineTo(0, mHeight);
    for (let x = 0; x <= this.width; x += 40) {
      const y =
        mHeight -
        Math.sin(x * 0.003 + 1) * 60 -
        Math.cos(x * 0.007) * 40 -
        Math.sin(x * 0.015) * 20;
      mctx.lineTo(x, y);
    }
    mctx.lineTo(this.width, this.height);
    mctx.closePath();
    mctx.fill();

    this.mountainCanvas = m;
    this.mtnKey = key;
  }

  private renderAtmosphere(theme: SwordTheme, time: number) {
    const ctx = this.ctx;

    // Twinkling stars (fillRect 比 arc+fill 便宜数倍，视觉等效)
    ctx.fillStyle = '#e0f2fe';
    for (const star of this.stars) {
      const alpha = star.alpha * (0.6 + 0.4 * Math.sin(time * star.speed * 2 + star.x));
      if (alpha <= 0.02) continue;
      ctx.globalAlpha = alpha;
      ctx.fillRect(star.x, star.y, star.size * 1.4, star.size * 1.4);
    }
    ctx.globalAlpha = 1;

    // Distant mountain silhouette / 远山仙境（静态，预渲染缓存）
    this.ensureMountainCanvas();
    if (this.mountainCanvas) {
      ctx.drawImage(this.mountainCanvas, 0, 0);
    }
  }

  /**
   * 剑体精灵图：把刀刃路径 + 辉光(shadowBlur) + 渐变一次性烘焙到离屏画布，
   * 运行帧循环里只做 drawImage，彻底消除每帧 120 次 shadowBlur/渐变/多段路径。
   */
  private ensureSwordSprite(theme: SwordTheme, glowIntensity: number) {
    const key = `${theme.id}|${glowIntensity.toFixed(1)}`;
    if (key === this.spriteKey && this.swordSprite) return;

    const L = this.SPRITE_L;
    const W = this.SPRITE_W;
    const pad = this.SPRITE_PAD;
    const SS = this.SPRITE_SS;

    const c = document.createElement('canvas');
    c.width = Math.ceil((L * 1.3 + pad * 2) * SS);
    c.height = Math.ceil((W * 2.4 + pad * 2) * SS);
    const s = c.getContext('2d');
    if (!s) return;

    s.scale(SS, SS);
    s.translate(c.width / SS / 2, c.height / SS / 2);

    // Glow halo baked once
    if (glowIntensity > 0) {
      s.shadowColor = theme.glowColor;
      s.shadowBlur = 10 * glowIntensity;
    }

    // Blade silhouette (Double-edged Chinese Jian) — 与原始路径完全一致
    s.beginPath();
    s.moveTo(L * 0.65, 0);
    s.lineTo(L * 0.2, -W * 0.5);
    s.lineTo(-L * 0.2, -W * 0.4);
    s.lineTo(-L * 0.22, -W * 1.2);
    s.lineTo(-L * 0.28, -W * 1.2);
    s.lineTo(-L * 0.26, -W * 0.35);
    s.lineTo(-L * 0.55, -W * 0.3);
    s.lineTo(-L * 0.6, -W * 0.6);
    s.lineTo(-L * 0.65, 0);
    s.lineTo(-L * 0.6, W * 0.6);
    s.lineTo(-L * 0.55, W * 0.3);
    s.lineTo(-L * 0.26, W * 0.35);
    s.lineTo(-L * 0.28, W * 1.2);
    s.lineTo(-L * 0.22, W * 1.2);
    s.lineTo(-L * 0.2, W * 0.4);
    s.lineTo(L * 0.2, W * 0.5);
    s.closePath();

    const bladeGrad = s.createLinearGradient(-L * 0.3, 0, L * 0.65, 0);
    bladeGrad.addColorStop(0, '#64748b');
    bladeGrad.addColorStop(0.3, theme.bladeColor);
    bladeGrad.addColorStop(0.8, '#ffffff');
    bladeGrad.addColorStop(1, '#ffffff');
    s.fillStyle = bladeGrad;
    s.fill();

    // Central glowing fuller (剑身血槽/灵纹)
    s.beginPath();
    s.moveTo(-L * 0.2, 0);
    s.lineTo(L * 0.52, 0);
    s.strokeStyle = theme.coreColor;
    s.lineWidth = 1.2;
    s.stroke();

    // Crossguard metallic rim
    s.strokeStyle = theme.glowColor;
    s.lineWidth = 0.8;
    s.stroke();

    this.swordSprite = c;
    this.spriteKey = key;
  }

  private renderHandAura(
    hand: RecognizedHand,
    theme: SwordTheme,
    config: SimulationConfig,
    time: number
  ) {
    const ctx = this.ctx;
    const hx = hand.palmCenter.x * this.width;
    const hy = hand.palmCenter.y * this.height;

    ctx.save();

    // 1. Gesture Name Badge & Qi Ripple on hand center
    const pulse = 1 + 0.15 * Math.sin(time * 6);
    const baseRadius = 48 * pulse;

    // Outer talisman circle
    ctx.beginPath();
    ctx.arc(hx, hy, baseRadius, 0, Math.PI * 2);
    ctx.strokeStyle = theme.runeColor;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -time * 20;
    ctx.stroke();
    ctx.setLineDash([]);

    // Core glow
    const radialGlow = ctx.createRadialGradient(hx, hy, 5, hx, hy, baseRadius * 1.6);
    radialGlow.addColorStop(0, theme.glowColor + '88');
    radialGlow.addColorStop(0.5, theme.glowColor + '22');
    radialGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = radialGlow;
    ctx.beginPath();
    ctx.arc(hx, hy, baseRadius * 1.6, 0, Math.PI * 2);
    ctx.fill();

    // 2. Gesture Specific Visualizers
    if (hand.gesture === 'TWO_FINGER_POINT') {
      // Directional Sword Beam / 剑指神光
      const dir = hand.pointDirection;
      const rayLen = 450;
      const endX = hx + dir.x * rayLen;
      const endY = hy + dir.y * rayLen;

      const beamGrad = ctx.createLinearGradient(hx, hy, endX, endY);
      beamGrad.addColorStop(0, theme.glowColor + 'aa');
      beamGrad.addColorStop(0.3, theme.glowColor + '66');
      beamGrad.addColorStop(1, 'transparent');

      ctx.strokeStyle = beamGrad;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Guiding crosshair rings
      for (let r = 1; r <= 3; r++) {
        const ringX = hx + dir.x * (r * 110);
        const ringY = hy + dir.y * (r * 110);
        ctx.beginPath();
        ctx.arc(ringX, ringY, 14 * r, 0, Math.PI * 2);
        ctx.strokeStyle = theme.glowColor + '44';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    } else if (hand.gesture === 'OPEN_PALM_RING') {
      // Concentric Bagua Array / 混元太极八卦阵
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(time * 0.5);

      // Inner ring
      ctx.beginPath();
      ctx.arc(0, 0, 135, 0, Math.PI * 2);
      ctx.strokeStyle = theme.runeColor + '66';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 8]);
      ctx.stroke();

      // Outer ring
      ctx.beginPath();
      ctx.arc(0, 0, 215, 0, Math.PI * 2);
      ctx.strokeStyle = theme.runeColor + '44';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([12, 12]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();
    } else if (hand.gesture === 'FIST_CLUSTER') {
      // High Energy Singularity / 凝剑核心
      ctx.beginPath();
      ctx.arc(hx, hy, 35 + Math.sin(time * 12) * 5, 0, Math.PI * 2);
      ctx.fillStyle = theme.glowColor + '44';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (hand.gesture === 'FOUR_FINGER_TRIANGLE') {
      // Triangular Array Projection / 诛仙三才阵
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(hand.handAngle + time * 0.25);
      const size = 220;

      ctx.beginPath();
      ctx.moveTo(size, 0);
      ctx.lineTo(Math.cos((Math.PI * 2) / 3) * size, Math.sin((Math.PI * 2) / 3) * size);
      ctx.lineTo(Math.cos((Math.PI * 4) / 3) * size, Math.sin((Math.PI * 4) / 3) * size);
      ctx.closePath();

      ctx.strokeStyle = theme.runeColor + '66';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();
    }

    ctx.restore();
  }

  private renderEnergyLines(swords: BoidSword[], gesture: HandGesture, theme: SwordTheme) {
    const ctx = this.ctx;
    const N = swords.length;
    const maxLines = 60;
    let linesDrawn = 0;

    // 先收集，再按透明度分两桶批量描边（原来最多 60 次独立 stroke → 现在 2 次）
    this.pairsNear.length = 0;
    this.pairsFar.length = 0;

    for (let i = 0; i < N && linesDrawn < maxLines; i += 2) {
      const s1 = swords[i];
      for (let j = i + 1; j < N && linesDrawn < maxLines; j += 2) {
        const s2 = swords[j];
        const dx = s1.x - s2.x;
        const dy = s1.y - s2.y;
        const distSq = dx * dx + dy * dy;

        const maxDist = gesture === 'FIST_CLUSTER' ? 100 : 75;
        if (distSq < maxDist * maxDist) {
          const alpha = (1 - Math.sqrt(distSq) / maxDist) * 0.4;
          if (alpha > 0.22) {
            this.pairsNear.push(s1.x, s1.y, s2.x, s2.y);
          } else {
            this.pairsFar.push(s1.x, s1.y, s2.x, s2.y);
          }
          linesDrawn++;
        }
      }
    }

    ctx.save();
    ctx.lineWidth = 1;

    ctx.strokeStyle = `${theme.runeColor}26`;
    ctx.beginPath();
    for (let k = 0; k < this.pairsFar.length; k += 4) {
      ctx.moveTo(this.pairsFar[k], this.pairsFar[k + 1]);
      ctx.lineTo(this.pairsFar[k + 2], this.pairsFar[k + 3]);
    }
    ctx.stroke();

    ctx.strokeStyle = `${theme.runeColor}4D`;
    ctx.beginPath();
    for (let k = 0; k < this.pairsNear.length; k += 4) {
      ctx.moveTo(this.pairsNear[k], this.pairsNear[k + 1]);
      ctx.lineTo(this.pairsNear[k + 2], this.pairsNear[k + 3]);
    }
    ctx.stroke();

    ctx.restore();
  }

  private renderSwords(
    swords: BoidSword[],
    theme: SwordTheme,
    config: SimulationConfig,
    time: number
  ) {
    const ctx = this.ctx;
    this.ensureSwordSprite(theme, config.glowIntensity);
    const sprite = this.swordSprite;
    if (!sprite) return;

    const spriteW1x = sprite.width / this.SPRITE_SS;
    const spriteH1x = sprite.height / this.SPRITE_SS;

    for (const sword of swords) {
      const pts = sword.trail;
      const n = pts.length;

      // 1. 尾迹：单条变宽丝带多边形，一次 fill 替代原来的逐段 stroke（16 次 → 1 次）
      if (n > 2) {
        ctx.beginPath();
        let closed = false;
        for (let pass = 0; pass < 2; pass++) {
          for (let i = 0; i < n; i++) {
            const idx = pass === 0 ? i : n - 1 - i;
            const p = pts[idx];
            const prev = pts[idx > 0 ? idx - 1 : 0];
            const next = pts[idx < n - 1 ? idx + 1 : n - 1];
            let dx = next.x - prev.x;
            let dy = next.y - prev.y;
            let len = Math.sqrt(dx * dx + dy * dy);
            if (len < 0.0001) {
              dx = Math.cos(sword.angle);
              dy = Math.sin(sword.angle);
              len = 1;
            }
            const w = Math.max(0.4, sword.width * 0.8 * (1 - idx / n)) * 0.5;
            const nx = (-dy / len) * w;
            const ny = (dx / len) * w;
            if (pass === 0) {
              if (idx === 0) ctx.moveTo(p.x + nx, p.y + ny);
              else ctx.lineTo(p.x + nx, p.y + ny);
            } else {
              if (idx === n - 1) ctx.lineTo(p.x - nx, p.y - ny);
              else if (idx === 0) {
                ctx.lineTo(p.x - nx, p.y - ny);
                closed = true;
              } else ctx.lineTo(p.x - nx, p.y - ny);
            }
          }
        }
        if (closed) {
          ctx.closePath();
          ctx.fillStyle = theme.trailColor;
          ctx.fill();
        }
      }

      // 2. 剑体：预烘焙精灵图直接贴图（无 shadowBlur / 渐变 / 多段路径）
      const scaleL = sword.length / this.SPRITE_L;
      const scaleW = sword.width / this.SPRITE_W;
      const dw = spriteW1x * scaleL;
      const dh = spriteH1x * scaleW;

      ctx.save();
      ctx.translate(sword.x, sword.y);
      ctx.rotate(sword.angle);
      ctx.drawImage(sprite, -dw / 2, -dh / 2, dw, dh);

      // Tassel (剑穗) 动态飘动 — 单次描边，开销极小
      const L = sword.length;
      const tasselPhase = time * 8 + sword.id;
      const tasselWave1 = Math.sin(tasselPhase) * 4;
      const tasselWave2 = Math.cos(tasselPhase * 1.3) * 6;

      ctx.beginPath();
      ctx.moveTo(-L * 0.65, 0);
      ctx.quadraticCurveTo(-L * 0.85, tasselWave1, -L * 1.1, tasselWave2);
      ctx.strokeStyle = theme.tasselColor;
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Tassel bead
      ctx.beginPath();
      ctx.arc(-L * 1.1, tasselWave2, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();

      ctx.restore();
    }
  }

  private renderParticles(_updateCallback: (dt: number) => void) {
    // Render and prune active sparks
    const ctx = this.ctx;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.025;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = p.color.replace('ALPHA', alpha.toFixed(2));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  public addSparks(x: number, y: number, color: string, count: number = 8) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1.0,
        color: color.includes('rgba') ? color : 'rgba(255, 255, 255, ALPHA)',
        size: 1.5 + Math.random() * 2,
      });
    }
  }
}
