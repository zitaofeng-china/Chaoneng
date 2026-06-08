import request from '@/axios'
import type {
  V2DepositListParams,
  V2DepositListResponse,
  V2DepositDetail
} from './recharge_order_types'

// ========== 订单接口 ==========

const BASE_URL = '/v1/order/'

/**
 * 获取充值订单列表
 * GET /v1/order/deposit
 */
export const v2GetDepositList = (
  params: V2DepositListParams
): Promise<IResponse<V2DepositListResponse>> => {
  return request.get({
    url: `${BASE_URL}deposit`,
    params
  })
}

/**
 * 获取充值订单详情
 * GET /v1/order/{id}
 */
export const v2GetDepositDetail = (id: string): Promise<IResponse<V2DepositDetail>> => {
  return request.get({
    url: `${BASE_URL}${id}`
  })
}
