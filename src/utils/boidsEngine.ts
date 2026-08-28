import { BoidSword, HandGesture, Point2D, RecognizedHand, SimulationConfig } from '../types';

export class BoidsEngine {
  public swords: BoidSword[] = [];
  public width: number = window.innerWidth;
  public height: number = window.innerHeight;
  public formationTime: number = 0;
  private targetFormationWeight: number = 0;
  public activeGesture: HandGesture = 'FREE_FLIGHT';

  constructor(config: SimulationConfig) {
    this.initSwords(config.swordCount);
  }

  public resize(w: number, h: number) {
    this.width = Math.max(300, w);
    this.height = Math.max(300, h);
  }

  public initSwords(count: number) {
    this.swords = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      this.swords.push({
        id: i,
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        ax: 0,
        ay: 0,
        angle,
        angularVelocity: 0,
        speed,
        length: 26 + Math.random() * 8,
        width: 4 + Math.random() * 1.5,
        trail: [],
        formationSlot: i,
        targetX: this.width / 2,
        targetY: this.height / 2,
        targetAngle: angle,
        formationWeight: 0,
        colorIndex: i % 5,
        energyLevel: 0.5 + Math.random() * 0.5,
        sparkTimer: 0,
        wobblePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  public updateCount(count: number) {
    if (this.swords.length === count) return;
    if (this.swords.length < count) {
      const needed = count - this.swords.length;
      for (let i = 0; i < needed; i++) {
        const id = this.swords.length;
        const angle = Math.random() * Math.PI * 2;
        const speed = 3;
        this.swords.push({
          id,
          x: this.width / 2 + (Math.random() - 0.5) * 200,
          y: this.height / 2 + (Math.random() - 0.5) * 200,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          ax: 0,
          ay: 0,
          angle,
          angularVelocity: 0,
          speed,
          length: 26 + Math.random() * 8,
          width: 4 + Math.random() * 1.5,
          trail: [],
          formationSlot: id,
          targetX: this.width / 2,
          targetY: this.height / 2,
          targetAngle: angle,
          formationWeight: 0,
          colorIndex: id % 5,
          energyLevel: 0.8,
          sparkTimer: 0,
          wobblePhase: Math.random() * Math.PI * 2,
        });
      }
    } else {
      this.swords = this.swords.slice(0, count);
    }
  }

  public update(
    hand: RecognizedHand | null,
    config: SimulationConfig,
    dt: number = 1 / 60
  ) {
    this.formationTime += dt;
    const gesture = hand ? hand.gesture : 'FREE_FLIGHT';
    this.activeGesture = gesture;

    // Smooth transition weight between free boids and structured formation
    const isFormation = gesture !== 'FREE_FLIGHT';
    this.targetFormationWeight = isFormation ? 1.0 : 0.0;

    const transitionSpeed = config.formationTransitionSpeed || 3.5;

    // Screen-space hand center
    const handScreenX = hand ? hand.palmCenter.x * this.width : this.width / 2;
    const handScreenY = hand ? hand.palmCenter.y * this.height : this.height / 2;

    // Calculate formation slots for each sword
    this.calculateFormationTargets(gesture, hand, handScreenX, handScreenY, config);

    const N = this.swords.length;

    // Spatial partitioning / loop for Boids
    for (let i = 0; i < N; i++) {
      const sword = this.swords[i];

      // Smoothly interpolate formation weight
      sword.formationWeight += (this.targetFormationWeight - sword.formationWeight) * Math.min(1, dt * transitionSpeed);

      // Reset forces
      sword.ax = 0;
      sword.ay = 0;

      // 1. Classical Boids flocking forces
      let sepX = 0, sepY = 0, sepCount = 0;
      let aliX = 0, aliY = 0, aliCount = 0;
      let cohX = 0, cohY = 0, cohCount = 0;

      const sepDistSq = config.separationDistance * config.separationDistance;
      const neighDistSq = config.neighborDistance * config.neighborDistance;

      for (let j = 0; j < N; j++) {
        if (i === j) continue;
        const other = this.swords[j];
        const dx = sword.x - other.x;
        const dy = sword.y - other.y;
        const distSq = dx * dx + dy * dy;

        // Separation
        if (distSq > 0 && distSq < sepDistSq) {
          const dist = Math.sqrt(distSq);
          const force = (config.separationDistance - dist) / dist;
          sepX += (dx / dist) * force;
          sepY += (dy / dist) * force;
          sepCount++;
        }

        // Alignment & Cohesion
        if (distSq < neighDistSq) {
          aliX += other.vx;
          aliY += other.vy;
          aliCount++;

          cohX += other.x;
          cohY += other.y;
          cohCount++;
        }
      }

      if (sepCount > 0) {
        sepX /= sepCount;
        sepY /= sepCount;
      }

      if (aliCount > 0) {
        aliX = aliX / aliCount - sword.vx;
        aliY = aliY / aliCount - sword.vy;
      }

      if (cohCount > 0) {
        cohX = (cohX / cohCount) - sword.x;
        cohY = (cohY / cohCount) - sword.y;
      }

      // 2. Boundary soft repulsion
      const margin = 80;
      let boundX = 0, boundY = 0;
      if (sword.x < margin) boundX = (margin - sword.x) * 0.08;
      else if (sword.x > this.width - margin) boundX = (this.width - margin - sword.x) * 0.08;

      if (sword.y < margin) boundY = (margin - sword.y) * 0.08;
      else if (sword.y > this.height - margin) boundY = (this.height - margin - sword.y) * 0.08;

      // 3. Formation target force & Steering
      let formSteerX = 0;
      let formSteerY = 0;

      if (sword.formationWeight > 0.01) {
        const toTargetX = sword.targetX - sword.x;
        const toTargetY = sword.targetY - sword.y;
        const distToTarget = Math.sqrt(toTargetX * toTargetX + toTargetY * toTargetY);

        if (distToTarget > 1) {
          // Proportional-derivative spring arrival
          const desiredSpeed = Math.min(config.maxSpeed * 1.5, distToTarget * 0.8);
          const desiredVx = (toTargetX / distToTarget) * desiredSpeed;
          const desiredVy = (toTargetY / distToTarget) * desiredSpeed;

          formSteerX = desiredVx - sword.vx;
          formSteerY = desiredVy - sword.vy;
        }
      }

      // Blend forces based on formationWeight
      const wBoids = 1.0 - sword.formationWeight * 0.85; // Keep small separation even in formation
      const wForm = sword.formationWeight * config.targetWeight;

      sword.ax += sepX * config.separationWeight * (1 + sword.formationWeight * 0.5);
      sword.ax += aliX * config.alignmentWeight * wBoids;
      sword.ax += cohX * config.cohesionWeight * wBoids;
      sword.ax += boundX;
      sword.ax += formSteerX * wForm;

      sword.ay += sepY * config.separationWeight * (1 + sword.formationWeight * 0.5);
      sword.ay += aliY * config.alignmentWeight * wBoids;
      sword.ay += cohY * config.cohesionWeight * wBoids;
      sword.ay += boundY;
      sword.ay += formSteerY * wForm;

      // Subtle atmospheric wander force for life-like motion
      const wanderAngle = this.formationTime * 1.5 + sword.wobblePhase;
      sword.ax += Math.cos(wanderAngle) * 0.15;
      sword.ay += Math.sin(wanderAngle) * 0.15;

      // Limit acceleration force
      const accMag = Math.sqrt(sword.ax * sword.ax + sword.ay * sword.ay);
      const effectiveMaxForce = config.maxForce * (1 + sword.formationWeight * 2);
      if (accMag > effectiveMaxForce) {
        sword.ax = (sword.ax / accMag) * effectiveMaxForce;
        sword.ay = (sword.ay / accMag) * effectiveMaxForce;
      }

      // Update velocity
      sword.vx += sword.ax;
      sword.vy += sword.ay;

      // Clamp speed
      const curSpeed = Math.sqrt(sword.vx * sword.vx + sword.vy * sword.vy);
      let maxSpeed = config.maxSpeed;
      let minSpeed = config.minSpeed;

      if (gesture === 'TWO_FINGER_POINT') {
        maxSpeed *= 1.4; // Supersonic beam
      } else if (gesture === 'FIST_CLUSTER') {
        maxSpeed *= 1.2;
      }

      if (curSpeed > maxSpeed) {
        sword.vx = (sword.vx / curSpeed) * maxSpeed;
        sword.vy = (sword.vy / curSpeed) * maxSpeed;
        sword.speed = maxSpeed;
      } else if (curSpeed < minSpeed && curSpeed > 0.001) {
        sword.vx = (sword.vx / curSpeed) * minSpeed;
        sword.vy = (sword.vy / curSpeed) * minSpeed;
        sword.speed = minSpeed;
      } else {
        sword.speed = curSpeed;
      }

      // Update position
      sword.x += sword.vx;
      sword.y += sword.vy;

      // Wrap around screen boundaries with margin
      const wrapMargin = 40;
      if (sword.x < -wrapMargin) sword.x = this.width + wrapMargin;
      else if (sword.x > this.width + wrapMargin) sword.x = -wrapMargin;
      if (sword.y < -wrapMargin) sword.y = this.height + wrapMargin;
      else if (sword.y > this.height + wrapMargin) sword.y = -wrapMargin;

      // Update angle smoothly towards velocity or target formation orientation
      let desiredAngle = Math.atan2(sword.vy, sword.vx);
      if (sword.formationWeight > 0.6 && sword.targetAngle !== undefined) {
        // Blend heading toward formation orientation
        desiredAngle = sword.targetAngle;
      }

      // Angular shortest delta
      let angleDiff = desiredAngle - sword.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      const rotSmooth = 0.18 + sword.formationWeight * 0.15;
      sword.angle += angleDiff * rotSmooth;

      // Update Trail
      sword.trail.unshift({
        x: sword.x,
        y: sword.y,
        vx: sword.vx,
        vy: sword.vy,
        alpha: 1.0,
        width: sword.width,
      });

      const maxTrailLen = Math.max(3, Math.floor(config.trailLength * (gesture === 'TWO_FINGER_POINT' ? 1.6 : 1.0)));
      if (sword.trail.length > maxTrailLen) {
        sword.trail.length = maxTrailLen;
      }

      // Fade trail
      for (let t = 0; t < sword.trail.length; t++) {
        sword.trail[t].alpha = (1 - t / sword.trail.length) * 0.85;
      }
    }
  }

  private calculateFormationTargets(
    gesture: HandGesture,
    hand: RecognizedHand | null,
    centerX: number,
    centerY: number,
    _config: SimulationConfig
  ) {
    const N = this.swords.length;

    switch (gesture) {
      // 1. 双指并拢 (Sword gesture / TWO_FINGER_POINT):
      // Swords form a streaking aerodynamic wedge / beam along hand's pointing direction
      case 'TWO_FINGER_POINT': {
        const dir = hand ? hand.pointDirection : { x: 1, y: 0 };
        const perpX = -dir.y;
        const perpY = dir.x;
        const pointAngle = Math.atan2(dir.y, dir.x);

        // Distance ahead of hand
        const leadDist = 180;
        const leadX = centerX + dir.x * leadDist;
        const leadY = centerY + dir.y * leadDist;

        for (let i = 0; i < N; i++) {
          const s = this.swords[i];
          // Multi-layer arrow / wedge pattern
          const row = Math.floor(Math.sqrt(i));
          const col = i - row * row;
          const offsetAlong = -row * 35;
          const offsetPerp = (col - row / 2) * 28;

          s.targetX = leadX + dir.x * offsetAlong + perpX * offsetPerp;
          s.targetY = leadY + dir.y * offsetAlong + perpY * offsetPerp;
          s.targetAngle = pointAngle;
        }
        break;
      }

      // 2. 张开五指 (OPEN_PALM_RING):
      // Concentric rotating circular sword array (混元万剑环)
      case 'OPEN_PALM_RING': {
        const ring1Count = Math.min(N, Math.floor(N * 0.45));
        const ring2Count = N - ring1Count;
        const r1 = 135;
        const r2 = 215;
        const rotSpeed1 = 1.4;
        const rotSpeed2 = -0.9;

        for (let i = 0; i < N; i++) {
          const s = this.swords[i];
          if (i < ring1Count) {
            const angle = (i / ring1Count) * Math.PI * 2 + this.formationTime * rotSpeed1;
            s.targetX = centerX + Math.cos(angle) * r1;
            s.targetY = centerY + Math.sin(angle) * r1;
            s.targetAngle = angle + Math.PI / 2; // Tangent facing
          } else {
            const idx = i - ring1Count;
            const angle = (idx / ring2Count) * Math.PI * 2 + this.formationTime * rotSpeed2;
            s.targetX = centerX + Math.cos(angle) * r2;
            s.targetY = centerY + Math.sin(angle) * r2;
            s.targetAngle = angle - Math.PI / 2; // Opposite tangent facing
          }
        }
        break;
      }

      // 3. 握拳 (FIST_CLUSTER):
      // High-density swirling kinetic core / condensed sphere
      case 'FIST_CLUSTER': {
        const goldenRatio = (1 + Math.sqrt(5)) / 2;
        const baseRadius = 55;

        for (let i = 0; i < N; i++) {
          const s = this.swords[i];
          const theta = i * goldenRatio * Math.PI * 2 + this.formationTime * 3.5;
          const r = Math.sqrt(i / N) * baseRadius + Math.sin(this.formationTime * 6 + i) * 6;

          s.targetX = centerX + Math.cos(theta) * r;
          s.targetY = centerY + Math.sin(theta) * r;
          // Pointing inward / swirling towards core
          s.targetAngle = theta + Math.PI * 0.65;
        }
        break;
      }

      // 4. 四指并拢 (FOUR_FINGER_TRIANGLE):
      // Grand Triangular Sword Array (三才诛仙剑阵) with 3 vertices, edges & inner core
      case 'FOUR_FINGER_TRIANGLE': {
        const baseSize = 220;
        const triAngle = (hand ? hand.handAngle : 0) + this.formationTime * 0.25;

        // 3 vertices of equilateral triangle
        const v1 = { x: Math.cos(triAngle) * baseSize, y: Math.sin(triAngle) * baseSize };
        const v2 = {
          x: Math.cos(triAngle + (Math.PI * 2) / 3) * baseSize,
          y: Math.sin(triAngle + (Math.PI * 2) / 3) * baseSize,
        };
        const v3 = {
          x: Math.cos(triAngle + (Math.PI * 4) / 3) * baseSize,
          y: Math.sin(triAngle + (Math.PI * 4) / 3) * baseSize,
        };

        // Distribute along edges and inner sub-triangle
        for (let i = 0; i < N; i++) {
          const s = this.swords[i];
          const side = i % 3;
          const t = Math.floor(i / 3) / Math.max(1, Math.floor(N / 3));

          let px = 0, py = 0, edgeAngle = 0;
          if (side === 0) {
            px = v1.x + (v2.x - v1.x) * t;
            py = v1.y + (v2.y - v1.y) * t;
            edgeAngle = Math.atan2(v2.y - v1.y, v2.x - v1.x);
          } else if (side === 1) {
            px = v2.x + (v3.x - v2.x) * t;
            py = v2.y + (v3.y - v2.y) * t;
            edgeAngle = Math.atan2(v3.y - v2.y, v3.x - v2.x);
          } else {
            px = v3.x + (v1.x - v3.x) * t;
            py = v3.y + (v1.y - v3.y) * t;
            edgeAngle = Math.atan2(v1.y - v3.y, v1.x - v3.x);
          }

          s.targetX = centerX + px;
          s.targetY = centerY + py;
          s.targetAngle = edgeAngle;
        }
        break;
      }

      case 'FREE_FLIGHT':
      default:
        // No explicit target; boids wander naturally
        break;
    }
  }
}
