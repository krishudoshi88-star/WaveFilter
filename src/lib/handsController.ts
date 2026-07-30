import type { Hands, Results } from '@mediapipe/hands'
import type { DetectedHand, Handedness } from '../types'
import { classifyHand } from './gestureMatcher'

const MEDIAPIPE_VERSION = '0.4.1675469240'

export type HandsResultListener = (hands: DetectedHand[]) => void

export class HandsController {
  private hands: Hands
  private video: HTMLVideoElement | null = null
  private rafId: number | null = null
  private listeners = new Set<HandsResultListener>()
  private running = false

  constructor() {
    this.hands = new window.Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${MEDIAPIPE_VERSION}/${file}`,
    })
    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.6,
    })
    this.hands.onResults((results) => this.handleResults(results))
  }

  onResults(listener: HandsResultListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  async start(video: HTMLVideoElement) {
    this.video = video
    this.running = true
    const loop = async () => {
      if (!this.running || !this.video) return
      if (this.video.readyState >= 2) {
        await this.hands.send({ image: this.video })
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
    this.hands.close()
    this.listeners.clear()
  }

  private handleResults(results: Results) {
    const hands: DetectedHand[] = []
    const landmarkSets = results.multiHandLandmarks ?? []
    const handednessSets = results.multiHandedness ?? []

    for (let i = 0; i < landmarkSets.length; i++) {
      const landmarks = landmarkSets[i].map((p) => ({ x: p.x, y: p.y, z: p.z }))
      // MediaPipe reports handedness from the camera's point of view; a
      // typical selfie feed is mirrored, so flip label to match what the
      // user visually perceives as their left/right hand.
      const rawLabel = (handednessSets[i]?.label as Handedness) ?? 'Right'
      const handedness: Handedness = rawLabel === 'Left' ? 'Right' : 'Left'
      hands.push(classifyHand(landmarks, handedness))
    }

    for (const listener of this.listeners) listener(hands)
  }
}
