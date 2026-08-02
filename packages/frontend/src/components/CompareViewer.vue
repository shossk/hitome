<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useIntervalFn } from '@vueuse/core'
import { PauseIcon, PlayIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import ImageSurface from '@/components/ImageSurface.vue'
import ShotImage from '@/components/ShotImage.vue'
import SliderCompare from '@/components/SliderCompare.vue'
import DiffCanvas from '@/components/DiffCanvas.vue'
import type { DiffResult } from '@/lib/imageDiff'
import type { CompareMode } from '@/stores/viewer'

const props = defineProps<{
  mode: CompareMode
  urlBase: string | null
  urlCurrent: string | null
  labelBase: string
  labelCurrent: string
  threshold: number
}>()

const emit = defineEmits<{ result: [DiffResult | null] }>()

const splitPosition = ref(50)
const splitModel = computed({
  get: () => [splitPosition.value],
  set: (value: number[] | undefined) => {
    if (value?.length) splitPosition.value = value[0]
  },
})

const BLINK_INTERVAL = 700
const showingBase = ref(false)
const blinking = ref(true)
const { pause, resume } = useIntervalFn(
  () => {
    showingBase.value = !showingBase.value
  },
  BLINK_INTERVAL,
  { immediate: false },
)

watch(
  [() => props.mode, blinking],
  ([mode, isBlinking]) => {
    if (mode === 'blink' && isBlinking) resume()
    else pause()
    if (mode !== 'blink') showingBase.value = false
  },
  { immediate: true },
)

const blinkUrl = computed(() => (showingBase.value ? props.urlBase : props.urlCurrent))
const blinkLabel = computed(() => (showingBase.value ? props.labelBase : props.labelCurrent))
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- 並べて -->
    <div v-if="props.mode === 'side'" class="grid grid-cols-2 gap-3">
      <figure class="flex flex-col gap-1.5">
        <figcaption class="text-muted-foreground text-xs font-medium tabular-nums">
          {{ props.labelBase }}
        </figcaption>
        <ImageSurface class="mx-auto aspect-square w-full max-w-[min(100%,52svh)] rounded-lg border">
          <ShotImage :src="props.urlBase" :alt="props.labelBase" fallback-label="このビルドには無し" />
        </ImageSurface>
      </figure>
      <figure class="flex flex-col gap-1.5">
        <figcaption class="text-muted-foreground text-xs font-medium tabular-nums">
          {{ props.labelCurrent }}
        </figcaption>
        <ImageSurface class="mx-auto aspect-square w-full max-w-[min(100%,52svh)] rounded-lg border">
          <ShotImage
            :src="props.urlCurrent"
            :alt="props.labelCurrent"
            fallback-label="このビルドには無し"
          />
        </ImageSurface>
      </figure>
    </div>

    <!-- スライダー -->
    <div v-else-if="props.mode === 'slider'" class="flex flex-col gap-3">
      <SliderCompare
        v-model:position="splitPosition"
        :url-base="props.urlBase"
        :url-current="props.urlCurrent"
        :label-base="props.labelBase"
        :label-current="props.labelCurrent"
        class="mx-auto aspect-square w-full max-w-[min(100%,58svh)] rounded-lg border"
      />
      <Slider
        v-model="splitModel"
        :min="0"
        :max="100"
        :step="0.5"
        aria-label="比較位置"
        class="mx-auto max-w-[min(100%,58svh)] px-1"
      />
    </div>

    <!-- 差分 -->
    <ImageSurface
      v-else-if="props.mode === 'diff'"
      class="mx-auto aspect-square w-full max-w-[min(100%,58svh)] rounded-lg border"
    >
      <DiffCanvas
        :url-base="props.urlBase"
        :url-current="props.urlCurrent"
        :threshold="props.threshold"
        @result="emit('result', $event)"
      />
    </ImageSurface>

    <!-- 点滅 -->
    <div v-else class="flex flex-col gap-3">
      <ImageSurface class="mx-auto aspect-square w-full max-w-[min(100%,58svh)] rounded-lg border">
        <ShotImage :src="blinkUrl" :alt="blinkLabel" />
        <span
          class="bg-background/85 text-foreground absolute top-2 left-2 rounded-md px-2 py-1 text-xs font-medium tabular-nums"
        >
          {{ blinkLabel }}
        </span>
      </ImageSurface>
      <div class="flex items-center justify-center gap-2">
        <Button variant="outline" size="sm" @click="blinking = !blinking">
          <component :is="blinking ? PauseIcon : PlayIcon" data-icon="inline-start" />
          {{ blinking ? '停止' : '再生' }}
        </Button>
        <Button variant="ghost" size="sm" @click="showingBase = !showingBase">
          手動で切り替え
        </Button>
      </div>
    </div>
  </div>
</template>
