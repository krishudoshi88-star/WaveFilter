import type { SelfieSegmentation } from '@mediapipe/selfie_segmentation'

const MEDIAPIPE_VERSION = '0.1.1675465747'

/**
 * Runs person segmentation independently of the main render loop and keeps
 * the latest mask available synchronously via `getMask()`, so the
 * compositor's draw loop never has to wait on an async result.
 */
export class SegmentationController {
  private model: SelfieSegmentation
  private video: HTMLVideoElement | null = null
  private rafId: number | null = null
  private running = false
  private mask: CanvasImageSource | null = null

  constructor() {
    this.model = new window.SelfieSegmentation({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@${MEDIAPIPE_VERSION}/${file}`,
    })
    this.model.setOptions({ modelSelection: 1, selfieMode: false })
    this.model.onResults((results) => {
      this.mask = results.segmentationMask
    })
  }

  getMask(): CanvasImageSource | null {
    return this.mask
  }

  start(video: HTMLVideoElement) {
    this.video = video
    this.running = true
    const loop = async () => {
      if (!this.running || !this.video) return
      if (this.video.readyState >= 2) {
        await this.model.send({ image: this.video })
      }
      this.rafId = requestAnimationFrame(loop)
    }
    this.rafId = requestAnimationFrame(loop)
  }

  stop() {
    this.running = false
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  destroy() {
    this.stop()
    this.model.close()
  }
}
