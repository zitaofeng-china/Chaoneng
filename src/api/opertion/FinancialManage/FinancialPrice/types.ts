/**
 * 理财价格配置相关类型定义
 */

export interface FundPriceConfig {
  bandwidth_minimum: number
  bandwidth_price1: number
  bandwidth_price2: number
  customer: string
  energy_minimum: number
  energy_price1: number
  energy_price2: number
}

export interface UpdateFundPriceConfigParams {
  bandwidth_minimum: number
  bandwidth_price1: number
  bandwidth_price2: number
  customer: string
  energy_minimum: number
  energy_price1: number
  energy_price2: number
}
