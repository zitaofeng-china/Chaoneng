<template>
  <div class="customer-service-filters" @click.stop>
    <div class="customer-service-filters__field">
      <span>关键词：</span>
      <el-input
        :model-value="keyword"
        placeholder="chat_id / 用户昵称"
        clearable
        @update:model-value="emit('update:keyword', $event)"
        @keyup.enter="emit('search')"
      />
    </div>
    <div class="customer-service-filters__field">
      <span>机器人：</span>
      <el-select
        :model-value="botId ?? ''"
        placeholder="全部"
        clearable
        @update:model-value="emit('update:bot-id', $event === '' ? undefined : Number($event))"
      >
        <el-option
          v-for="option in botOptions"
          :key="String(option.value)"
          :label="option.label"
          :value="option.value ?? ''"
        />
      </el-select>
    </div>
    <div class="customer-service-filters__field">
      <span>代理：</span>
      <el-select
        :model-value="agentId ?? ''"
        placeholder="全部"
        clearable
        filterable
        @update:model-value="emit('update:agent-id', $event === '' ? undefined : Number($event))"
      >
        <el-option
          v-for="option in agentOptions"
          :key="String(option.value)"
          :label="option.label"
          :value="option.value ?? ''"
        />
      </el-select>
    </div>
    <div class="customer-service-filters__actions">
      <el-button type="primary" :loading="loading" @click="emit('search')">查询</el-button>
      <el-button :disabled="loading" @click="emit('reset')">重置</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  keyword: string
  botId?: number
  agentId?: number
  botOptions: Array<{ label: string; value: number | undefined }>
  agentOptions: Array<{ label: string; value: number | undefined }>
  loading: boolean
}>()
const emit = defineEmits<{
  (event: 'update:keyword', value: string): void
  (event: 'update:bot-id', value: number | undefined): void
  (event: 'update:agent-id', value: number | undefined): void
  (event: 'search'): void
  (event: 'reset'): void
}>()
</script>

<style scoped lang="less">
.customer-service-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  margin-bottom: 14px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color);
  border-radius: 6px;

  &__field {
    display: flex;
    align-items: center;
    gap: 8px;

    span {
      font-size: 14px;
      color: var(--el-text-color-primary);
      flex: none;
    }

    :deep(.el-input),
    :deep(.el-select) {
      width: 220px;
    }
  }

  &__actions {
    display: flex;
    gap: 8px;
  }
}

@media (width <= 768px) {
  .customer-service-filters__field {
    width: 100%;

    :deep(.el-input),
    :deep(.el-select) {
      flex: 1;
      width: auto;
    }
  }
}
</style>
