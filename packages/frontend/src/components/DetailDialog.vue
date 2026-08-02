<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { onKeyStroke } from '@vueuse/core'
import { ChevronLeftIcon, ChevronRightIcon } from '@lucide/vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Separator } from '@/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Kbd } from '@/components/ui/kbd'
import ImageSurface from '@/components/ImageSurface.vue'
import ShotImage from '@/components/ShotImage.vue'
import CompareViewer from '@/components/CompareViewer.vue'
import AngleTabs from '@/components/AngleTabs.vue'
import { formatAngle } from '@/lib/gallery'
import { formatRatio } from '@/lib/imageDiff'
import type { DiffResult } from '@/lib/imageDiff'
import { useFilteredPairs } from '@/composables/useFilteredPairs'
import { useDiffStore } from '@/stores/diff'
import { useGalleryStore } from '@/stores/gallery'
import { useViewerStore } from '@/stores/viewer'
import type { CompareMode } from '@/stores/viewer'

const gallery = useGalleryStore()
const viewer = useViewerStore()
const diff = useDiffStore()
const { filtered } = useFilteredPairs()

const MODES: { value: CompareMode; label: string }[] = [
  { value: 'side', label: '並べて' },
  { value: 'slider', label: 'スライダー' },
  { value: 'diff', label: '差分' },
  { value: 'blink', label: '点滅' },
]

const index = computed(() => filtered.value.findIndex((view) => view.pair.key === viewer.selectedKey))
const view = computed(() => (index.value >= 0 ? filtered.value[index.value] : null))
const pair = computed(() => view.value?.pair ?? null)

const open = computed({
  get: () => viewer.selectedKey !== null && view.value !== null,
  set: (value: boolean) => {
    if (!value) viewer.selectedKey = null
  },
})

const modeModel = computed({
  get: () => viewer.compareMode as string,
  set: (value: string | undefined) => {
    if (value) viewer.compareMode = value as CompareMode
  },
})

/** 差分モードで測った等倍の結果。他モードでは一覧のサンプル値を使う。 */
const detailDiff = ref<DiffResult | null>(null)
watch([() => viewer.selectedKey, () => viewer.angle], () => {
  detailDiff.value = null
})

const entry = computed(() =>
  diff.get(view.value?.urlBase ?? null, view.value?.urlCurrent ?? null, viewer.threshold),
)
const ratio = computed(() => {
  if (detailDiff.value) return detailDiff.value.ratio
  if (entry.value?.status === 'done') return entry.value.result?.ratio ?? null
  return null
})

// 一覧をスクロールせずに ←→ で辿った組み合わせも差分を出せるようにする。
watch(
  [view, () => viewer.threshold],
  () => {
    if (!open.value || !gallery.isComparing) return
    diff.request(view.value?.urlBase ?? null, view.value?.urlCurrent ?? null, viewer.threshold)
  },
  { immediate: true },
)

const labelBase = computed(() => `#${gallery.baseBuildId} (比較元)`)
const labelCurrent = computed(() => `#${gallery.currentBuildId}`)

function move(step: number) {
  if (index.value < 0 || filtered.value.length === 0) return
  const next = (index.value + step + filtered.value.length) % filtered.value.length
  viewer.selectedKey = filtered.value[next].pair.key
}

/**
 * ダイアログを開いた直後のフォーカスをコンテナ自身に置く。
 * 既定ではトグルの中に入ってしまい、←→ がそちらにも吸われる。
 */
function onOpenAutoFocus(event: Event) {
  event.preventDefault()
  ;(event.target as HTMLElement | null)?.focus()
}

/**
 * 矢印キーを自前で使うコントロール上では横取りしない。
 * ダイアログ内のトグルは roving-focus を切ってあるので対象外 (どこにフォーカスが
 * あっても ←→ は組み合わせ移動になる)。
 */
function ownsArrowKeys(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  if (!element) return false
  if (element.isContentEditable) return true
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)) return true
  return Boolean(element.closest('[data-slot="slider"]'))
}

onKeyStroke('ArrowLeft', (event) => {
  if (!open.value || ownsArrowKeys(event.target)) return
  event.preventDefault()
  move(-1)
})

onKeyStroke('ArrowRight', (event) => {
  if (!open.value || ownsArrowKeys(event.target)) return
  event.preventDefault()
  move(1)
})
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      v-if="pair && view"
      class="flex max-h-[94svh] w-[min(96vw,1120px)] max-w-[96vw] flex-col gap-0 overflow-y-auto p-0 sm:max-w-[min(96vw,1120px)]"
      @open-auto-focus="onOpenAutoFocus"
    >
      <DialogHeader class="flex-row items-start justify-between gap-4 border-b p-4 pr-12">
        <div class="flex min-w-0 flex-col gap-1">
          <DialogTitle class="truncate text-base">{{ pair.name }}</DialogTitle>
          <DialogDescription class="font-mono text-xs">
            {{ pair.weaponId }} · {{ pair.materialId }} · {{ formatAngle(viewer.angle) }}
          </DialogDescription>
        </div>
        <div class="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          <Badge v-if="pair.status === 'added'" variant="secondary">新規</Badge>
          <Badge v-else-if="pair.status === 'removed'" variant="destructive">削除</Badge>
          <Badge v-if="pair.renamed" variant="outline">
            名称変更: {{ pair.a?.name }} → {{ pair.b?.name }}
          </Badge>
          <template v-if="gallery.isComparing && pair.status === 'shared'">
            <Badge v-if="entry?.status === 'error'" variant="destructive">比較不可</Badge>
            <Badge v-else-if="ratio === null" variant="outline">差分を計算中</Badge>
            <Badge
              v-else-if="ratio > 0"
              class="tabular-nums"
              :title="detailDiff ? '等倍で計測した値' : '縮小サンプルによる概算値 (差分モードで等倍計測)'"
            >
              差分 {{ formatRatio(ratio) }}
            </Badge>
            <Badge v-else variant="outline">差分なし</Badge>
          </template>
        </div>
      </DialogHeader>

      <div class="flex flex-col gap-4 p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <ToggleGroup
            v-if="gallery.isComparing"
            v-model="modeModel"
            type="single"
            variant="outline"
            size="sm"
            :roving-focus="false"
          >
            <ToggleGroupItem v-for="mode in MODES" :key="mode.value" :value="mode.value">
              {{ mode.label }}
            </ToggleGroupItem>
          </ToggleGroup>
          <AngleTabs size="sm" :roving-focus="false" />
        </div>

        <CompareViewer
          v-if="gallery.isComparing"
          :mode="viewer.compareMode"
          :url-base="view.urlBase"
          :url-current="view.urlCurrent"
          :label-base="labelBase"
          :label-current="labelCurrent"
          :threshold="viewer.threshold"
          @result="detailDiff = $event"
        />

        <ImageSurface
          v-else
          class="mx-auto aspect-square w-full max-w-[min(100%,58svh)] rounded-lg border"
        >
          <ShotImage :src="view.urlCurrent" :alt="pair.name" />
        </ImageSurface>
      </div>

      <div
        class="bg-muted/40 text-muted-foreground mt-auto flex flex-wrap items-center justify-between gap-3 border-t p-4 text-xs"
      >
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span class="font-mono">{{ view.pair.b?.shots[viewer.angle]?.file ?? '—' }}</span>
          <template v-if="detailDiff">
            <Separator orientation="vertical" class="h-3.5" />
            <span class="tabular-nums">{{ detailDiff.width }}×{{ detailDiff.height }}</span>
            <Separator orientation="vertical" class="h-3.5" />
            <span class="tabular-nums">
              {{ detailDiff.changedPixels.toLocaleString('ja-JP') }} px 変化
            </span>
            <Badge v-if="detailDiff.sizeMismatch" variant="destructive">解像度が違います</Badge>
          </template>
        </div>

        <div class="flex items-center gap-2">
          <span class="hidden items-center gap-1 sm:flex">
            <Kbd>←</Kbd><Kbd>→</Kbd> で移動
          </span>
          <ButtonGroup>
            <Button variant="outline" size="icon-sm" aria-label="前の組み合わせ" @click="move(-1)">
              <ChevronLeftIcon />
            </Button>
            <Button variant="outline" size="icon-sm" aria-label="次の組み合わせ" @click="move(1)">
              <ChevronRightIcon />
            </Button>
          </ButtonGroup>
          <span class="tabular-nums">{{ index + 1 }} / {{ filtered.length }}</span>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
