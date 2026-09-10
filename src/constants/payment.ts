import { withAllOption } from '@/utils/tableHelpers'

/** 订单支付类型筛选项 */
export const PAYMENT_TYPE_OPTIONS = withAllOption([
  { label: '转账支付', value: 2 },
  { label: '余额支付', value: 1 }
])

/** 能量订单支付方式筛选 */
export const ENERGY_PAYMENT_METHOD_OPTIONS = withAllOption([
  { label: '余额支付', value: 1 },
  { label: '钱包支付', value: 2 }
])
