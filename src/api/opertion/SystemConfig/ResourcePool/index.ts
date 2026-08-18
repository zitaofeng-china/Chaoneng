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

/** GET /v1/pool */
export const v2GetPoolList = (params: PoolListParams): Promise<IResponse<PoolListResponse>> => {
  return request.get<PoolListResponse>({
    url: BASE_URL,
    params
  })
}

/** POST /v1/pool */
export const v2CreatePool = (data: CreatePoolParams): Promise<IResponse<string>> => {
  return request.post<string>({
    url: BASE_URL,
    data
  })
}

/** PUT /v1/pool */
export const v2UpdatePool = (data: UpdatePoolParams): Promise<IResponse<string>> => {
  return request.put<string>({
    url: BASE_URL,
    data
  })
}

/** GET /v1/pool/notify */
export const getResourcePoolNotify = (): Promise<IResponse<ResourcePoolNotifyData>> => {
  return request.get<ResourcePoolNotifyData>({
    url: NOTIFY_URL
  })
}

/** PUT /v1/pool/notify */
export const updateResourcePoolNotify = (
  data: UpdateResourcePoolNotifyParams
): Promise<IResponse<string>> => {
  return request.put<string>({
    url: NOTIFY_URL,
    data
  })
}
