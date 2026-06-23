<script setup lang="ts">
import { Icon } from '@/components/Icon'
import { useFullscreen } from '@vueuse/core'
import { propTypes } from '@/utils/propTypes'
import { useDesign } from '@/hooks/web/useDesign'

const { getPrefixCls } = useDesign()

const prefixCls = getPrefixCls('screenfull')

defineProps({
  color: propTypes.string.def(''),
  label: propTypes.string.def('')
})

const { toggle, isFullscreen } = useFullscreen()

const toggleFullscreen = () => {
  toggle()
}
</script>

<template>
  <div :class="prefixCls" class="top-tool-action" @click="toggleFullscreen">
    <Icon
      :size="18"
      :icon="isFullscreen ? 'vi-zmdi:fullscreen-exit' : 'vi-zmdi:fullscreen'"
      :color="color"
    />
    <span v-if="label" class="top-tool-action__label">{{ label }}</span>
  </div>
</template>

<style scoped>
.top-tool-action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.top-tool-action__label {
  font-size: 13px;
  line-height: 18px;
  color: var(--top-header-text-color);
  white-space: nowrap;
}
</style>
