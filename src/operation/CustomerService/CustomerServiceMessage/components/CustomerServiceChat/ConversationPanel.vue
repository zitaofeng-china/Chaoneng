<template>
  <main
    class="conversation-panel"
    :class="{ 'conversation-panel--has-pending-media': pendingMedia.length > 0 }"
  >
    <header class="conversation-panel__header">
      <div class="conversation-panel__identity">
        <span class="conversation-avatar">{{ activeConversation.avatar }}</span>
        <div
          ><strong>{{ activeConversation.name }}</strong
          ><span>用户 ID：{{ activeConversation.userId }} · 客服机器人</span></div
        >
      </div>
      <div class="conversation-panel__header-actions">
        <el-tooltip :content="chatFullscreen ? '退出全屏' : '全屏显示'">
          <el-button
            link
            size="small"
            :aria-label="chatFullscreen ? '退出全屏' : '全屏显示'"
            @click.stop="emit('toggle-fullscreen')"
          >
            {{ chatFullscreen ? '退出全屏' : '全屏' }}
          </el-button>
        </el-tooltip>
        <el-tooltip content="关闭会话">
          <el-button link size="small" aria-label="关闭会话" @click.stop="emit('close')">
            关闭
          </el-button>
        </el-tooltip>
      </div>
    </header>

    <div ref="messageArea" class="conversation-panel__messages" @scroll="handleMessageScroll">
      <div v-if="messagesLoading" class="conversation-panel__messages-loading"
        ><span class="customer-service-loading" tip="加载消息中..."
      /></div>
      <template v-else>
        <div v-if="olderMessagesLoading" class="conversation-panel__older-loading"
          ><span class="customer-service-loading" :size="16"
        /></div>
        <template v-for="message in activeConversation.messages" :key="message.id">
          <div
            v-if="message.id === unreadDividerMessageId"
            class="conversation-panel__unread-divider"
            >以下为未读消息</div
          >
          <div
            class="chat-message"
            :class="`chat-message--${message.direction}`"
            :data-message-id="message.id"
          >
            <span class="conversation-avatar">{{
              message.direction === 'outgoing' ? '客' : activeConversation.avatar
            }}</span>
            <div
              class="chat-message__content"
              :class="{
                'chat-message__content--image': message.mediaKind === 'image',
                'chat-message__content--video': message.mediaKind === 'video',
                'chat-message__content--file': message.mediaKind === 'file'
              }"
            >
              <time>{{ message.time }}</time>
              <div
                v-if="message.imageUrls?.length"
                class="chat-message__images"
                :class="{ 'chat-message__images--multiple': message.imageUrls.length > 1 }"
              >
                <button
                  v-for="(url, index) in message.imageUrls"
                  :key="`${message.id}-${index}`"
                  type="button"
                  @click="emit('open-image', url)"
                >
                  <img :src="url" :alt="message.fileName || `聊天图片 ${index + 1}`" />
                </button>
              </div>
              <div v-if="message.videoUrl" class="chat-message__video">
                <video
                  :src="message.videoUrl"
                  controls
                  preload="metadata"
                  disablepictureinpicture
                />
              </div>
              <a
                v-if="message.fileUrl && message.mediaKind === 'file'"
                class="chat-message__file"
                :href="message.fileUrl"
                :download="message.fileName || '附件'"
                target="_blank"
                rel="noopener noreferrer"
              >
                📎
                <span>
                  <strong>{{ message.fileName || '附件' }}</strong>
                  <small v-if="message.fileSize">{{ formatFileSize(message.fileSize) }}</small>
                </span>
              </a>
              <el-tooltip v-if="message.mediaTooLarge" content="超过最大限制，点击查看">
                <button
                  class="chat-message__media-placeholder"
                  type="button"
                  aria-label="加载附件"
                  @click.stop="emit('load-large-media', message)"
                  >加载</button
                >
              </el-tooltip>
              <div v-if="message.mediaLoading" class="chat-message__media-loading"
                ><span class="customer-service-loading" :size="18"
              /></div>
              <p v-if="message.content">{{ message.content }}</p>
            </div>
          </div>
        </template>
        <el-empty
          v-if="!activeConversation.messages.length"
          description="暂无消息"
          :image-size="72"
        />
        <el-tooltip
          v-if="unreadRemainingCount || showReturnToLatest"
          :content="unreadRemainingCount ? '加载全部未读消息' : '回到最新消息'"
        >
          <el-button
            class="conversation-panel__load-unread"
            circle
            type="primary"
            :loading="loadingRemainingUnread"
            @click="handleBottomAction"
          >
            ↓
          </el-button>
        </el-tooltip>
      </template>
    </div>

    <footer class="conversation-panel__reply">
      <div v-if="pendingMedia.length" class="image-previews">
        <div
          v-for="(media, index) in pendingMedia"
          :key="`${media.file.name}-${index}`"
          class="image-previews__item"
          :title="media.file.name"
        >
          <button
            v-if="media.mediaKind === 'image'"
            class="image-previews__media"
            type="button"
            @click="emit('open-image', media.previewUrl || '')"
            ><img :src="media.previewUrl" :alt="`待发送图片 ${index + 1}`"
          /></button>
          <div
            v-else-if="media.mediaKind === 'video'"
            class="image-previews__media image-previews__media--video"
            role="button"
            tabindex="0"
            @click.stop="emit('open-video', media.previewUrl || '')"
            @keydown.enter.prevent="emit('open-video', media.previewUrl || '')"
            @contextmenu.prevent
          >
            <video
              :src="media.previewUrl"
              muted
              playsinline
              preload="metadata"
              aria-hidden="true"
              disablepictureinpicture
            />
          </div>
          <div v-else class="image-previews__file"
            >📎<span>{{ media.file.name }}</span></div
          >
          <el-tooltip content="移除媒体"
            ><button
              class="image-previews__remove"
              type="button"
              aria-label="移除媒体"
              @click="emit('remove-pending-media', index)"
              >×</button
            ></el-tooltip
          >
        </div>
      </div>
      <el-input
        type="textarea"
        ref="replyInput"
        :model-value="replyText"
        placeholder="输入回复内容..."
        :autosize="{ minRows: pendingMedia.length ? 2 : 1, maxRows: pendingMedia.length ? 3 : 4 }"
        :max-length="1000"
        show-word-limit
        @update:model-value="emit('update:reply-text', $event)"
        @focus="emit('reply-input-focus')"
        @blur="emit('reply-input-blur')"
        @keydown.enter.exact.prevent="emit('send-reply')"
      />
      <div class="conversation-panel__actions">
        <div class="conversation-panel__tools">
          <input
            ref="fileInput"
            class="image-input"
            type="file"
            multiple
            @change="handleFileSelect"
          />
          <el-tooltip content="选择文件"
            ><el-button size="small" @click="fileInput?.click()"
              ><template #icon>📎</template></el-button
            ></el-tooltip
          >
          <el-popover
            v-if="showQuickReply"
            v-model:visible="quickReplyPickerVisible"
            trigger="click"
            placement="top"
            width="300"
          >
            <template #reference><el-button size="small">快捷回复</el-button></template>
            <div class="quick-reply-picker">
              <div class="quick-reply-picker__list">
                <button
                  v-for="(item, index) in quickReplies"
                  :key="item.id"
                  type="button"
                  @mousedown.prevent
                  @click="handleQuickReply(item)"
                >
                  <strong
                    >{{ item.title
                    }}<kbd>Ctrl + {{ getQuickReplyShortcutLabel(index) }}</kbd></strong
                  ><span>{{ item.content }}</span>
                </button>
                <el-empty v-if="!quickReplies.length" description="暂无快捷回复" :image-size="48" />
              </div>
              <el-button class="quick-reply-picker__manage" link @click="openQuickReplyManager"
                >管理快捷回复</el-button
              >
            </div>
          </el-popover>
          <span>Enter 发送，Shift + Enter 换行，Ctrl + 1-0 快捷发送</span>
        </div>
        <el-button type="primary" :loading="replySending" @click="emit('send-reply')"
          >发送</el-button
        >
      </div>
    </footer>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ChatMessage, Conversation, PendingMedia, QuickReply } from './types'

const props = defineProps<{
  activeConversation: Conversation
  chatFullscreen: boolean
  messagesLoading: boolean
  olderMessagesLoading: boolean
  unreadDividerMessageId: number | null
  unreadRemainingCount: number
  loadingRemainingUnread: boolean
  pendingMedia: PendingMedia[]
  replyText: string
  replySending: boolean
  showQuickReply: boolean
  quickReplies: QuickReply[]
  formatFileSize: (size?: number) => string
}>()

const emit = defineEmits<{
  (event: 'load-older'): void
  (event: 'toggle-fullscreen'): void
  (event: 'close'): void
  (event: 'load-unread'): void
  (event: 'open-image', url: string): void
  (event: 'open-video', url: string): void
  (event: 'load-large-media', message: ChatMessage): void
  (event: 'remove-pending-media', index: number): void
  (event: 'update:reply-text', value: string): void
  (event: 'reply-input-focus'): void
  (event: 'reply-input-blur'): void
  (event: 'select-files', files: File[]): void
  (event: 'quick-reply', reply: QuickReply): void
  (event: 'open-quick-reply-manager'): void
  (event: 'send-reply'): void
}>()

const messageArea = ref<HTMLElement>()
const replyInput = ref<{ focus: () => void }>()
const fileInput = ref<HTMLInputElement>()
const quickReplyPickerVisible = ref(false)
const showReturnToLatest = ref(false)

function handleMessageScroll(event: Event) {
  const target = event.currentTarget as HTMLElement
  const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight
  showReturnToLatest.value = props.activeConversation.messages.length > 10 && distanceToBottom > 48
  if (target.scrollTop <= 24) emit('load-older')
}

function handleBottomAction() {
  if (props.unreadRemainingCount) {
    emit('load-unread')
    return
  }
  const target = messageArea.value
  if (!target) return
  target.scrollTo({ top: target.scrollHeight, behavior: 'smooth' })
  showReturnToLatest.value = false
}

function handleFileSelect(event: Event) {
  emit('select-files', Array.from((event.target as HTMLInputElement).files ?? []))
  if (fileInput.value) fileInput.value.value = ''
}

function getQuickReplyShortcutLabel(index: number) {
  return index === 9 ? '0' : String(index + 1)
}

function handleQuickReply(reply: QuickReply) {
  quickReplyPickerVisible.value = false
  emit('quick-reply', reply)
}

function openQuickReplyManager() {
  quickReplyPickerVisible.value = false
  emit('open-quick-reply-manager')
}

defineExpose({
  focusReplyInput: () => replyInput.value?.focus(),
  getMessageArea: () => messageArea.value
})
</script>

<style scoped lang="less">
.conversation-panel {
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-rows: 64px minmax(260px, 1fr) 116px;

  &--has-pending-media {
    grid-template-rows: 64px minmax(260px, 1fr) clamp(180px, 24vh, 240px);
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    background: var(--el-bg-color);
    border-bottom: 1px solid var(--el-border-color);

    div {
      display: flex;
      gap: 12px;
      align-items: baseline;
    }

    strong {
      font-size: 14px;
      color: var(--el-text-color-primary);
    }

    span {
      font-size: 12px;
      color: var(--el-text-color-regular);
    }
  }

  &__identity {
    display: flex !important;
    align-items: center !important;
    gap: 11px !important;

    div {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    strong {
      font-size: 15px;
    }

    .conversation-avatar {
      width: 38px;
      height: 38px;
    }
  }

  &__header-actions {
    display: flex;
    align-items: center;

    :deep(.el-button) {
      color: var(--el-text-color-secondary);
    }
  }

  &__messages {
    display: flex;
    min-height: 0;
    padding: 28px 30px;
    overflow-y: auto;
    background: #f6f8fc;
    flex-direction: column;
    gap: 20px;
  }

  &__reply {
    display: flex;
    padding: 14px 20px 10px;
    background: var(--el-bg-color);
    border-top: 1px solid var(--el-border-color);
    flex-direction: column;

    :deep(.el-textarea) {
      flex: 1;
      padding: 0;
      background: transparent;
      border: 0;
    }

    :deep(.el-textarea__inner) {
      min-height: 62px;
      padding: 0;
      background: transparent;
      resize: none;
    }
  }

  &__actions,
  &__tools {
    display: flex;
    align-items: center;
  }

  &__actions {
    justify-content: space-between;
    padding-top: 10px;
  }

  &__tools {
    gap: 12px;

    span {
      font-size: 12px;
      color: var(--el-text-color-regular);
    }
  }

  &__unread-divider {
    display: flex;
    width: 100%;
    font-size: 12px;
    color: var(--el-color-primary);
    white-space: nowrap;
    align-items: center;
    gap: 10px;

    &::before,
    &::after {
      width: 100%;
      height: 1px;
      background: var(--el-color-primary-light-7);
      content: '';
    }
  }

  &__load-unread {
    position: sticky;
    right: 2px;
    bottom: 2px;
    align-self: flex-end;
    flex: none;
    box-shadow: 0 3px 10px var(--el-color-primary-light-5);
  }
}

.conversation-avatar {
  display: inline-flex;
  width: 34px;
  height: 34px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background: var(--el-color-primary);
  border-radius: 50%;
  box-shadow: 0 2px 5px var(--el-color-primary-light-7);
  flex: none;
  align-items: center;
  justify-content: center;
}

.image-input {
  display: none;
}

.conversation-panel__messages-loading {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.conversation-panel__older-loading {
  display: flex;
  justify-content: center;
  min-height: 24px;
}

.image-previews {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;

  &__item {
    position: relative;
    width: 72px;
    height: 72px;
    overflow: hidden;
    background: var(--el-fill-color);
    border: 1px solid var(--el-border-color);
    border-radius: 6px;

    &:hover .image-previews__remove {
      opacity: 1;
    }
  }

  &__media {
    position: relative;
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    overflow: hidden;
    cursor: zoom-in;
    background: #161b22;
    border: 0;

    img,
    video {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    img {
      transition: transform 0.18s ease;
    }

    &:hover img {
      transform: scale(1.04);
    }

    &--video {
      cursor: default;
    }
  }

  &__file {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    padding: 6px;
    color: var(--el-text-color-secondary);
    text-align: center;
    background: var(--el-fill-color);
    border-radius: 5px;

    span {
      overflow: hidden;
      font-size: 11px;
      line-height: 1.3;
      text-overflow: ellipsis;
      word-break: break-all;
    }
  }

  &__remove {
    position: absolute;
    top: 3px;
    right: 3px;
    display: inline-flex;
    width: 22px;
    height: 22px;
    padding: 0;
    color: #fff;
    cursor: pointer;
    background: var(--el-color-danger);
    border: 0;
    border-radius: 50%;
    opacity: 0;
    transition:
      opacity 0.16s ease,
      background 0.16s ease;
    align-items: center;
    justify-content: center;

    &:hover {
      background: var(--el-color-danger-dark-2);
    }

    &:focus-visible {
      outline: 2px solid var(--el-color-primary);
      outline-offset: 1px;
      opacity: 1;
    }

    :deep(.el-icon) {
      font-size: 13px;
    }
  }
}

.chat-message {
  display: flex;
  width: fit-content;
  max-width: min(72%, 620px);
  align-items: flex-start;
  gap: 11px;

  > div {
    display: flex;
    flex-direction: column;
  }

  > .conversation-avatar {
    margin-top: 20px;
  }

  &__content {
    display: flex;
    width: fit-content;
    max-width: 320px;
    min-width: 0;
    flex-direction: column;
    align-items: flex-start;

    &--image {
      width: min(328px, 100%);
      max-width: 328px;
    }

    &--video {
      width: min(322px, 100%);
      max-width: 322px;
    }

    &--file {
      width: min(300px, 100%);
    }
  }

  p {
    width: auto;
    padding: 10px 13px;
    margin: 0;
    font-size: 14px;
    line-height: 1.65;
    color: var(--el-text-color-primary);
    white-space: pre-wrap;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color);
    border-radius: 7px;
    box-shadow: 0 1px 2px rgb(31 35 41 / 4%);
    box-sizing: border-box;
  }

  &__content--image p,
  &__content--video p,
  &__content--file p {
    width: 100%;
    padding: 7px 10px;
  }

  time {
    margin: 0 3px 4px;
    font-size: 12px;
    color: var(--el-text-color-regular);
    order: -1;
  }

  &--outgoing {
    align-self: flex-end;
    flex-direction: row-reverse;

    .chat-message__content {
      align-items: flex-end;
    }

    .conversation-avatar,
    p {
      color: #fff;
      background: var(--el-color-primary);
      border-color: var(--el-color-primary);
    }

    .conversation-avatar {
      background: var(--el-color-primary);
      box-shadow: 0 2px 5px var(--el-color-primary-light-7);
    }

    p {
      box-shadow: 0 2px 6px var(--el-color-primary-light-7);
    }

    time {
      text-align: right;
    }
  }
}

.chat-message__images {
  display: grid;
  width: 320px;
  max-width: 100%;
  aspect-ratio: 16 / 9;
  flex: none;
  padding: 3px;
  overflow: hidden;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 7px;
  box-shadow: 0 1px 2px rgb(31 35 41 / 4%);
  grid-template-columns: 1fr;
  gap: 4px;

  &--multiple {
    grid-template-columns: repeat(2, 1fr);
  }

  button {
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    overflow: hidden;
    cursor: zoom-in;
    background: var(--el-fill-color);
    border: 0;
    border-radius: 4px;
  }

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.chat-message__video,
.chat-message__media-loading,
.chat-message__media-placeholder {
  width: 320px;
  max-width: 100%;
  aspect-ratio: 16 / 9;
  flex: none;
}

.chat-message__video {
  overflow: hidden;
  background: #000;
  border: 1px solid var(--el-border-color);
  border-radius: 7px;
  box-shadow: 0 1px 2px rgb(31 35 41 / 4%);

  video {
    display: block;
    width: 100%;
    height: 100%;
    background: #000;
    object-fit: contain;
  }
}

.chat-message__file {
  display: inline-flex;
  max-width: 300px;
  min-width: 180px;
  padding: 10px 12px;
  color: inherit;
  text-decoration: none;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 7px;
  box-shadow: 0 1px 2px rgb(31 35 41 / 4%);
  transition: background 0.16s ease;
  align-items: center;
  gap: 10px;

  &:hover {
    background: var(--el-fill-color);
  }

  :deep(.el-icon) {
    font-size: 22px;
    color: var(--el-color-primary);
    flex: none;
  }

  span {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 2px;
  }

  strong {
    overflow: hidden;
    font-size: 13px;
    font-weight: 500;
    color: var(--el-text-color-primary);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    font-size: 12px;
    color: var(--el-text-color-regular);
  }
}

.chat-message__media-loading {
  display: inline-flex;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 7px;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
}

.chat-message__media-placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: var(--el-text-color-regular);
  cursor: pointer;
  background: var(--el-fill-color);
  border: 1px dashed var(--el-border-color-dark);
  border-radius: 7px;
  transition:
    background 0.16s ease,
    border-color 0.16s ease;

  &:hover {
    background: var(--el-fill-color-light);
    border-color: var(--el-color-primary);
  }

  :deep(.el-icon) {
    font-size: 32px;
    color: var(--el-color-primary);
  }
}

.chat-message--outgoing {
  .chat-message__file {
    color: #fff;
    background: var(--el-color-primary);
    border-color: var(--el-color-primary);

    &:hover {
      background: var(--el-color-primary);
    }

    :deep(.el-icon),
    strong,
    small {
      color: #fff;
    }
  }

  .chat-message__media-loading {
    background: var(--el-color-primary);
    border-color: var(--el-color-primary);

    :deep(.el-icon) {
      color: #fff;
    }
  }
}

.quick-reply-picker {
  display: flex;
  width: 280px;
  max-height: 200px;
  padding: 2px;
  overflow: hidden;
  border-radius: 6px;
  flex-direction: column;
  gap: 4px;

  &__list {
    min-height: 0;
    overflow-y: auto;
  }

  button:not(.el-button) {
    display: flex;
    width: 100%;
    padding: 10px;
    text-align: left;
    cursor: pointer;
    background: transparent;
    border: 0;
    border-radius: 4px;
    flex-direction: column;
    gap: 4px;

    &:hover {
      background: var(--el-fill-color);
    }

    strong {
      display: flex;
      font-size: 13px;
      font-weight: 500;
      color: var(--el-text-color-primary);
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    span {
      overflow: hidden;
      font-size: 12px;
      color: var(--el-text-color-regular);
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    kbd {
      padding: 1px 4px;
      font-family: inherit;
      font-size: 11px;
      font-weight: 400;
      line-height: 1.35;
      color: var(--el-text-color-regular);
      background: var(--el-fill-color);
      border: 1px solid var(--el-border-color);
      border-radius: 3px;
    }
  }

  &__manage {
    flex: none;
    margin: 0 -2px -2px;
    border-top: 1px solid var(--el-border-color);
  }
}

@media (width <= 768px) {
  .conversation-panel {
    min-height: 584px;
    grid-template-rows: 64px minmax(300px, 1fr) 116px;

    &--has-pending-media {
      grid-template-rows: 64px minmax(300px, 1fr) clamp(180px, 26vh, 240px);
    }

    &__messages {
      padding: 20px 16px;
    }

    &__header {
      padding: 0 16px;
    }

    &__tools span {
      display: none;
    }
  }

  .chat-message {
    max-width: 92%;
  }
}
</style>
