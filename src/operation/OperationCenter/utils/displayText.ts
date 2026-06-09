import { h } from 'vue'

export const renderNullableText = (value?: string | number | null, fallback = '-') => {
  return h('span', value === undefined || value === null || value === '' ? fallback : String(value))
}
