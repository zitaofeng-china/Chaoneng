import request from '@/axios'
import type { SystemBillListParams, SystemBillListResponse } from './types'

/**
 * 分页获取系统账单列表（链上出入记录）
 * GET /v1/bill/system
 */
export const v1GetSystemBillList = (
  params: SystemBillListParams
): Promise<IResponse<SystemBillListResponse>> => {
  return request.get({
    url: '/v1/bill/system',
    params
  })
}

export * from './types'
