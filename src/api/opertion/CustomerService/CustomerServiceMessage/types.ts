export interface ConversationListItem {
  id: number
  bot_id: number
  user_id: number
  chat_id: number
  created_at: string | number
  updated_at: string | number
  last_read_at: string | number | null
  last_message_at: string | number | null
  last_message_type: string | null
  last_message_preview: string | null
  /** 1=用户/对方(入)，其他数字=客服(出) */
  last_message_direction?: number | null
  tg_first_name: string | null
  tg_user_name: string | null
  agent_id?: number
  agent_name?: string | null
  unread_count: number
}

export interface ConversationListParams {
  agent_id?: number
  bot_id?: number
  current_page?: number
  keyword?: string
  order?: string
  page_size?: number
  unread_only?: boolean
}

export interface ConversationPager {
  current_page: number
  page_size: number
  total: number
}

export interface ConversationListResponse {
  list: ConversationListItem[]
  pager: ConversationPager
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
  media_type: string
  content: string | null
  media_file_id: string | null
  media_meta: string | MessageMediaMeta | null
  created_at: string | number
  updated_at: string | number
}

export interface ConversationMessageParams {
  current_page?: number
  page_size?: number
  start_time?: string | number
  end_time?: string | number
  keyword?: string
  order?: string
}

export interface ConversationMessageResponse {
  list: ConversationMessageItem[]
  pager: ConversationPager
}

export interface ConversationReplyParams {
  content?: string
  file?: string
}

export interface ConversationReplyResult {
  id?: number | string
  message_id?: number | string
  messageId?: number | string
}
