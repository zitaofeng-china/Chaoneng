import request from '@/axios'
import type {
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

function toUnixTimestamp(value: ConversationMessageTime): number {
  const numericValue =
    typeof value === 'number'
      ? value
      : /^-?\d+$/.test(value.trim())
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

function normalizeConversationMessageParams(
  params?: ConversationMessageParams
): ConversationMessageParams | undefined {
  if (!params) return params

  return {
    ...params,
    start_time: params.start_time === undefined ? undefined : toUnixTimestamp(params.start_time),
    end_time: params.end_time === undefined ? undefined : toUnixTimestamp(params.end_time)
  }
}

export const getConversationList = (
  params: ConversationListParams
): Promise<IResponse<ConversationListResponse>> => {
  return request.get({ url: CONVERSATION_BASE_URL, params })
}

export const getConversationMessages = (
  id: number,
  params?: ConversationMessageParams
): Promise<IResponse<ConversationMessageResponse>> => {
  return request.get({
    url: `${CONVERSATION_BASE_URL}/${id}/message`,
    params: normalizeConversationMessageParams(params)
  })
}

export const markConversationRead = (id: number): Promise<IResponse> => {
  return request.put({ url: `${CONVERSATION_BASE_URL}/${id}/read` })
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
