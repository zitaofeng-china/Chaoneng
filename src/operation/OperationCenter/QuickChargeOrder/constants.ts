import {
  createStatusOptions,
  withAllOption,
  type StatusMeta,
  type TableTagType
} from '@/utils/tableHelpers'

export const QUICK_CHARGE_RESOURCE_TYPE_OPTIONS = withAllOption([
  { label: '速充能量', value: 15 },
  { label: '托管速充', value: 21 }
])

export const QUICK_CHARGE_STATUS_MAP: Record<number, StatusMeta> = {
  1: { label: '成功', type: 'success' },
  2: { label: '失败', type: 'danger' }
}

export const QUICK_CHARGE_STATUS_OPTIONS = createStatusOptions(QUICK_CHARGE_STATUS_MAP)

export const QUICK_CHARGE_ORDER_TYPE_MAP: Record<number, string> = {
  4: '按时间',
  5: '按笔数',
  6: '福利',
  7: '速充订单',
  8: '即用能量',
  9: '批量下单',
  10: '激活',
  15: '速充能量',
  20: '托管',
  21: '托管速充'
}

export const QUICK_CHARGE_ORDER_TYPE_TAG_TYPE: Record<number, TableTagType> = {
  4: 'info',
  5: 'primary',
  6: 'success',
  7: 'danger',
  8: 'warning',
  9: 'warning',
  10: 'primary',
  15: 'warning',
  20: 'warning',
  21: 'primary'
}

export const getQuickChargeOrderTypeText = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(value)) return '未知'
  return QUICK_CHARGE_ORDER_TYPE_MAP[value] || '未知类型'
}

export const getQuickChargeOrderTypeTagType = (value?: number): TableTagType => {
  if (value === undefined || value === null || Number.isNaN(value)) return 'info'
  return QUICK_CHARGE_ORDER_TYPE_TAG_TYPE[value] || 'info'
}
