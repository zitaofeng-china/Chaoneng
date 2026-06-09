import { createStatusOptions, withAllOption, type StatusMeta } from '@/utils/tableHelpers'

export const EXCHANGE_COIN_OPTIONS = withAllOption([
  { label: 'USDT → TRX', value: 'USDT' },
  { label: 'TRX → USDT', value: 'TRX' }
])

export const EXCHANGE_STATUS_MAP: Record<number, StatusMeta> = {
  1: { label: '待支付', type: 'info' },
  2: { label: '已支付', type: 'warning' },
  3: { label: '处理中', type: 'info' },
  4: { label: '待确认', type: 'warning' },
  5: { label: '已完成', type: 'success' },
  6: { label: '已失败', type: 'danger' },
  7: { label: '退款中', type: 'info' },
  8: { label: '已取消', type: 'warning' },
  9: { label: '已中止', type: 'danger' }
}

export const EXCHANGE_STATUS_OPTIONS = createStatusOptions(EXCHANGE_STATUS_MAP, '')
