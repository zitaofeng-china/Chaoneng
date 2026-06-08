import request from '@/axios'
import { V2EnergyListParams, V2EnergyListResponse, V2OrderDetailResponse } from './types'

// ========== 订单接口 ==========

const BASE_URL = '/v1/order/energy'

/**
 * 获取能量交易订单列表
 * GET /v1/order/energy
 */
export const v2GetEnergyList = (
  params: V2EnergyListParams
): Promise<IResponse<V2EnergyListResponse>> => {
  return request.get({
    url: `${BASE_URL}`,
    params
  })
}

/**
 * 获取订单详情
 * GET /v1/order/{id}
 */
export const v2GetOrderDetail = (id: string): Promise<IResponse<V2OrderDetailResponse>> => {
  return request.get({
    url: `/v1/order/${id}`
  })
}

/**
 * 回收资源（停止代理）
 * POST /v1/order/{order_id}/recycle
 */
export const v2RecycleOrder = (order_id: string): Promise<IResponse<string>> => {
  return request.post({
    url: `/v1/order/${order_id}/recycle`
  })
}

// 导出所有类型
export * from './types'
