import request from '@/axios'
import type { DepositListParamsV1, DepositListResponseV1, DepositDetailResponseV1 } from './type'

// 导出类型定义
export * from './type'

// ========== 新接口 v1 ==========

/**
 * 获取用户充值列表 - 新接口 v1
 * GET /v1/order/deposit
 */
export const v1GetDepositList = (
  params: DepositListParamsV1
): Promise<IResponse<DepositListResponseV1>> => {
  return request.get({
    url: '/v1/order/deposit',
    params
  })
}

/**
 * 获取订单详情 - 新接口 v1
 * GET /v1/order/{id}
 */
export const v1GetDepositDetail = (id: string): Promise<IResponse<DepositDetailResponseV1>> => {
  return request.get({
    url: `/v1/order/${id}`
  })
}
