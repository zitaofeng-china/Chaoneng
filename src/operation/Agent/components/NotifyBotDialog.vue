<template>
  <Dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    :width="dialogWidth"
    :max-height="dialogMaxHeight"
  >
    <div v-loading="loading" class="notify-bot-body">
      <ElForm v-if="showModeSelect" label-width="0" class="notify-bot-selector">
        <ElFormItem>
          <ElTabs
            v-model="selectedMode"
            class="notify-config-tabs"
            :class="{ 'is-disabled': loading || submitting }"
          >
            <ElTabPane
              v-for="tab in notifyModeTabs"
              :key="tab.name"
              :label="tab.label"
              :name="tab.name"
              :disabled="loading || submitting"
            />
          </ElTabs>
        </ElFormItem>
      </ElForm>

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
        <ElDescriptionsItem v-if="isResourcePoolMode" label="整点广播对象ID">
          {{ resourcePoolForm.broadcast_chat_id || '-' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem v-if="isResourcePoolMode" label="未匹配订单对象ID">
          {{ resourcePoolForm.no_match_chat_id || '-' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem v-if="isResourcePoolMode" label="代理充值地址阈值">
          {{ formatThreshold(resourcePoolForm.agent_address_threshold) }}
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
            <ElFormItem
              v-if="isResourcePoolMode"
              label="代理充值地址阈值"
              prop="agent_address_threshold"
            >
              <ElInputNumber
                v-model="resourcePoolForm.agent_address_threshold"
                :min="0"
                :precision="0"
                :step="1"
                controls-position="right"
                style="width: 100%"
              />
            </ElFormItem>
            <ElFormItem label="接收消息对象ID" prop="chat_id" required>
              <ElInput
                v-model="resourcePoolForm.chat_id"
                clearable
                inputmode="numeric"
                pattern="-?[0-9]*"
                placeholder="请输入接收消息对象ID"
                style="width: 100%"
                @input="handleChatIdInput"
              />
            </ElFormItem>
            <ElFormItem
              v-if="isResourcePoolMode"
              label="整点广播对象ID"
              prop="broadcast_chat_id"
              required
            >
              <ElInput
                v-model="resourcePoolForm.broadcast_chat_id"
                clearable
                inputmode="numeric"
                pattern="-?[0-9]*"
                placeholder="请输入整点广播对象ID"
                style="width: 100%"
                @input="handleBroadcastChatIdInput"
              />
            </ElFormItem>
            <ElFormItem
              v-if="isResourcePoolMode"
              label="未匹配订单对象ID"
              prop="no_match_chat_id"
              required
            >
              <ElInput
                v-model="resourcePoolForm.no_match_chat_id"
                clearable
                inputmode="numeric"
                pattern="-?[0-9]*"
                placeholder="请输入接收未匹配订单信息的对象ID"
                style="width: 100%"
                @input="handleNoMatchChatIdInput"
              />
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
        <ElButton @click="handleClose" :disabled="submitting">
          {{ isConfigMode ? '取消' : '关闭' }}
        </ElButton>
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
  ElInputNumber,
  ElOption,
  ElSelect,
  ElSwitch,
  ElTabPane,
  ElTabs
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
import { formatTableDateTime } from '@/utils/tableHelpers'

const props = defineProps<{
  visible: boolean
  mode?: 'agent' | 'resourcePool' | 'asset'
  title?: string
  showModeSelect?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'success'): void
}>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

type NotifyBotMode = 'agent' | 'resourcePool' | 'asset'
type ResourcePoolFormState = {
  token: string
  broadcast_chat_id: string
  chat_id: string
  no_match_chat_id: string
  agent_address_threshold: number
  interval: number
  status: number
}

const DEFAULT_RESOURCE_POOL_FORM: ResourcePoolFormState = {
  token: '',
  broadcast_chat_id: '',
  chat_id: '',
  no_match_chat_id: '',
  agent_address_threshold: 0,
  interval: 30,
  status: 1
}
const notifyModeTabs: Array<{ label: string; name: NotifyBotMode }> = [
  { label: '资源池播报', name: 'resourcePool' },
  { label: '现金池播报', name: 'asset' },
  { label: '代理订阅', name: 'agent' }
]

const getDefaultMode = (): NotifyBotMode =>
  props.mode || (props.showModeSelect ? 'resourcePool' : 'agent')
const selectedMode = ref<NotifyBotMode>(getDefaultMode())
const showModeSelect = computed(() => !!props.showModeSelect)
const effectiveMode = computed<NotifyBotMode>(() =>
  showModeSelect.value ? selectedMode.value : props.mode || 'agent'
)
const isConfigMode = computed(
  () => effectiveMode.value === 'resourcePool' || effectiveMode.value === 'asset'
)
const isResourcePoolMode = computed(() => effectiveMode.value === 'resourcePool')
const isAssetMode = computed(() => effectiveMode.value === 'asset')
const dialogTitle = computed(() => props.title || '通知配置')
const emptyDescription = computed(() => '暂无通知配置')
const dialogWidth = computed(() =>
  isResourcePoolMode.value && !showModeSelect.value ? '840px' : '680px'
)
const dialogMaxHeight = computed(() => 'auto')

const loading = ref(false)
const submitting = ref(false)
const agentBotInfo = ref<NotifyBotInfo | null>(null)
const resourcePoolBotInfo = ref<ResourcePoolNotifyData | null>(null)
const assetBotInfo = ref<AssetNotifyData | null>(null)
const tokenInput = ref('')
const resourcePoolFormRef = ref<FormInstance>()
const resourcePoolForm = ref<ResourcePoolFormState>({ ...DEFAULT_RESOURCE_POOL_FORM })
const CHAT_ID_PATTERN = /^-?\d+$/
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

const getNotifyStatusLabel = (status?: number) => NOTIFY_STATUS_LABEL_MAP[status || 1] || '启用'
const getIntervalLabel = (interval?: number) =>
  INTERVAL_LABEL_MAP[interval || 30] || `每${interval || 30}分钟`

const getNotifyStatusClass = (status?: number) =>
  status === 2 ? 'notify-status notify-status--disabled' : 'notify-status notify-status--enabled'

const formatThreshold = (value?: number) => (value === undefined || value === null ? '-' : value)

const createChatIdRule = (label: string) => [
  {
    validator: (_rule: unknown, value: unknown, callback: (error?: Error) => void) => {
      const chatId = String(value || '').trim()
      if (!chatId) {
        callback(new Error(`请输入${label}，只可以输入数字`))
        return
      }
      if (!CHAT_ID_PATTERN.test(chatId)) {
        callback(new Error(`${label}只可以输入数字，可在开头输入负号`))
        return
      }
      if (!Number.isSafeInteger(Number(chatId))) {
        callback(new Error(`${label}超出有效数字范围`))
        return
      }
      callback()
    },
    trigger: ['blur', 'change'] as const
  }
]

const resourcePoolRules: FormRules = {
  token: [{ required: true, message: '请输入机器人 Token', trigger: 'blur' }],
  broadcast_chat_id: createChatIdRule('整点广播对象ID'),
  chat_id: createChatIdRule('接收消息对象ID'),
  no_match_chat_id: createChatIdRule('未匹配订单对象ID')
}
const currentBotInfo = computed(() => {
  if (isResourcePoolMode.value) return resourcePoolBotInfo.value
  if (isAssetMode.value) return assetBotInfo.value
  return agentBotInfo.value
})

const { copy } = useClipboard()

const resetBotInfo = () => {
  agentBotInfo.value = null
  resourcePoolBotInfo.value = null
  assetBotInfo.value = null
}

const resetDialogState = () => {
  resetBotInfo()
  tokenInput.value = ''
  resourcePoolForm.value = { ...DEFAULT_RESOURCE_POOL_FORM }
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
          broadcast_chat_id: res.data.broadcast_chat_id ? String(res.data.broadcast_chat_id) : '',
          chat_id: res.data.chat_id ? String(res.data.chat_id) : '',
          no_match_chat_id: res.data.no_match_chat_id ? String(res.data.no_match_chat_id) : '',
          agent_address_threshold: Number(res.data.agent_address_threshold) || 0,
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
          broadcast_chat_id: '',
          chat_id: res.data.chat_id ? String(res.data.chat_id) : '',
          no_match_chat_id: '',
          agent_address_threshold: 0,
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
    resetBotInfo()
    handleErrorMessage(error, isConfigMode.value ? '获取通知配置失败' : '获取通知机器人失败')
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

const normalizeChatIdInput = (value: string | number) => {
  const text = String(value || '')
  const sign = text.trimStart().startsWith('-') ? '-' : ''
  const digits = text.replace(/\D/g, '')
  return `${sign}${digits}`
}

const handleChatIdInput = (value: string) => {
  resourcePoolForm.value.chat_id = normalizeChatIdInput(value)
}

const handleBroadcastChatIdInput = (value: string) => {
  resourcePoolForm.value.broadcast_chat_id = normalizeChatIdInput(value)
}

const handleNoMatchChatIdInput = (value: string) => {
  resourcePoolForm.value.no_match_chat_id = normalizeChatIdInput(value)
}

const getChatIdNumber = () => Number(resourcePoolForm.value.chat_id.trim())

const getBroadcastChatIdNumber = () => Number(resourcePoolForm.value.broadcast_chat_id.trim())

const getNoMatchChatIdNumber = () => Number(resourcePoolForm.value.no_match_chat_id.trim())

const handleSave = async () => {
  if (submitting.value) return
  submitting.value = true
  try {
    if (isResourcePoolMode.value) {
      const valid = await resourcePoolFormRef.value?.validate().catch(() => false)
      if (!valid) return

      await updateResourcePoolNotify({
        token: resourcePoolForm.value.token.trim(),
        broadcast_chat_id: getBroadcastChatIdNumber(),
        chat_id: getChatIdNumber(),
        no_match_chat_id: getNoMatchChatIdNumber(),
        agent_address_threshold: Number(resourcePoolForm.value.agent_address_threshold) || 0,
        status: Number(resourcePoolForm.value.status) === 2 ? 2 : 1
      })
      await fetchNotifyBot()
      handleSuccessMessage('通知配置保存成功')
    } else if (isAssetMode.value) {
      const valid = await resourcePoolFormRef.value?.validate().catch(() => false)
      if (!valid) return

      await updateAssetNotify({
        token: resourcePoolForm.value.token.trim(),
        chat_id: getChatIdNumber(),
        interval: Number(resourcePoolForm.value.interval) || 30
      })
      await fetchNotifyBot()
      handleSuccessMessage('通知配置保存成功')
    } else {
      const token = tokenInput.value.trim()
      if (!token) {
        handleErrorMessage(new Error('请输入机器人 Token'), '请输入机器人 Token')
        return
      }

      await v1SetNotifyBot({ token })
      await fetchNotifyBot()
      handleSuccessMessage('设置成功')
      tokenInput.value = ''
    }

    emit('success')
  } catch (error) {
    const errorMessage =
      isResourcePoolMode.value || isAssetMode.value ? '保存通知配置失败' : '设置失败'
    handleErrorMessage(error, errorMessage)
  } finally {
    submitting.value = false
  }
}

const handleClose = () => {
  if (submitting.value) return
  dialogVisible.value = false
}

watch(
  () => props.visible,
  async (val) => {
    if (val) {
      selectedMode.value = getDefaultMode()
      resetDialogState()
      await fetchNotifyBot()
    }
  }
)

watch(selectedMode, async () => {
  if (!props.visible || !showModeSelect.value) return

  resetDialogState()
  await fetchNotifyBot()
})
</script>

<style scoped>
.notify-bot-body {
  padding: 4px 6px;
}

.notify-bot-body :deep(.el-descriptions__label) {
  white-space: nowrap;
}

.notify-bot-selector {
  width: 100%;
  margin-bottom: 12px;
}

.notify-bot-selector :deep(.el-form-item__content) {
  margin-left: 0 !important;
}

.notify-config-tabs {
  width: 100%;
}

.notify-config-tabs.is-disabled {
  pointer-events: none;
}

.notify-config-tabs :deep(.el-tabs__header) {
  margin-bottom: 12px;
}

.notify-config-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
}

.notify-config-tabs :deep(.el-tabs__item) {
  height: 36px;
  padding: 0 18px;
  font-size: 14px;
  line-height: 36px;
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
</style>
