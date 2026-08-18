/**
 * 资源订单（理财订单）相关API
 * 接口路径：/v1/fund/order
 */
import request from '@/axios'
import type {
  V2ResourceOrderListParams,
  V2ResourceOrderListResponse,
  V2UpdateResourceOrderParams
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
 * 更新理财订单
 * PUT /v1/fund/order
 */
export const v2UpdateResourceOrder = (
  data: V2UpdateResourceOrderParams
): Promise<IResponse<unknown>> => {
  return request.put({
    url: BASE_URL,
    data
  })
}

// 导出类型
export * from './types'
