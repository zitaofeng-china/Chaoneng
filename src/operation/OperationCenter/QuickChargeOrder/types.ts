export interface QuickChargeOrder {
  id: string
  bot_user_name: string
  agent_name: string
  receive_address: string
  type: string | number
  order_type_label: string
  amount: string
  unit_price: string
  start_time: string
  end_time: string
  status: number
  remark: string
  bot_id?: string | number
  bot_name?: string
  tg_user_name?: string
  energy_num?: string
  used_txid?: string
  delegated_txid?: string
  recycled_txid?: string
  kind?: number
}

export interface QuickChargeSearchParams extends Recordable {
  keyword?: string
  type?: number | string
  status?: number | string
  bot_id?: number | string
  current_page?: number
  page_size?: number
  order?: string
}

export type {
  QuickChargeActivation,
  QuickChargeOrderDetail,
  QuickChargeOrderSummary,
  QuickChargeResource
} from '@/components/QuickChargeOrderDetail/types'
