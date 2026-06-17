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
const resourcePoolForm = ref({
  token: '',
  chat_id: '',
  interval: 30,
  status: 1
})
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

const resourcePoolRules: FormRules = {
  token: [{ required: true, message: '请输入机器人 Token', trigger: 'blur' }],
  chat_id: [
    {
      validator: (_rule, value, callback) => {
        const chatId = String(value || '').trim()
        if (!chatId) {
          callback(new Error('请输入接收消息对象ID'))
          return
        }
        if (!CHAT_ID_PATTERN.test(chatId)) {
          callback(new Error('接收消息对象ID只能输入数字，可在开头输入负号'))
          return
        }
        if (!Number.isSafeInteger(Number(chatId))) {
          callback(new Error('接收消息对象ID超出有效数字范围'))
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

const normalizeChatIdInput = (value: string | number) => {
  const text = String(value || '')
  const sign = text.trimStart().startsWith('-') ? '-' : ''
  const digits = text.replace(/\D/g, '')
  return `${sign}${digits}`
}

const handleChatIdInput = (value: string) => {
  resourcePoolForm.value.chat_id = normalizeChatIdInput(value)
}

const getChatIdNumber = () => Number(resourcePoolForm.value.chat_id.trim())

const handleSave = async () => {
  submitting.value = true
  try {
    if (isResourcePoolMode.value) {
      const valid = await resourcePoolFormRef.value?.validate().catch(() => false)
      if (!valid) return

      await updateResourcePoolNotify({
        token: resourcePoolForm.value.token.trim(),
        chat_id: getChatIdNumber(),
        status: Number(resourcePoolForm.value.status) === 2 ? 2 : 1
      })
      handleSuccessMessage('通知配置保存成功')
    } else if (isAssetMode.value) {
      const valid = await resourcePoolFormRef.value?.validate().catch(() => false)
      if (!valid) return

      await updateAssetNotify({
        token: resourcePoolForm.value.token.trim(),
        chat_id: getChatIdNumber(),
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
      tokenInput.value = ''
      resourcePoolForm.value = {
        token: '',
        chat_id: '',
        interval: 30,
        status: 1
      }
      await fetchNotifyBot()
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
</style>
