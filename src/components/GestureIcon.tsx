import { useMemo } from 'react'
import './GestureIcon.css'
import type { GestureId } from '../types'
import { GESTURE_POSE_SPECS } from '../data/gestures'
import { generateHandTemplate } from '../data/handKinematics'
import { HAND_CONNECTIONS, fitLandmarksToViewBox } from '../lib/handSkeleton'

const SIZE = 100
const PADDING = 16

interface GestureIconProps {
  gesture: GestureId
  size?: number
  active?: boolean
  className?: string
}

const templateCache = new Map<GestureId, ReturnType<typeof fitLandmarksToViewBox>>()

function getPoints(gesture: GestureId) {
  let points = templateCache.get(gesture)
  if (!points) {
    const landmarks = generateHandTemplate(GESTURE_POSE_SPECS[gesture])
    points = fitLandmarksToViewBox(landmarks, SIZE, PADDING)
    templateCache.set(gesture, points)
  }
  return points
}

export function GestureIcon({ gesture, size = 48, active = false, className }: GestureIconProps) {
  const points = useMemo(() => getPoints(gesture), [gesture])

  return (
    <svg
      className={`gesture-icon${active ? ' gesture-icon--active' : ''}${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={gesture}
    >
      <circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2 - 2} className="gesture-icon__backdrop" />
      {HAND_CONNECTIONS.map(([a, b], i) => (
        <line
          key={i}
          x1={points[a].x}
          y1={points[a].y}
          x2={points[b].x}
          y2={points[b].y}
          className="gesture-icon__bone"
        />
      ))}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === 0 ? 3.4 : 2.4} className="gesture-icon__joint" />
      ))}
    </svg>
  )
}
