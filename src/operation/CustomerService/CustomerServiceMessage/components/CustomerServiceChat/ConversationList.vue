<template>
  <aside class="conversation-list">
    <div class="conversation-list__title"
      ><span>全部会话</span><small>{{ total }} 条</small></div
    >
    <button
      v-for="item in conversations"
      :key="item.id"
      class="conversation-list__item"
      :class="{ 'conversation-list__item--active': item.id === selectedId }"
      type="button"
      @click.stop="emit('select', item)"
    >
      <span class="conversation-avatar">{{ item.avatar }}</span>
      <span class="conversation-list__content">
        <strong>{{ item.name }}</strong>
        <small>{{ item.preview }}</small>
      </span>
      <span class="conversation-list__meta">
        <small>{{ item.updatedAt }}</small>
        <b v-if="item.unread">{{ item.unread }}</b>
      </span>
    </button>
    <div v-if="loading" class="conversation-list__loading"
      ><span class="customer-service-loading"
    /></div>
    <el-empty v-else-if="!conversations.length" description="暂无会话" :image-size="72" />
  </aside>
</template>

<script setup lang="ts">
import type { Conversation } from './types'

defineProps<{
  conversations: Conversation[]
  selectedId: number | null
  total: number
  loading: boolean
}>()

const emit = defineEmits<{
  (event: 'select', conversation: Conversation): void
}>()
</script>

<style scoped lang="less">
.conversation-list {
  min-height: 0;
  overflow-y: auto;
  background: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color);

  &__title {
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    height: 52px;
    padding: 0 18px;
    font-size: 14px;
    font-weight: 600;
    line-height: normal;
    color: var(--el-text-color-primary);
    background: var(--el-bg-color);
    border-bottom: 1px solid var(--el-border-color);
    align-items: center;
    justify-content: space-between;

    span {
      font-size: 15px;
    }

    small {
      font-size: 12px;
      font-weight: 400;
      color: var(--el-text-color-regular);
    }
  }

  &__loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 160px;
  }

  &__item {
    display: flex;
    width: 100%;
    min-height: 80px;
    padding: 14px 16px;
    color: inherit;
    text-align: left;
    cursor: pointer;
    background: transparent;
    border: 0;
    border-bottom: 1px solid var(--el-border-color);
    transition: background 0.18s ease;

    &:hover,
    &--active {
      background: var(--el-color-primary-light-9);
    }

    &--active {
      box-shadow: inset 3px 0 0 var(--el-color-primary);
    }
  }

  &__content {
    display: flex;
    flex: 1;
    min-width: 0;
    padding-left: 10px;
    flex-direction: column;
    gap: 6px;

    strong,
    small {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    strong {
      font-size: 13px;
      color: var(--el-text-color-primary);
    }

    small {
      font-size: 12px;
      color: var(--el-text-color-regular);
    }
  }

  &__meta {
    display: flex;
    align-items: flex-end;
    padding-left: 6px;
    flex-direction: column;
    gap: 6px;

    small {
      font-size: 12px;
      color: var(--el-text-color-regular);
      white-space: nowrap;
    }

    b {
      height: 17px;
      min-width: 17px;
      padding: 0 5px;
      font-size: 11px;
      font-weight: 400;
      line-height: 17px;
      color: #fff;
      text-align: center;
      background: var(--el-color-danger);
      border-radius: 9px;
    }
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

@media (width <= 768px) {
  .conversation-list {
    max-height: 260px;
    border-right: 0;
    border-bottom: 1px solid var(--el-border-color);
  }
}
</style>
