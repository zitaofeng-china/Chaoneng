<template>
  <div class="recipient-selector">
    <!-- 接收用户类型选择 -->
    <ElFormItem
      v-if="showFilterType && !isSingleUser && !isMultipleBots"
      label="接收用户"
      prop="filter_type"
      :rules="[{ required: true, message: '请选择接收用户类型', trigger: 'change' }]"
    >
      <ElRadioGroup :model-value="filterType" @update:model-value="handleFilterTypeChange">
        <ElRadio value="user_custom">自定义</ElRadio>
        <ElRadio value="all_user">全部</ElRadio>
      </ElRadioGroup>
    </ElFormItem>

    <!-- TG用户ID列表 -->
    <ElFormItem
      v-if="showUserList && shouldShowUserListInput"
      :label="isSingleUser ? 'TG用户ID' : 'TG用户ID列表'"
      prop="user_list"
    >
      <!-- 单个用户模式：只读输入框 -->
      <ElInput
        v-if="isSingleUser"
        :model-value="userList"
        @update:model-value="handleUserListChange"
        disabled
        placeholder="当前用户TG ID"
      />
      <!-- 群发模式：虚拟化下拉多选框 -->
      <ElSelectV2
        v-else
        :model-value="selectedUserIds"
        @update:model-value="handleUserSelectionChange"
        :options="userOptions"
        multiple
        filterable
        clearable
        placeholder="请选择用户"
        style="width: 100%"
        :loading="loadingUsers"
        :disabled="!selectedBotId || loadingUsers"
        collapse-tags
        collapse-tags-tooltip
        :max-collapse-tags="3"
      />
    </ElFormItem>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, ref, type PropType } from 'vue'
import { ElFormItem, ElRadioGroup, ElRadio, ElInput, ElSelectV2, ElMessage } from 'element-plus'
import { v1GetMessageUserList } from '@/api/management/common/message'
import { handleErrorMessage, handleWarningMessage } from '@/utils/messageHelper'
import type { SelectOption } from '@/utils/tableHelpers'

const props = defineProps({
  filterType: {
    type: String as PropType<'user_custom' | 'all_user'>,
    default: 'user_custom'
  },
  userList: {
    type: String,
    default: ''
  },
  isSingleUser: {
    type: Boolean,
    default: false
  },
  isMultipleBots: {
    type: Boolean,
    default: false
  },
  showFilterType: {
    type: Boolean,
    default: true
  },
  showUserList: {
    type: Boolean,
    default: true
  },
  selectedBotId: {
    type: [Number, String] as PropType<number | string | undefined>,
    default: undefined
  }
})

const emit = defineEmits(['update:filterType', 'update:userList'])

const loadingUsers = ref(false)
const userOptions = ref<SelectOption<number>[]>([])

const selectedUserIds = computed(() => {
  if (!props.userList) return []
  return props.userList
    .split(',')
    .map((id) => Number(id.trim()))
    .filter((id) => !isNaN(id) && id !== 0)
})

const shouldShowUserListInput = computed(() => {
  if (props.isMultipleBots) return false
  return props.isSingleUser || props.filterType === 'user_custom'
})

const fetchBotUsers = async (botId: number | string) => {
  if (!botId) {
    userOptions.value = []
    return
  }

  loadingUsers.value = true
  try {
    const res = await v1GetMessageUserList(Number(botId))
    if (res.code === '000000') {
      const list = res.data || []
      userOptions.value = list.map((user) => ({
        label: `${user.tg_user_name || user.tg_first_name || 'Unknown'} (${user.tg_user_id})`,
        value: user.tg_user_id
      }))
      if (userOptions.value.length === 0) {
        ElMessage({ type: 'info', message: '没有可选择的用户', grouping: false, offset: 20 })
      }
    } else {
      userOptions.value = []
      handleWarningMessage('获取用户列表失败')
    }
  } catch (error: unknown) {
    userOptions.value = []
    handleErrorMessage(error, '获取用户列表失败')
  } finally {
    loadingUsers.value = false
  }
}

watch(
  () => props.selectedBotId,
  (newBotId) => {
    if (newBotId && !props.isSingleUser && props.filterType === 'user_custom') {
      fetchBotUsers(newBotId)
    } else {
      userOptions.value = []
    }
  },
  { immediate: true }
)

watch(
  () => props.filterType,
  (newType) => {
    if (newType === 'user_custom' && props.selectedBotId) {
      fetchBotUsers(props.selectedBotId)
    }
  }
)

const handleFilterTypeChange = (value: 'user_custom' | 'all_user') => {
  emit('update:filterType', value)
  if (value === 'all_user') {
    emit('update:userList', '')
  }
}

const handleUserListChange = (value: string) => {
  emit('update:userList', value)
}

const handleUserSelectionChange = (selectedIds: number[]) => {
  const userListStr = selectedIds.join(',')
  emit('update:userList', userListStr)
}
</script>

<style scoped>
.recipient-selector {
  width: 100%;
}
</style>
