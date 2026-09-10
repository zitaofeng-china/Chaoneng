export interface QuickChargeOrderSummary {
  order_id: string
  gift_bandwidth: boolean
  active_count: number
  energy_count: number
  used_count: number
}

/** 速充扩展；status 已删除，统一用外层 order.status */
export interface OrderFastCharge {
  /** 使用前数量，可能为 null */
  before_used?: number | null
}

export interface QuickChargeResource {
  id: number
  amount: string | number
  target: string
  code: number
  source: string
  balance: number
  expirated_at: string | number | null
  used_txid: string
  delegated_txid: string
  delegated_at: string | number | null
  recycled_txid: string
  recycled_at: string | number | null
}

export interface QuickChargeActivation {
  target: string
  actived_txid: string
  actived_at: string | number | null
}

export interface QuickChargeOrderDetail extends Recordable {
  id: string
  order_num: string
  tg_name: string
  bot_id: string | number
  bot_name: string
  username: string
  order_type: number
  order_amount: string
  pay_unit: string
  energy_num: string
  receive_address: string
  energy_address: string
  status: number
  recycle_time: number
  create_time: number
  finish_time: number
  pay_time: number
  stop_time: null
  stroke_num: number
  txid: string
  from_address: string
  recycle_txid: string
  used_txid: string
  flash_price: string
  kind?: number
  /** 使用前数量，来自 fast_charge.before_used，null 时展示为 - */
  before_used?: number | null
  summary: QuickChargeOrderSummary
  resources: QuickChargeResource[]
  activations: QuickChargeActivation[]
}

export interface QuickChargeOrderDetailSource {
  id: string
  tg_first_name?: string | null
  tg_user_name?: string | null
  bot_id?: string | number | null
  bot_user_name?: string | null
  bot_first_name?: string | null
  agent_name?: string | null
  kind: number
  amount?: string | number | null
  coin?: string | null
  receive_address?: string | null
  status: number
  fast_charge?: OrderFastCharge | null
  created_at?: string | number | null
  updated_at?: string | number | null
  paid_at?: string | number | null
  summary?: QuickChargeOrderSummary | null
  resources?: QuickChargeResource[]
  activations?: QuickChargeActivation[]
}

export interface QuickChargeOrderDetailResponse {
  data?: QuickChargeOrderDetailSource
}

export type FetchQuickChargeOrderDetail = (
  id: string
) => Promise<QuickChargeOrderDetailResponse | null | undefined>
