<script setup lang="ts">
import { computed } from 'vue'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDateTime } from '@/lib/gallery'
import type { BuildSummary } from '@/lib/types'

const NONE = '__none__'

const props = withDefaults(
  defineProps<{
    modelValue: string | null
    builds: BuildSummary[]
    /** 「比較しない」を選べるようにする。 */
    allowNone?: boolean
    noneLabel?: string
    label: string
  }>(),
  { allowNone: false, noneLabel: '比較しない' },
)

const emit = defineEmits<{ select: [string | null] }>()

const selected = computed(() => props.builds.find((build) => build.id === props.modelValue) ?? null)

const model = computed({
  get: () => props.modelValue ?? NONE,
  set: (value: string) => emit('select', value === NONE ? null : value),
})
</script>

<template>
  <Select v-model="model" :disabled="props.builds.length === 0">
    <SelectTrigger :aria-label="props.label" class="min-w-[9.5rem]">
      <SelectValue>
        <span v-if="selected" class="flex items-baseline gap-1.5">
          <span class="font-medium tabular-nums">#{{ selected.id }}</span>
          <span class="text-muted-foreground text-xs tabular-nums">
            {{ selected.entryCount }}枚
          </span>
        </span>
        <span v-else class="text-muted-foreground">{{ props.noneLabel }}</span>
      </SelectValue>
    </SelectTrigger>

    <SelectContent align="start" class="min-w-[16rem]">
      <SelectGroup v-if="props.allowNone">
        <SelectItem :value="NONE">
          <span class="text-muted-foreground">{{ props.noneLabel }}</span>
        </SelectItem>
      </SelectGroup>
      <SelectSeparator v-if="props.allowNone" />

      <SelectGroup>
        <SelectItem v-for="build in props.builds" :key="build.id" :value="build.id">
          <span class="flex w-full items-baseline gap-2">
            <span class="font-medium tabular-nums">#{{ build.id }}</span>
            <span class="text-muted-foreground text-xs tabular-nums">
              {{ formatDateTime(build.createdAt) }}
            </span>
            <span class="text-muted-foreground ml-auto text-xs tabular-nums">
              {{ build.entryCount }}枚<template v-if="build.errorCount">
                / {{ build.errorCount }}エラー</template>
            </span>
          </span>
        </SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
</template>
