/**
 * 资产账户相关 API
 */
import request from '@/axios'
import type {
  CreateAssetAccountParams,
  GetAssetBalanceParams,
  AssetBalanceData,
  UpdateAssetNotifyParams,
  AssetNotifyData
} from './types'

const BASE_URL = '/v1/asset'

/**
 * 创建资产账户
 * POST /v1/asset/account
 */
export const createAssetAccount = (data: CreateAssetAccountParams): Promise<IResponse<unknown>> => {
  return request.post({ url: `${BASE_URL}/account`, data })
}

/**
 * 统计资产历史
 * GET /v1/asset/report
 */
export const getAssetReport = (
  params: GetAssetBalanceParams
): Promise<IResponse<AssetBalanceData>> => {
  return request.get({ url: `${BASE_URL}/report`, params })
}

/**
 * 获取资产通知配置
 * GET /v1/asset/notify
 */
export const getAssetNotify = (): Promise<IResponse<AssetNotifyData>> => {
  return request.get({ url: `${BASE_URL}/notify` })
}

/**
 * 更新资产通知配置
 * PUT /v1/asset/notify
 */
export const updateAssetNotify = (data: UpdateAssetNotifyParams): Promise<IResponse<unknown>> => {
  return request.put({ url: `${BASE_URL}/notify`, data })
}

/**
 * 批量创建资产账户
 * POST /v1/asset/account/batch
 */
export const batchCreateAssetAccount = (
  data: Array<{ address: string; name: string }>
): Promise<IResponse<unknown>> => {
  return request.post({ url: `${BASE_URL}/account/batch`, data })
}
