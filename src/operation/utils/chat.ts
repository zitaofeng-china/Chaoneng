const CHAT_TYPE_TEXT_MAP: Record<string, string> = {
  group: '群组',
  supergroup: '超级群组',
  channel: '频道'
}

export const getChatTypeText = (type?: string, fallback = '-') => {
  return type ? CHAT_TYPE_TEXT_MAP[type] || type : fallback
}
