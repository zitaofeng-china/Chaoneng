import request from '@/axios'
import type {
  ReplyListParams,
  ReplyItem,
  ReplySaveParams,
  BotOption,
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

// ========== 旧接口 ==========

// 获取关键词回复列表
export const getReplyListApi = (params: ReplyListParams) => {
  return request.get<{ list: ReplyItem[]; totalCount: number }>({ url: BASE_URL, params })
}

// 删除关键词回复
export const deleteReplyApi = (id: number) => {
  return request.delete<boolean>({ url: BASE_URL, params: { id } })
}

// 保存关键词回复 (新增/编辑)
export const saveReplyApi = (data: ReplySaveParams) => {
  const payload = {
    id: data.id,
    bot_id: data.tg_bot_id,
    content: data.content || '',
    files: data.files || [],
    inner_buttons: data.inline_menu_ids || [],
    key_name: data.key_name,
    status: data.status
  }
  return data.id
    ? request.put<ReplyItem>({ url: BASE_URL, data: payload })
    : request.post<ReplyItem>({ url: BASE_URL, data: payload })
}

// 更新关键词回复状态
export const updateReplyStatusApi = (data: UpdateReplyParamsV1) => {
  return request.put<boolean>({ url: BASE_URL, data })
}

// 获取机器人列表 (用于搜索下拉框)
export const getBotOptionsApi = () => {
  return request.get<BotOption[]>({ url: '/mock/bot/options' }) // Placeholder URL, please update
}
