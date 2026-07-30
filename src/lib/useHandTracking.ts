import { useEffect, useRef } from 'react'
import { HandsController } from './handsController'
import type { DetectedHand } from '../types'

/**
 * Starts MediaPipe hand tracking against a video element and forwards each
 * frame's results to `onResults` via a ref-stable callback (no re-renders).
 */
export function useHandTracking(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  active: boolean,
  onResults: (hands: DetectedHand[]) => void,
) {
  const onResultsRef = useRef(onResults)
  onResultsRef.current = onResults

  useEffect(() => {
    if (!active) return
    const video = videoRef.current
    if (!video) return

    const controller = new HandsController()
    const unsubscribe = controller.onResults((hands) => onResultsRef.current(hands))
    controller.start(video)

    return () => {
      unsubscribe()
      controller.destroy()
    }
  }, [active, videoRef])
}
