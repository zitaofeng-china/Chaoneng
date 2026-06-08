export interface QuickChargeOrder {
  id: string
  bot_user_name: string
  agent_name: string
  send_address: string
  receive_address: string
  type: string
  order_type_label: string
  amount: string
  unit_price: string
  start_time: string
  end_time: string
  duration: string
  status: number
  remark: string
  bot_id?: string | number
  bot_name?: string
  tg_user_name?: string
  energy_num?: string
  used_txid?: string
  delegated_txid?: string
  recycled_txid?: string
}

export interface QuickChargeSearchParams extends Recordable {
  keyword?: string
  type?: string
  status?: number | string
  bot_user_name?: string
  current_page?: number
  page_size?: number
}

export interface QuickChargeOrderSummary {
  order_id: string
  gift_bandwidth: boolean
  active_count: number
  energy_count: number
  used_count: number
}

export interface QuickChargeResource {
  id: number
  amount: string | number
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

export interface QuickChargeActivation {
  target: string
  actived_txid: string
  actived_at: string
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
  energy_rent_text: string
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
  summary: QuickChargeOrderSummary
  resources: QuickChargeResource[]
  activations: QuickChargeActivation[]
}
