import request from '@/axios'
import type {
  ExchangeOrderListParamsV1,
  ExchangeOrderListResponseV1,
  ExchangeOrderDetailResponseV1
} from './type'

// 导出类型定义
export * from './type'

// ========== 新接口 v1 ==========

const BASE_URL = '/v1/order/'

/**
 * 获取闪兑订单列表 - 新接口 v1
 * GET /v1/order/exchange
 */
export const v1GetExchangeOrderList = (
  params: ExchangeOrderListParamsV1
): Promise<IResponse<ExchangeOrderListResponseV1>> => {
  return request.get({
    url: `${BASE_URL}exchange`,
    params
  })
}

/**
 * 获取订单详情 - 新接口 v1
 * GET /v1/order/{id}
 */
export const v1GetExchangeOrderDetail = (
  id: string
): Promise<IResponse<ExchangeOrderDetailResponseV1>> => {
  return request.get({
    url: `${BASE_URL}${id}`
  })
}
