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
  instant_energy: string
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
  sohu: string
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

export interface V2StatsDailyEnergyIn {
  date: string
  energy_in: string | number
}

export interface V2StatsDailyActiveAgent {
  date: string
  active_agent: number
}

export interface V2StatsData {
  updated_at?: number
  price_trx?: string
  revenue?: V2StatsRevenue
  expense?: V2StatsExpense
  resource?: V2StatsResource
  income?: V2StatsIncome
  today_energy_in?: string | number
  total_energy_in?: string | number
  today_exchange_in?: string | number
  total_exchange_in?: string | number
  today_exchange_out?: string | number
  total_exchange_out?: string | number
  today_profit?: string | number
  total_profit?: string | number
  today_agent_add?: number
  total_agent_add?: number
  today_bot_in?: string | number
  total_bot_in?: string | number
  today_bot_add?: number
  total_bot_add?: number
  today_active_in?: string | number
  total_active_in?: string | number
  today_bandwidth_out?: string | number
  total_bandwidth_out?: string | number
  daily_energy_in?: V2StatsDailyEnergyIn[]
  daily_active_agent?: V2StatsDailyActiveAgent[]
}

export interface V2StatsParams {
  start_time?: string
  end_time?: string
}
