import request from '@/axios'
import type { ChargeOrderListParams, ChargeOrderListResponse } from './types'

export * from './types'

const BASE_URL = '/v1/order/charge'

/**
 * 分页获取用户速充列表
 * GET /v1/order/charge
 */
export const v1GetQuickChargeOrderList = (
  params: ChargeOrderListParams
): Promise<IResponse<ChargeOrderListResponse>> => {
  return request.get({
    url: BASE_URL,
    params
  })
}
