// ========== 代理端速充订单类型定义 ==========

export interface QuickChargePager {
  current_page: number
  page_size: number
  total: number
}

export interface QuickChargeOrderListParams {
  current_page?: number
  end_time?: string
  energy_address?: string
  keyword?: string
  kind?: number | number[]
  order_id?: string
  order?: string
  page_size?: number
  receive_address?: string
  start_time?: string
  status?: number
  origin?: number
  bot_id?: number
}

export interface QuickChargeOrderListItem {
  id: string
  created_at: number
  updated_at: number
  paid_at: number | null
  kind: number
  status: number
  user_id: number
  agent_id: number
  bot_id: number
  amount: string
  fee?: string | number
  coin: string
  receive_address: string
  pay_id: string
  payment_address?: string
  cost: string
  describe: string
  agent_name: string
  bot_name: string
  bot_user_name?: string
  tg_user_name: string
  tg_first_name: string
  energy_address: string
  energy_amount: string
  energy_count: number
  energy_actual_amount: string
  expirated_at: string | null
  delegated_at: string | null
  recycled_at: string | null
  username?: string
  email?: string
  origin?: number
}

export interface QuickChargeOrderListResponse {
  list: QuickChargeOrderListItem[]
  pager: QuickChargePager
}

export interface QuickChargeOrderSummary {
  order_id: string
  gift_bandwidth: boolean
  active_count: number
  energy_count: number
  used_count: number
}

export interface QuickChargeOrderResource {
  id: number
  created_at: string
  updated_at: string
  order_id: string
  amount: number
  target: string
  code: number
  source: string
  balance: number
  expirated_at: string
  used_txid: string
  delegated_txid: string
  delegated_at: string
  recycled_txid: string
  recycled_at: string
}

export interface QuickChargeOrderActivation {
  id: number
  order_id: string
  target: string
  actived_at: string
  actived_txid: string
  created_at: string
  updated_at: string
}

export interface QuickChargeOrderExchange {
  order_id: string
  in_coin: string
  in_amount: number
  in_address: string
  out_coin: string
  out_amount: number
  out_address: string
  out_at: string
  out_txid: string
  actual_rate: number
  real_rate: number
  agent_profit: number
  plate_profit: number
}

export interface QuickChargeOrderTransaction {
  id: string
  from: string
  to: string
  amount: number
  coin: string
  time: string
  height: number
  handled: boolean
}

export interface QuickChargeOrderDetailResponse {
  id: string
  created_at: string
  updated_at: string
  paid_at: string
  kind: number
  status: number
  user_id: number
  agent_id: number
  bot_id: number
  amount: number
  coin: string
  receive_address: string
  pay_id: string
  cost: number
  describe: string
  agent_name: string
  bot_first_name: string
  bot_user_name: string
  tg_user_name: string
  tg_first_name: string
  summary: QuickChargeOrderSummary
  resources: QuickChargeOrderResource[]
  activations?: QuickChargeOrderActivation[]
  exchange?: QuickChargeOrderExchange
  deliver_transaction?: QuickChargeOrderTransaction
  pay_transaction?: QuickChargeOrderTransaction
  /** 速充扩展；status 已删除，统一用外层 status；before_used 可能为 null */
  fast_charge?: {
    before_used?: number | null
  } | null
}
