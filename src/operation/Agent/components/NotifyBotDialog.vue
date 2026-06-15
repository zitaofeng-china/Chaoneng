<template>
  <Dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    :width="dialogWidth"
    :max-height="dialogMaxHeight"
  >
    <div v-loading="loading" class="notify-bot-body">
      <ElDescriptions v-if="currentBotInfo" :column="1" border label-width="110px">
        <ElDescriptionsItem label="机器人ID">{{ currentBotInfo.id || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="机器人用户名">{{
          currentBotInfo.user_name || '-'
        }}</ElDescriptionsItem>
        <ElDescriptionsItem label="机器人名称">{{
          currentBotInfo.first_name || '-'
        }}</ElDescriptionsItem>
        <ElDescriptionsItem label="Token">
          <div class="token-cell">
            <span class="token-text">{{ currentBotInfo.token || '-' }}</span>
            <ElButton
              v-if="currentBotInfo.token"
              link
              type="primary"
              size="small"
              @click="copyToken"
            >
              复制
            </ElButton>
          </div>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="更新时间">
          {{ currentBotInfo.updated_at ? formatTableDateTime(currentBotInfo.updated_at) : '-' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem v-if="isResourcePoolMode || isAssetMode" label="接收消息对象ID">
          {{ resourcePoolForm.chat_id || '-' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem v-if="isResourcePoolMode" label="通知状态">
          <span :class="getNotifyStatusClass(resourcePoolForm.status)">
            {{ getNotifyStatusLabel(resourcePoolForm.status) }}
          </span>
        </ElDescriptionsItem>
        <ElDescriptionsItem v-if="isAssetMode" label="推送时间">
          {{ getIntervalLabel(resourcePoolForm.interval) }}
        </ElDescriptionsItem>
      </ElDescriptions>

      <ElEmpty v-else-if="!loading" :description="emptyDescription" />

      <div v-if="isConfigMode" class="edit-token">
        <div class="edit-token-label">修改通知配置</div>
        <div class="resource-pool-form">
          <ElForm
            ref="resourcePoolFormRef"
            :model="resourcePoolForm"
            :rules="resourcePoolRules"
            label-width="140px"
          >
            <ElFormItem label="修改机器人 Token" prop="token" required>
              <ElInput
                v-model="resourcePoolForm.token"
                placeholder="请输入新的机器人 Token"
                clearable
              />
            </ElFormItem>
            <ElFormItem label="接收消息对象ID" prop="chat_id" required>
              <ElSelectV2
                v-model="resourcePoolForm.chat_id"
                :options="receiverOptions"
                filterable
                clearable
                placeholder="请输入接收消息对象ID（频道/群组/个人）"
                style="width: 100%"
                :loading="receiverLoading"
                :remote-method="handleReceiverSearch"
                @visible-change="handleReceiverVisibleChange"
                @change="handleReceiverChange"
              >
                <template #default="{ item }">
                  <div class="receiver-suggestion">
                    <div class="receiver-suggestion__title">
                      <span class="receiver-suggestion__tag">{{ item.kind }}</span>
                      <span class="receiver-suggestion__name">{{ item.title }}</span>
                    </div>
                    <div class="receiver-suggestion__meta">
                      <span>{{ item.subtitle }}</span>
                      <span v-if="item.extra">{{ item.extra }}</span>
                    </div>
                  </div>
                </template>
              </ElSelectV2>
            </ElFormItem>
            <ElFormItem v-if="isResourcePoolMode" label="通知状态" prop="status">
              <ElSwitch
                v-model="resourcePoolForm.status"
                :active-value="1"
                :inactive-value="2"
                active-text="启用"
                inactive-text="禁用"
                inline-prompt
              />
            </ElFormItem>
            <ElFormItem v-if="isAssetMode" label="推送时间" prop="interval">
              <ElSelect v-model="resourcePoolForm.interval" style="width: 100%">
                <ElOption label="每30分钟" :value="30" />
                <ElOption label="每1小时" :value="60" />
                <ElOption label="每2小时" :value="120" />
                <ElOption label="每6小时" :value="360" />
                <ElOption label="每12小时" :value="720" />
                <ElOption label="每24小时" :value="1440" />
              </ElSelect>
            </ElFormItem>
          </ElForm>
        </div>
      </div>

      <div v-else class="edit-token">
        <div class="edit-token-label">修改机器人 Token</div>
        <div class="edit-token-row">
          <ElInput v-model="tokenInput" placeholder="请输入新的机器人 Token" clearable />
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <ElButton @click="handleClose">{{ isConfigMode ? '取消' : '关闭' }}</ElButton>
        <ElButton type="primary" :loading="submitting" @click="handleSave"> 保存 </ElButton>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import {
  ElButton,
  ElDescriptions,
  ElDescriptionsItem,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElInput,
  ElOption,
  ElSelect,
  ElSelectV2,
  ElSwitch
} from 'element-plus'
import { Dialog } from '@/components/Dialog'
import { useClipboard } from '@/hooks/web/useClipboard'
import { handleErrorMessage, handleSuccessMessage } from '@/utils/messageHelper'
import {
  v1GetNotifyBot,
  v1SetNotifyBot,
  type NotifyBotInfo
} from '@/api/opertion/Agent/common/botlist'
import {
  getResourcePoolNotify,
  updateResourcePoolNotify,
  type ResourcePoolNotifyData
} from '@/api/opertion/SystemConfig/ResourcePool'
import {
  getAssetNotify,
  updateAssetNotify,
  type AssetNotifyData
} from '@/api/opertion/DataStatistics/Announcement'
import { v1GetChatList, type MessageChatItem } from '@/api/opertion/common/message'
import { v1GetUserList, type UserItemV1 } from '@/api/opertion/common/tgUser'
import { getChatTypeText } from '@/operation/utils/chat'
import { formatTableDateTime } from '@/utils/tableHelpers'

const props = defineProps<{
  visible: boolean
  mode?: 'agent' | 'resourcePool' | 'asset'
  title?: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'success'): void
}>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const isConfigMode = computed(() => props.mode === 'resourcePool' || props.mode === 'asset')
const isResourcePoolMode = computed(() => props.mode === 'resourcePool')
const isAssetMode = computed(() => props.mode === 'asset')
const dialogTitle = computed(() => props.title || '通知机器人')
const emptyDescription = computed(() => '暂无通知机器人')
const dialogWidth = computed(() => (isResourcePoolMode.value ? '840px' : '680px'))
const dialogMaxHeight = computed(() => 'auto')

const loading = ref(false)
const submitting = ref(false)
const agentBotInfo = ref<NotifyBotInfo | null>(null)
const resourcePoolBotInfo = ref<ResourcePoolNotifyData | null>(null)
const assetBotInfo = ref<AssetNotifyData | null>(null)
const tokenInput = ref('')
const resourcePoolFormRef = ref<FormInstance>()
const receiverLoading = ref(false)
const receiverAllOptions = ref<ReceiverSuggestionItem[]>([])
const receiverOptions = ref<ReceiverSuggestionItem[]>([])
const resourcePoolForm = ref({
  token: '',
  chat_id: '',
  interval: 30,
  status: 1
})
const RECEIVER_SUGGESTION_PAGE_SIZE = 200
const NOTIFY_STATUS_LABEL_MAP: Record<number, string> = {
  1: '启用',
  2: '禁用'
}
const INTERVAL_LABEL_MAP: Record<number, string> = {
  30: '每30分钟',
  60: '每1小时',
  120: '每2小时',
  360: '每6小时',
  720: '每12小时',
  1440: '每24小时'
}

interface ReceiverSuggestionItem {
  value: string
  title: string
  subtitle: string
  kind: string
  extra?: string
  label?: string
}

const getNotifyStatusLabel = (status?: number) => NOTIFY_STATUS_LABEL_MAP[status || 1] || '启用'
const getIntervalLabel = (interval?: number) =>
  INTERVAL_LABEL_MAP[interval || 30] || `每${interval || 30}分钟`

const getNotifyStatusClass = (status?: number) =>
  status === 2 ? 'notify-status notify-status--disabled' : 'notify-status notify-status--enabled'

const resourcePoolRules: FormRules = {
  token: [{ required: true, message: '请输入机器人 Token', trigger: 'blur' }],
  chat_id: [
    { required: true, message: '请输入接收消息对象ID', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) => {
        if (!/^-?\d+$/.test(String(value || '').trim())) {
          callback(new Error('接收消息对象ID必须为整数'))
          return
        }
        callback()
      },
      trigger: ['blur', 'change']
    }
  ]
}
const currentBotInfo = computed(() => {
  if (isResourcePoolMode.value) return resourcePoolBotInfo.value
  if (isAssetMode.value) return assetBotInfo.value
  return agentBotInfo.value
})

const { copy } = useClipboard()

const toUserSuggestion = (user: UserItemV1): ReceiverSuggestionItem | null => {
  const id = Number(user.tg_user_id)
  if (!Number.isFinite(id) || id === 0) {
    return null
  }

  return {
    value: String(id),
    label: String(id),
    title: user.tg_user_name || user.tg_first_name || user.username || `TG用户 ${id}`,
    subtitle: `对象ID: ${id}`,
    extra: `用户名: ${user.tg_user_name || user.tg_first_name || user.username || '-'}`,
    kind: '个人'
  }
}

const toChatSuggestion = (chat: MessageChatItem): ReceiverSuggestionItem | null => {
  const id = Number(chat.id)
  if (!Number.isFinite(id)) {
    return null
  }

  return {
    value: String(id),
    label: String(id),
    title: chat.name || `聊天 ${id}`,
    subtitle: `对象ID: ${id}`,
    extra: `会话名称: ${chat.name || '-'}`,
    kind: getChatTypeText(chat.type, '聊天')
  }
}

const ensureCurrentValueSuggestion = (
  suggestions: ReceiverSuggestionItem[],
  currentValue: string
): ReceiverSuggestionItem[] => {
  const trimmedValue = currentValue.trim()
  if (
    !trimmedValue ||
    !/^-?\d+$/.test(trimmedValue) ||
    suggestions.some((item) => item.value === trimmedValue)
  ) {
    return suggestions
  }

  return [
    {
      value: trimmedValue,
      label: trimmedValue,
      title: trimmedValue,
      subtitle: `对象ID: ${trimmedValue}`,
      extra: '当前配置 / 手动输入',
      kind: 'ID'
    },
    ...suggestions
  ]
}

const mergeSuggestions = (
  userList: UserItemV1[] = [],
  chatList: MessageChatItem[] = [],
  currentValue = ''
) => {
  const suggestionMap = new Map<string, ReceiverSuggestionItem>()

  userList.forEach((user) => {
    const suggestion = toUserSuggestion(user)
    if (suggestion && !suggestionMap.has(suggestion.value)) {
      suggestionMap.set(suggestion.value, suggestion)
    }
  })

  chatList.forEach((chat) => {
    const suggestion = toChatSuggestion(chat)
    if (suggestion && !suggestionMap.has(suggestion.value)) {
      suggestionMap.set(suggestion.value, suggestion)
    }
  })

  return ensureCurrentValueSuggestion(Array.from(suggestionMap.values()), currentValue)
}

const filterReceiverOptions = (queryString: string) => {
  const keyword = queryString.trim().toLowerCase()
  const source = receiverAllOptions.value
  const filtered = !keyword
    ? source
    : source.filter((item) => {
        const searchText =
          `${item.value} ${item.label || ''} ${item.title} ${item.subtitle} ${item.kind}`
            .toLowerCase()
            .trim()
        return searchText.includes(keyword)
      })

  receiverOptions.value = ensureCurrentValueSuggestion(filtered, resourcePoolForm.value.chat_id)
}

const fetchReceiverSuggestions = async () => {
  receiverLoading.value = true

  try {
    const [chatRes, userRes] = await Promise.all([
      v1GetChatList({
        current_page: 1,
        page_size: RECEIVER_SUGGESTION_PAGE_SIZE
      }),
      v1GetUserList({
        current_page: 1,
        page_size: RECEIVER_SUGGESTION_PAGE_SIZE,
        origin: 1
      })
    ])

    receiverAllOptions.value = mergeSuggestions(
      userRes?.data?.list || [],
      chatRes?.data?.list || [],
      resourcePoolForm.value.chat_id
    )
    filterReceiverOptions(resourcePoolForm.value.chat_id || '')
  } catch {
    receiverAllOptions.value = ensureCurrentValueSuggestion([], resourcePoolForm.value.chat_id)
    receiverOptions.value = [...receiverAllOptions.value]
  } finally {
    receiverLoading.value = false
  }
}

const handleReceiverSearch = (queryString: string) => {
  filterReceiverOptions(queryString)
}

const handleReceiverVisibleChange = (visible: boolean) => {
  if (!visible) return
  filterReceiverOptions(resourcePoolForm.value.chat_id || '')
}

const handleReceiverChange = (value: string | number | undefined) => {
  resourcePoolForm.value.chat_id = value === undefined || value === null ? '' : String(value)
}

const fetchNotifyBot = async () => {
  loading.value = true
  try {
    if (isResourcePoolMode.value) {
      const res = await getResourcePoolNotify()
      if (res.code === '000000' && res.data) {
        resourcePoolBotInfo.value = res.data
        resourcePoolForm.value = {
          token: res.data.token || '',
          chat_id: res.data.chat_id ? String(res.data.chat_id) : '',
          interval: 30,
          status: Number(res.data.status) === 2 ? 2 : 1
        }
      } else {
        resourcePoolBotInfo.value = null
      }
    } else if (isAssetMode.value) {
      const res = await getAssetNotify()
      if (res.code === '000000' && res.data) {
        assetBotInfo.value = res.data
        resourcePoolForm.value = {
          token: res.data.token || '',
          chat_id: res.data.chat_id ? String(res.data.chat_id) : '',
          interval: Number(res.data.interval) || 30,
          status: 1
        }
      } else {
        assetBotInfo.value = null
      }
    } else {
      const res = await v1GetNotifyBot()
      if (res.code === '000000' && res.data) {
        agentBotInfo.value = res.data
      } else {
        agentBotInfo.value = null
      }
    }
  } catch (error) {
    if (isResourcePoolMode.value) {
      resourcePoolBotInfo.value = null
      handleErrorMessage(error, '获取通知配置失败')
    } else if (isAssetMode.value) {
      assetBotInfo.value = null
      handleErrorMessage(error, '获取通知配置失败')
    } else {
      agentBotInfo.value = null
      handleErrorMessage(error, '获取通知机器人失败')
    }
  } finally {
    loading.value = false
  }
}

const copyToken = () => {
  const token = isResourcePoolMode.value
    ? resourcePoolBotInfo.value?.token
    : isAssetMode.value
      ? assetBotInfo.value?.token
      : agentBotInfo.value?.token
  if (!token) return
  copy(token)
  handleSuccessMessage('Token 已复制')
}

const handleSave = async () => {
  submitting.value = true
  try {
    if (isResourcePoolMode.value) {
      const valid = await resourcePoolFormRef.value?.validate().catch(() => false)
      if (!valid) return

      await updateResourcePoolNotify({
        token: resourcePoolForm.value.token.trim(),
        chat_id: Number(resourcePoolForm.value.chat_id.trim()),
        status: Number(resourcePoolForm.value.status) === 2 ? 2 : 1
      })
      handleSuccessMessage('通知配置保存成功')
    } else if (isAssetMode.value) {
      const valid = await resourcePoolFormRef.value?.validate().catch(() => false)
      if (!valid) return

      await updateAssetNotify({
        token: resourcePoolForm.value.token.trim(),
        chat_id: Number(resourcePoolForm.value.chat_id.trim()),
        interval: Number(resourcePoolForm.value.interval) || 30
      })
      handleSuccessMessage('通知配置保存成功')
    } else {
      const token = tokenInput.value.trim()
      if (!token) {
        handleErrorMessage(new Error('请输入机器人 Token'), '请输入机器人 Token')
        return
      }

      await v1SetNotifyBot({ token })
      handleSuccessMessage('设置成功')
      tokenInput.value = ''
    }

    await fetchNotifyBot()
    emit('success')
  } catch (error) {
    handleErrorMessage(error, isResourcePoolMode.value ? '保存通知配置失败' : '设置失败')
  } finally {
    submitting.value = false
  }
}

const handleClose = () => {
  dialogVisible.value = false
}

watch(
  () => props.visible,
  async (val) => {
    if (val) {
      agentBotInfo.value = null
      resourcePoolBotInfo.value = null
      assetBotInfo.value = null
      receiverAllOptions.value = []
      receiverOptions.value = []
      receiverLoading.value = false
      tokenInput.value = ''
      resourcePoolForm.value = {
        token: '',
        chat_id: '',
        interval: 30,
        status: 1
      }
      await fetchNotifyBot()

      if (isConfigMode.value) {
        await fetchReceiverSuggestions()
      }
    }
  }
)
</script>

<style scoped>
.notify-bot-body {
  padding: 4px 6px;
}

.notify-bot-body :deep(.el-descriptions__label) {
  white-space: nowrap;
}

.resource-pool-descriptions {
  width: 100%;
}

.token-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.token-text {
  flex: 1;
  word-break: break-all;
}

.edit-token {
  margin-top: 16px;
}

.resource-pool-form {
  max-width: 760px;
  margin-top: 8px;
}

.edit-token-label {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.edit-token-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.notify-status {
  font-weight: 500;
}

.notify-status--enabled {
  color: #67c23a;
}

.notify-status--disabled {
  color: #f56c6c;
}

.notify-bot-body :deep(.el-form-item__content) {
  min-width: 0;
}

.receiver-suggestion {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 2px 0;
}

.receiver-suggestion__title {
  display: flex;
  gap: 8px;
  align-items: center;
}

.receiver-suggestion__tag {
  flex-shrink: 0;
  min-width: 40px;
  color: #409eff;
}

.receiver-suggestion__name {
  overflow: hidden;
  color: #303133;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.receiver-suggestion__meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
  color: #909399;
}
</style>
