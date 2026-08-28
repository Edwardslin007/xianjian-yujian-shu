export type HandGesture =
  | 'FREE_FLIGHT'           // 自由漫游（无手势或未识别）
  | 'TWO_FINGER_POINT'      // 双指并拢（指引剑群朝手势方向飞行）
  | 'OPEN_PALM_RING'        // 张开五指（剑群围成圆环旋转）
  | 'FIST_CLUSTER'          // 握拳（聚拢成团/凝剑成核）
  | 'FOUR_FINGER_TRIANGLE'; // 四指并拢（聚成三角形剑阵）

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface RecognizedHand {
  landmarks: HandLandmark[];
  gesture: HandGesture;
  confidence: number;
  palmCenter: Point2D;
  pointDirection: Point2D; // Normalized vector for sword finger
  handAngle: number;       // Orientation angle
  rawGesture: string;
  fingerDistances: number[];
  extendedFingers: boolean[]; // [thumb, index, middle, ring, pinky]
}

export interface SwordTrailPoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  width: number;
}

export interface BoidSword {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  angle: number;
  angularVelocity: number;
  speed: number;
  length: number;
  width: number;
  trail: SwordTrailPoint[];
  formationSlot: number;
  targetX: number;
  targetY: number;
  targetAngle: number;
  formationWeight: number; // 0 (pure boids) -> 1 (exact formation)
  colorIndex: number;
  energyLevel: number;
  sparkTimer: number;
  wobblePhase: number;
}

export interface SwordTheme {
  id: string;
  name: string;
  pinyin: string;
  glowColor: string;
  bladeColor: string;
  coreColor: string;
  trailColor: string;
  runeColor: string;
  tasselColor: string;
  bgAtmosphere: string;
  description: string;
}

export interface SimulationConfig {
  swordCount: number;
  maxSpeed: number;
  minSpeed: number;
  maxForce: number;
  separationDistance: number;
  neighborDistance: number;
  separationWeight: number;
  alignmentWeight: number;
  cohesionWeight: number;
  targetWeight: number;
  trailLength: number;
  glowIntensity: number;
  themeId: string;
  soundEnabled: boolean;
  soundVolume: number;
  showLandmarks: boolean;
  showBackgroundRune: boolean;
  showEnergyLines: boolean;
  cameraMirrored: boolean;
  formationTransitionSpeed: number;
}
