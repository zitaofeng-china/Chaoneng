export type AgentMarketingNumeric = number | string | null

export interface AgentMarketingAmountParams {
  current_page?: number
  keyword?: string
  order?: string
  page_size?: number
  price_id?: number | string
}

export interface AgentMarketingOrderItem {
  id?: number | string
  kind?: number | string
  name?: string
  order_name?: string
  order_type?: string | number
  total_expense?: AgentMarketingNumeric
  order_count?: AgentMarketingNumeric
  [key: string]: unknown
}

export interface AgentMarketingBotItem {
  agent_id?: number | string
  id?: number | string
  bot_id?: number | string
  bot_name?: string
  name?: string
  bot_username?: string
  last_month_expense?: AgentMarketingNumeric
  this_month_expense?: AgentMarketingNumeric
  today_expense?: AgentMarketingNumeric
  total_expense?: AgentMarketingNumeric
  yesterday_expense?: AgentMarketingNumeric
  bot_count?: AgentMarketingNumeric
  order_count?: AgentMarketingNumeric
  user_count?: AgentMarketingNumeric
  orders?: AgentMarketingOrderItem[]
  children?: AgentMarketingOrderItem[]
  [key: string]: unknown
}

export interface AgentMarketingBotExpenseParams {
  current_page?: number
  keyword?: string
  order?: string
  page_size?: number
}

export interface AgentMarketingBotExpenseItem {
  agent_id?: number | string
  agent_name?: string
  bot_id?: number | string
  bot_name?: string
  last_month_expense?: AgentMarketingNumeric
  order_count?: AgentMarketingNumeric
  this_month_expense?: AgentMarketingNumeric
  today_expense?: AgentMarketingNumeric
  total_expense?: AgentMarketingNumeric
  user_count?: AgentMarketingNumeric
  yesterday_expense?: AgentMarketingNumeric
  [key: string]: unknown
}

export type AgentMarketingBotExpenseData = AgentMarketingBotExpenseItem[]

export interface AgentMarketingBotOrderParams {
  bot_id: number | string
}

export interface AgentMarketingBotOrderItem extends AgentMarketingBotExpenseItem {
  kind?: number | string
}

export type AgentMarketingBotOrderData = AgentMarketingBotOrderItem[]

export interface AgentMarketingAgentItem {
  agent_id?: number | string
  agent_name?: string
  bot_count?: AgentMarketingNumeric
  last_month_expense?: AgentMarketingNumeric
  order_count?: AgentMarketingNumeric
  price_id?: AgentMarketingNumeric
  this_month_expense?: AgentMarketingNumeric
  today_expense?: AgentMarketingNumeric
  total_expense?: AgentMarketingNumeric
  user_count?: AgentMarketingNumeric
  yesterday_expense?: AgentMarketingNumeric
  bots?: AgentMarketingBotItem[]
  children?: AgentMarketingBotItem[]
  [key: string]: unknown
}

export interface AgentMarketingAmountSummary {
  agent_count?: AgentMarketingNumeric
  bot_count?: AgentMarketingNumeric
  this_month_total_expense?: AgentMarketingNumeric
  total_expense?: AgentMarketingNumeric
  [key: string]: unknown
}

export interface AgentMarketingAmountPager {
  current_page?: number
  page_size?: number
  total?: number
}

export interface AgentMarketingAmountData {
  detail?: AgentMarketingAgentItem[]
  pager?: AgentMarketingAmountPager
  summary?: AgentMarketingAmountSummary
  [key: string]: unknown
}
