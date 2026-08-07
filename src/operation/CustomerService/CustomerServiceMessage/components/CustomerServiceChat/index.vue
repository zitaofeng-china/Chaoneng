<template>
  <div
    class="customer-service-chat"
    :class="{ 'customer-service-chat--fullscreen': chatFullscreen }"
    @click="focusReplyInput"
    @wheel="handleConversationWheel"
  >
    <div v-if="isDraggingImages" class="page-drop-overlay">拖入文件即可发送</div>
    <el-card shadow="never">
      <CustomerServiceFilters
        v-model:keyword="keyword"
        v-model:bot-id="botId"
        :bot-options="botOptions"
        :loading="listLoading"
        @search="handleSearch"
        @reset="resetFilters"
      />
      <section class="service-workbench">
        <ConversationList
          :conversations="conversations"
          :selected-id="selectedId"
          :total="conversationTotal"
          :loading="listLoading"
          @select="handleConversationClick"
        />
        <ConversationPanel
          v-if="activeConversation"
          ref="conversationPanel"
          :active-conversation="activeConversation"
          :chat-fullscreen="chatFullscreen"
          :messages-loading="messagesLoading"
          :older-messages-loading="olderMessagesLoading"
          :unread-divider-message-id="unreadDividerMessageId"
          :unread-remaining-count="unreadRemainingCount"
          :loading-remaining-unread="loadingRemainingUnread"
          :pending-media="pendingImages"
          :reply-text="replyText"
          :reply-sending="replySending"
          :show-quick-reply="showQuickReply"
          :quick-replies="quickReplies"
          :format-file-size="formatFileSize"
          @load-older="loadOlderMessages(activeConversation.id)"
          @toggle-fullscreen="toggleChatFullscreen"
          @close="closeConversationPanel"
          @load-unread="loadRemainingUnreadMessages"
          @open-image="openImage"
          @open-video="openVideo"
          @load-large-media="loadLargeMessageMedia"
          @remove-pending-media="removePendingImage"
          @update:reply-text="replyText = $event"
          @reply-input-focus="handleReplyInputFocus"
          @reply-input-blur="replyInputFocused = false"
          @select-files="addMedia"
          @quick-reply="sendQuickReply"
          @open-quick-reply-manager="openQuickReplyManager"
          @send-reply="sendReply()"
        />
        <main v-else class="conversation-panel conversation-panel--empty"
          ><el-empty description="请选择一个客户会话"
        /></main>
      </section>
    </el-card>
    <QuickReplyManager
      v-if="showQuickReply"
      v-model:visible="quickReplyModalVisible"
      v-model:form="quickReplyForm"
      :quick-replies="quickReplies"
      :max-quick-replies="MAX_QUICK_REPLIES"
      @add="addQuickReply"
      @remove="removeQuickReply"
    />
    <MediaViewer ref="mediaViewer" v-model:visible="mediaViewerVisible" />
  </div>
</template>

<script setup lang="ts">
import ConversationList from './ConversationList.vue'
import ConversationPanel from './ConversationPanel.vue'
import CustomerServiceFilters from './CustomerServiceFilters.vue'
import MediaViewer from './MediaViewer.vue'
import QuickReplyManager from './QuickReplyManager.vue'
import { useCustomerServiceChat } from './useCustomerServiceChat'
const {
  keyword,
  botId,
  botOptions,
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
} = useCustomerServiceChat()
</script>

<style scoped lang="less">
.customer-service-chat {
  :deep(.el-card__body) {
    padding: 18px;
  }

  &--fullscreen {
    position: fixed;
    z-index: 1000;
    inset: 0;
    display: flex;
    min-width: 0;
    min-height: 0;
    padding: 12px;
    overflow: hidden;
    background: var(--el-bg-color);

    :deep(.el-card) {
      display: flex;
      width: 100%;
      min-width: 0;
      min-height: 0;
      flex: 1;
      overflow: hidden;
      border: 0;
      border-radius: 0;
    }

    :deep(.el-card__body) {
      display: flex;
      min-width: 0;
      min-height: 0;
      padding: 0;
      flex: 1;
      flex-direction: column;
    }

    .service-workbench {
      height: 100%;
      min-height: 0;
      flex: 1;
    }
  }
}

.service-workbench {
  display: grid;
  height: max(540px, calc(100dvh - 215px));
  min-height: 0;
  overflow: hidden;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  grid-template-columns: clamp(220px, 17vw, 270px) minmax(0, 1fr);
}

.conversation-panel--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

.page-drop-overlay {
  position: fixed;
  z-index: 1000;
  display: flex;
  font-size: 28px;
  color: var(--el-color-primary);
  pointer-events: none;
  background: rgb(236 245 255 / 88%);
  outline: 2px dashed var(--el-color-primary);
  outline-offset: -14px;
  inset: 0;
  align-items: center;
  justify-content: center;
}

@media (width <= 768px) {
  .service-workbench {
    height: auto;
    min-height: auto;
    grid-template-columns: 1fr;
  }
}
</style>
