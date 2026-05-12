/**
 * 资源订单相关API
 */
import request from '@/axios'
import type {
  V2ResourceOrderListParams,
  V2ResourceOrderListResponse,
  V2ResourceOrderDetail,
  V2SettlementRecordListParams,
  V2SettlementRecordListResponse
} from './types'

const BASE_URL = '/v2/manage/order/resource_order/'

/**
 * 获取资源订单列表
 * GET /v2/manage/order/resource_order/list
 */
export const v2GetResourceOrderList = (
  params: V2ResourceOrderListParams
): Promise<IResponse<V2ResourceOrderListResponse>> => {
  console.log('[v2GetResourceOrderList] 调用参数:', params)
  return request.get({
    url: `${BASE_URL}list`,
    params
  })
}

/**
 * 获取资源订单详情
 * GET /v2/manage/order/resource_order/detail
 */
export const v2GetResourceOrderDetail = (
  orderId: string
): Promise<IResponse<V2ResourceOrderDetail>> => {
  console.log('[v2GetResourceOrderDetail] 订单ID:', orderId)
  return request.get({
    url: `${BASE_URL}detail`,
    params: { order_id: orderId }
  })
}

/**
 * 获取结算记录列表
 * GET /v2/manage/order/resource_order/settlement_record/list
 */
export const v2GetSettlementRecordList = (
  params: V2SettlementRecordListParams
): Promise<IResponse<V2SettlementRecordListResponse>> => {
  console.log('[v2GetSettlementRecordList] 调用参数:', params)
  return request.get({
    url: `${BASE_URL}settlement_record/list`,
    params
  })
}
