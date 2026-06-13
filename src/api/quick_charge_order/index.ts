import request from '@/axios'
import type {
  QuickChargeOrderDetailResponse,
  QuickChargeOrderListParams,
  QuickChargeOrderListResponse
} from './types'

export * from './types'

const BASE_URL = '/v1/order/energy'

export const v1GetQuickChargeOrderList = (
  params: QuickChargeOrderListParams
): Promise<IResponse<QuickChargeOrderListResponse>> => {
  return request.get({
    url: BASE_URL,
    params
  })
}

export const v1GetQuickChargeOrderDetail = (
  id: string
): Promise<IResponse<QuickChargeOrderDetailResponse>> => {
  return request.get({
    url: `/v1/order/${id}`
  })
}
