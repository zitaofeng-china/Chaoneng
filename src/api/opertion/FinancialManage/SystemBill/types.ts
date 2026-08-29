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
  current_page?: number
  end_time?: string
  flow?: 1 | 2 | number
  keyword?: string
  kinds?: number[] // 交易类型：1-代理充值，2-用户充值，3-闪兑，4-时间能量，5-笔数能量，6-福利能量，81-补充资源，82-资源收购
  order?: string
  order_id?: string
  page_size?: number
  pool_kind?: number // 资金池：1-TRX池子，2-USDT池子，3-能量池子，4-带宽池子，5-激活池子，6-能量接收池子，7-带宽接收池子，8-财务池子
  price_id?: number
  resource_type?: number // 资源类型：0=带宽，1=能量
  status?: number | string // 状态：1=正常，2=交易失败，3=未匹配，4=订单异常
  start_time?: string
  user_id?: number
}

export interface SystemBillItem extends Recordable {
  agent_id: number
  amount: number | string
  created_at: number | string
  describe?: string
  flow: number
  from: string
  id: string
  kind: number // 交易类型：1-代理充值，2-用户充值，3-闪兑，4-时间能量，5-笔数能量，6-福利能量，81-补充资源，82-资源收购
  order_id: string
  pool_kind: number // 资金池：1-TRX池子，2-USDT池子，3-能量池子，4-带宽池子，5-激活池子，6-能量接收池子，7-带宽接收池子，8-财务池子
  price_id?: number
  resource_type?: number | string // 资源类型：0=带宽，1=能量
  status: number // 状态：1=正常，2=交易失败，3=未匹配，4=订单异常
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

export interface SystemBillStats extends Recordable {
  sum_flow_in_trx?: number | string
  sum_flow_in_usdt?: number | string
  sum_flow_out_trx?: number | string
  sum_flow_out_usdt?: number | string
}

export interface SystemBillListResponse extends Recordable {
  list: SystemBillItem[]
  pager: SystemBillPager
  summary?: SystemBillSummary
  stats?: SystemBillStats | SystemBillStats[]
}
