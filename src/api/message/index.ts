import request from '@/axios'

/**
 * 机器人简要信息（用于下拉选择）
 */
export interface MessageBotItem {
  id: number
  user_name: string
  agent_id: number
}

/**
 * 聊天列表项（机器人名下的聊天/群/频道）
 */
export interface MessageChatItem {
  id: number
  bot_id: number
  bot_user_name: string
  bot_first_name: string
  agent_name: string
  name: string
  link: string
  type: string
  size: number
  created_at: string | number
  updated_at: string | number
}

/**
 * 聊天列表查询参数（支持分页/筛选）
 */
export interface ChatListParams {
  agent_id?: number
  bot_id?: number
  keyword?: string
  type?: string
  current_page?: number
  page_size?: number
  start_time?: string
  end_time?: string
  order?: string
}

/**
 * 聊天列表响应（分页）
 */
export interface ChatListResponse {
  list: MessageChatItem[]
  pager: {
    current_page: number
    page_size: number
    total: number
  }
}

/**
 * 机器人名下的用户简要信息
 */
export interface MessageUserItem {
  tg_user_id: number
  tg_user_name: string
  tg_first_name: string
}

/**
 * 获取机器人简要列表（下拉选择用）
 * GET /v1/message/bot
 */
export const v1GetMessageBotList = (): Promise<IResponse<MessageBotItem[]>> => {
  return request.get({ url: '/v1/message/bot' })
}

/**
 * 获取机器人名下聊天简要列表（不分页，用于发送消息时下拉选择）
 * GET /v1/message/chat
 */
export const v1GetMessageChatList = (
  botId: number | string
): Promise<IResponse<MessageChatItem[]>> => {
  return request.get({ url: '/v1/message/chat', params: { bot_id: botId } })
}

/**
 * 获取聊天列表（支持分页/搜索/排序）
 * GET /v1/bot/chat
 */
export const v1GetChatList = (params: ChatListParams): Promise<IResponse<ChatListResponse>> => {
  return request.get({ url: '/v1/bot/chat', params })
}

/**
 * 获取机器人名下的用户列表（下拉选择用）
 * GET /v1/message/user
 */
export const v1GetMessageUserList = (
  botId: number | string
): Promise<IResponse<MessageUserItem[]>> => {
  return request.get({ url: '/v1/message/user', params: { bot_id: botId } })
}
