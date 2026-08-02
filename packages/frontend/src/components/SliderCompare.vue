<script setup lang="ts">
import { ref } from 'vue'
import { GripVerticalIcon } from '@lucide/vue'
import ImageSurface from '@/components/ImageSurface.vue'
import ShotImage from '@/components/ShotImage.vue'

/** 左に比較元、右に現ビルドを置き、境界をドラッグして重ね比べる。 */
const props = defineProps<{
  urlBase: string | null
  urlCurrent: string | null
  labelBase: string
  labelCurrent: string
}>()

const position = defineModel<number>('position', { default: 50 })

const root = ref<HTMLElement | null>(null)
const dragging = ref(false)

function updateFromEvent(event: PointerEvent) {
  const rect = root.value?.getBoundingClientRect()
  if (!rect || rect.width === 0) return
  const ratio = ((event.clientX - rect.left) / rect.width) * 100
  position.value = Math.min(100, Math.max(0, Math.round(ratio * 10) / 10))
}

function onPointerDown(event: PointerEvent) {
  dragging.value = true
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  updateFromEvent(event)
}

function onPointerMove(event: PointerEvent) {
  if (!dragging.value) return
  updateFromEvent(event)
}

function onPointerUp(event: PointerEvent) {
  dragging.value = false
  ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
}
</script>

<template>
  <div
    ref="root"
    class="relative size-full cursor-ew-resize touch-none select-none"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <ImageSurface class="size-full">
      <ShotImage :src="props.urlCurrent" :alt="props.labelCurrent" class="pointer-events-none" />

      <div class="absolute inset-0" :style="{ clipPath: `inset(0 ${100 - position}% 0 0)` }">
        <ImageSurface class="size-full">
          <ShotImage :src="props.urlBase" :alt="props.labelBase" class="pointer-events-none" />
        </ImageSurface>
      </div>

      <div
        class="bg-primary pointer-events-none absolute inset-y-0 w-px"
        :style="{ left: `${position}%` }"
      >
        <div
          class="bg-primary text-primary-foreground absolute top-1/2 left-1/2 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-md"
        >
          <GripVerticalIcon class="size-4" />
        </div>
      </div>

      <span
        class="bg-background/85 text-foreground pointer-events-none absolute top-2 left-2 rounded-md px-2 py-1 text-xs font-medium tabular-nums"
      >
        {{ props.labelBase }}
      </span>
      <span
        class="bg-background/85 text-foreground pointer-events-none absolute top-2 right-2 rounded-md px-2 py-1 text-xs font-medium tabular-nums"
      >
        {{ props.labelCurrent }}
      </span>
    </ImageSurface>
  </div>
</template>
