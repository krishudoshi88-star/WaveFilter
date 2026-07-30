export type GestureId =
  | 'thumbs_up'
  | 'peace'
  | 'ok'
  | 'point_up'
  | 'fist'
  | 'open_palm'
  | 'pinch'
  | 'l_shape'
  | 'call_me'
  | 'three_fingers'
  | 'rock_on'
  | 'wave'

export type AssetKind = 'image' | 'gif' | 'video'

export type OverlayPosition = 'face' | 'background' | 'full_screen' | 'hand_attached'

export type BlendMode = 'normal' | 'screen' | 'multiply'

export type DurationMode = 'hold' | 'toggle'

export interface FilterAsset {
  id: string
  name: string
  kind: AssetKind
  /** data URL for the raw asset bytes, embedded so packs are portable */
  dataUrl: string
  mimeType: string
}

export interface FilterConfig {
  id: string
  gesture: GestureId
  asset: FilterAsset
  position: OverlayPosition
  blendMode: BlendMode
  scale: number
  duration: DurationMode
  createdAt: number
}

export interface FilterPack {
  id: string
  name: string
  createdAt: number
  filters: FilterConfig[]
}

export interface WavepackBundle {
  formatVersion: 1
  pack: FilterPack
}

export interface Landmark {
  x: number
  y: number
  z: number
}

export type Handedness = 'Left' | 'Right'

export interface DetectedHand {
  handedness: Handedness
  landmarks: Landmark[]
  gesture: GestureId | null
  confidence: number
}
