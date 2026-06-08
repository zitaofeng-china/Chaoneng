import request from '@/axios'
import type {
  V2PoolListParams,
  V2PoolListResponse,
  V2CreatePoolParams,
  V2UpdatePoolParams
} from './resource_pool_account_types'

// ========== 新接口 v2 ==========

const BASE_URL = '/v2/pools'

/**
 * 获取资源池列表 - 新接口 v2
 * GET /v2/pools
 */
export const v2GetPoolList = (params: V2PoolListParams): Promise<IResponse<V2PoolListResponse>> => {
  return request.get<V2PoolListResponse>({
    url: BASE_URL,
    params
  })
}

/**
 * 创建资源池 - 新接口 v2
 * POST /v2/pools/create
 */
export const v2CreatePool = (data: V2CreatePoolParams): Promise<IResponse<string>> => {
  return request.post<string>({
    url: `${BASE_URL}/create`,
    data
  })
}

/**
 * 更新资源池 - 新接口 v2
 * POST /v2/pools/update
 */
export const v2UpdatePool = (data: V2UpdatePoolParams): Promise<IResponse<string>> => {
  return request.post<string>({
    url: `${BASE_URL}/update`,
    data
  })
}
