import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import './FilterLibrary.css'
import { GestureIcon } from '../components/GestureIcon'
import { useFilterStore } from '../store/useFilterStore'
import { exportWavepack, importWavepack } from '../lib/wavepack'
import type { FilterPack } from '../types'

function PackPreview({ pack }: { pack: FilterPack }) {
  if (pack.filters.length === 0) {
    return <div className="library-card__preview library-card__preview--empty">No filters yet</div>
  }
  return (
    <div className="library-card__preview">
      {pack.filters.slice(0, 4).map((f) => (
        <div key={f.id} className="library-card__preview-tile">
          {f.asset.kind === 'video' ? (
            <video src={f.asset.dataUrl} muted loop autoPlay playsInline />
          ) : (
            <img src={f.asset.dataUrl} alt={f.asset.name} />
          )}
        </div>
      ))}
      {Array.from({ length: Math.max(0, 4 - pack.filters.length) }).map((_, i) => (
        <div key={`pad-${i}`} className="library-card__preview-tile library-card__preview-tile--empty" />
      ))}
    </div>
  )
}

export function FilterLibrary() {
  const packs = useFilterStore((s) => s.packs)
  const activePackId = useFilterStore((s) => s.activePackId)
  const setActivePackId = useFilterStore((s) => s.setActivePackId)
  const createPack = useFilterStore((s) => s.createPack)
  const deletePack = useFilterStore((s) => s.deletePack)
  const importPack = useFilterStore((s) => s.importPack)
  const navigate = useNavigate()
  const importInputRef = useRef<HTMLInputElement>(null)

  async function handleImport(file: File) {
    try {
      const pack = await importWavepack(file)
      importPack(pack)
    } catch {
      window.alert('That file is not a valid .wavepack bundle.')
    }
  }

  return (
    <div className="library">
      <div className="library__header">
        <div>
          <h1 className="library__title">Filter Library</h1>
          <p className="library__subtitle">All of your saved filter packs, ready to run live or share.</p>
        </div>
        <div className="library__actions">
          <button className="btn" onClick={() => importInputRef.current?.click()}>
            Import .wavepack
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".wavepack,application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleImport(file)
              e.target.value = ''
            }}
          />
          <button
            className="btn btn-primary"
            onClick={() => {
              const name = window.prompt('Name this filter pack')
              if (name) createPack(name)
            }}
          >
            + New Pack
          </button>
        </div>
      </div>

      <div className="library__grid">
        {packs.map((pack) => (
          <div key={pack.id} className={`library-card panel${pack.id === activePackId ? ' library-card--active' : ''}`}>
            <PackPreview pack={pack} />
            <div className="library-card__body">
              <div className="library-card__title-row">
                <h3>{pack.name}</h3>
                {pack.id === activePackId && <span className="pill pill--accent">Active</span>}
              </div>
              <p className="library-card__meta">{pack.filters.length} filter{pack.filters.length === 1 ? '' : 's'}</p>
              <div className="library-card__gestures">
                {pack.filters.slice(0, 8).map((f) => (
                  <GestureIcon key={f.id} gesture={f.gesture} size={22} />
                ))}
              </div>
              <div className="library-card__actions">
                <button
                  className="btn"
                  onClick={() => {
                    setActivePackId(pack.id)
                    navigate('/live')
                  }}
                >
                  Use Live
                </button>
                <button className="btn" onClick={() => setActivePackId(pack.id)}>
                  Set Active
                </button>
                <button className="btn" onClick={() => exportWavepack(pack)}>
                  Export
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    if (window.confirm(`Delete "${pack.name}"? This cannot be undone.`)) deletePack(pack.id)
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
