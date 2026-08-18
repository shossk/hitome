<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { CameraOffIcon, TriangleAlertIcon } from '@lucide/vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { TooltipProvider } from '@/components/ui/tooltip'
import AppHeader from '@/components/AppHeader.vue'
import FilterBar from '@/components/FilterBar.vue'
import GalleryGrid from '@/components/GalleryGrid.vue'
import DetailDialog from '@/components/DetailDialog.vue'
import { useGalleryStore } from '@/stores/gallery'
import { useViewerStore } from '@/stores/viewer'

const gallery = useGalleryStore()
const viewer = useViewerStore()

const hasBuilds = computed(() => gallery.builds.length > 0)
const initialLoading = computed(() => gallery.loadingBuilds && !hasBuilds.value)
const ready = computed(() => hasBuilds.value && gallery.currentManifest !== null)

// 保存されていた角度が今のビルドに無い場合 (撮影角度を変えたとき) に取り残されないようにする
watch(
  () => gallery.angles,
  angles => {
    if (angles.length > 0 && !angles.includes(viewer.angle)) viewer.angle = angles[0]
  },
)

onMounted(() => gallery.loadBuilds())
</script>

<template>
  <TooltipProvider :delay-duration="400">
    <div class="bg-background text-foreground min-h-svh">
      <div
        class="bg-background/85 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-30 backdrop-blur"
      >
        <AppHeader />
        <FilterBar v-if="ready" />
      </div>

      <main class="mx-auto w-full max-w-[1800px] px-4 py-4">
        <Alert v-if="gallery.error" variant="destructive" class="mb-4">
          <TriangleAlertIcon />
          <AlertTitle>撮影結果を読み込めませんでした</AlertTitle>
          <AlertDescription>{{ gallery.error }}</AlertDescription>
        </Alert>

        <div
          v-if="initialLoading"
          class="grid gap-3"
          :style="{ gridTemplateColumns: `repeat(auto-fill, minmax(${viewer.thumbSize}px, 1fr))` }"
        >
          <Skeleton v-for="index in 12" :key="index" class="aspect-[1/1.16] rounded-xl" />
        </div>

        <Empty v-else-if="!hasBuilds" class="mt-12 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CameraOffIcon />
            </EmptyMedia>
            <EmptyTitle>撮影結果がまだありません</EmptyTitle>
            <EmptyDescription>
              Godot の撮影ツールを実行すると、ビルドごとの画像がここに並びます。
              <code class="bg-muted mt-2 block rounded-md px-2 py-1 font-mono text-xs">
                ./godot/tools/capture/run.sh 1
              </code>
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" size="sm" @click="gallery.refresh()">再読み込み</Button>
          </EmptyContent>
        </Empty>

        <GalleryGrid v-else-if="ready" />
      </main>

      <DetailDialog />
    </div>
  </TooltipProvider>
</template>
