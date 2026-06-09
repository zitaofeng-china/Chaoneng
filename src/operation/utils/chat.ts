import { withAllOption } from '@/utils/tableHelpers'

const CHAT_TYPE_TEXT_MAP: Record<string, string> = {
  group: '群组',
  supergroup: '超级群组',
  channel: '频道'
}

export const CHAT_TYPE_OPTIONS = Object.entries(CHAT_TYPE_TEXT_MAP).map(([value, label]) => ({
  label,
  value
}))

export const CHAT_TYPE_SEARCH_OPTIONS = withAllOption(CHAT_TYPE_OPTIONS)

export const getChatTypeText = (type?: string, fallback = '-') => {
  return type ? CHAT_TYPE_TEXT_MAP[type] || type : fallback
}
