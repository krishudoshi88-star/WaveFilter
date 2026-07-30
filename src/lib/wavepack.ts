import type { FilterPack, WavepackBundle } from '../types'

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function exportWavepack(pack: FilterPack): void {
  const bundle: WavepackBundle = { formatVersion: 1, pack }
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${pack.name.replace(/\s+/g, '_').toLowerCase() || 'filter-pack'}.wavepack`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function importWavepack(file: File): Promise<FilterPack> {
  const text = await file.text()
  const bundle = JSON.parse(text) as WavepackBundle
  if (!bundle || bundle.formatVersion !== 1 || !bundle.pack) {
    throw new Error('Invalid .wavepack file')
  }
  return bundle.pack
}
