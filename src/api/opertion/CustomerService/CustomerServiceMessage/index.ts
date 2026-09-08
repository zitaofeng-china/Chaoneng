import request from '@/axios'
import type {
  ConversationDeleteParams,
  ConversationListParams,
  ConversationListResponse,
  ConversationMessageParams,
  ConversationMessageResponse,
  ConversationReplyParams,
  ConversationReplyResult
} from './types'

export * from './types'

const CONVERSATION_BASE_URL = '/v1/conversation'

type ConversationMessageTime = string | number

/** 将时间参数规范为 Unix 秒级时间戳 */
function toUnixTimestamp(value: ConversationMessageTime): number {
  const numericValue =
    typeof value === 'number'
      ? value
      : /^-?\d+(\.\d+)?$/.test(value.trim())
        ? Number(value.trim())
        : undefined
  const date =
    numericValue !== undefined
      ? new Date(numericValue < 100_000_000_000 ? numericValue * 1000 : numericValue)
      : new Date(value)

  if (Number.isNaN(date.getTime())) {
    throw new Error(`客服消息接口收到无效时间参数: ${String(value)}`)
  }

  return Math.floor(date.getTime() / 1000)
}

function normalizeTimeParams<
  T extends { start_time?: ConversationMessageTime; end_time?: ConversationMessageTime }
>(params?: T): T | undefined {
  if (!params) return params

  return {
    ...params,
    start_time: params.start_time === undefined ? undefined : toUnixTimestamp(params.start_time),
    end_time: params.end_time === undefined ? undefined : toUnixTimestamp(params.end_time)
  }
}

/** GET /v1/conversation 分页获取客服会话列表 */
export const getConversationList = (
  params: ConversationListParams
): Promise<IResponse<ConversationListResponse>> => {
  return request.get({ url: CONVERSATION_BASE_URL, params: normalizeTimeParams(params) })
}

export const getConversationMessages = (
  id: number,
  params?: ConversationMessageParams
): Promise<IResponse<ConversationMessageResponse>> => {
  return request.get({
    url: `${CONVERSATION_BASE_URL}/${id}/message`,
    params: normalizeTimeParams(params)
  })
}

export const markConversationRead = (id: number): Promise<IResponse> => {
  return request.put({ url: `${CONVERSATION_BASE_URL}/${id}/read` })
}

function compactConversationDeleteParams(
  params: ConversationDeleteParams
): ConversationDeleteParams {
  const compacted: ConversationDeleteParams = {}
  if (params.ids?.length) compacted.ids = params.ids
  if (params.bot_id !== undefined) compacted.bot_id = params.bot_id
  if (params.start_time !== undefined) compacted.start_time = params.start_time
  if (params.end_time !== undefined) compacted.end_time = params.end_time
  return compacted
}

function hasConversationDeleteFilter(params: ConversationDeleteParams) {
  return Boolean(
    params.ids?.length ||
      params.bot_id !== undefined ||
      params.start_time !== undefined ||
      params.end_time !== undefined
  )
}

/** DELETE /v1/conversation 按条件批量删除客服会话及其消息，需增强认证 */
export const deleteConversations = (
  params: ConversationDeleteParams
): Promise<IResponse<string>> => {
  const query = compactConversationDeleteParams(normalizeTimeParams(params) ?? {})
  if (!hasConversationDeleteFilter(query)) {
    return Promise.reject(new Error('删除会话必须指定筛选条件'))
  }
  return request.delete({ url: CONVERSATION_BASE_URL, params: query })
}

export const replyConversation = (
  id: number,
  data: ConversationReplyParams
): Promise<IResponse<ConversationReplyResult | string | number>> => {
  return request.post({ url: `${CONVERSATION_BASE_URL}/${id}/reply`, data })
}

/** 获取消息附件二进制数据，复用项目统一的请求、鉴权与错误处理。 */
export async function getMessageFileBlob(conversationId: number, messageId: number): Promise<Blob> {
  const response = await request.get<Blob>({
    url: `${CONVERSATION_BASE_URL}/${conversationId}/message/${messageId}/media`,
    responseType: 'blob'
  })
  const blob = (response as unknown as { data: Blob }).data
  if (!(blob instanceof Blob)) throw new Error('获取消息文件失败')
  return blob
}
