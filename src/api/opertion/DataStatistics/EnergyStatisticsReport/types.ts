export interface EnergyStatisticsReportParams {
  start_time?: string
  end_time?: string
  order?: string
}

export interface EnergyStatisticsSummary {
  batch_energy?: number | string
  flash_energy?: number | string
  hosting?: number | string
  instant_energy?: number | string
  stroke_energy?: number | string
  time_energy?: number | string
  total?: number | string
  weal_energy?: number | string
}

export interface EnergyStatisticsDetailItem extends EnergyStatisticsSummary {
  date: string
}

export interface EnergyStatisticsReportData {
  detail?: EnergyStatisticsDetailItem[]
  summary?: EnergyStatisticsSummary
}
