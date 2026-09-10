import request from '@/axios'
import type { V2ExchangeDetail, V2ExchangeListParams, V2ExchangeListResponse } from './types'

// ========== 订单接口 ==========

const BASE_URL = '/v1/order/exchange'

/**
 * 获取闪兑订单列表
 * GET /v1/order/exchange
 */
export const v2GetExchangeList = (
  params: V2ExchangeListParams
): Promise<IResponse<V2ExchangeListResponse>> => {
  return request.get({
    url: `${BASE_URL}`,
    params
  })
}

/**
 * 获取闪兑订单详情
 * GET /v1/order/{id}
 */
export const v2GetExchangeDetail = (id: string): Promise<IResponse<V2ExchangeDetail>> => {
  return request.get({
    url: `/v1/order/${id}`
  })
}

/**
 * 重试闪兑订单（补发）
 * POST /v1/order/{id}/retry
 */
export const v2RetryExchangeOrder = (id: string): Promise<IResponse<string>> => {
  return request.post({
    url: `/v1/order/${id}/retry`,
    skipErrorHandler: true
  })
}

// 导出所有类型
export * from './types'
