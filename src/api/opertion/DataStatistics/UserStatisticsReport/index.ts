import request from '@/axios'
import type { UserStatisticsReportData, UserStatisticsReportParams } from './types'

export * from './types'

export const getUserStatisticsReport = (
  params?: UserStatisticsReportParams
): Promise<IResponse<UserStatisticsReportData>> => {
  return request.get<UserStatisticsReportData>({
    url: '/v2/system/stats/growth',
    params
  })
}
