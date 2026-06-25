export interface OrderTypeStatisticsParams {
  start_time?: string
  end_time?: string
  order?: string
}

export interface OrderTypeStatisticsSummary {
  batch_active?: number | string
  batch_energy?: number | string
  flash_energy?: number | string
  hosting?: number | string
  instant_energy?: number | string
  stroke_energy?: number | string
  time_energy?: number | string
  total?: number | string
  weal_energy?: number | string
}

export interface OrderTypeStatisticsDetailItem extends OrderTypeStatisticsSummary {
  date: string
}

export interface OrderTypeStatisticsData {
  detail?: OrderTypeStatisticsDetailItem[]
  summary?: OrderTypeStatisticsSummary
}
