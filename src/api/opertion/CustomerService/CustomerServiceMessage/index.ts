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

const CONVERSATION_BASE_URL = '/v1/conversations'

export const getConversationList = (
  params: ConversationListParams
): Promise<IResponse<ConversationListResponse>> => {
  return request.get({ url: CONVERSATION_BASE_URL, params })
}

export const getConversationMessages = (
  id: number,
  params?: ConversationMessageParams
): Promise<IResponse<ConversationMessageResponse>> => {
  return request.get({ url: `${CONVERSATION_BASE_URL}/${id}/messages`, params })
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
export async function getMessageFileBlob(messageId: number): Promise<Blob> {
  const response = await request.get<Blob>({
    url: `/v1/messages/${messageId}/file`,
    responseType: 'blob'
  })
  const blob = (response as unknown as { data: Blob }).data
  if (!(blob instanceof Blob)) throw new Error('获取消息文件失败')
  return blob
}
