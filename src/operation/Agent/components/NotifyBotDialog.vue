<template>
  <Dialog
    v-model="dialogVisible"
    :class="{ 'notify-bot-dialog--split': showModeSelect }"
    :title="dialogTitle"
    :width="dialogWidth"
    :max-height="dialogMaxHeight"
  >
    <div v-loading="loading" :class="showModeSelect ? 'notify-bot-layout' : 'notify-bot-body'">
      <aside v-if="showModeSelect" class="notify-bot-nav">
        <button
          v-for="tab in notifyModeTabs"
          :key="tab.name"
          type="button"
          class="notify-bot-nav__item"
          :class="{ 'is-active': activeSection === tab.name }"
          :disabled="loading || submitting"
          @click="scrollToSection(tab.name)"
        >
          {{ tab.label }}
        </button>
      </aside>

      <div
        ref="scrollAreaRef"
        :class="showModeSelect ? 'notify-bot-scroll' : 'notify-bot-single'"
        @scroll.passive="syncActiveSection"
      >
        <section
          v-for="tab in visibleTabs"
          :id="`notify-section-${tab.name}`"
          :key="tab.name"
          class="notify-bot-section"
          :data-section="tab.name"
        >
          <h3 v-if="showModeSelect" class="notify-bot-section__title">{{ tab.label }}</h3>

          <ElDescriptions v-if="getBotInfo(tab.name)" :column="1" border label-width="110px">
            <ElDescriptionsItem label="机器人ID">{{
              getBotInfo(tab.name)?.id || '-'
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="机器人用户名">{{
              getBotInfo(tab.name)?.user_name || '-'
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="机器人名称">{{
              getBotInfo(tab.name)?.first_name || '-'
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="Token">
              <div class="token-cell">
                <span class="token-text">{{ getBotInfo(tab.name)?.token || '-' }}</span>
                <ElButton
                  v-if="getBotInfo(tab.name)?.token"
                  link
                  type="primary"
                  size="small"
                  @click="copyToken(tab.name)"
                >
                  复制
                </ElButton>
              </div>
            </ElDescriptionsItem>
            <ElDescriptionsItem label="更新时间">
              {{
                getBotInfo(tab.name)?.updated_at
                  ? formatTableDateTime(getBotInfo(tab.name)?.updated_at)
                  : '-'
              }}
            </ElDescriptionsItem>
            <ElDescriptionsItem
              v-if="tab.name === 'resourcePool' || tab.name === 'asset'"
              label="接收消息对象ID"
            >
              {{
                tab.name === 'resourcePool'
                  ? resourcePoolForm.chat_id || '-'
                  : assetForm.chat_id || '-'
              }}
            </ElDescriptionsItem>
            <ElDescriptionsItem v-if="tab.name === 'resourcePool'" label="整点广播对象ID">
              {{ resourcePoolForm.broadcast_chat_id || '-' }}
            </ElDescriptionsItem>
            <ElDescriptionsItem v-if="tab.name === 'resourcePool'" label="未匹配订单对象ID">
              {{ resourcePoolForm.no_match_chat_id || '-' }}
            </ElDescriptionsItem>
            <ElDescriptionsItem v-if="tab.name === 'resourcePool'" label="代理充值地址阈值">
              {{ formatThreshold(resourcePoolForm.agent_address_threshold) }}
            </ElDescriptionsItem>
            <ElDescriptionsItem v-if="tab.name === 'resourcePool'" label="通知状态">
              <span :class="getNotifyStatusClass(resourcePoolForm.status)">
                {{ getNotifyStatusLabel(resourcePoolForm.status) }}
              </span>
            </ElDescriptionsItem>
            <ElDescriptionsItem v-if="tab.name === 'asset'" label="推送时间">
              {{ getIntervalLabel(assetForm.interval) }}
            </ElDescriptionsItem>
          </ElDescriptions>

          <ElEmpty v-else-if="!loading" :description="emptyDescription" />

          <div class="edit-token">
            <div class="edit-token-label">
              {{ tab.name === 'agent' ? '修改机器人 Token' : '修改通知配置' }}
            </div>

            <div v-if="tab.name === 'resourcePool'" class="resource-pool-form">
              <ElForm
                :ref="(el) => assignFormRef('resourcePool', el)"
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
                <ElFormItem label="代理充值地址阈值" prop="agent_address_threshold">
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
                    @input="handleResourcePoolChatIdInput"
                  />
                </ElFormItem>
                <ElFormItem label="整点广播对象ID" prop="broadcast_chat_id" required>
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
                <ElFormItem label="未匹配订单对象ID" prop="no_match_chat_id" required>
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
                <ElFormItem label="通知状态" prop="status">
                  <ElSwitch
                    v-model="resourcePoolForm.status"
                    :active-value="1"
                    :inactive-value="2"
                    active-text="启用"
                    inactive-text="禁用"
                    inline-prompt
                  />
                </ElFormItem>
              </ElForm>
            </div>

            <div v-else-if="tab.name === 'asset'" class="resource-pool-form">
              <ElForm
                :ref="(el) => assignFormRef('asset', el)"
                :model="assetForm"
                :rules="assetRules"
                label-width="140px"
              >
                <ElFormItem label="修改机器人 Token" prop="token" required>
                  <ElInput
                    v-model="assetForm.token"
                    placeholder="请输入新的机器人 Token"
                    clearable
                  />
                </ElFormItem>
                <ElFormItem label="接收消息对象ID" prop="chat_id" required>
                  <ElInput
                    v-model="assetForm.chat_id"
                    clearable
                    inputmode="numeric"
                    pattern="-?[0-9]*"
                    placeholder="请输入接收消息对象ID"
                    style="width: 100%"
                    @input="handleAssetChatIdInput"
                  />
                </ElFormItem>
                <ElFormItem label="推送时间" prop="interval">
                  <ElSelect v-model="assetForm.interval" style="width: 100%">
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

            <div v-else class="edit-token-row">
              <ElInput v-model="tokenInput" placeholder="请输入新的机器人 Token" clearable />
            </div>
          </div>
        </section>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <ElButton @click="handleClose" :disabled="submitting">
          {{ isConfigMode || showModeSelect ? '取消' : '关闭' }}
        </ElButton>
        <ElButton type="primary" :loading="submitting" @click="handleSave"> 保存 </ElButton>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
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
  ElMessage,
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
  status: number
}
type AssetFormState = {
  token: string
  chat_id: string
  interval: number
}

const DEFAULT_RESOURCE_POOL_FORM: ResourcePoolFormState = {
  token: '',
  broadcast_chat_id: '',
  chat_id: '',
  no_match_chat_id: '',
  agent_address_threshold: 0,
  status: 1
}
const DEFAULT_ASSET_FORM: AssetFormState = {
  token: '',
  chat_id: '',
  interval: 30
}
const notifyModeTabs: Array<{ label: string; name: NotifyBotMode }> = [
  { label: '资源池播报', name: 'resourcePool' },
  { label: '现金池播报', name: 'asset' },
  { label: '代理订阅', name: 'agent' }
]

const getDefaultMode = (): NotifyBotMode =>
  props.mode || (props.showModeSelect ? 'resourcePool' : 'agent')
const activeSection = ref<NotifyBotMode>(getDefaultMode())
const showModeSelect = computed(() => !!props.showModeSelect)
const effectiveMode = computed<NotifyBotMode>(() =>
  showModeSelect.value ? activeSection.value : props.mode || 'agent'
)
const isConfigMode = computed(
  () => effectiveMode.value === 'resourcePool' || effectiveMode.value === 'asset'
)
const visibleTabs = computed(() =>
  showModeSelect.value
    ? notifyModeTabs
    : notifyModeTabs.filter((tab) => tab.name === (props.mode || 'agent'))
)
const dialogTitle = computed(() => props.title || '通知配置')
const emptyDescription = computed(() => '暂无通知配置')
const dialogWidth = computed(() => {
  if (showModeSelect.value) return '960px'
  return props.mode === 'resourcePool' ? '840px' : '680px'
})
const dialogMaxHeight = computed(() => (showModeSelect.value ? '640px' : 'auto'))

const loading = ref(false)
const submitting = ref(false)
const scrollingByClick = ref(false)
const scrollAreaRef = ref<HTMLElement>()
const agentBotInfo = ref<NotifyBotInfo | null>(null)
const resourcePoolBotInfo = ref<ResourcePoolNotifyData | null>(null)
const assetBotInfo = ref<AssetNotifyData | null>(null)
const tokenInput = ref('')
const resourcePoolFormRef = ref<FormInstance>()
const assetFormRef = ref<FormInstance>()

const assignFormRef = (name: 'resourcePool' | 'asset', el: unknown) => {
  if (!el) return
  if (name === 'resourcePool') resourcePoolFormRef.value = el as FormInstance
  if (name === 'asset') assetFormRef.value = el as FormInstance
}
const resourcePoolForm = ref<ResourcePoolFormState>({ ...DEFAULT_RESOURCE_POOL_FORM })
const assetForm = ref<AssetFormState>({ ...DEFAULT_ASSET_FORM })
const resourcePoolSnapshot = ref('')
const assetSnapshot = ref('')
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
const assetRules: FormRules = {
  token: [{ required: true, message: '请输入机器人 Token', trigger: 'blur' }],
  chat_id: createChatIdRule('接收消息对象ID')
}

const getBotInfo = (mode: NotifyBotMode) => {
  if (mode === 'resourcePool') return resourcePoolBotInfo.value
  if (mode === 'asset') return assetBotInfo.value
  return agentBotInfo.value
}

const snapshotOf = (value: unknown) => JSON.stringify(value)

const isResourcePoolDirty = computed(
  () => snapshotOf(resourcePoolForm.value) !== resourcePoolSnapshot.value
)
const isAssetDirty = computed(() => snapshotOf(assetForm.value) !== assetSnapshot.value)
const isAgentDirty = computed(() => tokenInput.value.trim() !== '')

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
  assetForm.value = { ...DEFAULT_ASSET_FORM }
  resourcePoolSnapshot.value = snapshotOf(resourcePoolForm.value)
  assetSnapshot.value = snapshotOf(assetForm.value)
  activeSection.value = getDefaultMode()
}

const rememberSnapshots = () => {
  resourcePoolSnapshot.value = snapshotOf(resourcePoolForm.value)
  assetSnapshot.value = snapshotOf(assetForm.value)
}

const loadResourcePoolConfig = async () => {
  const res = await getResourcePoolNotify()
  if (res.code === '000000' && res.data) {
    resourcePoolBotInfo.value = res.data
    resourcePoolForm.value = {
      token: res.data.token || '',
      broadcast_chat_id: res.data.broadcast_chat_id ? String(res.data.broadcast_chat_id) : '',
      chat_id: res.data.chat_id ? String(res.data.chat_id) : '',
      no_match_chat_id: res.data.no_match_chat_id ? String(res.data.no_match_chat_id) : '',
      agent_address_threshold: Number(res.data.agent_address_threshold) || 0,
      status: Number(res.data.status) === 2 ? 2 : 1
    }
  } else {
    resourcePoolBotInfo.value = null
    resourcePoolForm.value = { ...DEFAULT_RESOURCE_POOL_FORM }
  }
}

const loadAssetConfig = async () => {
  const res = await getAssetNotify()
  if (res.code === '000000' && res.data) {
    assetBotInfo.value = res.data
    assetForm.value = {
      token: res.data.token || '',
      chat_id: res.data.chat_id ? String(res.data.chat_id) : '',
      interval: Number(res.data.interval) || 30
    }
  } else {
    assetBotInfo.value = null
    assetForm.value = { ...DEFAULT_ASSET_FORM }
  }
}

const loadAgentConfig = async () => {
  const res = await v1GetNotifyBot()
  if (res.code === '000000' && res.data) {
    agentBotInfo.value = res.data
  } else {
    agentBotInfo.value = null
  }
}

const fetchNotifyConfigs = async () => {
  loading.value = true
  try {
    const loaders = showModeSelect.value
      ? [loadResourcePoolConfig(), loadAssetConfig(), loadAgentConfig()]
      : props.mode === 'resourcePool'
        ? [loadResourcePoolConfig()]
        : props.mode === 'asset'
          ? [loadAssetConfig()]
          : [loadAgentConfig()]
    await Promise.all(loaders)
    rememberSnapshots()
  } catch (error) {
    resetBotInfo()
    handleErrorMessage(error, '获取通知配置失败')
  } finally {
    loading.value = false
  }
}

const copyToken = (mode: NotifyBotMode) => {
  const token = getBotInfo(mode)?.token
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

const handleResourcePoolChatIdInput = (value: string) => {
  resourcePoolForm.value.chat_id = normalizeChatIdInput(value)
}

const handleAssetChatIdInput = (value: string) => {
  assetForm.value.chat_id = normalizeChatIdInput(value)
}

const handleBroadcastChatIdInput = (value: string) => {
  resourcePoolForm.value.broadcast_chat_id = normalizeChatIdInput(value)
}

const handleNoMatchChatIdInput = (value: string) => {
  resourcePoolForm.value.no_match_chat_id = normalizeChatIdInput(value)
}

const toChatIdNumber = (value: string) => Number(value.trim())

const scrollToSection = async (mode: NotifyBotMode) => {
  activeSection.value = mode
  if (!showModeSelect.value) return
  scrollingByClick.value = true
  await nextTick()
  const container = scrollAreaRef.value
  const section = document.getElementById(`notify-section-${mode}`)
  if (container && section) {
    const isLast = mode === notifyModeTabs[notifyModeTabs.length - 1].name
    const top = isLast
      ? container.scrollHeight - container.clientHeight
      : section.getBoundingClientRect().top -
        container.getBoundingClientRect().top +
        container.scrollTop
    container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }
  window.setTimeout(() => {
    scrollingByClick.value = false
  }, 360)
}

const syncActiveSection = () => {
  if (!showModeSelect.value || scrollingByClick.value) return
  const container = scrollAreaRef.value
  if (!container) return

  if (container.scrollTop + container.clientHeight >= container.scrollHeight - 8) {
    activeSection.value = notifyModeTabs[notifyModeTabs.length - 1].name
    return
  }

  const containerTop = container.getBoundingClientRect().top
  let current = notifyModeTabs[0].name
  for (const tab of notifyModeTabs) {
    const section = document.getElementById(`notify-section-${tab.name}`)
    if (!section) continue
    if (section.getBoundingClientRect().top - containerTop <= 48) current = tab.name
  }
  activeSection.value = current
}

const saveResourcePool = async () => {
  await updateResourcePoolNotify({
    token: resourcePoolForm.value.token.trim(),
    broadcast_chat_id: toChatIdNumber(resourcePoolForm.value.broadcast_chat_id),
    chat_id: toChatIdNumber(resourcePoolForm.value.chat_id),
    no_match_chat_id: toChatIdNumber(resourcePoolForm.value.no_match_chat_id),
    agent_address_threshold: Number(resourcePoolForm.value.agent_address_threshold) || 0,
    status: Number(resourcePoolForm.value.status) === 2 ? 2 : 1
  })
}

const saveAsset = async () => {
  await updateAssetNotify({
    token: assetForm.value.token.trim(),
    chat_id: toChatIdNumber(assetForm.value.chat_id),
    interval: Number(assetForm.value.interval) || 30
  })
}

const saveAgent = async () => {
  const token = tokenInput.value.trim()
  if (!token) throw new Error('请输入机器人 Token')
  await v1SetNotifyBot({ token })
  tokenInput.value = ''
}

const handleSaveCombined = async () => {
  const dirtyTasks: Array<{
    name: NotifyBotMode
    label: string
    validate: () => Promise<boolean>
    save: () => Promise<void>
  }> = []

  if (isResourcePoolDirty.value) {
    dirtyTasks.push({
      name: 'resourcePool',
      label: '资源池播报',
      validate: async () => Boolean(await resourcePoolFormRef.value?.validate().catch(() => false)),
      save: saveResourcePool
    })
  }
  if (isAssetDirty.value) {
    dirtyTasks.push({
      name: 'asset',
      label: '现金池播报',
      validate: async () => Boolean(await assetFormRef.value?.validate().catch(() => false)),
      save: saveAsset
    })
  }
  if (isAgentDirty.value) {
    dirtyTasks.push({
      name: 'agent',
      label: '代理订阅',
      validate: async () => {
        if (tokenInput.value.trim()) return true
        handleErrorMessage(new Error('请输入机器人 Token'), '请输入机器人 Token')
        return false
      },
      save: saveAgent
    })
  }

  if (!dirtyTasks.length) {
    ElMessage.info('没有需要保存的修改')
    return
  }

  for (const task of dirtyTasks) {
    const valid = await task.validate()
    if (!valid) {
      await scrollToSection(task.name)
      return
    }
  }

  const saved: string[] = []
  const failed: string[] = []
  for (const task of dirtyTasks) {
    try {
      await task.save()
      saved.push(task.label)
    } catch {
      failed.push(task.label)
    }
  }

  await fetchNotifyConfigs()

  if (saved.length) {
    handleSuccessMessage(
      saved.length === dirtyTasks.length ? '通知配置保存成功' : `${saved.join('、')}已保存`
    )
    emit('success')
  }
  if (failed.length) {
    handleErrorMessage(new Error(failed.join('、')), `${failed.join('、')}保存失败`)
  }
}

const handleSaveSingle = async () => {
  const mode = props.mode || 'agent'
  if (mode === 'resourcePool') {
    const valid = await resourcePoolFormRef.value?.validate().catch(() => false)
    if (!valid) return
    if (!isResourcePoolDirty.value) {
      ElMessage.info('没有需要保存的修改')
      return
    }
    await saveResourcePool()
  } else if (mode === 'asset') {
    const valid = await assetFormRef.value?.validate().catch(() => false)
    if (!valid) return
    if (!isAssetDirty.value) {
      ElMessage.info('没有需要保存的修改')
      return
    }
    await saveAsset()
  } else {
    if (!isAgentDirty.value) {
      ElMessage.info('没有需要保存的修改')
      return
    }
    await saveAgent()
  }

  await fetchNotifyConfigs()
  handleSuccessMessage(mode === 'agent' ? '设置成功' : '通知配置保存成功')
  emit('success')
}

const handleSave = async () => {
  if (submitting.value) return
  submitting.value = true
  try {
    if (showModeSelect.value) await handleSaveCombined()
    else await handleSaveSingle()
  } catch (error) {
    handleErrorMessage(error, '保存通知配置失败')
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
    if (!val) return
    resetDialogState()
    await fetchNotifyConfigs()
    await nextTick()
    if (scrollAreaRef.value) scrollAreaRef.value.scrollTop = 0
  }
)
</script>

<style scoped>
.notify-bot-dialog--split :deep(.el-scrollbar__wrap) {
  overflow: hidden;
}

.notify-bot-body,
.notify-bot-single {
  padding: 4px 6px;
}

.notify-bot-layout {
  display: flex;
  height: 560px;
  min-height: 0;
  overflow: hidden;
}

.notify-bot-nav {
  position: sticky;
  top: 0;
  display: flex;
  width: 132px;
  padding: 4px 8px 4px 0;
  border-right: 1px solid var(--el-border-color-lighter);
  flex: none;
  flex-direction: column;
  align-self: flex-start;
  gap: 6px;
}

.notify-bot-nav__item {
  display: block;
  width: 100%;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 20px;
  color: var(--el-text-color-regular);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 6px;
}

.notify-bot-nav__item:hover {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.notify-bot-nav__item.is-active {
  font-weight: 600;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  box-shadow: inset 3px 0 0 var(--el-color-primary);
}

.notify-bot-nav__item:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.notify-bot-scroll {
  flex: 1;
  min-width: 0;
  padding: 0 4px 8px 16px;
  overflow: hidden auto;
}

.notify-bot-section + .notify-bot-section {
  padding-top: 20px;
  margin-top: 28px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.notify-bot-section__title {
  margin: 0 0 14px;
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
  color: var(--el-text-color-primary);
}

.notify-bot-body :deep(.el-descriptions__label),
.notify-bot-scroll :deep(.el-descriptions__label),
.notify-bot-single :deep(.el-descriptions__label) {
  white-space: nowrap;
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

.notify-bot-body :deep(.el-form-item__content),
.notify-bot-scroll :deep(.el-form-item__content),
.notify-bot-single :deep(.el-form-item__content) {
  min-width: 0;
}
</style>
