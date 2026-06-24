<template>
  <div class="notification-config-section">
    <div class="notification-config-header">
      <h3 class="text-lg font-semibold">代理消息提醒配置</h3>
      <div class="official-bot-tip">
        该功能启用前,请务必关注官方机器人
        <a v-if="notifyBotName" :href="notifyBotLink" target="_blank" rel="noopener noreferrer">{{
          notifyBotDisplayName
        }}</a>
        <span v-else>通知机器人</span>!
      </div>
    </div>

    <div class="flex justify-center">
      <ElForm :model="form" label-width="100px" class="max-w-2xl">
        <!-- 余额不足提醒 -->
        <ElFormItem label="余额不足提醒">
          <div class="flex items-center gap-4 w-full">
            <ElSwitch v-model="form.enabled" :loading="saving" @change="handleSwitchChange" />
            <ElInputNumber
              v-model="form.threshold"
              placeholder="请输入提醒阈值"
              :min="0"
              :precision="2"
              :step="1"
              :controls="false"
              class="flex-1"
              :disabled="!form.enabled"
            />
            <span class="text-gray-500">TRX</span>
          </div>
          <div class="text-sm text-gray-500 mt-1">
            当账户TRX余额低于该阈值时，将发送提醒通知（开关关闭即禁用）
          </div>
        </ElFormItem>

        <ElFormItem label="订单播报">
          <div class="w-full">
            <ElCheckboxGroup
              v-model="form.orderTypes"
              class="order-type-group"
              :disabled="saving"
              @change="handleOrderTypesChange"
            >
              <div class="order-type-action">
                <ElSwitch
                  v-model="form.orderEnabled"
                  :loading="saving"
                  :width="orderSwitchWidth"
                  :active-text="ORDER_SELECT_ACTIVE_TEXT"
                  :inactive-text="ORDER_SELECT_INACTIVE_TEXT"
                  inline-prompt
                  class="order-select-switch"
                  @change="handleOrderSwitchChange"
                />
              </div>
              <ElCheckbox
                v-for="item in ORDER_NOTIFY_TYPE_OPTIONS"
                :key="item.value"
                :label="item.value"
              >
                {{ item.label }}
              </ElCheckbox>
            </ElCheckboxGroup>
          </div>
        </ElFormItem>

        <!-- TG账号 -->
        <ElFormItem label="TG账号">
          <ElInput
            v-model="form.chatId"
            placeholder="请输入TG账号数字ID"
            :disabled="saving"
            style="width: 100%"
            maxlength="20"
            @input="handleChatIdInput"
          />
          <div class="text-sm text-gray-500 mt-1"
            >将发送给该 Telegram 账号提醒消息（仅支持数字 ID）</div
          >
        </ElFormItem>

        <!-- 操作按钮 -->
        <ElFormItem label=" ">
          <div class="flex gap-2 justify-end w-full">
            <ElButton :disabled="saving" @click="handleReset">取消</ElButton>
            <ElButton type="primary" :loading="saving" @click="handleSave">保存</ElButton>
          </div>
        </ElFormItem>
      </ElForm>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  ElForm,
  ElFormItem,
  ElSwitch,
  ElInput,
  ElInputNumber,
  ElCheckbox,
  ElCheckboxGroup,
  ElButton
} from 'element-plus'
import { v1UpdateUserNotify } from '@/api/management/AccountManage/AccountList'
import { v1GetNotifyBot } from '@/api/management/BotManage/BotList'
import {
  handleErrorMessage,
  handleSuccessMessage,
  handleWarningMessage
} from '@/utils/messageHelper'

const ORDER_NOTIFY_TYPE_OPTIONS = [
  { label: '用户充值', value: 2 },
  { label: '兑换', value: 3 },
  { label: '时间能量', value: 4 },
  { label: '笔数能量', value: 5 },
  { label: '福利能量', value: 6 },
  { label: '闪租能量', value: 7 },
  { label: '批量能量', value: 9 },
  { label: '批量激活', value: 10 },
  { label: '机器人付费', value: 11 },
  { label: '奖励', value: 12 },
  { label: '速充能量', value: 15 },
  { label: '能量托管', value: 20 },
  { label: '速充托管', value: 21 }
] as const

const ORDER_SELECT_ACTIVE_TEXT = '全选'
const ORDER_SELECT_INACTIVE_TEXT = '不选中'
const ORDER_SWITCH_TEXT_WIDTH = 12
const ORDER_SWITCH_ACTION_WIDTH = 40

interface NotificationFormState {
  enabled: boolean
  threshold: number | undefined
  chatId: string
  orderEnabled: boolean
  orderTypes: number[]
}

interface NotifyConfigData {
  chat_id?: number | string
  balance_threshold?: number | string
  order_subscription?: number[] | string | null
}

interface NotifyPayload {
  chat_id: number
  balance_threshold: number
  order_subscription?: number[] | null
}

const props = defineProps<{
  accountId?: number
  /**
   * 后端返回的字段：notify.balance_threshold（0 表示禁用，>0 表示启用）、notify.chat_id
   */
  notify?: NotifyConfigData | null
  notifyThreshold?: number | string
  chatId?: number | string
  orderNotifyTypes?: number[] | string
  orderNotifyEnabled?: boolean | number | string
}>()

const emit = defineEmits<{
  saved: []
}>()

// 表单数据
const form = reactive<NotificationFormState>({
  enabled: false,
  threshold: undefined,
  chatId: '',
  orderEnabled: false,
  orderTypes: []
})

// 原始数据备份（用于取消时恢复）
const originalData = reactive<NotificationFormState>({
  enabled: false,
  threshold: undefined,
  chatId: '',
  orderEnabled: false,
  orderTypes: []
})

const saving = ref(false)
const notifyBotName = ref('')

const notifyBotDisplayName = computed(() => {
  if (!notifyBotName.value) return ''
  return notifyBotName.value.startsWith('@') ? notifyBotName.value : `@${notifyBotName.value}`
})

const notifyBotLink = computed(() => {
  const username = notifyBotName.value.replace(/^@/, '')
  return username ? `https://t.me/${username}` : ''
})

const orderSwitchWidth = computed(() => {
  const maxTextLength = Math.max(ORDER_SELECT_ACTIVE_TEXT.length, ORDER_SELECT_INACTIVE_TEXT.length)
  return maxTextLength * ORDER_SWITCH_TEXT_WIDTH + ORDER_SWITCH_ACTION_WIDTH
})

const fetchNotifyBotName = async () => {
  try {
    const res = await v1GetNotifyBot()
    notifyBotName.value = res.data?.user_name || ''
  } catch (error) {
    notifyBotName.value = ''
  }
}

const parseBoolean = (value: unknown) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value > 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return ['1', 'true', 'yes', 'on'].includes(normalized)
  }
  return false
}

const parseOrderTypes = (value: unknown) => {
  const validValues = new Set(getAllOrderTypeValues())
  const normalizeOrderTypes = (items: unknown[]) =>
    items.map((item) => Number(item)).filter((item) => !isNaN(item) && validValues.has(item))

  if (Array.isArray(value)) {
    return normalizeOrderTypes(value)
  }
  if (typeof value === 'string') {
    const normalized = value.trim()
    if (!normalized || normalized.toLowerCase() === 'null') return []
    if (normalized.startsWith('[')) {
      try {
        const parsed = JSON.parse(normalized)
        return parseOrderTypes(parsed)
      } catch (error) {
        return []
      }
    }
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => Number(item))
      .filter((item) => !isNaN(item) && validValues.has(item))
  }
  return []
}

const getAllOrderTypeValues = (): number[] => ORDER_NOTIFY_TYPE_OPTIONS.map((item) => item.value)

const parseOrderSubscription = (value: unknown) => {
  if (value === null || value === undefined) {
    return {
      orderEnabled: false,
      orderTypes: []
    }
  }

  if (Array.isArray(value) && value.length === 0) {
    return {
      orderEnabled: true,
      orderTypes: getAllOrderTypeValues()
    }
  }

  if (typeof value === 'string' && value.trim() === '[]') {
    return {
      orderEnabled: true,
      orderTypes: getAllOrderTypeValues()
    }
  }

  const orderTypes = parseOrderTypes(value)
  return {
    orderEnabled: orderTypes.length === ORDER_NOTIFY_TYPE_OPTIONS.length,
    orderTypes
  }
}

const getOrderSubscriptionPayload = (orderTypes: number[]) => {
  const validValues = getAllOrderTypeValues()
  const validSet = new Set(validValues)
  const normalizedOrderTypes = [...new Set(orderTypes)].filter((item) => validSet.has(item))
  if (normalizedOrderTypes.length === 0) return null
  if (normalizedOrderTypes.length === validValues.length) return []
  return normalizedOrderTypes
}

const buildNotifyPayload = (params: {
  chatId: number
  threshold: number
  orderTypes?: number[]
}): NotifyPayload => {
  const orderSubscription = getOrderSubscriptionPayload(params.orderTypes ?? form.orderTypes)
  const notify: NotifyPayload = {
    chat_id: params.chatId,
    balance_threshold: params.threshold,
    order_subscription: orderSubscription
  }
  return notify
}

const syncOriginalData = () => {
  Object.assign(originalData, form)
  originalData.orderTypes = [...form.orderTypes]
}

const persistNotifyConfig = async (params: {
  chatId: number
  threshold: number
  orderTypes?: number[]
}) => {
  await v1UpdateUserNotify({
    id: Number(props.accountId),
    ...buildNotifyPayload(params)
  })
}

// 同步父组件传入的数据到表单
const syncFromProps = () => {
  const notify = props.notify || {}
  const threshold = Number(notify.balance_threshold ?? props.notifyThreshold ?? 0)
  const rawChatId = notify.chat_id ?? props.chatId
  const chatIdStr = rawChatId !== undefined && rawChatId !== null ? String(rawChatId) : ''
  const hasNotifyOrderSubscription = Object.prototype.hasOwnProperty.call(
    notify,
    'order_subscription'
  )
  const orderSubscription = hasNotifyOrderSubscription
    ? notify.order_subscription
    : props.orderNotifyTypes
  const { orderEnabled, orderTypes } = parseOrderSubscription(orderSubscription)
  form.enabled = threshold > 0
  form.threshold = threshold > 0 ? threshold : undefined
  form.chatId = chatIdStr === '0' ? '' : chatIdStr
  form.orderEnabled = orderEnabled || parseBoolean(props.orderNotifyEnabled)
  form.orderTypes = orderTypes
  Object.assign(originalData, form)
  originalData.orderTypes = [...form.orderTypes]
}

watch(
  () => [
    props.accountId,
    props.notify,
    props.notifyThreshold,
    props.chatId,
    props.orderNotifyTypes,
    props.orderNotifyEnabled
  ],
  () => syncFromProps(),
  { immediate: true }
)

onMounted(() => {
  fetchNotifyBotName()
})

// 保存配置
const handleSave = async () => {
  if (saving.value) return
  if (!props.accountId) {
    handleWarningMessage('账户信息未加载完成')
    return
  }

  let threshold = 0
  // 关闭开关时也保留原 TG 账号，只把阈值置 0 表示禁用
  let chatId: number = Number(String(form.chatId || '').trim()) || 0
  const validOrderTypeSet = new Set(getAllOrderTypeValues())
  const orderTypes = form.orderTypes
    .map((item) => Number(item))
    .filter((item) => !isNaN(item) && validOrderTypeSet.has(item))

  if (form.enabled) {
    if (form.threshold === undefined || form.threshold === null) {
      handleWarningMessage('请输入提醒阈值')
      return
    }
    threshold = Number(form.threshold)
    if (isNaN(threshold) || threshold <= 0) {
      handleWarningMessage('请输入大于 0 的提醒阈值')
      return
    }
    const chatIdStr = String(form.chatId || '').trim()
    if (chatIdStr === '') {
      handleWarningMessage('请输入TG账号')
      return
    }
    if (!/^\d+$/.test(chatIdStr)) {
      handleWarningMessage('TG账号仅支持数字 ID')
      return
    }
    chatId = Number(chatIdStr)
    if (isNaN(chatId) || chatId <= 0) {
      handleWarningMessage('请输入有效的TG账号')
      return
    }
  }

  if (orderTypes.length > 0) {
    if (chatId <= 0) {
      handleWarningMessage('请先填写TG账号')
      return
    }
  }
  form.orderEnabled = orderTypes.length === ORDER_NOTIFY_TYPE_OPTIONS.length

  saving.value = true
  try {
    await persistNotifyConfig({
      chatId,
      threshold,
      orderTypes
    })

    handleSuccessMessage('保存成功')
    syncOriginalData()
    emit('saved')
  } catch (error) {
    handleErrorMessage(error, '保存失败')
  } finally {
    saving.value = false
  }
}

// 取消：恢复到原始数据
const handleReset = () => {
  Object.assign(form, originalData)
  form.orderTypes = [...originalData.orderTypes]
}

// 切换余额提醒开关只更新本地表单，最终由“保存”统一提交
const handleSwitchChange = (val: boolean | string | number) => {
  if (saving.value) return

  if (val) {
    const prevThreshold = Number(originalData.threshold || 0)
    if (!form.threshold || Number(form.threshold) <= 0) {
      form.threshold = prevThreshold > 0 ? prevThreshold : 1
    }
    return
  }

  form.threshold = undefined
}

// TG账号输入过滤：只保留数字
const handleChatIdInput = (value: string) => {
  form.chatId = String(value || '').replace(/\D/g, '')
}

const handleOrderSwitchChange = (val: boolean | string | number) => {
  if (val) {
    form.orderTypes = ORDER_NOTIFY_TYPE_OPTIONS.map((item) => item.value)
  } else {
    form.orderTypes = []
  }
}

const handleOrderTypesChange = (value: Array<number | string>) => {
  form.orderEnabled = value.length === ORDER_NOTIFY_TYPE_OPTIONS.length
}
</script>

<style scoped>
.notification-config-section {
  padding: 12px;
  margin-top: 0;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgb(0 0 0 / 10%);
}

.notification-config-header {
  position: relative;
  display: flex;
  min-height: 24px;
  margin-bottom: 12px;
  align-items: center;
}

.notification-config-header h3 {
  margin: 0;
}

.official-bot-tip {
  position: absolute;
  left: 50%;
  font-size: 14px;
  font-weight: 500;
  color: #f56c6c;
  text-align: center;
  white-space: nowrap;
  transform: translateX(-50%);
}

.official-bot-tip a {
  color: #409eff;
  text-decoration: none;
}

.official-bot-tip a:hover {
  text-decoration: underline;
}

.order-type-group {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px 20px;
  margin-top: 0;
}

.order-type-group :deep(.el-checkbox) {
  margin-right: 0;
}

.order-type-action {
  display: flex;
  align-items: center;
  min-height: 24px;
}

.order-select-switch {
  --el-switch-on-color: var(--el-color-primary);
  --el-switch-off-color: var(--el-border-color-darker);
}

.order-select-switch :deep(.el-switch__inner) {
  padding: 0 10px;
}
</style>
