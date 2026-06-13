import request from '@/axios'
import type { UserStatisticsRawQueryParams, UserStatisticsRawResponse } from './types'

export * from './types'

/**
 * 复用旧统计接口，按日获取机器人新增用户原始数据。
 * 页面侧会继续聚合成“今日/昨日/本月/上月”报表结构。
 */
export const getUserStatisticsRawReport = (params: UserStatisticsRawQueryParams) => {
  return request.get<UserStatisticsRawResponse>({
    url: '/statistics/bot-summary',
    params
  })
}
