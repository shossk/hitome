<script setup lang="ts">
import { computed } from 'vue'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { useViewerStore } from '@/stores/viewer'

/** 透過 PNG の背景 (市松 / 暗 / 明) を設定に従って敷く枠。 */
const props = defineProps<{ class?: HTMLAttributes['class'] }>()

const viewer = useViewerStore()

const surfaceClass = computed(
  () =>
    ({
      checker: 'surface-checker',
      dark: 'surface-dark',
      light: 'surface-light',
    })[viewer.background],
)
</script>

<template>
  <div :class="cn('relative overflow-hidden', surfaceClass, props.class)">
    <slot />
  </div>
</template>
