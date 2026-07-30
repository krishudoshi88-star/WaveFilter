import { useEffect, useMemo, useRef, useState } from 'react'
import './LiveSession.css'
import { GestureIcon } from '../components/GestureIcon'
import { useFilterStore } from '../store/useFilterStore'
import { useHandTracking } from '../lib/useHandTracking'
import { Compositor } from '../lib/compositor'
import { OverlayRenderer } from '../lib/overlayRenderer'
import type { DetectedHand, FilterAsset, GestureId } from '../types'

type SessionMode = 'preview' | 'virtual_cam'

function AssetThumb({ asset }: { asset: FilterAsset }) {
  if (asset.kind === 'video') {
    return <video className="live-strip__thumb-media" src={asset.dataUrl} muted loop autoPlay playsInline />
  }
  return <img className="live-strip__thumb-media" src={asset.dataUrl} alt={asset.name} />
}

export function LiveSession() {
  const packs = useFilterStore((s) => s.packs)
  const activePackId = useFilterStore((s) => s.activePackId)
  const activePack = useMemo(() => packs.find((p) => p.id === activePackId), [packs, activePackId])

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const virtualPreviewRef = useRef<HTMLVideoElement>(null)

  const compositorRef = useRef<Compositor | null>(null)
  const overlayRef = useRef<OverlayRenderer | null>(null)
  const handsRef = useRef<DetectedHand[]>([])

  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [mode, setMode] = useState<SessionMode>('preview')
  const [activeGestures, setActiveGestures] = useState<Set<GestureId>>(new Set())
  const [virtualStream, setVirtualStream] = useState<MediaStream | null>(null)

  useEffect(() => {
    let cancelled = false
    let stream: MediaStream | null = null

    async function setup() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        if (cancelled || !videoRef.current || !canvasRef.current || !overlayCanvasRef.current) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        const video = videoRef.current
        video.srcObject = stream
        await video.play()

        const compositor = new Compositor(canvasRef.current, video)
        const overlay = new OverlayRenderer(overlayCanvasRef.current, video)
        compositorRef.current = compositor
        overlayRef.current = overlay
        compositor.start()
        overlay.start()
        setCameraReady(true)
      } catch (err) {
        setCameraError(err instanceof Error ? err.message : 'Could not access the webcam')
      }
    }

    setup()
    return () => {
      cancelled = true
      compositorRef.current?.destroy()
      overlayRef.current?.stop()
      compositorRef.current = null
      overlayRef.current = null
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  useHandTracking(videoRef, cameraReady, (hands) => {
    handsRef.current = hands
    compositorRef.current?.setHands(hands)
    overlayRef.current?.setHands(hands)
  })

  useEffect(() => {
    compositorRef.current?.setFilters(activePack?.filters ?? [])
  }, [activePack?.filters, cameraReady])

  useEffect(() => {
    const id = window.setInterval(() => {
      const next = new Set(handsRef.current.filter((h) => h.gesture).map((h) => h.gesture as GestureId))
      setActiveGestures((prev) => {
        if (prev.size === next.size && [...prev].every((g) => next.has(g))) return prev
        return next
      })
    }, 150)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (mode !== 'virtual_cam' || !cameraReady) {
      setVirtualStream(null)
      return
    }
    const stream = compositorRef.current?.getStream(30) ?? null
    setVirtualStream(stream)
    return () => {
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [mode, cameraReady])

  useEffect(() => {
    if (virtualPreviewRef.current) {
      virtualPreviewRef.current.srcObject = virtualStream
    }
  }, [virtualStream])

  const filters = activePack?.filters ?? []

  return (
    <div className="live">
      <video ref={videoRef} className="live__video-src" muted playsInline />
      <canvas ref={canvasRef} className="live__canvas" />
      <canvas ref={overlayCanvasRef} className={`live__overlay${mode === 'virtual_cam' ? ' live__overlay--hidden' : ''}`} />

      <div className="live__topbar">
        <div className="live__mode-toggle">
          <button
            className={`live__mode-btn${mode === 'preview' ? ' live__mode-btn--active' : ''}`}
            onClick={() => setMode('preview')}
          >
            Preview Mode
          </button>
          <button
            className={`live__mode-btn${mode === 'virtual_cam' ? ' live__mode-btn--active' : ''}`}
            onClick={() => setMode('virtual_cam')}
          >
            Virtual Cam Mode
          </button>
        </div>
        {activePack && <span className="pill pill--accent">{activePack.name}</span>}
        {!cameraReady && !cameraError && <span className="pill">Starting camera…</span>}
      </div>

      {cameraError && (
        <div className="live__error-banner">
          Camera unavailable: {cameraError}. Grant camera permission and reload.
        </div>
      )}

      {mode === 'virtual_cam' && (
        <div className="live__vcam-panel panel">
          <div className="live__vcam-status">
            <span className={`live__vcam-dot${virtualStream ? ' live__vcam-dot--live' : ''}`} />
            {virtualStream ? 'Canvas stream live (30 fps)' : 'Waiting for stream…'}
          </div>
          {virtualStream && (
            <video ref={virtualPreviewRef} className="live__vcam-preview" autoPlay muted playsInline />
          )}
          <h3>Route this feed into a video call</h3>
          <ol>
            <li>
              In OBS, add a <strong>Window Capture</strong> (or Browser Source) targeting this Live Session
              tab so it captures the composited canvas.
            </li>
            <li>
              Click <strong>Start Virtual Camera</strong> in OBS Studio ( Controls → Start Virtual Camera ).
            </li>
            <li>
              In Google Meet or Zoom Web, open camera settings and select <strong>OBS Virtual Camera</strong>{' '}
              as the video source.
            </li>
          </ol>
          <p className="live__vcam-note">
            The composited canvas also exposes a live <code>MediaStream</code> via{' '}
            <code>canvas.captureStream(30)</code> — useful if you're wiring WaveFilter into a custom virtual-camera
            browser extension instead of OBS.
          </p>
        </div>
      )}

      <div className="live-strip">
        {filters.length === 0 && (
          <div className="live-strip__empty">No filters yet — add some in the Filter Builder.</div>
        )}
        {filters.map((f) => (
          <div
            key={f.id}
            className={`live-strip__item${activeGestures.has(f.gesture) ? ' live-strip__item--active' : ''}`}
          >
            <div className="live-strip__thumb">
              <AssetThumb asset={f.asset} />
            </div>
            <GestureIcon gesture={f.gesture} size={26} active={activeGestures.has(f.gesture)} />
            <span className="live-strip__name">{f.asset.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
