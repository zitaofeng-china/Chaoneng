import request from '@/axios'
import type { OrderTypeStatisticsData, OrderTypeStatisticsParams } from './types'

export * from './types'

export const getOrderTypeStatisticsReport = (
  params?: OrderTypeStatisticsParams
): Promise<IResponse<OrderTypeStatisticsData>> => {
  return request.get<OrderTypeStatisticsData>({
    url: '/v2/system/stats/order',
    params
  })
}
