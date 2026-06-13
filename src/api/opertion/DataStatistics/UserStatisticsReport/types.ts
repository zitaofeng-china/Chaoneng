export interface UserStatisticsRawQueryParams {
  botId?: number | string
  endDate?: number | string
  pageNum?: number
  pageSize?: number
  startDate?: number | string
}

export interface UserStatisticsRawItem {
  id: number | string
  date: number | string
  botId?: number | string
  bot_id?: number | string
  botUsername?: string
  bot_username?: string
  newUserCount?: number | string
  new_user_count?: number | string
}

export interface UserStatisticsRawResponse {
  list: UserStatisticsRawItem[]
  total: number
}
