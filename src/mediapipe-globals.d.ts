// @mediapipe/hands and @mediapipe/selfie_segmentation ship as Closure-compiled
// scripts that only attach themselves to the global object — they have no real
// ESM/CJS exports a bundler can statically link. We load them via <script> tags
// in index.html and consume them here as typed globals instead.
import type { Hands } from '@mediapipe/hands'
import type { SelfieSegmentation } from '@mediapipe/selfie_segmentation'

declare global {
  interface Window {
    Hands: new (config?: ConstructorParameters<typeof Hands>[0]) => Hands
    SelfieSegmentation: new (
      config?: ConstructorParameters<typeof SelfieSegmentation>[0],
    ) => SelfieSegmentation
  }
}

export {}
