<template>
  <aside ref="listRef" class="conversation-list" @scroll.passive="handleScroll">
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
      <span class="conversation-list__agent" :title="item.agentName || '未绑定代理'"
        >代理：{{ item.agentName || '-' }}</span
      >
      <span class="conversation-list__row">
        <span class="conversation-avatar">{{ item.avatar }}</span>
        <span class="conversation-list__content">
          <strong>{{ item.name }}</strong>
          <small>
            <template v-if="item.preview">
              <span
                v-if="item.previewDirection === 'outgoing'"
                class="conversation-list__from conversation-list__from--me"
                >我：</span
              >
              <span v-else-if="item.previewDirection === 'incoming'" class="conversation-list__from"
                >对方：</span
              >{{ item.preview }}
            </template>
          </small>
        </span>
        <span class="conversation-list__meta">
          <small>{{ item.updatedAt }}</small>
          <b v-if="item.unread">{{ item.unread }}</b>
        </span>
      </span>
    </button>
    <div v-if="loading && !conversations.length" class="conversation-list__loading"
      ><span class="customer-service-loading"
    /></div>
    <el-empty v-else-if="!conversations.length" description="暂无会话" :image-size="72" />
    <div v-else-if="moreLoading" class="conversation-list__status">加载更多...</div>
    <div v-else-if="!hasMore" class="conversation-list__status">已加载全部</div>
  </aside>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { Conversation } from './types'

const props = defineProps<{
  conversations: Conversation[]
  selectedId: number | null
  total: number
  loading: boolean
  moreLoading: boolean
  hasMore: boolean
}>()

const emit = defineEmits<{
  (event: 'select', conversation: Conversation): void
  (event: 'load-more'): void
}>()

const listRef = ref<HTMLElement>()

function handleScroll() {
  const el = listRef.value
  if (!el || props.loading || props.moreLoading || !props.hasMore) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
    emit('load-more')
  }
}

watch(
  () => props.loading,
  (loading) => {
    if (loading && listRef.value) listRef.value.scrollTop = 0
  }
)

watch(
  () => props.conversations.length,
  async () => {
    await nextTick()
    const el = listRef.value
    if (!el || props.loading || props.moreLoading || !props.hasMore) return
    if (el.scrollHeight <= el.clientHeight + 80) emit('load-more')
  }
)
</script>

<style scoped lang="less">
.conversation-list {
  display: flex;
  min-height: 0;
  overflow-y: auto;
  background: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color);
  flex-direction: column;

  &__title {
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    flex-shrink: 0;
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

  &__status {
    flex-shrink: 0;
    padding: 12px 8px 16px;
    font-size: 12px;
    line-height: 18px;
    color: var(--el-text-color-secondary);
    text-align: center;
  }

  &__item {
    display: flex;
    flex: 0 0 auto;
    width: auto;
    min-height: 86px;
    padding: 0;
    margin: 8px 8px 0;
    overflow: hidden;
    color: inherit;
    text-align: left;
    cursor: pointer;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color);
    border-radius: 6px;
    transition:
      background 0.18s ease,
      border-color 0.18s ease;
    flex-direction: column;
    align-items: stretch;

    &:last-of-type {
      margin-bottom: 8px;
    }

    &:hover .conversation-list__row,
    &--active .conversation-list__row {
      background: var(--el-color-primary-light-9);
    }

    &--active {
      border-color: var(--el-color-primary-light-5);
    }

    &--active .conversation-list__row {
      box-shadow: inset 3px 0 0 var(--el-color-primary);
    }
  }

  &__agent {
    display: block;
    flex-shrink: 0;
    width: 100%;
    padding: 6px 10px;
    overflow: hidden;
    font-size: 13px;
    font-weight: 600;
    line-height: 18px;
    color: var(--el-text-color-primary);
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
    background: var(--el-fill-color-light);
    border: 0;
    border-bottom: 1px solid var(--el-border-color);
  }

  &__row {
    display: flex;
    flex-shrink: 0;
    min-width: 0;
    padding: 8px 10px;
    background: transparent;
    transition: background 0.18s ease;
    align-items: center;
  }

  &__content {
    display: flex;
    flex: 1;
    min-width: 0;
    padding-left: 8px;
    flex-direction: column;
    justify-content: center;
    gap: 2px;

    strong,
    small {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    strong {
      font-size: 13px;
      line-height: 18px;
      color: var(--el-text-color-primary);
    }

    small {
      max-width: 100%;
      font-size: 12px;
      line-height: 16px;
      color: var(--el-text-color-regular);
    }
  }

  &__from {
    font-style: normal;
    font-weight: 600;
    color: var(--el-text-color-primary);

    &--me {
      color: var(--el-color-primary);
    }
  }

  &__meta {
    display: flex;
    align-items: flex-end;
    padding-left: 6px;
    flex-direction: column;
    gap: 4px;

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
