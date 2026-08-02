<script setup lang="ts">
import { computed } from 'vue'
import { ArrowLeftRightIcon, CameraIcon, RefreshCwIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import BuildSelect from '@/components/BuildSelect.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { formatDateTime } from '@/lib/gallery'
import { useFilteredPairs } from '@/composables/useFilteredPairs'
import { useDiffStore } from '@/stores/diff'
import { useGalleryStore } from '@/stores/gallery'

const gallery = useGalleryStore()
const diff = useDiffStore()
const { views, changedCount } = useFilteredPairs()

const currentBuild = computed(() => gallery.buildById(gallery.currentBuildId))
</script>

<template>
  <header class="border-b">
    <div class="mx-auto flex w-full max-w-[1800px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
      <div class="flex items-center gap-2">
        <CameraIcon class="text-muted-foreground size-4" />
        <span class="cn-font-heading text-sm font-semibold tracking-tight">hitome</span>
      </div>

      <Separator orientation="vertical" class="hidden h-5 sm:block" />

      <div class="flex flex-wrap items-center gap-2">
        <span class="text-muted-foreground text-xs">表示</span>
        <BuildSelect
          :model-value="gallery.currentBuildId"
          :builds="gallery.builds"
          none-label="ビルドなし"
          label="表示するビルド"
          @select="gallery.setCurrentBuild($event)"
        />

        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="比較元と入れ替える"
              :disabled="!gallery.isComparing"
              @click="gallery.swapBuilds()"
            >
              <ArrowLeftRightIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>比較元と入れ替える</TooltipContent>
        </Tooltip>

        <span class="text-muted-foreground text-xs">比較元</span>
        <BuildSelect
          :model-value="gallery.baseBuildId"
          :builds="gallery.builds.filter((build) => build.id !== gallery.currentBuildId)"
          allow-none
          label="比較元のビルド"
          @select="gallery.setBaseBuild($event)"
        />
      </div>

      <div class="text-muted-foreground ml-auto flex items-center gap-2 text-xs">
        <Spinner v-if="diff.pendingCount > 0" class="size-3.5" />
        <span v-if="gallery.isComparing" class="tabular-nums">
          {{ views.length }}件中
          <span class="text-foreground font-medium">{{ changedCount }}</span>
          件に差分
        </span>
        <span v-else class="tabular-nums">{{ views.length }}件</span>

        <Badge v-if="currentBuild?.errorCount" variant="destructive">
          撮影エラー {{ currentBuild.errorCount }}
        </Badge>

        <span v-if="currentBuild" class="hidden lg:inline">
          {{ formatDateTime(currentBuild.createdAt) }}
        </span>

        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="再読み込み"
              :disabled="gallery.loadingBuilds"
              @click="gallery.refresh()"
            >
              <RefreshCwIcon :class="gallery.loadingBuilds ? 'animate-spin' : ''" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>撮影結果を再読み込み</TooltipContent>
        </Tooltip>

        <ThemeToggle />
      </div>
    </div>
  </header>
</template>
