import type { FilterAsset } from '../types'
import { GifSource } from './gifSource'

export interface LoadedAsset {
  width: number
  height: number
  update(nowMs: number): void
  getSource(): CanvasImageSource
  dispose(): void
}

class ImageAssetSource implements LoadedAsset {
  width = 0
  height = 0
  private img: HTMLImageElement

  private constructor(img: HTMLImageElement) {
    this.img = img
    this.width = img.naturalWidth
    this.height = img.naturalHeight
  }

  static load(dataUrl: string): Promise<ImageAssetSource> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(new ImageAssetSource(img))
      img.onerror = reject
      img.src = dataUrl
    })
  }

  update() {}
  getSource() {
    return this.img
  }
  dispose() {}
}

class VideoAssetSource implements LoadedAsset {
  width = 0
  height = 0
  private video: HTMLVideoElement

  private constructor(video: HTMLVideoElement) {
    this.video = video
    this.width = video.videoWidth
    this.height = video.videoHeight
  }

  static load(dataUrl: string): Promise<VideoAssetSource> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.muted = true
      video.loop = true
      video.playsInline = true
      video.autoplay = true
      video.onloadeddata = () => {
        video.play().catch(() => {})
        resolve(new VideoAssetSource(video))
      }
      video.onerror = reject
      video.src = dataUrl
    })
  }

  update() {}
  getSource() {
    return this.video
  }
  dispose() {
    this.video.pause()
    this.video.src = ''
  }
}

class GifAssetSource implements LoadedAsset {
  width: number
  height: number
  private gif: GifSource

  private constructor(gif: GifSource) {
    this.gif = gif
    this.width = gif.width
    this.height = gif.height
  }

  static async load(dataUrl: string): Promise<GifAssetSource> {
    const gif = await GifSource.load(dataUrl)
    return new GifAssetSource(gif)
  }

  update(nowMs: number) {
    this.gif.update(nowMs)
  }
  getSource() {
    return this.gif.getSource()
  }
  dispose() {}
}

export function loadAsset(asset: FilterAsset): Promise<LoadedAsset> {
  switch (asset.kind) {
    case 'image':
      return ImageAssetSource.load(asset.dataUrl)
    case 'video':
      return VideoAssetSource.load(asset.dataUrl)
    case 'gif':
      return GifAssetSource.load(asset.dataUrl)
  }
}
