<script setup lang="ts">
import { SearchXIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import ShotCard from '@/components/ShotCard.vue'
import { useFilteredPairs } from '@/composables/useFilteredPairs'
import { useViewerStore } from '@/stores/viewer'

const viewer = useViewerStore()
const { filtered } = useFilteredPairs()
</script>

<template>
  <div
    v-if="filtered.length"
    class="grid gap-3"
    :style="{ gridTemplateColumns: `repeat(auto-fill, minmax(${viewer.thumbSize}px, 1fr))` }"
  >
    <ShotCard v-for="view in filtered" :key="view.pair.key" :view="view" />
  </div>

  <Empty v-else class="border">
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <SearchXIcon />
      </EmptyMedia>
      <EmptyTitle>該当する組み合わせがありません</EmptyTitle>
      <EmptyDescription>
        フィルタを緩めるか、「変更のみ」を解除してください。
      </EmptyDescription>
    </EmptyHeader>
    <EmptyContent>
      <Button variant="outline" size="sm" @click="viewer.resetFilters()">
        フィルタをリセット
      </Button>
    </EmptyContent>
  </Empty>
</template>
