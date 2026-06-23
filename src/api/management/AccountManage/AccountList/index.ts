import request from '@/axios'
import type { BillListParamsV1, BillListResponseV1, AccountDetail } from './type'

// ==================== 新接口 v1 ====================

/**
 * 获取账单列表
 * 接口路径：GET /v1/bill/agent
 * 用途：通过 kinds 参数区分充值记录和扣款记录
 * - 充值记录：kinds = [1, 2] (1-代理充值, 2-用户充值)
 * - 扣款记录：kinds = [3, 4, 5, 6, 7, 8, 9, 10, 11]
 */
export const v1GetBillList = (params: BillListParamsV1) => {
  // 处理 kinds 参数：如果是数组，转换为多个同名参数
  const queryParams = { ...params }
  if (Array.isArray(queryParams.kinds)) {
    const searchParams = new URLSearchParams()
    Object.keys(queryParams).forEach((key) => {
      const value = queryParams[key]
      if (key === 'kinds' && Array.isArray(value)) {
        value.forEach((kind) => searchParams.append('kinds', String(kind)))
      } else if (value !== undefined && value !== null) {
        searchParams.append(key, String(value))
      }
    })

    return request.get<BillListResponseV1>({
      url: `/v1/bill/agent?${searchParams.toString()}`
    })
  }

  return request.get<BillListResponseV1>({ url: '/v1/bill/agent', params })
}

// ==================== 代理端账户接口 ====================

/**
 * 获取代理账户信息
 * 接口路径：GET /v1/user/get_detail
 * 参数：无
 */
export const getAccountListApi = (params?: any) => {
  return request.get<AccountDetail>({ url: '/user/get_detail', params })
}

/**
 * 更新代理通知设置
 * 接口路径：PUT /v1/user/notify
 * 参数：id（账户ID）、chat_id（TG用户数字ID）、threshold（提醒阈值，0 表示禁用）
 */
export interface UpdateNotifyParams {
  id: number
  chat_id: number
  threshold: number
  order_chat_id?: number
  order_notify_chat_id?: number
  order_types?: number[]
  order_notify_types?: number[]
  order_enabled?: boolean
  order_notify_enabled?: boolean
}

export const v1UpdateUserNotify = (data: UpdateNotifyParams): Promise<IResponse> => {
  return request.put({ url: '/v1/user/notify', data })
}
