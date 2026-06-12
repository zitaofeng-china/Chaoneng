import request from '@/axios'
import type { UserListParamsV2, UserListResponseV2 } from './user_list.types'

// 导出类型定义
export * from './user_list.types'

// ========== 用户管理接口（代理端 + 运营端通用） ==========

/**
 * 获取用户列表
 * GET /v1/user
 */
export const v2GetUserList = (params: UserListParamsV2): Promise<IResponse<UserListResponseV2>> => {
  return request.get({
    url: '/v1/user',
    params
  })
}
