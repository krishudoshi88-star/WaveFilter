import { useMemo, useRef, useState } from 'react'
import './FilterBuilder.css'
import { GestureIcon } from '../components/GestureIcon'
import { GESTURES } from '../data/gestures'
import { useFilterStore, newId } from '../store/useFilterStore'
import { fileToDataUrl } from '../lib/wavepack'
import type { AssetKind, BlendMode, DurationMode, FilterAsset, FilterConfig, GestureId, OverlayPosition } from '../types'

const POSITIONS: { id: OverlayPosition; label: string; hint: string }[] = [
  { id: 'face', label: 'Face', hint: 'Anchored over the upper-face region' },
  { id: 'background', label: 'Background', hint: 'Behind the subject, in front of the room' },
  { id: 'full_screen', label: 'Full-Screen', hint: 'Covers the entire composited frame' },
  { id: 'hand_attached', label: 'Hand-Attached', hint: 'Follows the triggering hand’s palm' },
]

const BLEND_MODES: { id: BlendMode; label: string }[] = [
  { id: 'normal', label: 'Normal' },
  { id: 'screen', label: 'Screen' },
  { id: 'multiply', label: 'Multiply' },
]

function kindFromMime(mime: string): AssetKind | null {
  if (mime === 'image/gif') return 'gif'
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  return null
}

export function FilterBuilder() {
  const packs = useFilterStore((s) => s.packs)
  const activePackId = useFilterStore((s) => s.activePackId)
  const setActivePackId = useFilterStore((s) => s.setActivePackId)
  const createPack = useFilterStore((s) => s.createPack)
  const addFilter = useFilterStore((s) => s.addFilter)

  const activePack = useMemo(() => packs.find((p) => p.id === activePackId), [packs, activePackId])

  const [asset, setAsset] = useState<FilterAsset | null>(null)
  const [assetName, setAssetName] = useState('')
  const [gesture, setGesture] = useState<GestureId>('open_palm')
  const [position, setPosition] = useState<OverlayPosition>('hand_attached')
  const [blendMode, setBlendMode] = useState<BlendMode>('normal')
  const [scale, setScale] = useState(1)
  const [duration, setDuration] = useState<DurationMode>('hold')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setError(null)
    const kind = kindFromMime(file.type)
    if (!kind) {
      setError('Unsupported file type. Upload a PNG, JPG, GIF, or MP4.')
      return
    }
    const dataUrl = await fileToDataUrl(file)
    setAsset({ id: newId(), name: file.name, kind, dataUrl, mimeType: file.type })
    setAssetName(file.name.replace(/\.[^.]+$/, ''))
    setSaved(false)
  }

  function handleSave() {
    if (!asset || !activePack) return
    const filter: FilterConfig = {
      id: newId(),
      gesture,
      asset: { ...asset, name: assetName || asset.name },
      position,
      blendMode,
      scale,
      duration,
      createdAt: Date.now(),
    }
    addFilter(activePack.id, filter)
    setSaved(true)
  }

  function handleNewPack() {
    const name = window.prompt('Name this filter pack')
    if (name) createPack(name)
  }

  return (
    <div className="builder">
      <div className="builder__col builder__col--controls">
        <div className="builder__header">
          <div>
            <h1 className="builder__title">Filter Builder</h1>
            <p className="builder__subtitle">Upload an asset and bind it to a hand gesture.</p>
          </div>
          <div className="builder__pack-picker">
            <label className="field-label">Pack</label>
            <div className="builder__pack-row">
              <select value={activePackId} onChange={(e) => setActivePackId(e.target.value)}>
                {packs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.filters.length})
                  </option>
                ))}
              </select>
              <button className="btn" onClick={handleNewPack}>
                + New Pack
              </button>
            </div>
          </div>
        </div>

        <section className="panel builder__section">
          <label className="field-label">Trigger Gesture</label>
          <div className="builder__gesture-grid">
            {GESTURES.map((g) => (
              <button
                key={g.id}
                type="button"
                className={`builder__gesture-btn${gesture === g.id ? ' builder__gesture-btn--active' : ''}`}
                onClick={() => setGesture(g.id)}
                title={g.description}
              >
                <GestureIcon gesture={g.id} size={44} active={gesture === g.id} />
                <span>{g.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel builder__section">
          <label className="field-label">Overlay Position</label>
          <div className="builder__position-grid">
            {POSITIONS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`builder__option-btn${position === p.id ? ' builder__option-btn--active' : ''}`}
                onClick={() => setPosition(p.id)}
              >
                <strong>{p.label}</strong>
                <span>{p.hint}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel builder__section builder__section--row">
          <div>
            <label className="field-label">Blend Mode</label>
            <div className="builder__chip-row">
              {BLEND_MODES.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={`builder__chip${blendMode === b.id ? ' builder__chip--active' : ''}`}
                  onClick={() => setBlendMode(b.id)}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="field-label">Duration</label>
            <div className="builder__chip-row">
              <button
                type="button"
                className={`builder__chip${duration === 'hold' ? ' builder__chip--active' : ''}`}
                onClick={() => setDuration('hold')}
              >
                Hold
              </button>
              <button
                type="button"
                className={`builder__chip${duration === 'toggle' ? ' builder__chip--active' : ''}`}
                onClick={() => setDuration('toggle')}
              >
                Toggle
              </button>
            </div>
          </div>
        </section>

        <section className="panel builder__section">
          <label className="field-label">
            Scale <span className="builder__scale-value">{scale.toFixed(2)}x</span>
          </label>
          <input
            type="range"
            min={0.25}
            max={3}
            step={0.05}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
          />
        </section>

        <button className="btn btn-primary builder__save" onClick={handleSave} disabled={!asset}>
          {saved ? 'Saved to pack ✓' : 'Save Filter to Pack'}
        </button>
      </div>

      <div className="builder__col builder__col--preview">
        <div
          className="builder__dropzone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const file = e.dataTransfer.files[0]
            if (file) handleFile(file)
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          {asset ? (
            <AssetPreview asset={asset} />
          ) : (
            <div className="builder__dropzone-empty">
              <div className="builder__dropzone-icon">+</div>
              <p>Drop a PNG, GIF, or MP4 here</p>
              <p className="builder__dropzone-hint">or click to browse</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,video/mp4,video/webm"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }}
          />
        </div>
        {error && <p className="builder__error">{error}</p>}
        {asset && (
          <div className="builder__asset-meta panel">
            <label className="field-label">Asset Name</label>
            <input
              className="builder__name-input"
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
            />
            <div className="builder__meta-pills">
              <span className="pill pill--accent">{asset.kind.toUpperCase()}</span>
              <span className="pill">{gesture.replace('_', ' ')}</span>
              <span className="pill">{position.replace('_', ' ')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AssetPreview({ asset }: { asset: FilterAsset }) {
  if (asset.kind === 'video') {
    return <video className="builder__preview-media" src={asset.dataUrl} autoPlay loop muted playsInline />
  }
  return <img className="builder__preview-media" src={asset.dataUrl} alt={asset.name} />
}
