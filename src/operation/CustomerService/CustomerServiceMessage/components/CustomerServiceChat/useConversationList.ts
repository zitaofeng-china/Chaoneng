import dayjs from 'dayjs'
import { computed, onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import { getConversationList } from '@/api/opertion/CustomerService/CustomerServiceMessage'
import type { ConversationListItem } from '@/api/opertion/CustomerService/CustomerServiceMessage'
import { v1GetMessageBotList, type MessageBotItem } from '@/api/opertion/common/message'
import type { ChatMessage, Conversation } from './types'
import { parseApiDateTime, type ApiDateTime } from './time'

interface UseConversationListOptions {
  selectedId: Ref<number | null>
  getCachedMessages: (conversationId: number) => ChatMessage[]
  clearExpiredMessageCaches: () => void
  appendLatestMessages: (conversationId: number) => Promise<number>
}

const conversationRefreshInterval = 5000

/** 客服会话筛选、机器人选项与后台静默轮询。 */
export function useConversationList(options: UseConversationListOptions) {
  const keyword = ref('')
  const botId = ref<number | undefined>()
  const listLoading = ref(false)
  const conversationTotal = ref(0)
  const botList = ref<MessageBotItem[]>([])
  const conversations = ref<Conversation[]>([])
  let conversationListLoading = false
  let conversationRefreshTimer: number | undefined

  const botOptions = computed(() => [
    { label: '全部', value: undefined as number | undefined },
    ...botList.value.map((bot) => ({
      label: bot.user_name || bot.first_name || `Bot#${bot.id}`,
      value: bot.id
    }))
  ])

  function formatConversationTime(value?: ApiDateTime) {
    if (!value) return ''
    const time = parseApiDateTime(value)
    if (!time.isValid()) return value
    const now = dayjs()
    if (time.isSame(now, 'day')) return time.format('HH:mm')
    if (time.isSame(now.subtract(1, 'day'), 'day')) return '昨天'
    if (time.isSame(now, 'year')) return time.format('MM-DD')
    return time.format('YYYY-MM-DD')
  }

  function resolveConversationName(item: ConversationListItem) {
    return (
      item.tg_first_name?.trim() ||
      (item.tg_user_name ? `@${item.tg_user_name.replace(/^@/, '')}` : '') ||
      String(item.chat_id)
    )
  }

  function resolveConversationPreview(item: ConversationListItem) {
    const type = (item.last_message_type || '').toLowerCase()
    if (type.includes('video')) return '[视频]'
    if (type.includes('photo') || type.includes('image') || type.includes('picture'))
      return '[图片]'
    if (type.includes('document') || type.includes('file')) return '[文件]'
    return item.last_message_preview || ''
  }

  function mapConversationItem(item: ConversationListItem): Conversation {
    const name = resolveConversationName(item)
    return {
      id: item.id,
      name,
      avatar: name.replace(/^@/, '').slice(0, 1) || '客',
      userId: String(item.chat_id),
      chatId: item.chat_id,
      botId: item.bot_id,
      tgUsername: item.tg_user_name || '',
      updatedAt: formatConversationTime(item.last_message_at),
      preview: resolveConversationPreview(item),
      unread: item.unread_count || 0,
      lastReadAt: item.last_read_at,
      messages: [...options.getCachedMessages(item.id)]
    }
  }

  async function fetchBotList() {
    try {
      // 客服消息筛选仅需要机器人简要信息，使用无分页的下拉专用接口。
      const res = await v1GetMessageBotList()
      botList.value = res.data ?? []
    } catch {
      // 错误已由 http 拦截器处理
    }
  }

  async function fetchConversationList(silent = false) {
    if (conversationListLoading) return
    conversationListLoading = true
    if (!silent) listLoading.value = true
    try {
      options.clearExpiredMessageCaches()
      const activeConversationId = options.selectedId.value
      const activeMessages = activeConversationId
        ? (conversations.value.find((item) => item.id === activeConversationId)?.messages ?? [])
        : []
      const previousUnreadCount = activeConversationId
        ? (conversations.value.find((item) => item.id === activeConversationId)?.unread ?? 0)
        : 0
      const res = await getConversationList({
        bot_id: botId.value,
        keyword: keyword.value.trim() || undefined,
        current_page: 1,
        page_size: 50
      })
      const list = [...(res.data?.list ?? [])].sort((a, b) => {
        const unreadDiff = Number(Boolean(b.unread_count)) - Number(Boolean(a.unread_count))
        if (unreadDiff) return unreadDiff
        const timeA = parseApiDateTime(a.last_message_at).valueOf() || 0
        const timeB = parseApiDateTime(b.last_message_at).valueOf() || 0
        return timeB - timeA
      })
      conversationTotal.value = res.data?.pager?.total ?? list.length
      conversations.value = list.map(mapConversationItem)
      if (
        options.selectedId.value !== null &&
        !conversations.value.some((item) => item.id === options.selectedId.value)
      ) {
        options.selectedId.value = null
      }
      const refreshedActiveConversation = activeConversationId
        ? conversations.value.find((item) => item.id === activeConversationId)
        : undefined
      // 当前会话已展开的历史消息是完整分页状态的唯一来源，不能被 20 条缓存截断。
      if (refreshedActiveConversation && activeMessages.length) {
        refreshedActiveConversation.messages = activeMessages
      }
      if (
        silent &&
        refreshedActiveConversation &&
        refreshedActiveConversation.unread > previousUnreadCount
      ) {
        void options.appendLatestMessages(refreshedActiveConversation.id)
      }
    } catch {
      // 定时刷新失败时保留当前列表，避免短暂网络波动清空正在处理的会话。
      if (!silent) {
        conversations.value = []
        conversationTotal.value = 0
        options.selectedId.value = null
      }
    } finally {
      conversationListLoading = false
      if (!silent) listLoading.value = false
    }
  }

  function startConversationRefresh() {
    if (conversationRefreshTimer) return
    conversationRefreshTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void fetchConversationList(true)
    }, conversationRefreshInterval)
  }

  function stopConversationRefresh() {
    if (!conversationRefreshTimer) return
    window.clearInterval(conversationRefreshTimer)
    conversationRefreshTimer = undefined
  }

  function handleSearch() {
    void fetchConversationList()
  }

  function resetFilters() {
    keyword.value = ''
    botId.value = undefined
    void fetchConversationList()
  }

  onMounted(() => {
    void fetchBotList()
    void fetchConversationList()
    startConversationRefresh()
  })

  onBeforeUnmount(() => {
    stopConversationRefresh()
  })

  return {
    keyword,
    botId,
    botOptions,
    listLoading,
    conversationTotal,
    conversations,
    handleSearch,
    resetFilters
  }
}
