import type { GestureId, Landmark } from '../types'
import { generateHandTemplate, type HandPoseSpec } from './handKinematics'

export interface GestureDef {
  id: GestureId
  label: string
  description: string
  template: Landmark[]
}

const EXT = 0
const CURL = 1
const HALF = 0.5

const SPECS: Record<GestureId, HandPoseSpec> = {
  thumbs_up: {
    thumb: { curl: EXT, angle: 0 },
    index: { curl: CURL },
    middle: { curl: CURL },
    ring: { curl: CURL },
    pinky: { curl: CURL },
  },
  peace: {
    thumb: { curl: CURL, angle: -0.3 },
    index: { curl: EXT, angle: -0.5 },
    middle: { curl: EXT, angle: 0.2 },
    ring: { curl: CURL },
    pinky: { curl: CURL },
  },
  ok: {
    thumb: { curl: 0.75, angle: -0.2 },
    index: { curl: 0.75, angle: -0.1 },
    middle: { curl: EXT },
    ring: { curl: EXT },
    pinky: { curl: EXT },
  },
  point_up: {
    thumb: { curl: 0.8, angle: -0.1 },
    index: { curl: EXT },
    middle: { curl: CURL },
    ring: { curl: CURL },
    pinky: { curl: CURL },
  },
  fist: {
    thumb: { curl: 0.9, angle: -0.2 },
    index: { curl: CURL },
    middle: { curl: CURL },
    ring: { curl: CURL },
    pinky: { curl: CURL },
  },
  open_palm: {
    thumb: { curl: EXT },
    index: { curl: EXT, angle: -0.45 },
    middle: { curl: EXT },
    ring: { curl: EXT, angle: 0.45 },
    pinky: { curl: EXT, angle: 0.85 },
  },
  pinch: {
    thumb: { curl: 0.7, angle: -0.15 },
    index: { curl: 0.7, angle: -0.05 },
    middle: { curl: CURL },
    ring: { curl: CURL },
    pinky: { curl: CURL },
  },
  l_shape: {
    thumb: { curl: EXT, angle: -1.35 },
    index: { curl: EXT, angle: -0.35 },
    middle: { curl: CURL },
    ring: { curl: CURL },
    pinky: { curl: CURL },
  },
  call_me: {
    thumb: { curl: EXT, angle: -1.1 },
    index: { curl: CURL },
    middle: { curl: CURL },
    ring: { curl: CURL },
    pinky: { curl: EXT, angle: 0.75 },
  },
  three_fingers: {
    thumb: { curl: CURL, angle: -0.3 },
    index: { curl: EXT, angle: -0.5 },
    middle: { curl: EXT },
    ring: { curl: EXT, angle: 0.4 },
    pinky: { curl: CURL },
  },
  rock_on: {
    thumb: { curl: CURL, angle: -0.3 },
    index: { curl: EXT, angle: -0.4 },
    middle: { curl: CURL },
    ring: { curl: CURL },
    pinky: { curl: EXT, angle: 0.75 },
  },
  wave: {
    thumb: { curl: HALF, angle: -0.8 },
    index: { curl: EXT, angle: -0.1 },
    middle: { curl: EXT, angle: 0.02 },
    ring: { curl: EXT, angle: 0.15 },
    pinky: { curl: EXT, angle: 0.3 },
  },
}

const LABELS: Record<GestureId, { label: string; description: string }> = {
  thumbs_up: { label: 'Thumbs Up', description: 'Fist with thumb extended upward' },
  peace: { label: 'Peace Sign', description: 'Index and middle finger raised in a V' },
  ok: { label: 'OK', description: 'Thumb and index tip touching, other fingers raised' },
  point_up: { label: 'Point Up', description: 'Index finger extended, rest curled' },
  fist: { label: 'Fist', description: 'All fingers curled into the palm' },
  open_palm: { label: 'Open Palm', description: 'All five fingers extended and spread' },
  pinch: { label: 'Pinch', description: 'Thumb and index tip touching, rest curled' },
  l_shape: { label: 'L-Shape', description: 'Thumb and index extended at a right angle' },
  call_me: { label: 'Call Me', description: 'Thumb and pinky extended, middle three curled' },
  three_fingers: { label: 'Three Fingers', description: 'Index, middle and ring extended' },
  rock_on: { label: 'Rock On', description: 'Index and pinky extended, middle fingers curled' },
  wave: { label: 'Wave', description: 'Open hand facing forward, fingers together' },
}

export const GESTURE_POSE_SPECS = SPECS

export const GESTURES: GestureDef[] = (Object.keys(SPECS) as GestureId[]).map((id) => ({
  id,
  label: LABELS[id].label,
  description: LABELS[id].description,
  template: generateHandTemplate(SPECS[id]),
}))

export const GESTURE_MAP: Record<GestureId, GestureDef> = Object.fromEntries(
  GESTURES.map((g) => [g.id, g]),
) as Record<GestureId, GestureDef>
