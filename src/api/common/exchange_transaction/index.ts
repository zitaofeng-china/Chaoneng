import request from '@/axios'
import type {
  ExchangeOrderListParams,
  ExchangeOrderListResult,
  ExchangeOrderDetailData,
  ResendTrxParams,
  V2ExchangeListParams
} from './types'

// ========== 新接口 v2 ==========

const BASE_URL = '/v1/order/exchange'

/**
 * 获取闪兑订单列表 - 新接口 v2
 * GET /v2/order/exchange/list
 */
export const v2GetExchangeList = (params: V2ExchangeListParams) => {
  console.log('[v2GetExchangeList] 调用参数:', params)
  return request.get({
    url: `${BASE_URL}`,
    params
  })
}

/**
 * 获取闪兑订单详情 - 新接口 v2
 * GET /v2/order/{id}
 */
export const v2GetExchangeDetail = (id: string) => {
  console.log('[v2GetExchangeDetail] 调用参数:', id)
  return request.get({
    url: `/v1/order/${id}`
  })
}

/**
 * 重试闪兑订单（补发）
 * POST /v1/order/{id}/retry
 */
export const v2RetryExchangeOrder = (id: string) => {
  return request.post({
    url: `/v1/order/${id}/retry`
  })
}

export const resendTrxApi = (data: ResendTrxParams) => {
  return request.post({
    url: `/v1/order/${data.id}/retry`,
    data
  })
}

// 导出所有类型
export * from './types'
