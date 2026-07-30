import type { Landmark } from '../types'

export const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
]

export interface Point2D {
  x: number
  y: number
}

/** Fits an arbitrary-coordinate landmark set into a square viewBox, flipping y (math-up -> screen-down). */
export function fitLandmarksToViewBox(landmarks: Landmark[], size: number, padding: number): Point2D[] {
  const xs = landmarks.map((p) => p.x)
  const ys = landmarks.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const spanX = maxX - minX || 1
  const spanY = maxY - minY || 1
  const span = Math.max(spanX, spanY)
  const usable = size - padding * 2
  const offsetX = (span - spanX) / 2
  const offsetY = (span - spanY) / 2

  return landmarks.map((p) => ({
    x: padding + ((p.x - minX + offsetX) / span) * usable,
    y: padding + usable - ((p.y - minY + offsetY) / span) * usable,
  }))
}
