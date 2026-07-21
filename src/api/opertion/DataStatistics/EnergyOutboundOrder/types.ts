export interface EnergyOutboundOrderPager {
  current_page: number
  page_size: number
  total: number
}

export interface EnergyOutboundOrderListParams {
  current_page?: number
  page_size?: number
  keyword?: string
  txid?: string
  start_time?: string
  end_time?: string
  order?: string
  order_id?: number
  /** 结算状态：1=成功，2=失败 */
  status?: number
}

export interface EnergyOutboundOrderItem {
  id?: number
  order_id?: number
  agent_name?: string
  bot_name?: string
  period?: string
  settlement_period?: string
  kind?: number
  amount?: number | string
  price?: number | string
  duration?: number | string
  profit?: number | string
  expense?: number | string
  status?: number
  txid?: string
  created_at?: number | string
  describe?: string
  remark?: string
}

export interface EnergyOutboundOrderSummary {
  count?: number | string
  total_count?: number | string
  settlement_count?: number | string
  expense?: number | string
  expense_sum?: number | string
  profit_sum?: number | string
  trx_sum?: number | string
  amount?: number | string
  amount_sum?: number | string
  energy_sum?: number | string
}

export interface EnergyOutboundOrderStats {
  sum_profit?: number | string
  sum_energy?: number | string
  sum_bandwidth?: number | string
}

export interface EnergyOutboundOrderDetail {
  id: number
  created_at: number | string
  updated_at: number | string
  user_id: number
  bot_id: number
  bot_name: string
  agent_name: string
  status: number
  kind: number
  source: string
  target: string
  receiver: string
  balance: number | string
  amount: number | string
  paid_at: number | string
  recycled_at: number | string | null
  settled_at: number | string
  profit_sum: number | string
  describe: string
}

export interface EnergyOutboundOrderListResponse {
  list: EnergyOutboundOrderItem[]
  pager: EnergyOutboundOrderPager
  summary?: EnergyOutboundOrderSummary
  stats?: EnergyOutboundOrderStats
}
