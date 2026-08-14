import dayjs from 'dayjs'
import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { getConversationList } from '@/api/opertion/CustomerService/CustomerServiceMessage'
import type { ConversationListItem } from '@/api/opertion/CustomerService/CustomerServiceMessage'
import {
  v1GetMessageAgentList,
  v1GetMessageBotList,
  type MessageAgentItem,
  type MessageBotItem
} from '@/api/opertion/common/message'
import type { ChatMessage, Conversation, Direction } from './types'
import { parseApiDateTime, type ApiDateTime } from './time'

const CONVERSATION_PAGE_SIZE = 50

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
  const agentId = ref<number | undefined>()
  const listLoading = ref(false)
  const conversationTotal = ref(0)
  const botList = ref<MessageBotItem[]>([])
  const agentList = ref<MessageAgentItem[]>([])
  const conversations = ref<Conversation[]>([])
  const hasMoreConversations = ref(false)
  const moreLoading = ref(false)
  const currentPage = ref(1)
  let conversationListLoading = false
  let loadingMoreConversations = false
  let conversationRefreshTimer: number | undefined

  const botOptions = computed(() => [
    { label: '全部', value: undefined as number | undefined },
    ...botList.value.map((bot) => ({
      label: bot.user_name || bot.first_name || `Bot#${bot.id}`,
      value: bot.id
    }))
  ])

  const agentOptions = computed(() => [
    { label: '全部', value: undefined as number | undefined },
    ...agentList.value.map((agent) => ({
      label: agent.username || agent.email || `代理#${agent.id}`,
      value: agent.id
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
    const nickname = item.tg_first_name?.trim() || ''
    const username = item.tg_user_name?.trim().replace(/^@/, '') || ''
    if (nickname && username) return `${nickname} (${username})`
    if (nickname) return nickname
    if (username) return `@${username}`
    return String(item.chat_id)
  }

  function resolveAgentName(item: ConversationListItem) {
    return item.agent_name?.trim() || (item.agent_id ? `代理#${item.agent_id}` : '')
  }

  function resolveConversationPreview(item: ConversationListItem) {
    const type = (item.last_message_type || '').toLowerCase()
    if (type.includes('video')) return '[视频]'
    if (type.includes('photo') || type.includes('image') || type.includes('picture'))
      return '[图片]'
    if (type.includes('document') || type.includes('file')) return '[文件]'
    return item.last_message_preview || ''
  }

  function mapMessageDirection(direction?: number | null): Direction | undefined {
    if (direction === undefined || direction === null || Number.isNaN(Number(direction))) {
      return undefined
    }
    return Number(direction) === 1 ? 'incoming' : 'outgoing'
  }

  function isSameMessageTime(left?: ApiDateTime | null, right?: ApiDateTime | null) {
    if (left == null || right == null) return false
    const leftTime = parseApiDateTime(left).valueOf()
    const rightTime = parseApiDateTime(right).valueOf()
    return Boolean(leftTime && rightTime && Math.abs(leftTime - rightTime) < 2000)
  }

  function resolvePreviewDirection(
    item: ConversationListItem,
    previous?: Conversation,
    cachedMessages: ChatMessage[] = []
  ): Direction | undefined {
    const fromApi = mapMessageDirection(item.last_message_direction)
    if (fromApi) return fromApi
    if ((item.unread_count || 0) > 0) return 'incoming'

    const lastCached = cachedMessages.at(-1)
    if (lastCached && isSameMessageTime(lastCached.createdAt, item.last_message_at)) {
      return lastCached.direction
    }

    if (
      previous?.previewDirection &&
      isSameMessageTime(previous.lastMessageAt, item.last_message_at)
    ) {
      return previous.previewDirection
    }

    return undefined
  }

  function mapConversationItem(item: ConversationListItem, previous?: Conversation): Conversation {
    const name = resolveConversationName(item)
    const avatarSource =
      item.tg_first_name?.trim() ||
      item.tg_user_name?.trim().replace(/^@/, '') ||
      String(item.chat_id)
    const messages = [...options.getCachedMessages(item.id)]
    return {
      id: item.id,
      name,
      avatar: avatarSource.slice(0, 1) || '客',
      userId: String(item.chat_id),
      chatId: item.chat_id,
      botId: item.bot_id,
      agentId: item.agent_id,
      agentName: resolveAgentName(item),
      tgUsername: item.tg_user_name || '',
      updatedAt: formatConversationTime(item.last_message_at),
      lastMessageAt: item.last_message_at,
      preview: resolveConversationPreview(item),
      previewDirection: resolvePreviewDirection(item, previous, messages),
      unread: item.unread_count || 0,
      lastReadAt: item.last_read_at,
      messages
    }
  }

  async function fetchAgentList() {
    try {
      const res = await v1GetMessageAgentList()
      agentList.value = res.data ?? []
    } catch {
      agentList.value = []
    }
  }

  async function fetchBotList() {
    try {
      // 客服消息筛选仅需要机器人简要信息，使用无分页的下拉专用接口。
      const res = await v1GetMessageBotList(agentId.value ? { agent_id: agentId.value } : undefined)
      botList.value = res.data ?? []
      if (botId.value !== undefined && !botList.value.some((bot) => bot.id === botId.value)) {
        botId.value = undefined
      }
    } catch {
      // 错误已由 http 拦截器处理
    }
  }

  function sortConversationItems(list: ConversationListItem[]) {
    return [...list].sort((a, b) => {
      const unreadDiff = Number(Boolean(b.unread_count)) - Number(Boolean(a.unread_count))
      if (unreadDiff) return unreadDiff
      const timeA = parseApiDateTime(a.last_message_at).valueOf() || 0
      const timeB = parseApiDateTime(b.last_message_at).valueOf() || 0
      return timeB - timeA
    })
  }

  function updateHasMore(loadedCount: number, pageCount: number, total: number) {
    hasMoreConversations.value = loadedCount < total && pageCount >= CONVERSATION_PAGE_SIZE
  }

  async function requestConversationPage(page: number) {
    const res = await getConversationList({
      agent_id: agentId.value,
      bot_id: botId.value,
      keyword: keyword.value.trim() || undefined,
      current_page: page,
      page_size: CONVERSATION_PAGE_SIZE
    })
    return {
      list: res.data?.list ?? [],
      pager: res.data?.pager
    }
  }

  function applyConversationPage(
    incoming: ConversationListItem[],
    mode: 'replace' | 'append' | 'refresh'
  ) {
    const previousById = new Map(conversations.value.map((item) => [item.id, item]))
    const mapped = incoming.map((item) => {
      const previous = previousById.get(item.id)
      const next = mapConversationItem(item, previous)
      if (previous?.messages.length) next.messages = previous.messages
      return next
    })

    if (mode === 'replace') {
      conversations.value = mapped
      return
    }

    if (mode === 'append') {
      const existingIds = new Set(conversations.value.map((item) => item.id))
      conversations.value = [
        ...conversations.value,
        ...mapped.filter((item) => !existingIds.has(item.id))
      ]
      return
    }

    const incomingIds = new Set(mapped.map((item) => item.id))
    const updated = conversations.value.map((item) => {
      if (!incomingIds.has(item.id)) return item
      return mapped.find((next) => next.id === item.id) ?? item
    })
    const newcomers = mapped.filter((item) => !previousById.has(item.id))
    conversations.value = [...newcomers, ...updated]
  }

  async function fetchConversationList(silent = false) {
    if (conversationListLoading || loadingMoreConversations) return
    conversationListLoading = true
    if (!silent) listLoading.value = true
    try {
      options.clearExpiredMessageCaches()
      const activeConversationId = options.selectedId.value
      const previousUnreadCount = activeConversationId
        ? (conversations.value.find((item) => item.id === activeConversationId)?.unread ?? 0)
        : 0
      const { list, pager } = await requestConversationPage(1)
      const pageList = sortConversationItems(list)
      conversationTotal.value = pager?.total ?? pageList.length
      if (!silent) currentPage.value = 1
      applyConversationPage(pageList, silent ? 'refresh' : 'replace')
      if (silent) {
        hasMoreConversations.value = conversations.value.length < conversationTotal.value
      } else {
        updateHasMore(conversations.value.length, pageList.length, conversationTotal.value)
      }
      if (
        !silent &&
        options.selectedId.value !== null &&
        !conversations.value.some((item) => item.id === options.selectedId.value)
      ) {
        options.selectedId.value = null
      }
      const refreshedActiveConversation = activeConversationId
        ? conversations.value.find((item) => item.id === activeConversationId)
        : undefined
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
        currentPage.value = 1
        hasMoreConversations.value = false
        options.selectedId.value = null
      }
    } finally {
      conversationListLoading = false
      if (!silent) listLoading.value = false
    }
  }

  async function loadMoreConversations() {
    if (
      conversationListLoading ||
      loadingMoreConversations ||
      moreLoading.value ||
      !hasMoreConversations.value
    ) {
      return
    }

    loadingMoreConversations = true
    moreLoading.value = true
    try {
      const nextPage = currentPage.value + 1
      const { list, pager } = await requestConversationPage(nextPage)
      const pageList = sortConversationItems(list)
      conversationTotal.value = pager?.total ?? conversationTotal.value
      applyConversationPage(pageList, 'append')
      currentPage.value = nextPage
      updateHasMore(conversations.value.length, pageList.length, conversationTotal.value)
    } catch {
      hasMoreConversations.value = conversations.value.length < conversationTotal.value
    } finally {
      loadingMoreConversations = false
      moreLoading.value = false
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
    agentId.value = undefined
    void fetchBotList()
    void fetchConversationList()
  }

  watch(agentId, () => {
    void fetchBotList()
  })

  onMounted(() => {
    void fetchAgentList()
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
    agentId,
    botOptions,
    agentOptions,
    listLoading,
    conversationTotal,
    conversations,
    hasMoreConversations,
    moreLoading,
    handleSearch,
    resetFilters,
    loadMoreConversations
  }
}
