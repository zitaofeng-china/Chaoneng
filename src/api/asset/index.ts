/**
 * 资产账户相关 API
 */
import request from '@/axios'
import type { CreateAssetAccountParams, GetAssetBalanceParams, AssetBalanceData } from './types'

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
