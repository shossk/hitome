<script setup lang="ts">
import { ref, shallowRef, watch } from 'vue'
import { TriangleAlertIcon } from '@lucide/vue'
import { Spinner } from '@/components/ui/spinner'
import { renderDiff } from '@/lib/imageDiff'
import type { DiffResult } from '@/lib/imageDiff'

/** 等倍のピクセル差分をキャンバスに描く。変化したところが赤く出る。 */
const props = defineProps<{
  urlBase: string | null
  urlCurrent: string | null
  threshold: number
}>()

const emit = defineEmits<{ result: [DiffResult | null] }>()

const canvas = ref<HTMLCanvasElement | null>(null)
const pending = ref(false)
const error = shallowRef<string | null>(null)

watch(
  [canvas, () => props.urlBase, () => props.urlCurrent, () => props.threshold],
  async ([element, urlBase, urlCurrent, threshold]) => {
    if (!element || !urlBase || !urlCurrent) {
      emit('result', null)
      return
    }
    pending.value = true
    error.value = null
    try {
      emit('result', await renderDiff(element, urlBase, urlCurrent, threshold))
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : String(cause)
      emit('result', null)
    } finally {
      pending.value = false
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="relative size-full">
    <canvas ref="canvas" class="size-full object-contain" />

    <div
      v-if="pending"
      class="bg-background/60 absolute inset-0 flex items-center justify-center backdrop-blur-xs"
    >
      <Spinner class="size-6" />
    </div>

    <div
      v-else-if="error"
      class="text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm"
    >
      <TriangleAlertIcon class="size-5" />
      <span>{{ error }}</span>
    </div>
  </div>
</template>
