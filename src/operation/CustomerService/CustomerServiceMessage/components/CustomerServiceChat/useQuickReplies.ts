import { ElMessage } from 'element-plus'
import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import type { QuickReply, SendReplyOptions } from './types'

const MAX_QUICK_REPLIES = 10
const QUICK_REPLY_STORAGE_KEY = 'chaoneng:customer-service-quick-replies'
const LEGACY_QUICK_REPLY_KEYS = new Set([
  '到账核实\u0000已收到您的问题，客服正在为您核实，请稍候。',
  '订单查询\u0000请提供订单号或交易哈希，方便我们为您查询处理进度。',
  '提现处理\u0000您的提现申请已提交，预计将在审核完成后到账，请耐心等待。'
])

interface UseQuickRepliesOptions {
  mediaViewerVisible: Ref<boolean>
  canSendQuickReply: () => boolean
  focusReplyInput: () => void
  sendReply: (content?: string, options?: SendReplyOptions) => Promise<void>
}

/** 客服快捷回复的本地持久化、管理弹窗和 Ctrl+数字快捷发送。 */
export function useQuickReplies(options: UseQuickRepliesOptions) {
  const showQuickReply = true
  const quickReplyModalVisible = ref(false)
  const quickReplyForm = ref({ title: '', content: '' })
  const quickReplies = ref<QuickReply[]>([])

  function loadQuickReplies(): QuickReply[] {
    try {
      const savedReplies = localStorage.getItem(QUICK_REPLY_STORAGE_KEY)
      if (savedReplies === null) return []

      const parsedReplies: unknown = JSON.parse(savedReplies)
      if (!Array.isArray(parsedReplies)) return []

      return parsedReplies
        .map((item, index) => {
          if (!item || typeof item !== 'object') return null
          const { id, title, content } = item as Partial<QuickReply>
          if (
            typeof title !== 'string' ||
            typeof content !== 'string' ||
            !title.trim() ||
            !content.trim()
          )
            return null
          const numericId = Number(id)
          return {
            id: Number.isSafeInteger(numericId) && numericId > 0 ? numericId : Date.now() + index,
            title: title.trim().slice(0, 20),
            content: content.trim().slice(0, 100)
          }
        })
        .filter((item): item is QuickReply => item !== null)
        .filter((item) => !LEGACY_QUICK_REPLY_KEYS.has(`${item.title}\u0000${item.content}`))
        .slice(0, MAX_QUICK_REPLIES)
    } catch {
      return []
    }
  }

  function persistQuickReplies() {
    localStorage.setItem(QUICK_REPLY_STORAGE_KEY, JSON.stringify(quickReplies.value))
  }

  function getQuickReplyShortcutIndex(event: KeyboardEvent) {
    if (!event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return -1
    const matched = event.code.match(/^(?:Digit|Numpad)([0-9])$/)
    if (!matched) return -1
    const digit = Number(matched[1])
    return digit === 0 ? MAX_QUICK_REPLIES - 1 : digit - 1
  }

  function handleQuickReplyShortcut(event: KeyboardEvent) {
    if (event.repeat || quickReplyModalVisible.value || options.mediaViewerVisible.value) return
    const quickReply = quickReplies.value[getQuickReplyShortcutIndex(event)]
    if (!quickReply) return
    event.preventDefault()
    sendQuickReply(quickReply)
  }

  function sendQuickReply(item: QuickReply) {
    if (!options.canSendQuickReply()) return
    options.focusReplyInput()
    void options.sendReply(item.content, { preserveReplyText: true, includePendingMedia: false })
  }

  function openQuickReplyManager() {
    quickReplyModalVisible.value = true
  }

  function addQuickReply() {
    const { title, content } = quickReplyForm.value
    if (!title.trim() || !content.trim()) return ElMessage.warning('请填写模板名称和回复内容')
    if (quickReplies.value.length >= MAX_QUICK_REPLIES)
      return ElMessage.warning(`快捷回复最多保存 ${MAX_QUICK_REPLIES} 条`)
    quickReplies.value.push({ id: Date.now(), title: title.trim(), content: content.trim() })
    persistQuickReplies()
    quickReplyForm.value = { title: '', content: '' }
    ElMessage.success('快捷回复已新增')
  }

  function removeQuickReply(id: number) {
    quickReplies.value = quickReplies.value.filter((item) => item.id !== id)
    persistQuickReplies()
  }

  onMounted(() => {
    quickReplies.value = loadQuickReplies()
    persistQuickReplies()
    window.addEventListener('keydown', handleQuickReplyShortcut)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleQuickReplyShortcut)
  })

  return {
    showQuickReply,
    MAX_QUICK_REPLIES,
    quickReplies,
    quickReplyModalVisible,
    quickReplyForm,
    sendQuickReply,
    openQuickReplyManager,
    addQuickReply,
    removeQuickReply
  }
}
