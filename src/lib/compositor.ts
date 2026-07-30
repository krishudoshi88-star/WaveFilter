import type { DetectedHand, FilterConfig } from '../types'
import { loadAsset, type LoadedAsset } from './assetSource'
import { SegmentationController } from './segmentationController'

const FADE_MS = 300
// palm landmarks: wrist, index/middle/ring/pinky MCPs
const PALM_LANDMARKS = [0, 5, 9, 13, 17]
const WRIST = 0
const MIDDLE_MCP = 9

interface ActivationState {
  active: boolean
  toggledOn: boolean
  alpha: number
  lastTick: number | null
}

const BLEND_MODE_MAP: Record<FilterConfig['blendMode'], GlobalCompositeOperation> = {
  normal: 'source-over',
  screen: 'screen',
  multiply: 'multiply',
}

export class Compositor {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private video: HTMLVideoElement
  private segmentation = new SegmentationController()
  private rafId: number | null = null

  private filters: FilterConfig[] = []
  private assets = new Map<string, LoadedAsset>()
  private activation = new Map<string, ActivationState>()
  private latestHands: DetectedHand[] = []
  private previousGesturePresence = new Map<string, boolean>()

  constructor(canvas: HTMLCanvasElement, video: HTMLVideoElement) {
    this.canvas = canvas
    this.video = video
    this.ctx = canvas.getContext('2d')!
  }

  setFilters(filters: FilterConfig[]) {
    this.filters = filters
    const activeIds = new Set(filters.map((f) => f.id))
    for (const id of this.assets.keys()) {
      if (!activeIds.has(id)) this.assets.delete(id)
    }
    for (const filter of filters) {
      if (!this.assets.has(filter.id)) {
        loadAsset(filter.asset)
          .then((loaded) => this.assets.set(filter.id, loaded))
          .catch((err) => console.error('Failed to load filter asset', filter.asset.name, err))
      }
      if (!this.activation.has(filter.id)) {
        this.activation.set(filter.id, { active: false, toggledOn: false, alpha: 0, lastTick: null })
      }
    }
  }

  setHands(hands: DetectedHand[]) {
    this.latestHands = hands
  }

  start() {
    this.segmentation.start(this.video)
    const loop = (now: number) => {
      this.render(now)
      this.rafId = requestAnimationFrame(loop)
    }
    this.rafId = requestAnimationFrame(loop)
  }

  stop() {
    this.segmentation.stop()
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  destroy() {
    this.stop()
    this.segmentation.destroy()
  }

  getStream(fps = 30): MediaStream {
    return (this.canvas as HTMLCanvasElement & { captureStream(fps?: number): MediaStream }).captureStream(fps)
  }

  private syncCanvasSize() {
    const { videoWidth, videoHeight } = this.video
    if (videoWidth && (this.canvas.width !== videoWidth || this.canvas.height !== videoHeight)) {
      this.canvas.width = videoWidth
      this.canvas.height = videoHeight
    }
  }

  private updateActivation(filter: FilterConfig, now: number): ActivationState {
    const state = this.activation.get(filter.id)!
    const gesturePresent = this.latestHands.some((h) => h.gesture === filter.gesture)
    const wasPresent = this.previousGesturePresence.get(filter.id) ?? false
    const risingEdge = gesturePresent && !wasPresent
    this.previousGesturePresence.set(filter.id, gesturePresent)

    let active: boolean
    if (filter.duration === 'hold') {
      active = gesturePresent
    } else {
      if (risingEdge) state.toggledOn = !state.toggledOn
      active = state.toggledOn
    }
    state.active = active

    const dt = state.lastTick === null ? 0 : now - state.lastTick
    state.lastTick = now
    const step = dt / FADE_MS
    state.alpha = Math.min(1, Math.max(0, state.alpha + (active ? step : -step)))
    return state
  }

  private handForGesture(gesture: FilterConfig['gesture']): DetectedHand | undefined {
    return this.latestHands.find((h) => h.gesture === gesture)
  }

  private render(now: number) {
    this.syncCanvasSize()
    const { width, height } = this.canvas
    if (!width || !height) return

    const ctx = this.ctx
    ctx.save()
    ctx.clearRect(0, 0, width, height)

    // Mirror the feed horizontally so it behaves like a selfie camera.
    ctx.translate(width, 0)
    ctx.scale(-1, 1)

    const backgroundFilters = this.filters.filter((f) => f.position === 'background')
    const mask = this.segmentation.getMask()

    if (backgroundFilters.length && mask) {
      this.drawBackgroundLayer(backgroundFilters, now, width, height, mask)
    } else {
      ctx.drawImage(this.video, 0, 0, width, height)
    }

    for (const filter of this.filters) {
      if (filter.position === 'background') continue
      const state = this.updateActivation(filter, now)
      if (state.alpha <= 0.001) continue
      const asset = this.assets.get(filter.id)
      if (!asset) continue
      asset.update(now)
      this.drawFilter(filter, asset, state, width, height)
    }

    ctx.restore()
  }

  private drawBackgroundLayer(
    filters: FilterConfig[],
    now: number,
    width: number,
    height: number,
    mask: CanvasImageSource,
  ) {
    const ctx = this.ctx

    for (const filter of filters) {
      const state = this.updateActivation(filter, now)
      if (state.alpha <= 0.001) continue
      const asset = this.assets.get(filter.id)
      if (!asset) continue
      asset.update(now)
      ctx.save()
      ctx.globalAlpha = state.alpha
      ctx.globalCompositeOperation = BLEND_MODE_MAP[filter.blendMode]
      this.drawCover(asset.getSource(), asset.width, asset.height, width, height)
      ctx.restore()
    }

    const person = document.createElement('canvas')
    person.width = width
    person.height = height
    const personCtx = person.getContext('2d')!
    personCtx.drawImage(this.video, 0, 0, width, height)
    personCtx.globalCompositeOperation = 'destination-in'
    personCtx.drawImage(mask, 0, 0, width, height)

    ctx.drawImage(person, 0, 0)
  }

  private drawFilter(filter: FilterConfig, asset: LoadedAsset, state: ActivationState, width: number, height: number) {
    const ctx = this.ctx
    ctx.save()
    ctx.globalAlpha = state.alpha
    ctx.globalCompositeOperation = BLEND_MODE_MAP[filter.blendMode]

    if (filter.position === 'full_screen') {
      this.drawCover(asset.getSource(), asset.width, asset.height, width, height)
    } else if (filter.position === 'face') {
      this.drawFaceAnchored(asset, filter.scale, width, height)
    } else if (filter.position === 'hand_attached') {
      this.drawHandAnchored(filter, asset, width, height)
    }

    ctx.restore()
  }

  private drawCover(source: CanvasImageSource, sw: number, sh: number, dw: number, dh: number) {
    const scale = Math.max(dw / sw, dh / sh)
    const w = sw * scale
    const h = sh * scale
    this.ctx.drawImage(source, (dw - w) / 2, (dh - h) / 2, w, h)
  }

  /** No dedicated face landmarker is wired up, so approximate the face as a
   * fixed region in the upper-center of frame, scaled by filter.scale. */
  private drawFaceAnchored(asset: LoadedAsset, scale: number, width: number, height: number) {
    const baseSize = Math.min(width, height) * 0.4 * scale
    const aspect = asset.width / asset.height || 1
    const w = baseSize * aspect
    const h = baseSize
    const cx = width / 2
    const cy = height * 0.32
    this.ctx.drawImage(asset.getSource(), cx - w / 2, cy - h / 2, w, h)
  }

  private drawHandAnchored(filter: FilterConfig, asset: LoadedAsset, width: number, height: number) {
    const hand = this.handForGesture(filter.gesture)
    if (!hand) return

    const landmarks = hand.landmarks
    let px = 0
    let py = 0
    for (const idx of PALM_LANDMARKS) {
      px += landmarks[idx].x
      py += landmarks[idx].y
    }
    px = (px / PALM_LANDMARKS.length) * width
    py = (py / PALM_LANDMARKS.length) * height

    const wrist = landmarks[WRIST]
    const middleMcp = landmarks[MIDDLE_MCP]
    const dx = (middleMcp.x - wrist.x) * width
    const dy = (middleMcp.y - wrist.y) * height
    const angle = Math.atan2(dy, dx) + Math.PI / 2
    const handSpan = Math.hypot(dx, dy) || 1

    const baseSize = handSpan * 2.2 * filter.scale
    const aspect = asset.width / asset.height || 1
    const w = baseSize * aspect
    const h = baseSize

    const ctx = this.ctx
    ctx.translate(px, py)
    ctx.rotate(angle)
    ctx.drawImage(asset.getSource(), -w / 2, -h / 2, w, h)
  }
}
