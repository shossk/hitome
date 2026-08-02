<script setup lang="ts">
import { computed } from 'vue'
import { SearchIcon, XIcon } from '@lucide/vue'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import AngleTabs from '@/components/AngleTabs.vue'
import { useGalleryStore } from '@/stores/gallery'
import { ALL, useViewerStore } from '@/stores/viewer'
import type { Background, SortKey } from '@/stores/viewer'

const gallery = useGalleryStore()
const viewer = useViewerStore()

const BACKGROUNDS: { value: Background; label: string }[] = [
  { value: 'checker', label: '市松' },
  { value: 'dark', label: '暗' },
  { value: 'light', label: '明' },
]

const backgroundModel = computed({
  get: () => viewer.background as string,
  set: (value: string | undefined) => {
    if (value) viewer.background = value as Background
  },
})

const sortModel = computed({
  get: () => viewer.sortKey as string,
  set: (value: string) => {
    viewer.sortKey = value as SortKey
  },
})

const thumbModel = computed({
  get: () => [viewer.thumbSize],
  set: (value: number[] | undefined) => {
    if (value?.length) viewer.thumbSize = value[0]
  },
})
</script>

<template>
  <div class="border-b">
    <div
      class="mx-auto flex w-full max-w-[1800px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2"
    >
      <InputGroup class="w-full sm:w-56">
        <InputGroupInput v-model="viewer.search" placeholder="名前・ID で絞り込み" />
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupAddon v-if="viewer.search" align="inline-end">
          <InputGroupButton
            variant="ghost"
            size="icon-xs"
            aria-label="検索をクリア"
            @click="viewer.search = ''"
          >
            <XIcon />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>

      <Field orientation="horizontal" class="w-auto gap-1.5">
        <FieldLabel for="filter-weapon" class="text-muted-foreground text-xs">武器</FieldLabel>
        <Select v-model="viewer.weapon">
          <SelectTrigger id="filter-weapon" size="sm" class="min-w-[7rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem :value="ALL">すべて</SelectItem>
              <SelectItem v-for="id in gallery.weaponIds" :key="id" :value="id" class="font-mono">
                {{ id }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      <Field orientation="horizontal" class="w-auto gap-1.5">
        <FieldLabel for="filter-material" class="text-muted-foreground text-xs">素材</FieldLabel>
        <Select v-model="viewer.material">
          <SelectTrigger id="filter-material" size="sm" class="min-w-[7rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem :value="ALL">すべて</SelectItem>
              <SelectItem v-for="id in gallery.materialIds" :key="id" :value="id" class="font-mono">
                {{ id }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      <Field orientation="horizontal" class="w-auto gap-1.5">
        <FieldLabel class="text-muted-foreground text-xs">角度</FieldLabel>
        <AngleTabs size="sm" />
      </Field>

      <Field v-if="gallery.isComparing" orientation="horizontal" class="w-auto gap-2">
        <Switch id="only-changed" v-model="viewer.onlyChanged" size="sm" />
        <FieldLabel for="only-changed" class="text-xs">差分ありのみ</FieldLabel>
      </Field>

      <Field v-if="gallery.isComparing" orientation="horizontal" class="w-auto gap-1.5">
        <FieldLabel for="filter-sort" class="text-muted-foreground text-xs">並び</FieldLabel>
        <Select v-model="sortModel">
          <SelectTrigger id="filter-sort" size="sm" class="min-w-[8.5rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="name">名前順</SelectItem>
              <SelectItem value="diff">差分の大きい順</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      <Field orientation="horizontal" class="ml-auto w-auto gap-1.5">
        <FieldLabel class="text-muted-foreground text-xs">背景</FieldLabel>
        <ToggleGroup v-model="backgroundModel" type="single" variant="outline" size="sm">
          <ToggleGroupItem
            v-for="background in BACKGROUNDS"
            :key="background.value"
            :value="background.value"
          >
            {{ background.label }}
          </ToggleGroupItem>
        </ToggleGroup>
      </Field>

      <Field orientation="horizontal" class="w-auto gap-2">
        <FieldLabel class="text-muted-foreground text-xs">サイズ</FieldLabel>
        <Slider
          v-model="thumbModel"
          :min="120"
          :max="360"
          :step="20"
          class="w-24"
          aria-label="サムネイルの大きさ"
        />
      </Field>
    </div>
  </div>
</template>
