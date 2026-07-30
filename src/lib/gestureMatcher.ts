import type { DetectedHand, GestureId, Handedness, Landmark } from '../types'
import { GESTURES } from '../data/gestures'

export const GESTURE_MATCH_THRESHOLD = 0.85

const WRIST = 0
const MIDDLE_MCP = 9

/**
 * Translates landmarks so the wrist sits at the origin, mirrors left hands
 * so both handedness's map onto the same canonical (right-hand) template
 * space, rotates so wrist->middle-MCP points along +y, and scales by that
 * same distance. This makes the resulting vector invariant to hand
 * position, in-plane rotation, distance from the camera, and handedness -
 * only finger pose affects the comparison.
 */
export function normalizeLandmarks(landmarks: Landmark[], handedness: Handedness): Float32Array {
  const wrist = landmarks[WRIST]
  const mirror = handedness === 'Left' ? -1 : 1

  const translated = landmarks.map((p) => ({
    x: mirror * (p.x - wrist.x),
    y: -(p.y - wrist.y), // image-space y grows downward; flip so "up" is +y
    z: p.z - wrist.z,
  }))

  const ref = translated[MIDDLE_MCP]
  const refLen = Math.hypot(ref.x, ref.y) || 1
  const refAngle = Math.atan2(ref.x, ref.y) // angle from +y axis

  const cos = Math.cos(-refAngle)
  const sin = Math.sin(-refAngle)

  const out = new Float32Array(translated.length * 3)
  translated.forEach((p, i) => {
    const rx = (p.x * cos - p.y * sin) / refLen
    const ry = (p.x * sin + p.y * cos) / refLen
    const rz = p.z / refLen
    out[i * 3] = rx
    out[i * 3 + 1] = ry
    out[i * 3 + 2] = rz
  })
  return out
}

const TEMPLATE_VECTORS: { id: GestureId; vector: Float32Array }[] = GESTURES.map((g) => ({
  id: g.id,
  vector: normalizeLandmarks(g.template, 'Right'),
}))

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

export interface GestureMatch {
  gesture: GestureId | null
  confidence: number
}

export function matchGesture(landmarks: Landmark[], handedness: Handedness): GestureMatch {
  const vector = normalizeLandmarks(landmarks, handedness)

  let best: GestureId | null = null
  let bestScore = -1
  for (const template of TEMPLATE_VECTORS) {
    const score = cosineSimilarity(vector, template.vector)
    if (score > bestScore) {
      bestScore = score
      best = template.id
    }
  }

  if (bestScore < GESTURE_MATCH_THRESHOLD) {
    return { gesture: null, confidence: bestScore }
  }
  return { gesture: best, confidence: bestScore }
}

export function classifyHand(landmarks: Landmark[], handedness: Handedness): DetectedHand {
  const { gesture, confidence } = matchGesture(landmarks, handedness)
  return { handedness, landmarks, gesture, confidence }
}
