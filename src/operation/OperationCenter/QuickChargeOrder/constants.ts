import type { StatusMeta, TableTagType } from '@/utils/tableHelpers'

export const QUICK_CHARGE_STATUS_MAP: Record<number, StatusMeta> = {
  1: { label: '进行中', type: 'primary' },
  2: { label: '已完成', type: 'success' },
  3: { label: '已取消', type: 'info' }
}

export const QUICK_CHARGE_ORDER_TYPE_MAP: Record<number, string> = {
  4: '按时间',
  5: '按笔数',
  6: '福利',
  7: '速充订单',
  8: '托管',
  9: '批量下单',
  10: '激活'
}

export const QUICK_CHARGE_ORDER_TYPE_TAG_TYPE: Record<number, TableTagType> = {
  4: 'info',
  5: 'primary',
  6: 'success',
  7: 'danger',
  8: 'warning',
  9: 'warning',
  10: 'primary'
}

export const getQuickChargeOrderTypeText = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(value)) return '未知'
  return QUICK_CHARGE_ORDER_TYPE_MAP[value] || '未知类型'
}

export const getQuickChargeOrderTypeTagType = (value?: number): TableTagType => {
  if (value === undefined || value === null || Number.isNaN(value)) return 'info'
  return QUICK_CHARGE_ORDER_TYPE_TAG_TYPE[value] || 'info'
}
