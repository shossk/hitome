<script setup lang="ts">
import { ref, watch } from 'vue'
import { ImageOffIcon } from '@lucide/vue'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

/** 撮影画像 1 枚。読み込み中は Skeleton、未撮影・失敗はプレースホルダを出す。 */
const props = withDefaults(
  defineProps<{
    src: string | null
    alt: string
    class?: HTMLAttributes['class']
    /** 未撮影のときに出す文言。 */
    fallbackLabel?: string
  }>(),
  { fallbackLabel: 'この角度は未撮影' },
)

const loaded = ref(false)
const failed = ref(false)

watch(
  () => props.src,
  () => {
    loaded.value = false
    failed.value = false
  },
)
</script>

<template>
  <div class="relative size-full">
    <template v-if="props.src && !failed">
      <Skeleton v-if="!loaded" class="absolute inset-0 rounded-none" />
      <img
        :src="props.src"
        :alt="props.alt"
        loading="lazy"
        decoding="async"
        :class="
          cn(
            'size-full object-contain transition-opacity duration-200',
            loaded ? 'opacity-100' : 'opacity-0',
            props.class,
          )
        "
        @load="loaded = true"
        @error="failed = true"
      />
    </template>
    <div
      v-else
      class="text-muted-foreground/70 absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-xs"
    >
      <ImageOffIcon class="size-5" />
      <span>{{ failed ? '読み込みに失敗しました' : props.fallbackLabel }}</span>
    </div>
  </div>
</template>
