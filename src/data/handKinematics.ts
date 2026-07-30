import type { Landmark } from '../types'

/**
 * Procedural hand-pose generator used to build the 12 gesture fingerprint
 * templates. Every finger is a simple 3-bone chain rooted at a fixed base
 * point relative to the wrist; `curl` (0 = straight, 1 = fully folded into
 * the palm) rotates each joint further away from the extended direction so
 * the chain folds back on itself, approximating a curled finger in the
 * camera's 2D projection. Templates go through the same normalization as
 * live MediaPipe landmarks before comparison, so only relative pose matters.
 */

export interface FingerSpec {
  /** 0 = fully extended, 1 = fully curled into the palm */
  curl: number
  /** radians, overrides the finger's default resting direction from +y */
  angle?: number
}

export interface HandPoseSpec {
  thumb: FingerSpec
  index: FingerSpec
  middle: FingerSpec
  ring: FingerSpec
  pinky: FingerSpec
}

interface FingerRig {
  base: [number, number]
  defaultAngle: number
  boneLengths: [number, number, number]
  foldSchedule: [number, number, number]
}

const RIGS: Record<keyof HandPoseSpec, FingerRig> = {
  thumb: {
    base: [-0.3, 0.1],
    defaultAngle: -1.05,
    boneLengths: [0.32, 0.22, 0.18],
    foldSchedule: [1.3, 2.5, 3.3],
  },
  index: {
    base: [-0.17, 0.9],
    defaultAngle: -0.35,
    boneLengths: [0.42, 0.26, 0.2],
    foldSchedule: [1.9, 3.9, 5.6],
  },
  middle: {
    base: [0.0, 0.95],
    defaultAngle: 0,
    boneLengths: [0.46, 0.28, 0.22],
    foldSchedule: [1.9, 3.9, 5.6],
  },
  ring: {
    base: [0.17, 0.88],
    defaultAngle: 0.35,
    boneLengths: [0.42, 0.27, 0.2],
    foldSchedule: [1.9, 3.9, 5.6],
  },
  pinky: {
    base: [0.32, 0.75],
    defaultAngle: 0.75,
    boneLengths: [0.34, 0.22, 0.18],
    foldSchedule: [1.9, 3.9, 5.6],
  },
}

const WRIST: [number, number] = [0, 0]

function dir(angle: number): [number, number] {
  return [Math.sin(angle), Math.cos(angle)]
}

function add(a: [number, number], b: [number, number], scale: number): [number, number] {
  return [a[0] + b[0] * scale, a[1] + b[1] * scale]
}

function buildFingerChain(finger: keyof HandPoseSpec, spec: FingerSpec): Landmark[] {
  const rig = RIGS[finger]
  const baseAngle = spec.angle ?? rig.defaultAngle
  const basePoint: [number, number] = [WRIST[0] + rig.base[0], WRIST[1] + rig.base[1]]

  const points: Landmark[] = [{ x: basePoint[0], y: basePoint[1], z: 0 }]
  let cursor = basePoint
  for (let i = 0; i < 3; i++) {
    const angle = baseAngle + spec.curl * rig.foldSchedule[i]
    cursor = add(cursor, dir(angle), rig.boneLengths[i])
    points.push({ x: cursor[0], y: cursor[1], z: -spec.curl * 0.15 * (i + 1) })
  }
  return points
}

/**
 * Generates the full 21-point MediaPipe-style landmark set for a canonical
 * (right-hand, palm-forward) pose described by per-finger curl/angle specs.
 */
export function generateHandTemplate(spec: HandPoseSpec): Landmark[] {
  const wrist: Landmark = { x: WRIST[0], y: WRIST[1], z: 0 }
  const thumb = buildFingerChain('thumb', spec.thumb)
  const index = buildFingerChain('index', spec.index)
  const middle = buildFingerChain('middle', spec.middle)
  const ring = buildFingerChain('ring', spec.ring)
  const pinky = buildFingerChain('pinky', spec.pinky)

  // MediaPipe order: wrist, thumb(1-4), index(5-8), middle(9-12), ring(13-16), pinky(17-20)
  return [wrist, ...thumb, ...index, ...middle, ...ring, ...pinky]
}
