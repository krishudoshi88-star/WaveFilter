import type { DetectedHand } from '../types'
import { HAND_CONNECTIONS } from './handSkeleton'
import { GESTURE_MAP } from '../data/gestures'

const HAND_COLORS: Record<string, string> = {
  Left: '#38e1ff',
  Right: '#7c5cff',
}

/** Draws the debug hand skeleton + gesture badges on a transparent canvas layered above the video. Never part of the captured/virtual-cam output. */
export class OverlayRenderer {
  private canvas: HTMLCanvasElement
  private video: HTMLVideoElement
  private ctx: CanvasRenderingContext2D
  private rafId: number | null = null
  private hands: DetectedHand[] = []

  constructor(canvas: HTMLCanvasElement, video: HTMLVideoElement) {
    this.canvas = canvas
    this.video = video
    this.ctx = canvas.getContext('2d')!
  }

  setHands(hands: DetectedHand[]) {
    this.hands = hands
  }

  start() {
    const loop = () => {
      this.render()
      this.rafId = requestAnimationFrame(loop)
    }
    this.rafId = requestAnimationFrame(loop)
  }

  stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  private render() {
    const { videoWidth, videoHeight } = this.video
    if (!videoWidth) return
    if (this.canvas.width !== videoWidth || this.canvas.height !== videoHeight) {
      this.canvas.width = videoWidth
      this.canvas.height = videoHeight
    }
    const { width, height } = this.canvas
    const ctx = this.ctx
    ctx.save()
    ctx.clearRect(0, 0, width, height)
    ctx.translate(width, 0)
    ctx.scale(-1, 1)

    for (const hand of this.hands) {
      const color = HAND_COLORS[hand.handedness] ?? '#7c5cff'
      const pts = hand.landmarks.map((p) => ({ x: p.x * width, y: p.y * height }))

      ctx.lineWidth = 3
      ctx.strokeStyle = color
      ctx.lineCap = 'round'
      ctx.beginPath()
      for (const [a, b] of HAND_CONNECTIONS) {
        ctx.moveTo(pts[a].x, pts[a].y)
        ctx.lineTo(pts[b].x, pts[b].y)
      }
      ctx.stroke()

      ctx.fillStyle = color
      for (const p of pts) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2)
        ctx.fill()
      }

      if (hand.gesture) {
        const label = GESTURE_MAP[hand.gesture]?.label ?? hand.gesture
        const wrist = pts[0]
        this.drawBadge(wrist.x, wrist.y + 28, `${label}`, color)
      }
    }

    ctx.restore()
  }

  private drawBadge(x: number, y: number, text: string, color: string) {
    const ctx = this.ctx
    ctx.save()
    // Undo the mirror for text so labels read left-to-right normally.
    ctx.translate(x, y)
    ctx.scale(-1, 1)
    ctx.font = '600 15px Inter, system-ui, sans-serif'
    const metrics = ctx.measureText(text)
    const paddingX = 10
    const w = metrics.width + paddingX * 2
    const h = 26
    ctx.fillStyle = 'rgba(11, 13, 18, 0.82)'
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    this.roundRect(-w / 2, 0, w, h, 13)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 0, h / 2 + 1)
    ctx.restore()
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number) {
    const ctx = this.ctx
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }
}
