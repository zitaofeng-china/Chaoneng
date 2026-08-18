import request from '@/axios'
import type { InviteListQueryParams, InviteListResponse } from './invite.types'

// 导出类型定义
export * from './invite.types'

// ==================== 邀请列表接口 ====================

const INVITE_BASE = '/v1/invite'

/**
 * 获取邀请记录列表
 * 接口路径：GET /v1/invite
 * @param params 查询参数
 */
export const v1GetInviteList = (
  params: InviteListQueryParams
): Promise<IResponse<InviteListResponse>> => {
  return request.get({ url: INVITE_BASE, params })
}
