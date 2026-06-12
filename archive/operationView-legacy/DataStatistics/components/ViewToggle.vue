<template>
  <div class="view-toggle">
    <button
      class="view-toggle-btn"
      :class="{ active: modelValue === 'chart' }"
      title="图表视图"
      @click="emit('update:modelValue', 'chart')"
    >
      <Icon icon="ep:pie-chart" :size="14" />
    </button>
    <button
      class="view-toggle-btn"
      :class="{ active: modelValue === 'list' }"
      title="列表视图"
      @click="emit('update:modelValue', 'list')"
    >
      <Icon icon="ep:list" :size="14" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@/components/Icon'

defineProps<{
  modelValue: 'chart' | 'list'
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: 'chart' | 'list'): void
}>()
</script>

<style scoped>
.view-toggle {
  display: inline-flex;
  padding: 2px;
  background: #f0f2f5;
  border-radius: 6px;
}

.view-toggle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 22px;
  color: #909399;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 4px;
  transition: all 0.2s;
}

.view-toggle-btn:hover {
  color: #606266;
}

.view-toggle-btn.active {
  color: #1e40af;
  background: #fff;
  box-shadow: 0 1px 3px rgb(0 0 0 / 12%);
}
</style>
