import request from '@/axios'
import type {
  EnergyOrderListParamsV1,
  EnergyOrderListResponseV1,
  EnergyOrderDetailResponseV1
} from './types'

// 导出类型定义
export * from './types'

// ========== 新接口 v1 ==========

/**
 * 获取能量订单列表 - 新接口 v1
 * GET /v1/order/energy
 */
export const v1GetEnergyOrderList = (
  params: EnergyOrderListParamsV1
): Promise<IResponse<EnergyOrderListResponseV1>> => {
  return request.get({
    url: '/v1/order/energy',
    params
  })
}

/**
 * 获取订单详情 - 新接口 v1
 * GET /v1/order/{id}
 */
export const v1GetEnergyOrderDetail = (
  id: string
): Promise<IResponse<EnergyOrderDetailResponseV1>> => {
  return request.get({
    url: `/v1/order/${id}`
  })
}

/** GET /v1/order/batch_active/list/{id} */
export const v1GetBatchActiveList = (id: string | number, params?: Record<string, unknown>) => {
  return request.get({ url: `/v1/order/batch_active/list/${id}`, params })
}

/** GET /v1/order/energy_count/list/{id} */
export const v1GetEnergyCountList = (
  id: string | number,
  params?: { currentPage: number; pageSize: number }
) => {
  return request.get({ url: `/v1/order/energy_count/list/${id}`, params })
}
