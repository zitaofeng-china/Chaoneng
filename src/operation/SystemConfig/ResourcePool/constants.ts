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

export const RESOURCE_POOL_STATUS_MAP: Record<number, string> = {
  1: '启用',
  2: '禁用',
  3: '备用'
}

export const RESOURCE_POOL_STATUS_OPTIONS = Object.entries(RESOURCE_POOL_STATUS_MAP).map(
  ([value, label]) => ({
    label,
    value: Number(value)
  })
)

const THRESHOLD_POOL_KINDS = [3, 4]
const RECEIVE_POOL_KINDS = [6, 7]

export const isThresholdPoolKind = (kind: number) => THRESHOLD_POOL_KINDS.includes(kind)

export const isReceivePoolKind = (kind: number) => RECEIVE_POOL_KINDS.includes(kind)
