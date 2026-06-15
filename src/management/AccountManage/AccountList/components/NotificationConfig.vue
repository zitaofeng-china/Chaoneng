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

        <!-- TG账号 -->
        <ElFormItem label="TG账号">
          <ElInput
            v-model="form.chatId"
            placeholder="请输入TG账号数字ID"
            :disabled="!form.enabled"
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
            <ElButton @click="handleReset">取消</ElButton>
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
  ElButton,
  ElMessage
} from 'element-plus'
import { v1UpdateUserNotify } from '@/api/management/AccountManage/AccountList'
import { v1GetNotifyBot } from '@/api/management/BotManage/BotList'

interface NotificationFormState {
  enabled: boolean
  threshold: number | undefined
  chatId: string
}

const props = defineProps<{
  accountId?: number
  /**
   * 后端返回的字段：notify_threshold（0 表示禁用，>0 表示启用）、chat_id
   */
  notifyThreshold?: number | string
  chatId?: number | string
}>()

const emit = defineEmits<{
  saved: []
}>()

// 表单数据
const form = reactive<NotificationFormState>({
  enabled: false,
  threshold: undefined,
  chatId: ''
})

// 原始数据备份（用于取消时恢复）
const originalData = reactive<NotificationFormState>({
  enabled: false,
  threshold: undefined,
  chatId: ''
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

const fetchNotifyBotName = async () => {
  try {
    const res = await v1GetNotifyBot()
    notifyBotName.value = res.data?.user_name || ''
  } catch (error) {
    console.error('获取通知机器人名称失败:', error)
    notifyBotName.value = ''
  }
}

// 同步父组件传入的数据到表单
const syncFromProps = () => {
  const threshold = Number(props.notifyThreshold || 0)
  const chatIdStr = props.chatId !== undefined && props.chatId !== null ? String(props.chatId) : ''
  form.enabled = threshold > 0
  form.threshold = threshold > 0 ? threshold : undefined
  form.chatId = chatIdStr === '0' ? '' : chatIdStr
  Object.assign(originalData, form)
}

watch(
  () => [props.accountId, props.notifyThreshold, props.chatId],
  () => syncFromProps(),
  { immediate: true }
)

onMounted(() => {
  fetchNotifyBotName()
})

// 保存配置
const handleSave = async () => {
  if (!props.accountId) {
    ElMessage.warning('账户信息未加载完成')
    return
  }

  let threshold = 0
  // 关闭开关时也保留原 TG 账号，只把阈值置 0 表示禁用
  let chatId: number = Number(String(form.chatId || '').trim()) || 0

  if (form.enabled) {
    if (form.threshold === undefined || form.threshold === null) {
      ElMessage.warning('请输入提醒阈值')
      return
    }
    threshold = Number(form.threshold)
    if (isNaN(threshold) || threshold <= 0) {
      ElMessage.warning('请输入大于 0 的提醒阈值')
      return
    }
    const chatIdStr = String(form.chatId || '').trim()
    if (chatIdStr === '') {
      ElMessage.warning('请输入TG账号')
      return
    }
    if (!/^\d+$/.test(chatIdStr)) {
      ElMessage.warning('TG账号仅支持数字 ID')
      return
    }
    chatId = Number(chatIdStr)
    if (isNaN(chatId) || chatId <= 0) {
      ElMessage.warning('请输入有效的TG账号')
      return
    }
  }

  saving.value = true
  try {
    await v1UpdateUserNotify({
      id: Number(props.accountId),
      chat_id: chatId,
      threshold
    })

    ElMessage.success('保存成功')
    Object.assign(originalData, form)
    emit('saved')
  } catch (error: any) {
    console.error('保存代理消息提醒配置失败:', error)
    ElMessage.error(error?.msg || '保存失败')
  } finally {
    saving.value = false
  }
}

// 取消：恢复到原始数据
const handleReset = () => {
  Object.assign(form, originalData)
}

// 切换开关时直接调用接口（开 -> 关 立即禁用；关 -> 开 立即启用，阈值默认 1）
const handleSwitchChange = async (val: boolean | string | number) => {
  if (!props.accountId) return

  // 关 -> 开：阈值优先用之前保存过的，否则默认 1
  if (val) {
    const prevThreshold = Number(originalData.threshold || 0)
    const prevChatIdStr = String(originalData.chatId || '').trim()
    const prevChatId = /^\d+$/.test(prevChatIdStr) ? Number(prevChatIdStr) : 0
    const threshold = prevThreshold > 0 ? prevThreshold : 1

    saving.value = true
    try {
      await v1UpdateUserNotify({
        id: Number(props.accountId),
        chat_id: prevChatId,
        threshold
      })
      form.threshold = threshold
      form.chatId = prevChatId > 0 ? String(prevChatId) : ''
      Object.assign(originalData, form)
      ElMessage.success('已开启余额提醒')
      emit('saved')
    } catch (error: any) {
      // 失败回退
      form.enabled = false
      ElMessage.error(error?.msg || '开启失败')
    } finally {
      saving.value = false
    }
    return
  }

  // 开 -> 关：直接置 threshold 为 0 禁用
  saving.value = true
  try {
    const chatIdStr = String(form.chatId || '').trim()
    const chatId = /^\d+$/.test(chatIdStr) ? Number(chatIdStr) : 0
    await v1UpdateUserNotify({
      id: Number(props.accountId),
      chat_id: chatId,
      threshold: 0
    })
    Object.assign(originalData, form)
    ElMessage.success('已关闭余额提醒')
    emit('saved')
  } catch (error: any) {
    // 失败回退
    form.enabled = true
    ElMessage.error(error?.msg || '关闭失败')
  } finally {
    saving.value = false
  }
}

// TG账号输入过滤：只保留数字
const handleChatIdInput = (value: string) => {
  form.chatId = String(value || '').replace(/\D/g, '')
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
</style>
