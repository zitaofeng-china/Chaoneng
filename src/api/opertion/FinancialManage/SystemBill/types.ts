/**
 * 系统账单（链上出入记录）类型定义
 * 接口：GET /v1/bill/system
 */

export interface SystemBillPager {
  current_page: number
  page_size: number
  total: number
}

export interface SystemBillListParams {
  agent_id?: number
  bot_id?: number
  coin?: 'TRX' | 'USDT' | string
  current_page?: number
  end_time?: string
  flow?: 1 | 2 | number
  keyword?: string
  kinds?: number[] // 交易类型：1-代理充值，2-用户充值，3-闪兑，4-时间能量，5-笔数能量，6-福利能量，81-补充资源，82-资源收购
  order?: string
  order_id?: string
  page_size?: number
  price_id?: number
  start_time?: string
  user_id?: number
}

export interface SystemBillItem extends Recordable {
  agent_id: number
  amount: number | string
  coin: string
  created_at: number | string
  describe?: string
  flow: number
  from: string
  id: string
  kind: number // 交易类型：1-代理充值，2-用户充值，3-闪兑，4-时间能量，5-笔数能量，6-福利能量，81-补充资源，82-资源收购
  order_id: string
  price_id?: number
  status: number
  to: string
}

export interface SystemBillSummary extends Recordable {
  count?: number
  today_count?: number
  today_transaction_count?: number
  total_out_u?: number | string
  total_out_t?: number | string
  total_in_u?: number | string
  total_in_t?: number | string
}

export interface SystemBillListResponse extends Recordable {
  list: SystemBillItem[]
  pager: SystemBillPager
  summary?: SystemBillSummary
}
