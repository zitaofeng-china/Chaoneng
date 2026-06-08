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

interface ResourcePoolStatusMeta {
  label: string
  className: string
}

export const RESOURCE_POOL_STATUS_META_MAP: Record<number, ResourcePoolStatusMeta> = {
  1: { label: '启用', className: 'text-green-300 font-bold' },
  2: { label: '禁用', className: 'text-red-300 font-bold' },
  3: { label: '备用', className: 'text-orange-300 font-bold' }
}

export const RESOURCE_POOL_STATUS_MAP = Object.entries(RESOURCE_POOL_STATUS_META_MAP).reduce(
  (map, [value, meta]) => {
    map[Number(value)] = meta.label
    return map
  },
  {} as Record<number, string>
)

export const RESOURCE_POOL_STATUS_OPTIONS = Object.entries(RESOURCE_POOL_STATUS_META_MAP).map(
  ([value, meta]) => ({
    label: meta.label,
    value: Number(value)
  })
)

export const getResourcePoolStatusLabel = (status: number) => {
  return RESOURCE_POOL_STATUS_META_MAP[status]?.label || '未知状态'
}

export const getResourcePoolStatusClassName = (status: number) => {
  return RESOURCE_POOL_STATUS_META_MAP[status]?.className || 'text-gray-400 font-bold'
}

const THRESHOLD_POOL_KINDS = [3, 4]
const RECEIVE_POOL_KINDS = [6, 7]

export const isThresholdPoolKind = (kind: number) => THRESHOLD_POOL_KINDS.includes(kind)

export const isReceivePoolKind = (kind: number) => RECEIVE_POOL_KINDS.includes(kind)
