export type Direction = 'incoming' | 'outgoing'
export type MediaKind = 'image' | 'video' | 'file' | null

export interface ChatMessage {
  id: number
  conversationId: number
  direction: Direction
  content: string
  imageUrls?: string[]
  videoUrl?: string
  fileUrl?: string
  fileName?: string
  fileSize?: number
  mediaKind?: MediaKind
  mediaLoading?: boolean
  mediaTooLarge?: boolean
  createdAt: string | number
  time: string
}

export interface Conversation {
  id: number
  name: string
  avatar: string
  userId: string
  chatId: number
  botId: number
  tgUsername: string
  updatedAt: string
  preview: string
  unread: number
  lastReadAt: string | number | null
  messages: ChatMessage[]
}

export interface QuickReply {
  id: number
  title: string
  content: string
}

export interface SendReplyOptions {
  preserveReplyText?: boolean
  includePendingMedia?: boolean
}

export interface PendingMedia {
  file: File
  previewUrl?: string
  mediaKind: Exclude<MediaKind, null>
}

export interface MessagePageState {
  previousPage: number
  hasMore: boolean
  loading: boolean
  bufferedMessages: ChatMessage[]
  pageSize?: number
  endTime?: string
}
