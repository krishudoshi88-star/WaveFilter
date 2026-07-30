import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval'
import type { FilterConfig, FilterPack } from '../types'

// Filter packs can embed base64 video/GIF assets that quickly exceed
// localStorage's ~5MB quota, so persist through IndexedDB instead.
const indexedDbStorage: StateStorage = {
  getItem: async (name) => (await idbGet(name)) ?? null,
  setItem: async (name, value) => idbSet(name, value),
  removeItem: async (name) => idbDel(name),
}

const DEFAULT_PACK_ID = 'default-pack'

interface FilterStoreState {
  packs: FilterPack[]
  activePackId: string
  virtualCamMode: boolean

  activePack: () => FilterPack | undefined
  setActivePackId: (id: string) => void
  createPack: (name: string) => FilterPack
  deletePack: (id: string) => void
  importPack: (pack: FilterPack) => void

  addFilter: (packId: string, filter: FilterConfig) => void
  updateFilter: (packId: string, filterId: string, patch: Partial<FilterConfig>) => void
  removeFilter: (packId: string, filterId: string) => void

  setVirtualCamMode: (on: boolean) => void
}

function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export const useFilterStore = create<FilterStoreState>()(
  persist(
    (set, get) => ({
      packs: [{ id: DEFAULT_PACK_ID, name: 'My Filters', createdAt: Date.now(), filters: [] }],
      activePackId: DEFAULT_PACK_ID,
      virtualCamMode: false,

      activePack: () => get().packs.find((p) => p.id === get().activePackId),

      setActivePackId: (id) => set({ activePackId: id }),

      createPack: (name) => {
        const pack: FilterPack = { id: newId(), name, createdAt: Date.now(), filters: [] }
        set((s) => ({ packs: [...s.packs, pack], activePackId: pack.id }))
        return pack
      },

      deletePack: (id) => {
        set((s) => {
          const packs = s.packs.filter((p) => p.id !== id)
          const activePackId = s.activePackId === id ? (packs[0]?.id ?? '') : s.activePackId
          return { packs, activePackId }
        })
      },

      importPack: (pack) => {
        const withId = { ...pack, id: newId() }
        set((s) => ({ packs: [...s.packs, withId], activePackId: withId.id }))
      },

      addFilter: (packId, filter) => {
        set((s) => ({
          packs: s.packs.map((p) => (p.id === packId ? { ...p, filters: [...p.filters, filter] } : p)),
        }))
      },

      updateFilter: (packId, filterId, patch) => {
        set((s) => ({
          packs: s.packs.map((p) =>
            p.id !== packId
              ? p
              : { ...p, filters: p.filters.map((f) => (f.id === filterId ? { ...f, ...patch } : f)) },
          ),
        }))
      },

      removeFilter: (packId, filterId) => {
        set((s) => ({
          packs: s.packs.map((p) =>
            p.id !== packId ? p : { ...p, filters: p.filters.filter((f) => f.id !== filterId) },
          ),
        }))
      },

      setVirtualCamMode: (on) => set({ virtualCamMode: on }),
    }),
    { name: 'wavefilter-store', storage: createJSONStorage(() => indexedDbStorage) },
  ),
)

export { newId }
