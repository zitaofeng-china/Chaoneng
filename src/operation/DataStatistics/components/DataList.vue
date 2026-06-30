<template>
  <div class="data-list">
    <div v-for="(item, idx) in sortedData" :key="item.name" class="data-list-row">
      <span class="data-list-rank">{{ idx + 1 }}</span>
      <el-tooltip
        v-if="item.tip"
        :content="item.tip"
        placement="top"
        effect="light"
        :popper-class="tooltipPopperClass"
      >
        <span class="data-list-help"><Icon icon="ep:question-filled" :size="13" /></span>
      </el-tooltip>
      <span v-else class="data-list-dot" :style="{ background: colorAt(idx) }"></span>
      <span class="data-list-name">{{ item.name }}</span>
      <div class="data-list-bar">
        <div
          class="data-list-bar-inner"
          :style="{ width: barWidth(item.value), background: colorAt(idx) }"
        ></div>
      </div>
      <span class="data-list-value">
        {{ formatValue(item.value)
        }}<span v-if="unitOf(item)" class="data-list-unit">{{ unitOf(item) }}</span>
        <span v-if="item.count !== undefined" class="data-list-count">{{ item.count }} 笔</span>
      </span>
      <span v-if="showPercent" class="data-list-percent">{{ percent(item.value) }}%</span>
    </div>

    <div v-if="showPercent && total > 0" class="data-list-total">
      <span>合计</span>
      <span class="data-list-total-value">{{ formatValue(total) }} {{ unit }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@/components/Icon'

interface DataItem {
  name: string
  value: number
  unit?: string
  count?: number
  tip?: string
}

const props = withDefaults(
  defineProps<{
    data: DataItem[]
    total?: number
    unit?: string
    showPercent?: boolean
    tooltipPopperClass?: string
  }>(),
  {
    total: 0,
    unit: '',
    showPercent: true,
    tooltipPopperClass: 'data-list-help-popper'
  }
)

const palette = ['#1E40AF', '#3B82F6', '#22C55E', '#E6A23C', '#9333EA', '#14B8A6', '#F56C6C']

const sortedData = computed(() => [...props.data].sort((a, b) => b.value - a.value))

const maxValue = computed(() => Math.max(...props.data.map((d) => d.value), 1))

const colorAt = (idx: number) => palette[idx % palette.length]

// 优先用每项自带的 unit，否则用全局 unit
const unitOf = (item: DataItem) => (item.unit !== undefined ? item.unit : props.unit)

const barWidth = (v: number) => `${Math.max((v / maxValue.value) * 100, 2)}%`

const percent = (v: number) => {
  if (!props.total) return '0.0'
  return ((v / props.total) * 100).toFixed(1)
}

const formatValue = (v: number) => {
  return Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 })
}
</script>

<style scoped>
.data-list {
  display: flex;
  flex-direction: column;
  height: 300px;
  padding: 4px 4px 8px;
  overflow-y: auto;
}

.data-list-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 4px;
  border-bottom: 1px solid #f5f5f5;
}

.data-list-rank {
  width: 18px;
  font-size: 11px;
  color: #c0c4cc;
  text-align: center;
}

.data-list-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.data-list-help {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 8px;
  height: 16px;
  color: #25a8ff;
  cursor: help;
}

.data-list-name {
  flex-shrink: 0;
  width: 84px;
  overflow: hidden;
  font-size: 12px;
  color: #606266;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.data-list-bar {
  flex: 1;
  height: 6px;
  overflow: hidden;
  background: #f0f2f5;
  border-radius: 3px;
}

.data-list-bar-inner {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}

.data-list-value {
  font-feature-settings: 'tnum';
  flex-shrink: 0;
  min-width: 70px;
  font-size: 12px;
  font-weight: 600;
  color: #303133;
  text-align: right;
}

.data-list-unit {
  margin-left: 2px;
  font-size: 11px;
  font-weight: 400;
  color: #909399;
}

.data-list-count {
  margin-left: 6px;
  font-size: 11px;
  font-weight: 400;
  color: #f56c6c;
}

.data-list-percent {
  flex-shrink: 0;
  min-width: 46px;
  font-size: 11px;
  color: #909399;
  text-align: right;
}

.data-list-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 4px 2px;
  margin-top: auto;
  font-size: 12px;
  color: #909399;
  border-top: 1px solid #ebeef5;
}

.data-list-total-value {
  font-feature-settings: 'tnum';
  font-size: 13px;
  font-weight: 600;
  color: #1e40af;
}

:global(.data-list-help-popper) {
  max-width: 520px;
  padding: 12px 14px;
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-line;
}
</style>
