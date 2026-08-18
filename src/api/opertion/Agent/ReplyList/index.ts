import request from '@/axios'
import type {
  ReplyListParamsV1,
  ReplyListResponseV1,
  CreateReplyParamsV1,
  UpdateReplyParamsV1
} from './types'

// 导出类型定义
export * from './types'

// ========== 新接口 v1 ==========

const BASE_URL = '/v1/bot/reply'

/**
 * 获取关键词回复列表 - 新接口 v1
 * GET /v1/bot/reply
 */
export const v1GetReplyList = (
  params: ReplyListParamsV1
): Promise<IResponse<ReplyListResponseV1>> => {
  return request.get({
    url: BASE_URL,
    params
  })
}

/**
 * 创建关键词回复 - 新接口 v1
 * POST /v1/bot/reply
 */
export const v1CreateReply = (data: CreateReplyParamsV1): Promise<IResponse> => {
  return request.post({
    url: BASE_URL,
    data
  })
}

/**
 * 更新关键词回复 - 新接口 v1
 * PUT /v1/bot/reply
 */
export const v1UpdateReply = (data: UpdateReplyParamsV1): Promise<IResponse> => {
  return request.put({
    url: BASE_URL,
    data
  })
}

/**
 * 删除关键词回复 - 新接口 v1
 * DELETE /v1/bot/reply
 */
export const v1DeleteReply = (id: number): Promise<IResponse> => {
  return request.delete({
    url: BASE_URL,
    params: { id }
  })
}
