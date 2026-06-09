import { createStatusOptions, withAllOption, type StatusMeta } from '@/utils/tableHelpers'

export const RESOURCE_SUPPLEMENT_KIND_OPTIONS = [
  { label: '能量', value: '能量' },
  { label: '带宽', value: '带宽' }
]

export const RESOURCE_SUPPLEMENT_KIND_SEARCH_OPTIONS = withAllOption(
  RESOURCE_SUPPLEMENT_KIND_OPTIONS
)

export const RESOURCE_SUPPLEMENT_SOURCE_OPTIONS = [
  { label: '能量收购池 能量', value: '能量收购池 能量' },
  { label: '带宽收购池 带宽', value: '带宽收购池 带宽' },
  { label: 'https://justlend.org 能量', value: 'https://justlend.org 能量' },
  { label: 'https://feee.io 带宽', value: 'https://feee.io 带宽' },
  { label: 'https://trxfee.io 带宽', value: 'https://trxfee.io 带宽' }
]

export const RESOURCE_SUPPLEMENT_SOURCE_SEARCH_OPTIONS = withAllOption(
  RESOURCE_SUPPLEMENT_SOURCE_OPTIONS
)

export const RESOURCE_SUPPLEMENT_TASK_STATUS_MAP: Record<number, StatusMeta> = {
  1: { label: '启动', type: 'success' },
  2: { label: '关闭', type: 'danger' }
}

export const RESOURCE_SUPPLEMENT_TASK_STATUS_OPTIONS = createStatusOptions(
  RESOURCE_SUPPLEMENT_TASK_STATUS_MAP
)

export const RESOURCE_SUPPLEMENT_STATUS_MAP: Record<number, StatusMeta> = {
  1: { label: '成功', type: 'success' },
  2: { label: '失败', type: 'danger' }
}

export const RESOURCE_SUPPLEMENT_STATUS_OPTIONS = createStatusOptions(
  RESOURCE_SUPPLEMENT_STATUS_MAP
)

export const RESOURCE_ORDER_STATUS_MAP: Record<number, StatusMeta> = {
  1: { label: '新订单', type: 'info' },
  2: { label: '已支付', type: 'warning' },
  5: { label: '已完成', type: 'success' },
  8: { label: '已取消', type: 'danger' }
}

export const RESOURCE_ORDER_KIND_MAP: Record<number, string> = {
  6: '能量接收池子',
  7: '带宽接收池子'
}

export const RESOURCE_ORDER_KIND_OPTIONS = Object.entries(RESOURCE_ORDER_KIND_MAP).map(
  ([value, label]) => ({
    label,
    value: Number(value)
  })
)

export const RESOURCE_ORDER_KIND_SEARCH_OPTIONS = withAllOption(RESOURCE_ORDER_KIND_OPTIONS)

export const RESOURCE_ORDER_STATUS_OPTIONS = createStatusOptions(RESOURCE_ORDER_STATUS_MAP, '')
