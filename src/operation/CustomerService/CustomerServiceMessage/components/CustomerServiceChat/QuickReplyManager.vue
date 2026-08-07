<template>
  <el-dialog
    v-model="visibleModel"
    :title="`管理快捷回复（${quickReplies.length}/${maxQuickReplies}）`"
    width="680px"
  >
    <div class="quick-reply-manager">
      <div class="quick-reply-manager__form">
        <el-input
          class="quick-reply-manager__name"
          :model-value="form.title"
          placeholder="模板名称，例如：到账核实"
          maxlength="20"
          @update:model-value="updateForm('title', $event)"
        />
        <el-input
          class="quick-reply-manager__content"
          type="textarea"
          :model-value="form.content"
          placeholder="请输入快捷回复内容"
          :autosize="{ minRows: 2, maxRows: 4 }"
          maxlength="100"
          show-word-limit
          @update:model-value="updateForm('content', $event)"
        />
        <el-button
          class="quick-reply-manager__submit"
          type="primary"
          :disabled="quickReplies.length >= maxQuickReplies"
          @click="emit('add')"
          >新增</el-button
        >
      </div>
      <div class="quick-reply-manager__list">
        <div v-for="item in quickReplies" :key="item.id" class="quick-reply-manager__item"
          ><div
            ><strong>{{ item.title }}</strong
            ><p>{{ item.content }}</p></div
          ><el-button link type="danger" size="small" @click="emit('remove', item.id)"
            >删除</el-button
          ></div
        >
        <el-empty v-if="!quickReplies.length" description="暂无快捷回复" />
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { QuickReply } from './types'
const props = defineProps<{
  visible: boolean
  form: { title: string; content: string }
  quickReplies: QuickReply[]
  maxQuickReplies: number
}>()
const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void
  (event: 'update:form', value: { title: string; content: string }): void
  (event: 'add'): void
  (event: 'remove', id: number): void
}>()
const visibleModel = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})
function updateForm(field: 'title' | 'content', value: string) {
  emit('update:form', { ...props.form, [field]: value })
}
</script>

<style scoped lang="less">
.quick-reply-manager {
  &__form {
    display: grid;
    padding: 14px;
    margin-bottom: 12px;
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color);
    border-radius: 6px;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas: 'name submit' 'content submit';
    align-items: start;
    gap: 12px;
  }

  &__name {
    grid-area: name;
  }

  &__content {
    grid-area: content;
  }

  &__submit {
    grid-area: submit;
    align-self: center;
  }

  &__list {
    max-height: 360px;
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  &__item {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    min-height: 72px;
    padding: 13px 6px 13px 2px;
    border-bottom: 1px solid var(--el-border-color-lighter);

    &:last-child {
      border-bottom: 0;
    }

    div {
      min-width: 0;
      padding-right: 12px;
    }

    strong {
      font-size: 14px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }

    p {
      max-width: 530px;
      margin: 5px 0 0;
      font-size: 13px;
      line-height: 1.5;
      color: var(--el-text-color-regular);
      white-space: pre-wrap;
    }
  }
}

@media (width <= 768px) {
  .quick-reply-manager__form {
    grid-template-columns: 1fr;
    grid-template-areas: 'name' 'content' 'submit';
  }
}
</style>
