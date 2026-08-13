import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type {
  ChatMessage,
  Conversation,
  MediaKind,
  MessagePageState,
  SendReplyOptions
} from './types'
import {
  getConversationList,
  getConversationMessages,
  markConversationRead,
  replyConversation
} from '@/api/opertion/CustomerService/CustomerServiceMessage'
import type {
  ConversationListItem,
  ConversationMessageItem,
  ConversationReplyParams,
  ConversationReplyResult
} from '@/api/opertion/CustomerService/CustomerServiceMessage'
import { uploadFile } from '@/api/opertion/common/upload'
import { useQuickReplies } from './useQuickReplies'
import { usePendingMedia } from './usePendingMedia'
import { useMessageMedia } from './useMessageMedia'
import { useConversationList } from './useConversationList'
import { parseApiDateTime, type ApiDateTime } from './time'

/**
 * 客服会话页的状态与交互控制器。
 * 页面组件只负责组合子组件，消息分页、滚动锚点、缓存和媒体生命周期集中在这里维护。
 */
export function useCustomerServiceChat() {
  interface MessageViewportSnapshot {
    scrollTop: number
    scrollHeight: number
    anchorMessageId?: number
    anchorViewportTop?: number
  }

  const selectedId = ref<number | null>(null)
  const messagesLoading = ref(false)
  const olderMessagesLoading = ref(false)
  const replyText = ref('')
  const replySending = ref(false)
  const conversationPanel = ref<{
    focusReplyInput: () => void
    getMessageArea: () => HTMLElement | undefined
  }>()
  const mediaViewer = ref<{ openImage: (url: string) => void; openVideo: (url: string) => void }>()
  const replyInputFocused = ref(false)
  const mediaViewerVisible = ref(false)
  const chatFullscreen = ref(false)
  const maxCachedMessages = 20
  const messageCacheIdleMs = 30 * 60 * 1000
  /** 会话消息缓存，只保留最近 20 条。 */
  const messageCache = ref<Record<number, ChatMessage[]>>({})
  /** 缓存被截断时，重新打开会话必须重新拉取完整分页，避免分页游标与消息区间错位。 */
  const messageCacheTruncated = ref<Record<number, boolean>>({})
  /** 对方最后一次新消息后，缓存的到期时间。 */
  const messageCacheExpiresAt = ref<Record<number, number>>({})
  const messagePageState = ref<Record<number, MessagePageState>>({})
  const unreadDividerMessageId = ref<number | null>(null)
  const unreadRemainingCount = ref(0)
  const loadingRemainingUnread = ref(false)
  let messageRequestSeq = 0
  let readingConversationId: number | null = null
  let appendingLatestMessages = false
  let messageCacheCleanupTimer: number | undefined
  let conversationSwitchTimer: number | undefined
  let deferringConversationLoad = false

  const {
    keyword,
    botId,
    agentId,
    botOptions,
    agentOptions,
    listLoading,
    conversationTotal,
    conversations,
    handleSearch,
    resetFilters
  } = useConversationList({
    selectedId,
    getCachedMessages,
    clearExpiredMessageCaches,
    appendLatestMessages
  })

  const activeConversation = computed(() =>
    conversations.value.find((item) => item.id === selectedId.value)
  )

  const { pendingImages, isDraggingImages, addMedia, removePendingImage } = usePendingMedia({
    onMediaLayoutChange: scrollToLatestAfterReplyLayoutChange
  })

  const {
    mapMessageItem,
    attachMessageMedia,
    clearMessageObjectUrls,
    loadMessageMedia,
    waitForMessageMediaLayout,
    loadLargeMessageMedia
  } = useMessageMedia({
    getMessageArea,
    formatMessageTime
  })

  const {
    showQuickReply,
    MAX_QUICK_REPLIES,
    quickReplies,
    quickReplyModalVisible,
    quickReplyForm,
    sendQuickReply,
    openQuickReplyManager,
    addQuickReply,
    removeQuickReply
  } = useQuickReplies({
    mediaViewerVisible,
    canSendQuickReply: () => Boolean(activeConversation.value) && !replySending.value,
    focusReplyInput,
    sendReply
  })

  function getMessageArea() {
    return conversationPanel.value?.getMessageArea()
  }

  function focusReplyInput() {
    if (!activeConversation.value) return
    void nextTick(() => conversationPanel.value?.focusReplyInput())
  }

  async function syncReadStateWithReplyFocus(conversationId: number) {
    if (!replyInputFocused.value || selectedId.value !== conversationId) return false
    const conversation = conversations.value.find((item) => item.id === conversationId)
    if (!conversation?.unread) return true
    if (readingConversationId === conversationId) return false

    readingConversationId = conversationId
    try {
      const readUpdated = await updateConversationRead(conversationId)
      if (!readUpdated || selectedId.value !== conversationId) return false
      const currentConversation = conversations.value.find((item) => item.id === conversationId)
      if (currentConversation) currentConversation.unread = 0
      unreadDividerMessageId.value = null
      unreadRemainingCount.value = 0
      return true
    } finally {
      readingConversationId = null
    }
  }

  function handleReplyInputFocus() {
    replyInputFocused.value = true
    if (selectedId.value) void syncReadStateWithReplyFocus(selectedId.value)
  }

  function formatMessageTime(value?: ApiDateTime) {
    if (!value) return ''
    const time = parseApiDateTime(value)
    if (!time.isValid()) return value
    const now = dayjs()
    if (time.isSame(now, 'day')) return time.format('HH:mm')
    if (time.isSame(now, 'year')) return time.format('MM-DD HH:mm')
    return time.format('YYYY-MM-DD HH:mm')
  }

  function formatFileSize(size?: number) {
    if (!size || size <= 0) return ''
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / 1024 / 1024).toFixed(1)} MB`
  }

  function applyLastMessagePreviewMeta(conversation: Conversation) {
    const lastMessage = conversation.messages.at(-1)
    if (!lastMessage) return
    conversation.previewDirection = lastMessage.direction
    conversation.lastMessageAt = lastMessage.createdAt
  }

  function cacheConversationMessages(
    conversationId: number,
    messages: ChatMessage[],
    refreshIdleExpiry = false
  ) {
    const cachedMessages = messages.slice(-maxCachedMessages)
    messageCache.value[conversationId] = cachedMessages
    messageCacheTruncated.value[conversationId] = messages.length > maxCachedMessages
    if (refreshIdleExpiry) {
      const latestMessage = cachedMessages[cachedMessages.length - 1]
      const latestMessageAt = latestMessage
        ? parseApiDateTime(latestMessage.createdAt).valueOf()
        : Date.now()
      messageCacheExpiresAt.value[conversationId] = latestMessageAt + messageCacheIdleMs
    } else if (!messageCacheExpiresAt.value[conversationId]) {
      messageCacheExpiresAt.value[conversationId] = Date.now() + messageCacheIdleMs
    }
    return cachedMessages
  }

  function clearMessageCache(conversationId: number) {
    const cachedMessages = messageCache.value[conversationId]
    if (cachedMessages && selectedId.value !== conversationId)
      clearMessageObjectUrls(cachedMessages)
    delete messageCache.value[conversationId]
    delete messageCacheTruncated.value[conversationId]
    delete messageCacheExpiresAt.value[conversationId]
    delete messagePageState.value[conversationId]
  }

  function clearExpiredMessageCaches() {
    const now = Date.now()
    Object.entries(messageCacheExpiresAt.value).forEach(([id, expiresAt]) => {
      const conversationId = Number(id)
      // 当前活动会话仍依赖分页游标；不能在长时间停留时清掉已加载历史。
      if (conversationId === selectedId.value) {
        messageCacheExpiresAt.value[conversationId] = now + messageCacheIdleMs
        return
      }
      if (expiresAt <= now) clearMessageCache(conversationId)
    })
  }

  function getCachedMessages(conversationId: number) {
    if (
      messageCacheExpiresAt.value[conversationId] &&
      messageCacheExpiresAt.value[conversationId] <= Date.now()
    ) {
      clearMessageCache(conversationId)
    }
    return messageCache.value[conversationId] || []
  }

  function captureMessageViewport(): MessageViewportSnapshot | null {
    const messageArea = getMessageArea()
    if (!messageArea) return null

    const areaTop = messageArea.getBoundingClientRect().top
    const anchor = Array.from(messageArea.querySelectorAll<HTMLElement>('[data-message-id]')).find(
      (item) => item.getBoundingClientRect().bottom > areaTop + 1
    )
    const anchorMessageId = Number(anchor?.dataset.messageId)

    return {
      scrollTop: messageArea.scrollTop,
      scrollHeight: messageArea.scrollHeight,
      anchorMessageId: Number.isSafeInteger(anchorMessageId) ? anchorMessageId : undefined,
      anchorViewportTop: anchor?.getBoundingClientRect().top
    }
  }

  function restoreMessageViewport(snapshot: MessageViewportSnapshot | null) {
    const messageArea = getMessageArea()
    if (!snapshot || !messageArea) return

    if (snapshot.anchorMessageId !== undefined && snapshot.anchorViewportTop !== undefined) {
      const anchor = messageArea.querySelector<HTMLElement>(
        `[data-message-id="${snapshot.anchorMessageId}"]`
      )
      if (anchor) {
        const offset = anchor.getBoundingClientRect().top - snapshot.anchorViewportTop
        if (Math.abs(offset) > 1) messageArea.scrollTop += offset
        return
      }
    }

    const heightDelta = messageArea.scrollHeight - snapshot.scrollHeight
    if (Math.abs(heightDelta) > 1) messageArea.scrollTop = snapshot.scrollTop + heightDelta
  }

  async function loadConversationMessages(conversationId: number, markAsRead = true) {
    const requestSeq = ++messageRequestSeq
    let shouldScrollToLatest = false
    messagesLoading.value = true
    olderMessagesLoading.value = false
    unreadDividerMessageId.value = null
    unreadRemainingCount.value = 0
    messagePageState.value[conversationId] = {
      previousPage: 0,
      hasMore: false,
      loading: false,
      bufferedMessages: []
    }

    try {
      const currentConversation = conversations.value.find((item) => item.id === conversationId)
      if (
        currentConversation &&
        currentConversation.unread > 10 &&
        currentConversation.lastReadAt
      ) {
        const historyFirstPage = await getConversationMessages(conversationId, {
          current_page: 1,
          page_size: 10,
          end_time: currentConversation.lastReadAt
        })
        if (requestSeq !== messageRequestSeq || selectedId.value !== conversationId) return

        const historyTotal = historyFirstPage.data?.pager?.total ?? 0
        const historyLastPage = Math.max(1, Math.ceil(historyTotal / 10))
        const historyResponse =
          historyLastPage === 1
            ? historyFirstPage
            : await getConversationMessages(conversationId, {
                current_page: historyLastPage,
                page_size: 10,
                end_time: currentConversation.lastReadAt
              })
        if (requestSeq !== messageRequestSeq || selectedId.value !== conversationId) return

        const unreadResponse = await getConversationMessages(conversationId, {
          current_page: 1,
          page_size: 10,
          start_time: currentConversation.lastReadAt
        })
        if (requestSeq !== messageRequestSeq || selectedId.value !== conversationId) return

        const unreadItems = (unreadResponse.data?.list ?? [])
          .filter((item) =>
            parseApiDateTime(item.created_at).isAfter(
              parseApiDateTime(currentConversation.lastReadAt)
            )
          )
          .slice(0, 10)
        const loadedItems = [...(historyResponse.data?.list ?? []), ...unreadItems]
          .filter(
            (item, index, list) => list.findIndex((candidate) => candidate.id === item.id) === index
          )
          .sort((a, b) => {
            const timeA = parseApiDateTime(a.created_at).valueOf()
            const timeB = parseApiDateTime(b.created_at).valueOf()
            if (timeA !== timeB) return timeA - timeB
            return a.id - b.id
          })
        const messages = loadedItems.map((item) => mapMessageItem(item, conversationId))
        clearMessageObjectUrls(currentConversation.messages)
        currentConversation.messages = messages
        applyLastMessagePreviewMeta(currentConversation)
        cacheConversationMessages(conversationId, messages, true)
        loadMessageMedia(messages)
        if (currentConversation.unread) {
          unreadDividerMessageId.value =
            messages.find((item) => unreadItems.some((unread) => unread.id === item.id))?.id ?? null
          unreadRemainingCount.value = Math.max(0, currentConversation.unread - unreadItems.length)
        }
        messagePageState.value[conversationId] = {
          previousPage: historyLastPage - 1,
          hasMore: historyLastPage > 1,
          loading: false,
          bufferedMessages: [],
          pageSize: 10,
          endTime: currentConversation.lastReadAt
        }
        shouldScrollToLatest = true

        if (markAsRead && requestSeq === messageRequestSeq && selectedId.value === conversationId) {
          await syncReadStateWithReplyFocus(conversationId)
        }
        return
      }

      const firstPage = await getConversationMessages(conversationId, {
        current_page: 1,
        page_size: 20
      })
      if (requestSeq !== messageRequestSeq || selectedId.value !== conversationId) return

      const total = firstPage.data?.pager?.total ?? 0
      const latestPage = Math.max(1, Math.ceil(total / 20))
      let latestResponse = firstPage
      let previousResponse: typeof firstPage | undefined
      if (latestPage > 1) {
        latestResponse = await getConversationMessages(conversationId, {
          current_page: latestPage,
          page_size: 20
        })
        if (requestSeq !== messageRequestSeq || selectedId.value !== conversationId) return

        previousResponse =
          latestPage === 2
            ? firstPage
            : await getConversationMessages(conversationId, {
                current_page: latestPage - 1,
                page_size: 20
              })
        if (requestSeq !== messageRequestSeq || selectedId.value !== conversationId) return
      }

      const list = [
        ...(previousResponse?.data?.list ?? []),
        ...(latestResponse.data?.list ?? [])
      ].sort((a, b) => {
        const ta = parseApiDateTime(a.created_at).valueOf()
        const tb = parseApiDateTime(b.created_at).valueOf()
        if (ta !== tb) return ta - tb
        return a.id - b.id
      })

      const allMessages = list.map((item) => mapMessageItem(item, conversationId))
      const messages = allMessages.slice(-20)
      const bufferedMessages = allMessages.slice(0, -20)

      const conversation = conversations.value.find((item) => item.id === conversationId)
      if (conversation) {
        clearMessageObjectUrls(conversation.messages)
        conversation.messages = messages
        applyLastMessagePreviewMeta(conversation)
      }
      cacheConversationMessages(conversationId, messages, true)
      loadMessageMedia(messages)
      if (conversation?.unread && conversation.lastReadAt) {
        unreadDividerMessageId.value =
          messages.find((item) =>
            parseApiDateTime(item.createdAt).isAfter(parseApiDateTime(conversation.lastReadAt))
          )?.id ?? null
      }
      messagePageState.value[conversationId] = {
        previousPage: latestPage - 2,
        hasMore: bufferedMessages.length > 0 || latestPage > 2,
        loading: false,
        bufferedMessages
      }
      shouldScrollToLatest = true

      // 只有客服开始在回复输入框输入内容后，才将会话标记为已读。
      if (markAsRead && requestSeq === messageRequestSeq && selectedId.value === conversationId) {
        await syncReadStateWithReplyFocus(conversationId)
      }
    } catch {
      if (requestSeq !== messageRequestSeq || selectedId.value !== conversationId) return
      const conversation = conversations.value.find((item) => item.id === conversationId)
      if (conversation) {
        clearMessageObjectUrls(conversation.messages)
        conversation.messages = []
      }
      clearMessageCache(conversationId)
    } finally {
      if (requestSeq === messageRequestSeq) {
        messagesLoading.value = false
        if (shouldScrollToLatest && selectedId.value === conversationId) {
          await scrollToLatest()
        }
      }
    }
  }

  async function loadOlderMessages(conversationId: number) {
    const state = messagePageState.value[conversationId]
    if (!state || !state.hasMore || state.loading || selectedId.value !== conversationId) return

    state.loading = true
    olderMessagesLoading.value = true
    const requestSeq = messageRequestSeq

    try {
      let olderMessages = state.bufferedMessages
      let loadedPreviousPage = false
      if (!olderMessages.length && state.previousPage > 0) {
        const res = await getConversationMessages(conversationId, {
          current_page: state.previousPage,
          page_size: state.pageSize ?? 20,
          end_time: state.endTime
        })
        if (requestSeq !== messageRequestSeq || selectedId.value !== conversationId) return
        const list = [...(res.data?.list ?? [])].sort((a, b) => {
          const ta = parseApiDateTime(a.created_at).valueOf()
          const tb = parseApiDateTime(b.created_at).valueOf()
          if (ta !== tb) return ta - tb
          return a.id - b.id
        })
        olderMessages = list.map((item) => mapMessageItem(item, conversationId))
        loadedPreviousPage = true
      }
      if (!olderMessages.length) {
        state.hasMore = false
        return
      }

      await Promise.all(
        olderMessages.filter((item) => item.mediaKind).map((message) => attachMessageMedia(message))
      )
      if (requestSeq !== messageRequestSeq || selectedId.value !== conversationId) {
        clearMessageObjectUrls(olderMessages)
        return
      }

      const conversation = conversations.value.find((item) => item.id === conversationId)
      if (!conversation) return
      const existingIds = new Set(conversation.messages.map((item) => item.id))
      const uniqueMessages = olderMessages.filter((item) => !existingIds.has(item.id))
      clearMessageObjectUrls(olderMessages.filter((item) => existingIds.has(item.id)))
      // 请求和媒体读取期间用户可能已改变滚动位置，因此在真正插入前再记录实时锚点。
      const viewportBeforeInsert = captureMessageViewport()
      conversation.messages.unshift(...uniqueMessages)
      cacheConversationMessages(conversationId, conversation.messages)

      state.bufferedMessages = []
      if (loadedPreviousPage) state.previousPage -= 1
      state.hasMore = state.bufferedMessages.length > 0 || state.previousPage > 0
      // 与消息插入同一轮更新移除顶部 loading，避免其高度参与锚点补偿后又消失。
      olderMessagesLoading.value = false
      await nextTick()

      restoreMessageViewport(viewportBeforeInsert)
      const messageArea = getMessageArea()
      const restoredScrollTop = messageArea?.scrollTop
      const mediaMessageIds = uniqueMessages.filter((item) => item.mediaKind).map((item) => item.id)
      if (messageArea && restoredScrollTop !== undefined && mediaMessageIds.length) {
        await waitForMessageMediaLayout(mediaMessageIds)
        // 只有等待媒体布局期间用户没有继续滚动，才进行第二次锚点补偿。
        if (
          getMessageArea() === messageArea &&
          Math.abs(messageArea.scrollTop - restoredScrollTop) <= 1
        ) {
          restoreMessageViewport(viewportBeforeInsert)
        }
      }
    } catch {
      // 请求异常已由 http 拦截器处理，保留当前已加载消息以便重试。
    } finally {
      if (requestSeq === messageRequestSeq) {
        state.loading = false
        olderMessagesLoading.value = false
      }
    }
  }

  async function appendLatestMessages(
    conversationId: number,
    scrollBehavior: ScrollBehavior | null = 'auto'
  ): Promise<number> {
    if (appendingLatestMessages || messagesLoading.value || selectedId.value !== conversationId)
      return 0
    const conversation = conversations.value.find((item) => item.id === conversationId)
    const latestLoadedMessage = conversation?.messages.at(-1)
    if (!conversation || !latestLoadedMessage) return 0

    appendingLatestMessages = true
    const requestSeq = messageRequestSeq
    try {
      const latestTime = parseApiDateTime(latestLoadedMessage.createdAt).valueOf()
      const existingIds = new Set(conversation.messages.map((item) => item.id))
      const collectedItems: ConversationMessageItem[] = []
      const collectedIds = new Set<number>()
      const pageSize = 20
      let page = 1
      let totalPages = 1

      // start_time 为 Unix 秒级时间戳；同秒内可能含已加载消息，需按时间与 id 过滤增量。
      while (page <= totalPages && collectedItems.length < pageSize) {
        const response = await getConversationMessages(conversationId, {
          current_page: page,
          page_size: pageSize,
          start_time: latestLoadedMessage.createdAt
        })
        if (requestSeq !== messageRequestSeq || selectedId.value !== conversationId) return 0

        const list = response.data?.list ?? []
        if (page === 1) {
          totalPages = Math.max(1, Math.ceil(Number(response.data?.pager?.total ?? 0) / pageSize))
        }
        list.forEach((item) => {
          const itemTime = parseApiDateTime(item.created_at).valueOf()
          const isNewer =
            itemTime > latestTime || (itemTime === latestTime && item.id > latestLoadedMessage.id)
          if (isNewer && !existingIds.has(item.id) && !collectedIds.has(item.id)) {
            collectedItems.push(item)
            collectedIds.add(item.id)
          }
        })
        if (!list.length) break
        page += 1
      }

      const messages = collectedItems
        .sort((a, b) => {
          const timeA = parseApiDateTime(a.created_at).valueOf()
          const timeB = parseApiDateTime(b.created_at).valueOf()
          if (timeA !== timeB) return timeA - timeB
          return a.id - b.id
        })
        .map((item) => mapMessageItem(item, conversationId))
      if (!messages.length) return 0

      const messageArea = getMessageArea()
      const isAtBottom =
        !messageArea ||
        messageArea.scrollHeight - messageArea.scrollTop - messageArea.clientHeight < 48
      conversation.messages.push(...messages)
      applyLastMessagePreviewMeta(conversation)
      cacheConversationMessages(conversationId, conversation.messages, true)
      if (!unreadDividerMessageId.value && conversation.unread) {
        unreadDividerMessageId.value =
          messages.find((item) => item.direction === 'incoming')?.id ?? null
      }
      unreadRemainingCount.value = Math.max(0, unreadRemainingCount.value - messages.length)
      loadMessageMedia(messages)
      await syncReadStateWithReplyFocus(conversationId)
      if (isAtBottom && scrollBehavior) void scrollToLatest(scrollBehavior)
      return messages.length
    } catch {
      // 定时增量获取失败时保留已显示的消息，等待下次轮询重试。
      return 0
    } finally {
      appendingLatestMessages = false
    }
  }

  async function loadRemainingUnreadMessages() {
    const conversationId = selectedId.value
    if (!conversationId || loadingRemainingUnread.value) return
    loadingRemainingUnread.value = true
    let remainingToLoad = unreadRemainingCount.value
    try {
      while (remainingToLoad > 0) {
        const appendedCount = await appendLatestMessages(conversationId, null)
        if (!appendedCount) break
        remainingToLoad -= appendedCount
        await scrollToLatest('smooth')
      }
      if (selectedId.value === conversationId) await scrollToLatest('smooth')
    } finally {
      loadingRemainingUnread.value = false
    }
  }

  async function updateConversationRead(conversationId: number) {
    try {
      await markConversationRead(conversationId)
      return true
    } catch {
      // 请求异常已由 HTTP 拦截器提示，不影响当前会话的正常展示。
      return false
    }
  }

  function handleConversationClick(conversation: Conversation) {
    cancelDeferredConversationLoad()
    if (selectedId.value === conversation.id) {
      void loadConversationMessages(conversation.id)
      return
    }
    selectedId.value = conversation.id
  }

  function switchConversation(offset: 1 | -1, deferLoad = false) {
    if (!conversations.value.length) return false
    const currentIndex = conversations.value.findIndex((item) => item.id === selectedId.value)
    const nextIndex =
      currentIndex < 0
        ? offset > 0
          ? 0
          : conversations.value.length - 1
        : (currentIndex + offset + conversations.value.length) % conversations.value.length
    const nextConversation = conversations.value[nextIndex]
    if (!nextConversation || nextConversation.id === selectedId.value) return false
    deferringConversationLoad = deferLoad
    selectedId.value = nextConversation.id
    if (!deferLoad) deferringConversationLoad = false
    return true
  }

  function cancelDeferredConversationLoad() {
    if (conversationSwitchTimer) window.clearTimeout(conversationSwitchTimer)
    conversationSwitchTimer = undefined
    deferringConversationLoad = false
  }

  function loadSelectedConversation(conversationId: number) {
    const cachedMessages = getCachedMessages(conversationId)
    if (!cachedMessages?.length || messageCacheTruncated.value[conversationId]) {
      void loadConversationMessages(conversationId)
      return
    }

    const conversation = conversations.value.find((item) => item.id === conversationId)
    if (conversation) conversation.messages = [...cachedMessages]
    messagesLoading.value = false
    void scrollToLatest()
    void appendLatestMessages(conversationId)
  }

  function scheduleConversationLoad() {
    if (conversationSwitchTimer) window.clearTimeout(conversationSwitchTimer)
    conversationSwitchTimer = window.setTimeout(() => {
      conversationSwitchTimer = undefined
      deferringConversationLoad = false
      if (selectedId.value) loadSelectedConversation(selectedId.value)
    }, 1500)
  }

  function handleConversationShortcut(event: KeyboardEvent) {
    if (
      event.code === 'Escape' &&
      chatFullscreen.value &&
      !quickReplyModalVisible.value &&
      !mediaViewerVisible.value
    ) {
      event.preventDefault()
      chatFullscreen.value = false
      return
    }
    if (
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      quickReplyModalVisible.value ||
      mediaViewerVisible.value
    )
      return
    if (event.code === 'Tab') {
      event.preventDefault()
      if (switchConversation(1, true)) scheduleConversationLoad()
    } else if (event.code === 'Backquote') {
      event.preventDefault()
      if (switchConversation(-1, true)) scheduleConversationLoad()
    }
  }

  function toggleChatFullscreen() {
    chatFullscreen.value = !chatFullscreen.value
    void scrollToLatestAfterReplyLayoutChange()
  }

  function closeConversationPanel() {
    cancelDeferredConversationLoad()
    messageRequestSeq += 1
    selectedId.value = null
    replyText.value = ''
    pendingImages.value = []
    replyInputFocused.value = false
    messagesLoading.value = false
    olderMessagesLoading.value = false
    unreadDividerMessageId.value = null
    unreadRemainingCount.value = 0
    loadingRemainingUnread.value = false
  }

  function handleConversationWheel(event: WheelEvent) {
    if (!event.ctrlKey || !event.deltaY) return
    event.preventDefault()
    if (switchConversation(event.deltaY > 0 ? 1 : -1, true)) scheduleConversationLoad()
  }

  function startMessageCacheCleanup() {
    if (messageCacheCleanupTimer) window.clearInterval(messageCacheCleanupTimer)
    clearExpiredMessageCaches()
    messageCacheCleanupTimer = window.setInterval(clearExpiredMessageCaches, 60 * 1000)
  }

  function stopMessageCacheCleanup() {
    if (messageCacheCleanupTimer) window.clearInterval(messageCacheCleanupTimer)
    messageCacheCleanupTimer = undefined
  }

  function toRelativeMediaUrl(url: string) {
    try {
      const parsed = new URL(url)
      return `${parsed.pathname}${parsed.search}${parsed.hash}`
    } catch {
      return url
    }
  }

  function toDisplayMediaUrl(url: string) {
    if (/^(?:blob:|data:|https?:)/i.test(url)) return url
    try {
      const apiBaseUrl = new URL(
        import.meta.env.VITE_API_BASE_URL || window.location.origin,
        window.location.origin
      )
      return new URL(url, apiBaseUrl).href
    } catch {
      return url
    }
  }

  function resolveReplyMessageId(data: unknown) {
    const value =
      typeof data === 'object' && data !== null
        ? ((data as { id?: unknown; message_id?: unknown; messageId?: unknown }).id ??
          (data as { message_id?: unknown }).message_id ??
          (data as { messageId?: unknown }).messageId)
        : data
    const id = Number(value)
    return Number.isSafeInteger(id) && id > 0 ? id : null
  }

  function getMediaPreviewText(mediaKind?: MediaKind) {
    if (mediaKind === 'image') return '[图片]'
    if (mediaKind === 'video') return '[视频]'
    return '[文件]'
  }

  function moveConversationToTop(conversationId: number) {
    const index = conversations.value.findIndex((item) => item.id === conversationId)
    if (index <= 0) return
    const [conversation] = conversations.value.splice(index, 1)
    conversations.value.unshift(conversation)
  }

  function openImage(url: string) {
    mediaViewer.value?.openImage(url)
  }

  function openVideo(url: string) {
    mediaViewer.value?.openVideo(url)
  }

  async function sendReply(
    contentOverride?: string,
    options: SendReplyOptions = {}
  ): Promise<void> {
    const conversation = activeConversation.value
    const content = (contentOverride ?? replyText.value).trim()
    const pendingMedia =
      options.includePendingMedia === false
        ? []
        : [...pendingImages.value].sort((a, b) => {
            const order = { image: 0, video: 1, file: 2 } as const
            return order[a.mediaKind] - order[b.mediaKind]
          })
    if (!conversation) return
    if (!content && !pendingMedia.length) {
      ElMessage.warning('请输入回复内容或选择文件')
      return
    }
    replySending.value = true

    try {
      const uploadedMedia = await Promise.all(
        pendingMedia.map(async ({ file, mediaKind, previewUrl }) => {
          const uploadType = mediaKind === 'file' ? 'document' : mediaKind
          const uploadData = new FormData()
          uploadData.append('file', file)
          uploadData.append('media_type', uploadType)
          const res = await uploadFile(uploadData)
          const url = res.data?.url
          if (!url) throw new Error('媒体上传失败')
          return { mediaKind, url, fileName: file.name, fileSize: file.size, previewUrl }
        })
      )

      // Telegram 的图片、视频和文件均可携带 caption；将文本合并进第一条媒体请求。
      // 多个附件仍按当前单媒体接口依次发送，文本只作为首个附件的 caption，避免重复。
      const replyPayloads: ConversationReplyParams[] = uploadedMedia.length
        ? uploadedMedia.map(({ mediaKind, url }, index) => ({
            file: toRelativeMediaUrl(url),
            ...(index === 0 && content ? { content } : {})
          }))
        : [{ content }]

      const replyResults: IResponse<ConversationReplyResult | string | number>[] = []
      for (const payload of replyPayloads) {
        replyResults.push(await replyConversation(conversation.id, payload))
      }

      const replyMessageIds = replyResults.map((result) => resolveReplyMessageId(result.data))
      const now = dayjs()
      const time = now.format('HH:mm')
      const messages = replyPayloads.map((payload, index): ChatMessage => {
        const messageId = replyMessageIds[index]
        const media = uploadedMedia[index]
        const mediaKind = media?.mediaKind ?? null
        return {
          id: messageId ?? Date.now() + index,
          conversationId: conversation.id,
          direction: 'outgoing',
          content: payload.content || '',
          imageUrls: mediaKind === 'image' && media?.previewUrl ? [media.previewUrl] : undefined,
          videoUrl: mediaKind === 'video' ? media?.previewUrl : undefined,
          fileUrl: mediaKind === 'file' ? media?.url : undefined,
          fileName: media?.fileName,
          fileSize: media?.fileSize,
          mediaKind,
          mediaLoading: false,
          createdAt: now.toISOString(),
          time
        }
      })
      conversation.messages.push(...messages)
      cacheConversationMessages(conversation.id, conversation.messages, true)
      conversation.preview = content || getMediaPreviewText(uploadedMedia[0]?.mediaKind)
      conversation.previewDirection = 'outgoing'
      conversation.lastMessageAt = now.toISOString()
      conversation.updatedAt = time
      conversation.unread = 0
      moveConversationToTop(conversation.id)
      if (!options.preserveReplyText) replyText.value = ''
      if (options.includePendingMedia !== false) pendingImages.value = []
      void scrollToLatestAfterReplyLayoutChange()
      void scrollToLatest()
      ElMessage.success('回复已发送')
    } catch {
      // 上传或回复失败时保留输入和待发送图片，便于直接重试。
    } finally {
      replySending.value = false
    }
  }

  async function scrollToLatestAfterReplyLayoutChange() {
    await nextTick()
    await scrollToLatest()
    window.requestAnimationFrame(() => {
      void scrollToLatest()
      window.requestAnimationFrame(() => {
        void scrollToLatest()
      })
    })
    window.setTimeout(() => void scrollToLatest(), 120)
    window.setTimeout(() => void scrollToLatest(), 360)
  }

  async function scrollToLatest(behavior: ScrollBehavior = 'auto') {
    await nextTick()
    const messageArea = getMessageArea()
    if (!messageArea) return
    messageArea.scrollTo({ top: messageArea.scrollHeight, behavior })
    if (behavior === 'smooth') {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 300))
    }
  }

  watch(selectedId, (id) => {
    if (!id) {
      messagesLoading.value = false
      return
    }
    if (deferringConversationLoad) return
    loadSelectedConversation(id)
  })

  onMounted(() => {
    startMessageCacheCleanup()
    window.addEventListener('keydown', handleConversationShortcut)
  })

  onBeforeUnmount(() => {
    messageRequestSeq += 1
    stopMessageCacheCleanup()
    cancelDeferredConversationLoad()
    Object.values(messageCache.value).forEach(clearMessageObjectUrls)
    window.removeEventListener('keydown', handleConversationShortcut)
  })

  return {
    keyword,
    botId,
    agentId,
    botOptions,
    agentOptions,
    listLoading,
    handleSearch,
    resetFilters,
    conversations,
    selectedId,
    conversationTotal,
    handleConversationClick,
    activeConversation,
    conversationPanel,
    chatFullscreen,
    messagesLoading,
    olderMessagesLoading,
    unreadDividerMessageId,
    unreadRemainingCount,
    loadingRemainingUnread,
    pendingImages,
    replyText,
    replySending,
    replyInputFocused,
    toggleChatFullscreen,
    closeConversationPanel,
    loadOlderMessages,
    loadRemainingUnreadMessages,
    openImage,
    openVideo,
    loadLargeMessageMedia,
    removePendingImage,
    handleReplyInputFocus,
    addMedia,
    sendQuickReply,
    openQuickReplyManager,
    sendReply,
    showQuickReply,
    quickReplies,
    quickReplyModalVisible,
    quickReplyForm,
    MAX_QUICK_REPLIES,
    addQuickReply,
    removeQuickReply,
    mediaViewer,
    mediaViewerVisible,
    isDraggingImages,
    focusReplyInput,
    handleConversationWheel,
    formatFileSize
  }
}
