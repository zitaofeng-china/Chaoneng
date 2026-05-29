import request from '@/axios'
import type { BillListParamsV1, BillListResponseV1, AccountDetailResponse } from './type'

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
  return request.get<AccountDetailResponse>({ url: '/user/get_detail', params })
}

/**
 * 获取余额记录（充值记录/扣款记录）- 旧接口
 * 接口路径：GET /v1/user/balance_record
 * 参数：type (record_type: 1-充值记录, 2-扣款记录)
 */
export const getBalanceRecordApi = (params: any) => {
  return request.get({ url: '/user/balance_record', params })
}

// ==================== 旧接口（保留） ====================

// 获取账户详情
export const getAccountDetailApi = (id: number) => {
  return request.get({ url: '/v1/account/detail', params: { id } })
}

// 创建账户
export const createAccountApi = (data: any) => {
  return request.post({ url: '/v1/account/create', data })
}

// 更新账户
export const updateAccountApi = (data: any) => {
  return request.put({ url: '/v1/account/update', data })
}

// 删除账户
export const deleteAccountApi = (id: number) => {
  return request.delete({ url: '/v1/account/delete', params: { id } })
}

// 导出账户信息
export const exportAccountListApi = (params: any) => {
  return request.get({ url: '/v1/account/export', params, responseType: 'blob' })
}
