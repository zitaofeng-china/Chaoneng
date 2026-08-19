import request from '@/axios'
import { v1GetAdminMe } from '@/api/common/login'
import { toAccountDetailFromAdminMe } from '@/auth/admin/me'
import type { BillListParamsV1, BillListResponseV1, AccountDetail } from './type'

// ==================== 新接口 v1 ====================

/**
 * 获取账单列表
 * 接口路径：GET /v1/bill/agent
 * 用途：通过 kinds 参数区分充值记录和扣款记录
 * - 充值记录：kinds = [1, 2] (1-代理充值, 2-用户充值)
 * - 扣款记录：kinds = [3, 4, 5, 6, 7, 8, 9, 10, 11, 15, 20, 21]
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
 * 获取当前管理员/代理账户信息
 * 接口路径：GET /v1/admin/me
 */
export const v1GetAccountDetail = async (params?: Record<string, unknown>) => {
  const res = await v1GetAdminMe(params)
  if (res?.data) {
    return {
      ...res,
      data: toAccountDetailFromAdminMe(res.data) as AccountDetail
    }
  }
  return res as IResponse<AccountDetail>
}

/**
 * 更新代理通知设置
 * 接口路径：PUT /v1/user/notify
 * 参数：id（账户ID）、chat_ids（TG账号数字ID数组）、balance_threshold（余额提醒阈值）、order_subscription（订单播报类型）
 */
export interface UpdateNotifyParams {
  id: number
  chat_ids: number[]
  balance_threshold: number
  order_subscription?: number[] | null
}

export const v1UpdateUserNotify = (data: UpdateNotifyParams): Promise<IResponse> => {
  return request.put({ url: '/v1/user/notify', data })
}

/** GET /v1/address */
export const v1GetAddressList = (params: {
  agent_id?: number
  bot_id?: number
  current_page?: number
  keyword?: string
  kind?: number
  order?: string
  page_size?: number
}) => {
  return request.get<{ list: Array<{ address?: string }>; pager?: unknown }>({
    url: '/v1/address',
    params
  })
}
