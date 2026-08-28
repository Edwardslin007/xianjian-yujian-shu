import { HandGesture, HandLandmark, Point2D, RecognizedHand } from '../types';

function distance3D(p1: HandLandmark, p2: HandLandmark): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z || 0) - (p2.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function distance2D(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export class GestureRecognizer {
  private history: HandGesture[] = [];
  private readonly historySize = 5;
  private currentStableGesture: HandGesture = 'FREE_FLIGHT';

  public reset() {
    this.history = [];
    this.currentStableGesture = 'FREE_FLIGHT';
  }

  public recognize(landmarks: HandLandmark[] | null | undefined): RecognizedHand {
    if (!landmarks || landmarks.length < 21) {
      this.history.push('FREE_FLIGHT');
      if (this.history.length > this.historySize) this.history.shift();
      return {
        landmarks: [],
        gesture: 'FREE_FLIGHT',
        confidence: 0,
        palmCenter: { x: 0.5, y: 0.5 },
        pointDirection: { x: 0, y: -1 },
        handAngle: 0,
        rawGesture: '无手部识别',
        fingerDistances: [],
        extendedFingers: [false, false, false, false, false],
      };
    }

    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const thumbIp = landmarks[3];
    const thumbMcp = landmarks[2];

    const indexTip = landmarks[8];
    const indexDip = landmarks[7];
    const indexPip = landmarks[6];
    const indexMcp = landmarks[5];

    const middleTip = landmarks[12];
    const middleDip = landmarks[11];
    const middlePip = landmarks[10];
    const middleMcp = landmarks[9];

    const ringTip = landmarks[16];
    const ringDip = landmarks[15];
    const ringPip = landmarks[14];
    const ringMcp = landmarks[13];

    const pinkyTip = landmarks[20];
    const pinkyDip = landmarks[19];
    const pinkyPip = landmarks[18];
    const pinkyMcp = landmarks[17];

    // Palm scale reference (distance from wrist to middle MCP)
    const palmScale = distance3D(wrist, middleMcp) || 0.15;

    // Palm center calculation (center of MCPs + wrist)
    const palmCenter: Point2D = {
      x: (wrist.x + indexMcp.x + middleMcp.x + ringMcp.x + pinkyMcp.x) / 5,
      y: (wrist.y + indexMcp.y + middleMcp.y + ringMcp.y + pinkyMcp.y) / 5,
    };

    // Extension check for each finger
    // Finger is extended if tip is farther from wrist than PIP & DIP
    const isIndexExtended =
      distance3D(indexTip, wrist) > distance3D(indexPip, wrist) * 1.08 &&
      distance3D(indexTip, indexMcp) > distance3D(indexPip, indexMcp) * 1.15;

    const isMiddleExtended =
      distance3D(middleTip, wrist) > distance3D(middlePip, wrist) * 1.08 &&
      distance3D(middleTip, middleMcp) > distance3D(middlePip, middleMcp) * 1.15;

    const isRingExtended =
      distance3D(ringTip, wrist) > distance3D(ringPip, wrist) * 1.08 &&
      distance3D(ringTip, ringMcp) > distance3D(ringPip, ringMcp) * 1.15;

    const isPinkyExtended =
      distance3D(pinkyTip, wrist) > distance3D(pinkyPip, wrist) * 1.08 &&
      distance3D(pinkyTip, pinkyMcp) > distance3D(pinkyPip, pinkyMcp) * 1.15;

    // Thumb extended if tip is far from index MCP & thumb CMC
    const isThumbExtended =
      distance3D(thumbTip, indexMcp) > palmScale * 0.55 &&
      distance3D(thumbTip, wrist) > distance3D(thumbMcp, wrist) * 1.15;

    const extendedFingers = [
      isThumbExtended,
      isIndexExtended,
      isMiddleExtended,
      isRingExtended,
      isPinkyExtended,
    ];

    // Distances between adjacent tips relative to palm scale
    const distIndexMiddle = distance3D(indexTip, middleTip) / palmScale;
    const distMiddleRing = distance3D(middleTip, ringTip) / palmScale;
    const distRingPinky = distance3D(ringTip, pinkyTip) / palmScale;
    const distThumbIndex = distance3D(thumbTip, indexTip) / palmScale;

    // Pointing direction vector (from wrist/MCP to index tip or index+middle tips)
    let pointDirX = (indexTip.x + middleTip.x) / 2 - palmCenter.x;
    let pointDirY = (indexTip.y + middleTip.y) / 2 - palmCenter.y;
    const len = Math.sqrt(pointDirX * pointDirX + pointDirY * pointDirY) || 1;
    pointDirX /= len;
    pointDirY /= len;

    const handAngle = Math.atan2(pointDirY, pointDirX);

    let detectedGesture: HandGesture = 'FREE_FLIGHT';
    let rawGestureName = '自由漫游';
    let confidence = 0.85;

    // 1. 握拳 (Fist): All 4 main fingers folded
    const foldedCount =
      (isIndexExtended ? 0 : 1) +
      (isMiddleExtended ? 0 : 1) +
      (isRingExtended ? 0 : 1) +
      (isPinkyExtended ? 0 : 1);

    const allMainFingersFolded = foldedCount >= 4;
    const allMainFingersExtended =
      isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended;

    if (allMainFingersFolded) {
      detectedGesture = 'FIST_CLUSTER';
      rawGestureName = '握拳·凝剑成核';
      confidence = 0.95;
    }
    // 2. 双指并拢 (Sword gesture / Two-finger point): Index & Middle extended, Ring & Pinky folded, Index & Middle close together
    else if (
      isIndexExtended &&
      isMiddleExtended &&
      !isRingExtended &&
      !isPinkyExtended &&
      distIndexMiddle < 0.42
    ) {
      detectedGesture = 'TWO_FINGER_POINT';
      rawGestureName = '双指·御剑诀';
      confidence = 0.96;
    }
    // 3. 四指并拢 vs 张开五指 (Both have 4 main fingers extended)
    else if (allMainFingersExtended) {
      const avgSpread = (distIndexMiddle + distMiddleRing + distRingPinky) / 3;

      // If fingers are held tightly together -> Four Finger Triangle
      if (avgSpread < 0.38 && distIndexMiddle < 0.36 && distMiddleRing < 0.36 && distRingPinky < 0.4) {
        detectedGesture = 'FOUR_FINGER_TRIANGLE';
        rawGestureName = '四指·诛仙剑阵';
        confidence = 0.92;
      }
      // If fingers are spread out -> Open Palm Ring
      else if (avgSpread >= 0.38 || isThumbExtended) {
        detectedGesture = 'OPEN_PALM_RING';
        rawGestureName = '张开·混元剑环';
        confidence = 0.94;
      }
    }
    // Partial open palm (e.g. 3 fingers extended or spread thumb)
    else if (isThumbExtended && isIndexExtended && isMiddleExtended && (isRingExtended || isPinkyExtended)) {
      detectedGesture = 'OPEN_PALM_RING';
      rawGestureName = '张开·混元剑环';
      confidence = 0.88;
    }
    // Partial sword finger fallback
    else if (isIndexExtended && !isRingExtended && !isPinkyExtended) {
      detectedGesture = 'TWO_FINGER_POINT';
      rawGestureName = '双指·御剑诀';
      confidence = 0.82;
    }

    // Temporal smoothing to eliminate frame flicker
    this.history.push(detectedGesture);
    if (this.history.length > this.historySize) {
      this.history.shift();
    }

    // Count occurrences
    const counts = new Map<HandGesture, number>();
    for (const g of this.history) {
      counts.set(g, (counts.get(g) || 0) + 1);
    }

    let dominantGesture = this.currentStableGesture;
    let maxCount = 0;
    for (const [g, count] of counts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        dominantGesture = g;
      }
    }

    // Require at least 3 matching frames in history of 5 to change stable gesture
    if (maxCount >= 3) {
      this.currentStableGesture = dominantGesture;
    }

    return {
      landmarks,
      gesture: this.currentStableGesture,
      confidence,
      palmCenter,
      pointDirection: { x: pointDirX, y: pointDirY },
      handAngle,
      rawGesture: rawGestureName,
      fingerDistances: [distThumbIndex, distIndexMiddle, distMiddleRing, distRingPinky],
      extendedFingers,
    };
  }
}
