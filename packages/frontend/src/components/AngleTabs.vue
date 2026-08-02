<script setup lang="ts">
import { computed } from 'vue'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatAngle } from '@/lib/gallery'
import { useGalleryStore } from '@/stores/gallery'
import { useViewerStore } from '@/stores/viewer'

/** 表示アングルの切り替え。ツールバーと詳細ダイアログで共有する。 */
const props = withDefaults(
  defineProps<{
    size?: 'sm' | 'default'
    /** false にすると矢印キーを消費しない (詳細ダイアログの ←→ と衝突させないため)。 */
    rovingFocus?: boolean
  }>(),
  { size: 'default', rovingFocus: true },
)

const gallery = useGalleryStore()
const viewer = useViewerStore()

const model = computed({
  get: () => String(viewer.angle),
  set: (value: string | undefined) => {
    if (value !== undefined && value !== '') viewer.angle = Number(value)
  },
})
</script>

<template>
  <ToggleGroup
    v-model="model"
    type="single"
    variant="outline"
    :size="props.size"
    :roving-focus="props.rovingFocus"
  >
    <ToggleGroupItem
      v-for="angle in gallery.angles"
      :key="angle"
      :value="String(angle)"
      class="tabular-nums"
    >
      {{ formatAngle(angle) }}
    </ToggleGroupItem>
  </ToggleGroup>
</template>
