import request from '@/axios'
import type { V2StatsResponse, V2StatsParams } from './types'

// ========== 新接口 v2 ==========

/**
 * 获取统计数据 - 新接口 v2
 * GET /v2/system/stats
 */
export const v2GetStats = (params?: V2StatsParams) => {
  return request.get<V2StatsResponse>({
    url: '/v2/system/stats',
    params
  })
}

// 获取机器人摘要数据API
export const getBotSummaryApi = (params: any) => {
  return request.get({ url: '/statistics/bot-summary', params })
}
