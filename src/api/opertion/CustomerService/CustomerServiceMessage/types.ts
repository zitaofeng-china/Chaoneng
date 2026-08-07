export interface ConversationListItem {
  id: number
  bot_id: number
  user_id: number
  chat_id: number
  last_read_at: string | null
  last_message_at: string | null
  last_message_type: string | null
  last_message_preview: string | null
  tg_username: string | null
  nickname: string | null
  unread_count: number
}

export interface ConversationListParams {
  bot_id?: number
  keyword?: string
  page?: number
  page_size?: number
}

export interface ConversationListResponse {
  list: ConversationListItem[]
  page: number
  page_size: number
  total: number
}

export interface MessageMediaMeta {
  file_name?: string
  file_size?: number
  file_unique_id?: string
  mime_type?: string
}

export interface ConversationMessageItem {
  id: number
  bot_id: number
  user_id: number
  chat_id: number
  message_id: number
  direction: number
  message_type: string
  content: string | null
  media_file_id: string | null
  media_meta: string | MessageMediaMeta | null
  created_at: string
}

export interface ConversationMessageParams {
  page?: number
  page_size?: number
  start_time?: string
  end_time?: string
}

export interface ConversationMessageResponse {
  list: ConversationMessageItem[]
  page: number
  page_size: number
  total: number
}

export interface ConversationReplyParams {
  text?: string
  message_type?: string
  media_url?: string
}

export interface ConversationReplyResult {
  id?: number | string
  message_id?: number | string
  messageId?: number | string
}
