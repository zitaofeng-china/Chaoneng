/**
 * 资源订单（理财订单）相关API
 * 接口路径：/v1/fund/order
 */
import request from '@/axios'
import type {
  V2ResourceOrderDetail,
  V2ResourceOrderListParams,
  V2ResourceOrderListResponse,
  V2SettlementRecordListParams,
  V2SettlementRecordListResponse
} from './types'

const BASE_URL = '/v1/fund/order'

/**
 * 分页获取理财订单列表
 * GET /v1/fund/order
 */
export const v2GetResourceOrderList = (
  params: V2ResourceOrderListParams
): Promise<IResponse<V2ResourceOrderListResponse>> => {
  return request.get({
    url: BASE_URL,
    params
  })
}

/**
 * 获取理财订单详情
 * GET /v1/fund/order/{id}
 */
export const v2GetResourceOrderDetail = (
  id: number | string
): Promise<IResponse<V2ResourceOrderDetail>> => {
  return request.get({
    url: `${BASE_URL}/${id}`
  })
}

/**
 * 分页获取理财结算列表
 * GET /v1/fund/settlement
 */
export const v2GetSettlementRecordList = (
  params: V2SettlementRecordListParams
): Promise<IResponse<V2SettlementRecordListResponse>> => {
  return request.get({
    url: '/v1/fund/settlement',
    params
  })
}

// 导出类型
export * from './types'
