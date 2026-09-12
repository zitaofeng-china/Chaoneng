/**
 * 速充订单列表查询参数
 * GET /v1/order/charge
 */
export interface ChargeOrderListParams {
  bot_id?: number
  current_page?: number
  end_time?: number | string
  energy_address?: string
  keyword?: string
  kind?: number | number[]
  order?: string
  order_id?: string
  origin?: number
  page_size?: number
  pay_method?: number
  receive_address?: string
  start_time?: number | string
  status?: number
}

/**
 * 速充订单列表项
 */
export interface ChargeOrderListItem {
  id: string
  created_at: number | string
  updated_at: number | string
  paid_at: number | string | null
  kind: number
  status: number
  user_id: number
  agent_id: number
  bot_id: number
  amount: string | number
  fee?: string | number
  coin: string
  receive_address: string
  pay_id: string
  payment_address?: string
  cost?: string | number
  describe: string
  agent_name: string
  bot_name: string
  bot_user_name?: string
  tg_user_name: string
  tg_first_name: string
  energy_address: string
  energy_amount: string | number
  energy_count: number
  energy_actual_amount: string | number
  expirated_at: number | string | null
  delegated_at: number | string | null
  recycled_at: number | string | null
  username?: string
  email?: string
  origin?: number
}

export interface ChargeOrderPager {
  current_page: number
  page_size: number
  total: number
}

export interface ChargeOrderListResponse {
  list: ChargeOrderListItem[]
  pager: ChargeOrderPager
}
