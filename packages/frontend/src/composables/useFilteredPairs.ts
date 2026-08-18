import { computed } from 'vue'
import { shotAt } from '@/lib/gallery'
import { useDiffStore } from '@/stores/diff'
import { useGalleryStore } from '@/stores/gallery'
import { ALL, useViewerStore } from '@/stores/viewer'
import type { ComboPair } from '@/lib/types'

export interface PairView {
  pair: ComboPair
  urlBase: string | null
  urlCurrent: string | null
  /** 差分割合 (未計算・比較対象なしは null)。 */
  ratio: number | null
}

/**
 * フィルタ・並び替えを適用した一覧。
 * グリッドと詳細ダイアログ (前後移動) で同じ並びを共有するためのコンポーザブル。
 */
export function useFilteredPairs() {
  const gallery = useGalleryStore()
  const viewer = useViewerStore()
  const diff = useDiffStore()

  const views = computed<PairView[]>(() =>
    gallery.pairs.map(pair => {
      const urlBase = shotAt(pair.a, viewer.angle)?.url ?? null
      const urlCurrent = shotAt(pair.b, viewer.angle)?.url ?? null
      const entry = diff.get(urlBase, urlCurrent, viewer.threshold)
      return {
        pair,
        urlBase,
        urlCurrent,
        ratio: entry?.status === 'done' ? (entry.result?.ratio ?? null) : null,
      }
    }),
  )

  const filtered = computed<PairView[]>(() => {
    const needle = viewer.search.trim().toLowerCase()

    const result = views.value.filter(({ pair, ratio }) => {
      if (viewer.weapon !== ALL && pair.weaponId !== viewer.weapon) return false
      if (viewer.material !== ALL && pair.materialId !== viewer.material) return false

      if (needle) {
        const haystack = `${pair.name} ${pair.weaponId} ${pair.materialId}`.toLowerCase()
        if (!haystack.includes(needle)) return false
      }

      if (viewer.onlyChanged && gallery.isComparing) {
        if (pair.status !== 'shared' || pair.renamed) return true
        // 未計算のものは判定が付くまで残す (計算が終われば自然に消える)
        return ratio === null || ratio > 0
      }

      return true
    })

    return result.sort((a, b) => {
      if (viewer.sortKey === 'diff') {
        const diffDelta = (b.ratio ?? -1) - (a.ratio ?? -1)
        if (diffDelta !== 0) return diffDelta
      }
      return a.pair.name.localeCompare(b.pair.name, 'ja') || a.pair.key.localeCompare(b.pair.key)
    })
  })

  const changedCount = computed(
    () =>
      views.value.filter(
        ({ pair, ratio }) => pair.status !== 'shared' || pair.renamed || (ratio ?? 0) > 0,
      ).length,
  )

  return { views, filtered, changedCount }
}
