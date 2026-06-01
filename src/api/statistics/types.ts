// ========== 新接口 v2 类型定义 ==========

/**
 * GET /v2/system/stats 响应数据
 */
export interface V2StatsRevenue {
  agent_deposit: string
  exchange: string
  time_energy: string
  stroke_energy: string
  weal_energy: string
  flash_energy: string
  hosting: string
  batch_energy: string
  batch_active: string
  bot_fee: string
}

export interface V2StatsExpense {
  exchange_trx: string
  exchange_usdt: string
  energy_reward: string
  bandwidth_reward: string
  justlend: string
  feee: string
  trxfee: string
}

export interface V2StatsResource {
  energy_count: string
  energy_sum: string
  bandwidth_count: string
  bandwidth_sum: string
  activation_count: string
  weal_count: string
  energy_in_sum: string
  bandwidth_in_sum: string
}

export interface V2StatsIncome {
  exchange: string
  energy: string
  activation: string
}

export interface V2StatsData {
  updated_at: number
  price_trx: string
  revenue: V2StatsRevenue
  expense: V2StatsExpense
  resource: V2StatsResource
  income: V2StatsIncome
}

export interface V2StatsResponse {
  code: string
  data: V2StatsData
  msg: string
}

export interface V2StatsParams {
  start_time?: string
  end_time?: string
}

// ========== 旧接口类型定义 ==========

// 定义统计数据接口
export interface StatisticsItem {
  amount: number
  currency: string
  description: string
}

export interface RobotIncomeItem {
  totalIncome: number
  currency: string
  robotQuantity: number
  description: string
}

export interface DailyStatistics {
  energyIncome: StatisticsItem
  exchangeExpense: StatisticsItem
  exchangeIncome: StatisticsItem
  netProfit: StatisticsItem
  newAgents: StatisticsItem
  energyExpense: StatisticsItem
  robotIncomePerQuantity: RobotIncomeItem
}

export interface StatisticsData {
  dailyStatistics: DailyStatistics
}

export interface StatisticsResponse {
  code: number
  data: StatisticsData
  message: string
}

// 机器人摘要数据类型定义
export interface BotSummaryItem {
  id: string
  date: string
  botId: string
  botUsername: string

  // 金额相关字段（将显示在表格中）
  trxCost: number
  trxProfit: number
  rechargeTrxAmount: number
  rechargeUsdtAmount: number
  energyOrderTrxAmount: number
  energyOrderUsdtAmount: number
  hostedOrderTrxAmount: number
  hostedOrderUsdtAmount: number

  // 笔数相关字段（将显示在详情中）
  newUserCount: number
  rechargeOrderCount: number
  rechargeTrxOrderCount: number
  rechargeUsdtOrderCount: number
  energyOrderCount: number
  energyTimeRentalOrderCount: number
  energyBatchOrderCount: number
  hostedOrderCount: number
  hostedTransactionCount: number
}

export interface BotSummaryResponse {
  code: number
  data: {
    list: BotSummaryItem[]
    total: number
  }
  message: string
}
