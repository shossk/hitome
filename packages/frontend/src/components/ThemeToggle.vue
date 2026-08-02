<script setup lang="ts">
import { useDark, useToggle } from '@vueuse/core'
import { MoonIcon, SunIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const isDark = useDark({ initialValue: 'dark' })
const toggleDark = useToggle(isDark)
</script>

<template>
  <Tooltip>
    <TooltipTrigger as-child>
      <Button variant="ghost" size="icon-sm" aria-label="テーマを切り替える" @click="toggleDark()">
        <MoonIcon v-if="isDark" />
        <SunIcon v-else />
      </Button>
    </TooltipTrigger>
    <TooltipContent>{{ isDark ? 'ライトテーマにする' : 'ダークテーマにする' }}</TooltipContent>
  </Tooltip>
</template>
