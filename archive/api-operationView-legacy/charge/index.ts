/**
 * 资源补充（Charge）API
 * 接口路径：/v1/charge
 */
import request from '@/axios'
import type {
  ChargeListParams,
  ChargeListResponse,
  ChargeLogParams,
  ChargeLogResponse,
  ChargeTaskParams
} from './types'

const BASE_URL = '/v1/charge'

/**
 * 分页获取资源补充列表
 * GET /v1/charge
 */
export const getChargeList = (params: ChargeListParams): Promise<IResponse<ChargeListResponse>> => {
  return request.get({
    url: `${BASE_URL}/task`,
    params
  })
}

/**
 * 分页获取资源补充记录
 * GET /v1/charge/log
 */
export const getChargeLogList = (
  params: ChargeLogParams
): Promise<IResponse<ChargeLogResponse>> => {
  return request.get({
    url: `${BASE_URL}/log`,
    params
  })
}

/**
 * 创建资源补充任务
 * POST /v1/charge/task
 */
export const createChargeTask = (data: ChargeTaskParams): Promise<IResponse<string>> => {
  return request.post({
    url: `${BASE_URL}/task`,
    data
  })
}

/**
 * 更新资源补充任务
 * PUT /v1/charge/task
 */
export const updateChargeTask = (data: ChargeTaskParams): Promise<IResponse<string>> => {
  return request.put({
    url: `${BASE_URL}/task`,
    data
  })
}

// 导出类型
export * from './types'
