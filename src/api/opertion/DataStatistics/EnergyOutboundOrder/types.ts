export interface EnergyOutboundOrderPager {
  current_page: number
  page_size: number
  total: number
}

export interface EnergyOutboundOrderListParams {
  current_page?: number
  page_size?: number
  keyword?: string
  start_time?: string
  end_time?: string
  order?: string
  status?: number
}

export interface EnergyOutboundOrderItem {
  id?: number
  order_id?: number
  agent_name?: string
  bot_name?: string
  period?: string
  settlement_period?: string
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

export interface EnergyOutboundOrderListResponse {
  list: EnergyOutboundOrderItem[]
  pager: EnergyOutboundOrderPager
  summary?: EnergyOutboundOrderSummary
}
