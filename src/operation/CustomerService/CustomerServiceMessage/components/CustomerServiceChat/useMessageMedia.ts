import { nextTick, onBeforeUnmount } from 'vue'
import { getMessageFileBlob } from '@/api/opertion/CustomerService/CustomerServiceMessage'
import type {
  ConversationMessageItem,
  MessageMediaMeta
} from '@/api/opertion/CustomerService/CustomerServiceMessage'
import type { ChatMessage, MediaKind } from './types'
import { type ApiDateTime } from './time'

interface UseMessageMediaOptions {
  getMessageArea: () => HTMLElement | undefined
  formatMessageTime: (value?: ApiDateTime) => string
}

const maxInlineMediaSize = 2 * 1024 * 1024

/** 消息媒体识别、Blob 生命周期及媒体布局后的滚动协调。 */
export function useMessageMedia(options: UseMessageMediaOptions) {
  const objectUrls = new Set<string>()

  function parseMediaMeta(raw: ConversationMessageItem['media_meta']): MessageMediaMeta | null {
    if (!raw) return null
    if (typeof raw === 'object') return raw
    try {
      return JSON.parse(raw) as MessageMediaMeta
    } catch {
      return null
    }
  }

  function hasMediaFile(item: ConversationMessageItem) {
    if (item.media_file_id?.trim()) return true
    if (typeof item.media_meta === 'string') return item.media_meta.trim().length > 0
    return item.media_meta != null
  }

  function resolveMediaKind(
    item: ConversationMessageItem,
    meta: MessageMediaMeta | null
  ): MediaKind {
    if (!hasMediaFile(item)) return null
    const type = (item.media_type || '').toLowerCase()
    const mime = (meta?.mime_type || '').toLowerCase()
    const name = (meta?.file_name || '').toLowerCase()

    if (
      type.includes('photo') ||
      type.includes('image') ||
      type.includes('sticker') ||
      mime.startsWith('image/') ||
      /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name)
    )
      return 'image'

    if (
      type.includes('video') ||
      type.includes('animation') ||
      mime.startsWith('video/') ||
      /\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(name)
    )
      return 'video'

    return 'file'
  }

  function createObjectUrl(blob: Blob) {
    const url = URL.createObjectURL(blob)
    objectUrls.add(url)
    return url
  }

  function revokeObjectUrls(urls: Array<string | undefined>) {
    urls.forEach((url) => {
      if (!url || !objectUrls.has(url)) return
      URL.revokeObjectURL(url)
      objectUrls.delete(url)
    })
  }

  function clearMessageObjectUrls(messages: ChatMessage[]) {
    messages.forEach((message) => {
      revokeObjectUrls([...(message.imageUrls || []), message.videoUrl, message.fileUrl])
    })
  }

  function mapMessageItem(item: ConversationMessageItem, conversationId: number): ChatMessage {
    const meta = parseMediaMeta(item.media_meta)
    const mediaKind = resolveMediaKind(item, meta)
    const fileSize = Number(meta?.file_size) || undefined
    const mediaTooLarge = Boolean(mediaKind && fileSize && fileSize > maxInlineMediaSize)
    return {
      id: item.id,
      conversationId,
      direction: item.direction === 1 ? 'incoming' : 'outgoing',
      content: item.content?.trim() || '',
      fileName: meta?.file_name,
      fileSize,
      mediaKind,
      mediaLoading: Boolean(mediaKind && !mediaTooLarge),
      mediaTooLarge,
      createdAt: item.created_at,
      time: options.formatMessageTime(item.created_at)
    }
  }

  async function attachMessageMedia(message: ChatMessage, forceLoad = false) {
    if (!message.mediaKind || (message.mediaTooLarge && !forceLoad)) {
      message.mediaLoading = false
      return false
    }

    try {
      const blob = await getMessageFileBlob(message.conversationId, message.id)
      if (blob.size > maxInlineMediaSize && !forceLoad) {
        message.mediaTooLarge = true
        return false
      }
      const url = createObjectUrl(blob)
      message.mediaTooLarge = false
      if (message.mediaKind === 'image') message.imageUrls = [url]
      else if (message.mediaKind === 'video') message.videoUrl = url
      else message.fileUrl = url
      return true
    } catch {
      if (message.mediaKind === 'file' && !message.content) {
        message.content = message.fileName ? `[文件] ${message.fileName}` : '[文件]'
      } else if (message.mediaKind === 'image' && !message.content) {
        message.content = '[图片加载失败]'
      } else if (message.mediaKind === 'video' && !message.content) {
        message.content = '[视频加载失败]'
      }
      return false
    } finally {
      message.mediaLoading = false
    }
  }

  function loadMessageMedia(messages: ChatMessage[], onLoaded?: () => void) {
    const mediaMessages = messages.filter((message) => message.mediaKind && message.mediaLoading)
    if (!mediaMessages.length) return
    void Promise.allSettled(mediaMessages.map((message) => attachMessageMedia(message))).then(() =>
      onLoaded?.()
    )
  }

  function waitForMediaLayout(element: HTMLImageElement | HTMLVideoElement) {
    if (element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0)
      return Promise.resolve()
    if (element instanceof HTMLVideoElement && element.readyState >= HTMLMediaElement.HAVE_METADATA)
      return Promise.resolve()

    return new Promise<void>((resolve) => {
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        element.removeEventListener('load', finish)
        element.removeEventListener('error', finish)
        element.removeEventListener('loadedmetadata', finish)
        window.clearTimeout(timeout)
        resolve()
      }
      const timeout = window.setTimeout(finish, 3000)
      element.addEventListener('load', finish, { once: true })
      element.addEventListener('error', finish, { once: true })
      element.addEventListener('loadedmetadata', finish, { once: true })
    })
  }

  async function waitForMessageMediaLayout(messageIds: number[]) {
    if (!messageIds.length) return
    await nextTick()
    const messageArea = options.getMessageArea()
    if (!messageArea) return

    const ids = new Set(messageIds)
    const media = Array.from(messageArea.querySelectorAll('img, video'))
      .filter(
        (element): element is HTMLImageElement | HTMLVideoElement =>
          element instanceof HTMLImageElement || element instanceof HTMLVideoElement
      )
      .filter((element) => {
        const messageId = Number(
          element.closest<HTMLElement>('[data-message-id]')?.dataset.messageId
        )
        return ids.has(messageId)
      })
    await Promise.all(media.map(waitForMediaLayout))
  }

  async function loadLargeMessageMedia(message: ChatMessage) {
    if (message.mediaLoading || !message.mediaTooLarge) return
    message.mediaLoading = true
    message.mediaTooLarge = false
    const loaded = await attachMessageMedia(message, true)
    if (!loaded) message.mediaTooLarge = true
  }

  onBeforeUnmount(() => {
    objectUrls.forEach((url) => URL.revokeObjectURL(url))
    objectUrls.clear()
  })

  return {
    mapMessageItem,
    attachMessageMedia,
    clearMessageObjectUrls,
    loadMessageMedia,
    waitForMessageMediaLayout,
    loadLargeMessageMedia
  }
}
