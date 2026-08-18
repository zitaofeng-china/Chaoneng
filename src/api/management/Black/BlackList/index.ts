import request from '@/axios'
import type {
  BlackListParamsV1,
  BlackListResponseV1,
  CreateBlackListParamsV1,
  UpdateBlackListParamsV1,
  DeleteBlackListParamsV1
} from './types'

// ========== 新接口 v1 ==========

const BASE_URL = '/v1/blacklist'

/**
 * 获取黑名单列表 - 新接口 v1
 * GET /v1/blacklist
 */
export const v1GetBlackList = (
  params: BlackListParamsV1
): Promise<IResponse<BlackListResponseV1>> => {
  return request.get({
    url: BASE_URL,
    params
  })
}

/**
 * 创建黑名单 - 新接口 v1
 * POST /v1/blacklist
 */
export const v1CreateBlackList = (data: CreateBlackListParamsV1): Promise<IResponse> => {
  return request.post({
    url: BASE_URL,
    data
  })
}

/**
 * 更新黑名单 - 新接口 v1
 * PUT /v1/blacklist
 */
export const v1UpdateBlackList = (data: UpdateBlackListParamsV1): Promise<IResponse> => {
  return request.put({
    url: BASE_URL,
    data
  })
}

/**
 * 删除黑名单 - 新接口 v1
 * DELETE /v1/blacklist
 */
export const v1DeleteBlackList = (data: DeleteBlackListParamsV1): Promise<IResponse> => {
  return request.delete({
    url: BASE_URL,
    data
  })
}
