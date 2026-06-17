import request from '@/axios'
import type { HostingListParamsV1, HostingListResponseV1, RemoveHostingParamsV1 } from './types'

// 导出类型定义
export * from './types'

// ========== 托管地址接口 v1 ==========

const BASE_URL = '/v1/hosting/'

/**
 * 获取托管列表
 * GET /v1/hosting/list
 */
export const v1GetHostingList = (
  params: HostingListParamsV1
): Promise<IResponse<HostingListResponseV1>> => {
  return request.get({
    url: `${BASE_URL}list`,
    params
  })
}

/**
 * 删除托管地址
 * POST /v1/hosting/remove
 */
export const v1RemoveHosting = (data: RemoveHostingParamsV1): Promise<IResponse> => {
  return request.post({
    url: `${BASE_URL}remove`,
    data
  })
}
