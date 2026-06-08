import request from '@/axios'
import type { V2StatsData, V2StatsParams } from './types'

export * from './types'

// ========== 新接口 v2 ==========

/**
 * 获取统计数据 - 新接口 v2
 * GET /v2/system/stats
 */
export const v2GetStats = (params?: V2StatsParams) => {
  return request.get<V2StatsData>({
    url: '/v2/system/stats',
    params
  })
}
