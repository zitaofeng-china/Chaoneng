import request from '@/axios'
import type { EnergyOutboundOrderListParams, EnergyOutboundOrderListResponse } from './types'

export * from './types'

/**
 * 能量理财出账记录
 * GET /v1/fund/settlement
 */
export const getEnergyOutboundOrderList = (
  params: EnergyOutboundOrderListParams
): Promise<IResponse<EnergyOutboundOrderListResponse>> => {
  return request.get({
    url: '/v1/fund/settlement',
    params
  })
}
