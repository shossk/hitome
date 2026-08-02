import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { DEFAULT_THRESHOLD } from '@/lib/imageDiff'

export type Background = 'checker' | 'dark' | 'light'
export type CompareMode = 'side' | 'slider' | 'diff' | 'blink'
export type SortKey = 'name' | 'diff'

export const ALL = '__all__'

/** 表示設定とフィルタ。手元の見方を保ちたいので localStorage に永続化する。 */
export const useViewerStore = defineStore('viewer', () => {
  const search = useLocalStorage('hitome.search', '')
  const weapon = useLocalStorage('hitome.weapon', ALL)
  const material = useLocalStorage('hitome.material', ALL)
  const angle = useLocalStorage('hitome.angle', 0)
  const thumbSize = useLocalStorage('hitome.thumbSize', 200)
  const background = useLocalStorage<Background>('hitome.background', 'checker')
  const onlyChanged = useLocalStorage('hitome.onlyChanged', false)
  const compareMode = useLocalStorage<CompareMode>('hitome.compareMode', 'slider')
  const sortKey = useLocalStorage<SortKey>('hitome.sortKey', 'name')
  // キー名は pixelmatch の閾値 (0-1) に変わったときに変更した。
  // 旧 'hitome.threshold' は 0-255 スケールの値なので流用しない。
  const threshold = useLocalStorage('hitome.diffThreshold', DEFAULT_THRESHOLD)

  /** 詳細ダイアログで開いている組み合わせ (永続化しない)。 */
  const selectedKey = ref<string | null>(null)

  function resetFilters() {
    search.value = ''
    weapon.value = ALL
    material.value = ALL
    onlyChanged.value = false
  }

  return {
    selectedKey,
    search,
    weapon,
    material,
    angle,
    thumbSize,
    background,
    onlyChanged,
    compareMode,
    sortKey,
    threshold,
    resetFilters,
  }
})
