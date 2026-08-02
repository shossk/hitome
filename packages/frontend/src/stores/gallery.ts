import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { fetchBuilds, fetchManifest } from '@/lib/api'
import { useDiffStore } from '@/stores/diff'
import { collectIds, pairCombos, toCombos } from '@/lib/gallery'
import { ICON_ANGLE } from '@/lib/types'
import type { BuildSummary, Manifest } from '@/lib/types'

/**
 * ビルド一覧と manifest を持つストア。
 *
 * current = いま見ているビルド (通常は最新)、base = 比較元 (1 つ前)。
 * base が null のときは単一ビルドのギャラリー表示になる。
 */
export const useGalleryStore = defineStore('gallery', () => {
  const builds = ref<BuildSummary[]>([])
  const manifests = ref<Record<string, Manifest>>({})
  const currentBuildId = ref<string | null>(null)
  const baseBuildId = ref<string | null>(null)

  const loadingBuilds = ref(false)
  const pendingManifests = ref(0)
  const loadingManifest = computed(() => pendingManifests.value > 0)
  const error = ref<string | null>(null)
  const buildsDir = ref<string | null>(null)

  const currentManifest = computed(() =>
    currentBuildId.value ? (manifests.value[currentBuildId.value] ?? null) : null,
  )
  const baseManifest = computed(() =>
    baseBuildId.value ? (manifests.value[baseBuildId.value] ?? null) : null,
  )

  const currentCombos = computed(() => toCombos(currentManifest.value))
  const baseCombos = computed(() => toCombos(baseManifest.value))

  const isComparing = computed(
    () => baseBuildId.value !== null && baseBuildId.value !== currentBuildId.value,
  )

  const pairs = computed(() =>
    pairCombos(isComparing.value ? baseCombos.value : null, currentCombos.value),
  )

  const allCombos = computed(() => [...baseCombos.value, ...currentCombos.value])
  const weaponIds = computed(() => collectIds(allCombos.value, 'weaponId'))
  const materialIds = computed(() => collectIds(allCombos.value, 'materialId'))

  /** 選択肢に出す角度。両ビルドの和集合 + アイコン。 */
  const angles = computed(() => {
    const set = new Set<number>()
    for (const manifest of [baseManifest.value, currentManifest.value]) {
      for (const angle of manifest?.angles ?? []) set.add(angle)
    }
    const hasIcon = allCombos.value.some((combo) => combo.shots[ICON_ANGLE])
    const sorted = [...set].sort((a, b) => a - b)
    return hasIcon ? [...sorted, ICON_ANGLE] : sorted
  })

  const captureErrors = computed(() => currentManifest.value?.errors ?? [])

  function buildById(id: string | null): BuildSummary | null {
    if (!id) return null
    return builds.value.find((build) => build.id === id) ?? null
  }

  /** 同じビルドの多重取得を避けるための取得中プロミス。 */
  const inFlight = new Map<string, Promise<void>>()

  async function ensureManifest(id: string | null): Promise<void> {
    if (!id || manifests.value[id]) return
    const existing = inFlight.get(id)
    if (existing) return existing

    const task = (async () => {
      pendingManifests.value++
      try {
        // fetch を待ってから代入する。ここで await の結果を直接
        // スプレッドに混ぜると、並行呼び出し同士で古いスナップショットを
        // 書き戻してしまう。
        const manifest = await fetchManifest(id)
        manifests.value = { ...manifests.value, [id]: manifest }
      } catch (cause) {
        error.value = messageOf(cause)
      } finally {
        pendingManifests.value--
        inFlight.delete(id)
      }
    })()

    inFlight.set(id, task)
    return task
  }

  /** 一覧を取得し、未選択なら「最新 vs 1 つ前」を初期選択する。 */
  async function loadBuilds() {
    loadingBuilds.value = true
    error.value = null
    try {
      const res = await fetchBuilds()
      builds.value = res.builds
      buildsDir.value = res.buildsDir ?? null

      const ids = res.builds.map((build) => build.id)
      if (!currentBuildId.value || !ids.includes(currentBuildId.value)) {
        currentBuildId.value = ids[0] ?? null
        baseBuildId.value = ids[1] ?? null
      } else if (baseBuildId.value && !ids.includes(baseBuildId.value)) {
        baseBuildId.value = null
      }

      await Promise.all([ensureManifest(currentBuildId.value), ensureManifest(baseBuildId.value)])
    } catch (cause) {
      error.value = messageOf(cause)
    } finally {
      loadingBuilds.value = false
    }
  }

  async function setCurrentBuild(id: string | null) {
    currentBuildId.value = id
    if (id && baseBuildId.value === id) baseBuildId.value = null
    await ensureManifest(id)
  }

  async function setBaseBuild(id: string | null) {
    baseBuildId.value = id
    await ensureManifest(id)
  }

  function swapBuilds() {
    if (!isComparing.value) return
    const previous = baseBuildId.value
    baseBuildId.value = currentBuildId.value
    currentBuildId.value = previous
  }

  /** manifest と差分キャッシュを捨てて再取得する (撮り直したときに使う)。 */
  async function refresh() {
    manifests.value = {}
    useDiffStore().clear()
    await loadBuilds()
  }

  return {
    builds,
    manifests,
    currentBuildId,
    baseBuildId,
    loadingBuilds,
    loadingManifest,
    error,
    buildsDir,
    currentManifest,
    baseManifest,
    currentCombos,
    baseCombos,
    isComparing,
    pairs,
    weaponIds,
    materialIds,
    angles,
    captureErrors,
    buildById,
    loadBuilds,
    ensureManifest,
    setCurrentBuild,
    setBaseBuild,
    swapBuilds,
    refresh,
  }
})

function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}
