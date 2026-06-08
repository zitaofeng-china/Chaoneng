export interface WelfareConfigData {
  price: string | number
  max_count: number
  min_interval: number
  max_energy: number
  max_bandwidth: number
  min_active_day: number
  min_balance_trx: string | number
  min_balance_usdt: string | number
  min_avg_transfer_trx: string | number
  min_avg_transfer_usdt: string | number
  min_send_interval: number
  same_send_max_count_trx: number
  same_send_min_amount_trx: string | number
}

export type UpdateWelfareConfigParams = WelfareConfigData
