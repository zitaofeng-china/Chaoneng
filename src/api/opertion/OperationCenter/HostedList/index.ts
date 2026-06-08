import request from '@/axios'
import type {
  HostingListParamsV2,
  HostingListResponseV2,
  RemoveHostingParamsV2,
  RecycleOrderParamsV2
} from './types'

// 导出类型定义
export * from './types'

// ========== 新接口 v2 ==========

const BASE_URL = '/v2/manage/hosting/'

/**
 * 获取托管列表 - 新接口 v2
 * GET /v2/manage/hosting/list
 */
export const v2GetHostingList = (
  params: HostingListParamsV2
): Promise<IResponse<HostingListResponseV2>> => {
  return request.get({
    url: `${BASE_URL}list`,
    params
  })
}

/**
 * 删除托管地址 - 新接口 v2
 * POST /v2/manage/hosting/remove
 */
export const v2RemoveHosting = (data: RemoveHostingParamsV2): Promise<IResponse> => {
  return request.post({
    url: `${BASE_URL}remove`,
    data
  })
}

/**
 * 回收与重置 - 新接口 v2
 * POST /v2/manage/hosting/reset
 */
export const v2RecycleOrder = (data: RecycleOrderParamsV2): Promise<IResponse> => {
  return request.post({
    url: `${BASE_URL}reset`,
    data
  })
}
