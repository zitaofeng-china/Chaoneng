import { h } from 'vue'

export const renderSummaryCountText = (count?: number | string | null, unit = '') => {
  const normalizedCount = count ?? 0
  return h('span', `${normalizedCount} ${unit}`.trim())
}
