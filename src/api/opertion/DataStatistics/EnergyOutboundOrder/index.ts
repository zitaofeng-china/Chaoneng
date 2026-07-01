import request from '@/axios'
import type {
  EnergyOutboundOrderDetail,
  EnergyOutboundOrderListParams,
  EnergyOutboundOrderListResponse
} from './types'

export * from './types'

const FUND_ORDER_URL = '/v1/fund/order'

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

/**
 * 理财订单详情
 * GET /v1/fund/order/{id}
 */
export const getEnergyOutboundOrderDetail = (
  id: number | string
): Promise<IResponse<EnergyOutboundOrderDetail>> => {
  return request.get({
    url: `${FUND_ORDER_URL}/${id}`
  })
}
