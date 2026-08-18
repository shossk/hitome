import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { clearImageCache, diffImagesSampled } from '@/lib/imageDiff'
import type { DiffResult } from '@/lib/imageDiff'

export type DiffStatus = 'pending' | 'done' | 'error'

export interface DiffEntry {
  status: DiffStatus
  result: DiffResult | null
  message: string | null
}

/** 同時デコード数。1024px の PNG を複数枚読むので欲張らない。 */
const CONCURRENCY = 4

/**
 * 一覧用のピクセル差分キャッシュ。
 *
 * キーは「A の URL + B の URL + 閾値」なので、ビルドや角度を切り替えれば
 * 自動的に別エントリになり、戻ってきたときはキャッシュが効く。
 */
export const useDiffStore = defineStore('diff', () => {
  const entries = ref<Record<string, DiffEntry>>({})
  const queue: string[] = []
  const inFlight = new Set<string>()
  const sources = new Map<string, { urlA: string; urlB: string; threshold: number }>()

  const pendingCount = computed(
    () => Object.values(entries.value).filter(entry => entry.status === 'pending').length,
  )

  function keyOf(urlA: string, urlB: string, threshold: number): string {
    return `${urlA}|${urlB}|${threshold}`
  }

  function get(urlA: string | null, urlB: string | null, threshold: number): DiffEntry | null {
    if (!urlA || !urlB) return null
    return entries.value[keyOf(urlA, urlB, threshold)] ?? null
  }

  /** 差分計算を予約する。すでに計算済み / 計算中なら何もしない。 */
  function request(urlA: string | null, urlB: string | null, threshold: number): void {
    if (!urlA || !urlB || urlA === urlB) return
    const key = keyOf(urlA, urlB, threshold)
    if (entries.value[key]) return

    entries.value = { ...entries.value, [key]: { status: 'pending', result: null, message: null } }
    sources.set(key, { urlA, urlB, threshold })
    queue.push(key)
    pump()
  }

  function pump(): void {
    while (inFlight.size < CONCURRENCY && queue.length > 0) {
      const key = queue.shift()!
      const source = sources.get(key)
      if (!source) continue
      inFlight.add(key)

      diffImagesSampled(source.urlA, source.urlB, source.threshold)
        .then(result => {
          update(key, { status: 'done', result, message: null })
        })
        .catch((cause: unknown) => {
          update(key, {
            status: 'error',
            result: null,
            message: cause instanceof Error ? cause.message : String(cause),
          })
        })
        .finally(() => {
          inFlight.delete(key)
          sources.delete(key)
          pump()
        })
    }
  }

  function update(key: string, entry: DiffEntry): void {
    entries.value = { ...entries.value, [key]: entry }
  }

  function clear(): void {
    entries.value = {}
    queue.length = 0
    sources.clear()
    clearImageCache()
  }

  return { entries, pendingCount, get, request, clear }
})
