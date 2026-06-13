import request from '@/axios'
import type {
  PoolListParams,
  PoolListResponse,
  CreatePoolParams,
  UpdatePoolParams,
  ResourcePoolNotifyData,
  UpdateResourcePoolNotifyParams
} from './resource_pool_account_types'

export * from './resource_pool_account_types'

const BASE_URL = '/v1/pool'
const NOTIFY_URL = '/v1/pool/notify'

/**
 * 获取资源池列表
 * GET /v1/pool
 */
export const getPoolList = (params: PoolListParams): Promise<IResponse<PoolListResponse>> => {
  return request.get<PoolListResponse>({
    url: BASE_URL,
    params
  })
}

/**
 * 创建资源池
 * POST /v1/pool
 */
export const createPool = (data: CreatePoolParams): Promise<IResponse<string>> => {
  return request.post<string>({
    url: BASE_URL,
    data
  })
}

/**
 * 更新资源池
 * PUT /v1/pool
 */
export const updatePool = (data: UpdatePoolParams): Promise<IResponse<string>> => {
  return request.put<string>({
    url: BASE_URL,
    data
  })
}

/**
 * 删除资源池
 * DELETE /v1/pool/{id}
 */
export const deletePool = (id: number): Promise<IResponse<string>> => {
  return request.delete<string>({
    url: `${BASE_URL}/${id}`
  })
}

/**
 * 获取资源池通知机器人
 * GET /v1/pool/notify
 */
export const getResourcePoolNotify = (): Promise<IResponse<ResourcePoolNotifyData>> => {
  return request.get<ResourcePoolNotifyData>({
    url: NOTIFY_URL
  })
}

/**
 * 更新资源池通知机器人
 * PUT /v1/pool/notify
 */
export const updateResourcePoolNotify = (
  data: UpdateResourcePoolNotifyParams
): Promise<IResponse<string>> => {
  return request.put<string>({
    url: NOTIFY_URL,
    data
  })
}

// 兼容现有页面调用命名
export const v2GetPoolList = getPoolList
export const v2CreatePool = createPool
export const v2UpdatePool = updatePool
