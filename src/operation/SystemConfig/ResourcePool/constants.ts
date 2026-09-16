import { withAllOption } from '@/utils/tableHelpers'

export const RESOURCE_POOL_TYPE_MAP: Record<number, string> = {
  1: 'TRX池子',
  2: 'USDT池子',
  3: '能量池子',
  4: '带宽池子',
  5: '激活池子',
  6: '能量接收池子',
  7: '带宽接收池子',
  8: '财务池子'
}

export const RESOURCE_POOL_TYPE_OPTIONS = Object.entries(RESOURCE_POOL_TYPE_MAP).map(
  ([value, label]) => ({
    label,
    value: Number(value)
  })
)

export const RESOURCE_POOL_TYPE_SEARCH_OPTIONS = withAllOption(RESOURCE_POOL_TYPE_OPTIONS)

interface ResourcePoolStatusMeta {
  label: string
  className: string
}

export const RESOURCE_POOL_STATUS_META_MAP: Record<number, ResourcePoolStatusMeta> = {
  1: { label: '启用', className: 'text-green-300 font-bold' },
  2: { label: '禁用', className: 'text-red-300 font-bold' }
}

export const RESOURCE_POOL_STATUS_MAP: Record<number, string> = {
  1: RESOURCE_POOL_STATUS_META_MAP[1].label,
  2: RESOURCE_POOL_STATUS_META_MAP[2].label
}

export const RESOURCE_POOL_STATUS_OPTIONS = Object.entries(RESOURCE_POOL_STATUS_META_MAP).map(
  ([value, meta]) => ({
    label: meta.label,
    value: Number(value)
  })
)

export const RESOURCE_POOL_STATUS_SEARCH_OPTIONS = withAllOption(RESOURCE_POOL_STATUS_OPTIONS)

export const getResourcePoolStatusLabel = (status: number) => {
  return RESOURCE_POOL_STATUS_META_MAP[status]?.label || '未知状态'
}

export const getResourcePoolStatusClassName = (status: number) => {
  return RESOURCE_POOL_STATUS_META_MAP[status]?.className || 'text-gray-400 font-bold'
}

export const RESOURCE_POOL_ENABLED_STATUS = 1
export const RESOURCE_POOL_DISABLED_STATUS = 2
export const MIN_SAME_KIND_POOLS_TO_DISABLE = 2
export const MIN_SAME_KIND_ENABLED_TO_DISABLE = 2
export const RESOURCE_POOL_DISABLE_LOCK_HINT = '同一类型至少需要两个启用中的池子，才能禁用'

export interface ResourcePoolKindStat {
  total: number
  enabled: number
}

export const buildResourcePoolKindStats = (
  list: Array<{ kind: number; status: number }>
): Record<number, ResourcePoolKindStat> => {
  return list.reduce<Record<number, ResourcePoolKindStat>>((stats, item) => {
    const current = stats[item.kind] ?? { total: 0, enabled: 0 }
    current.total += 1
    if (item.status === RESOURCE_POOL_ENABLED_STATUS) {
      current.enabled += 1
    }
    stats[item.kind] = current
    return stats
  }, {})
}

/** 同类型池子总数、启用数都至少 2 个时，才允许把启用中的池子改为禁用 */
export const canDisableResourcePoolByKind = (
  kind: number,
  stats: Record<number, ResourcePoolKindStat>
) => {
  const kindStats = stats[kind]
  if (!kindStats) return false
  return (
    kindStats.total >= MIN_SAME_KIND_POOLS_TO_DISABLE &&
    kindStats.enabled >= MIN_SAME_KIND_ENABLED_TO_DISABLE
  )
}

export const isResourcePoolDisableLocked = (
  row: { kind: number; status: number },
  stats: Record<number, ResourcePoolKindStat>
) => {
  if (row.status !== RESOURCE_POOL_ENABLED_STATUS) return false
  return !canDisableResourcePoolByKind(row.kind, stats)
}

const THRESHOLD_POOL_KINDS = [3, 4]
const RECEIVE_POOL_KINDS = [6, 7]

export const isThresholdPoolKind = (kind: number) => THRESHOLD_POOL_KINDS.includes(kind)

export const isReceivePoolKind = (kind: number) => RECEIVE_POOL_KINDS.includes(kind)
