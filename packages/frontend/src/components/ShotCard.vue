<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useIntersectionObserver } from '@vueuse/core'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import ImageSurface from '@/components/ImageSurface.vue'
import ShotImage from '@/components/ShotImage.vue'
import { formatRatio } from '@/lib/imageDiff'
import { useDiffStore } from '@/stores/diff'
import { useGalleryStore } from '@/stores/gallery'
import { useViewerStore } from '@/stores/viewer'
import type { PairView } from '@/composables/useFilteredPairs'

const props = defineProps<{ view: PairView }>()

const gallery = useGalleryStore()
const viewer = useViewerStore()
const diff = useDiffStore()

const root = ref<HTMLElement | null>(null)
const visible = ref(false)

// 画面に入ったものだけ差分計算する。1024px の PNG を全件デコードすると重い。
useIntersectionObserver(
  root,
  ([entry]) => {
    if (entry?.isIntersecting) visible.value = true
  },
  { rootMargin: '256px' },
)

const pair = computed(() => props.view.pair)
const displayUrl = computed(() => props.view.urlCurrent ?? props.view.urlBase)
const hasBoth = computed(() => Boolean(props.view.urlBase && props.view.urlCurrent))
const entry = computed(() => diff.get(props.view.urlBase, props.view.urlCurrent, viewer.threshold))

watch(
  [visible, () => props.view.urlBase, () => props.view.urlCurrent, () => viewer.threshold],
  () => {
    if (!visible.value || !gallery.isComparing) return
    diff.request(props.view.urlBase, props.view.urlCurrent, viewer.threshold)
  },
  { immediate: true },
)
</script>

<template>
  <button
    ref="root"
    type="button"
    class="focus-visible:ring-ring/50 group rounded-xl text-left outline-none focus-visible:ring-3"
    @click="viewer.selectedKey = pair.key"
  >
    <Card
      class="hover:ring-foreground/25 gap-0 p-0 ring-1 transition-shadow group-focus-visible:ring-transparent"
    >
      <CardContent class="p-0">
        <ImageSurface class="aspect-square">
          <ShotImage
            :src="displayUrl"
            :alt="`${pair.name} (${pair.weaponId} / ${pair.materialId})`"
            :class="pair.status === 'removed' ? 'opacity-60' : ''"
          />

          <!-- ホバー中は比較元を重ねて出す (Before/After のクイック確認) -->
          <div
            v-if="hasBoth"
            class="absolute inset-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
          >
            <ImageSurface class="size-full">
              <ShotImage :src="view.urlBase" :alt="`${pair.name} (比較元)`" />
            </ImageSurface>
            <Badge variant="secondary" class="absolute bottom-2 left-2 shadow-sm">
              比較元 #{{ gallery.baseBuildId }}
            </Badge>
          </div>

          <div class="absolute top-2 right-2 flex flex-col items-end gap-1">
            <Badge v-if="pair.status === 'added'" variant="secondary" class="shadow-sm">
              新規
            </Badge>
            <Badge v-else-if="pair.status === 'removed'" variant="destructive" class="shadow-sm">
              削除
            </Badge>
            <template v-else-if="gallery.isComparing">
              <Badge
                v-if="!entry || entry.status === 'pending'"
                variant="outline"
                class="bg-background/80 shadow-sm"
              >
                <Spinner />
              </Badge>
              <Badge v-else-if="entry.status === 'error'" variant="destructive" class="shadow-sm">
                比較不可
              </Badge>
              <Badge
                v-else-if="(entry.result?.ratio ?? 0) > 0"
                variant="default"
                class="shadow-sm tabular-nums"
              >
                {{ formatRatio(entry.result!.ratio) }}
              </Badge>
              <Badge v-else variant="outline" class="bg-background/80 shadow-sm"> 差分なし </Badge>
            </template>
            <Badge v-if="pair.renamed" variant="outline" class="bg-background/80 shadow-sm">
              名称変更
            </Badge>
          </div>
        </ImageSurface>
      </CardContent>

      <CardFooter class="flex-col items-start gap-0.5 p-2.5">
        <span class="w-full truncate text-sm font-medium">{{ pair.name }}</span>
        <span class="text-muted-foreground w-full truncate font-mono text-xs">
          {{ pair.weaponId }} · {{ pair.materialId }}
        </span>
      </CardFooter>
    </Card>
  </button>
</template>
