import { decompressFrames, parseGIF, type ParsedFrame } from 'gifuct-js'

interface DecodedFrame {
  imageData: ImageData
  delay: number
}

/** Decodes a GIF into composited frames and drives playback on a private canvas. */
export class GifSource {
  readonly width: number
  readonly height: number
  private frames: DecodedFrame[]
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private index = 0
  private elapsed = 0
  private lastTick: number | null = null

  private constructor(width: number, height: number, frames: DecodedFrame[]) {
    this.width = width
    this.height = height
    this.frames = frames
    this.canvas = document.createElement('canvas')
    this.canvas.width = width
    this.canvas.height = height
    this.ctx = this.canvas.getContext('2d')!
    this.ctx.putImageData(frames[0].imageData, 0, 0)
  }

  static async load(dataUrl: string): Promise<GifSource> {
    const buffer = await (await fetch(dataUrl)).arrayBuffer()
    const gif = parseGIF(buffer)
    const raw = decompressFrames(gif, true) as ParsedFrame[]
    const width = gif.lsd.width
    const height = gif.lsd.height

    const compose = document.createElement('canvas')
    compose.width = width
    compose.height = height
    const composeCtx = compose.getContext('2d')!

    const frames: DecodedFrame[] = raw.map((frame) => {
      if (frame.disposalType === 2) {
        composeCtx.clearRect(0, 0, width, height)
      }
      const patch = new ImageData(new Uint8ClampedArray(frame.patch), frame.dims.width, frame.dims.height)
      composeCtx.putImageData(patch, frame.dims.left, frame.dims.top)
      return { imageData: composeCtx.getImageData(0, 0, width, height), delay: Math.max(frame.delay, 20) }
    })

    return new GifSource(width, height, frames)
  }

  update(nowMs: number) {
    if (this.lastTick === null) this.lastTick = nowMs
    this.elapsed += nowMs - this.lastTick
    this.lastTick = nowMs
    while (this.elapsed >= this.frames[this.index].delay) {
      this.elapsed -= this.frames[this.index].delay
      this.index = (this.index + 1) % this.frames.length
    }
    this.ctx.putImageData(this.frames[this.index].imageData, 0, 0)
  }

  getSource(): CanvasImageSource {
    return this.canvas
  }
}
