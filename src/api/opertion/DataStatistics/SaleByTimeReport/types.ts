export interface SaleByTimeReportParams {
  start_time?: string
  end_time?: string
  keyword?: string
  order?: string
}

export interface SaleByTimeReportSummaryItem {
  batch_active?: number | string
  batch_energy?: number | string
  flash_energy?: number | string
  hosting?: number | string
  level?: number | string
  stroke_energy?: number | string
  time_energy?: number | string
  total?: number | string
  weal_energy?: number | string
}

export interface SaleByTimeReportData {
  energy?: SaleByTimeReportSummaryItem[]
  order?: SaleByTimeReportSummaryItem[]
}
