export interface PaymentStatisticsReportParams {
  end_time?: string
  keyword?: string
  order?: string
  start_time?: string
}

export interface PaymentStatisticsItem {
  date?: string
  energy_by_balance?: number | string
  energy_by_wallet?: number | string
  order_by_balance?: number | string
  order_by_wallet?: number | string
}

export type PaymentStatisticsReportData = PaymentStatisticsItem[]
