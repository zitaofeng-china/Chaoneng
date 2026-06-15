export interface UserStatisticsReportParams {
  current_page?: number
  keyword?: string
  order?: string
  page_size?: number
}

export interface UserStatisticsSummary {
  growth_user_last_month?: number | string
  growth_user_month?: number | string
  growth_user_today?: number | string
  growth_user_total?: number | string
  growth_user_yesterday?: number | string
}

export interface UserStatisticsDetailItem extends UserStatisticsSummary {
  agent_name?: string
  bot_id?: number | string
  bot_name?: string
}

export interface UserStatisticsPager {
  current_page?: number
  page_size?: number
  total?: number
}

export interface UserStatisticsReportData {
  detail?: UserStatisticsDetailItem[]
  list?: UserStatisticsDetailItem[]
  pager?: UserStatisticsPager
  summary?: UserStatisticsSummary
  total?: number
}
