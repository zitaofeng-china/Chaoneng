import request from '@/axios'
import type { UserListParams, UserListResponse } from './user_list.types'

// 导出类型定义
export * from './user_list.types'

// ========== 用户管理接口 ==========

/**
 * 获取用户列表
 * GET /v1/user
 */
export const v1GetUserList = (params: UserListParams): Promise<IResponse<UserListResponse>> => {
  return request.get({
    url: '/v1/user',
    params
  })
}
