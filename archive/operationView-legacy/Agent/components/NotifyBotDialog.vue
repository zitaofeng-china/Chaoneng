<template>
  <Dialog v-model="dialogVisible" title="通知机器人" width="680px" max-height="auto">
    <div v-loading="loading" class="notify-bot-body">
      <ElDescriptions v-if="botInfo" :column="1" border label-width="110px">
        <ElDescriptionsItem label="机器人ID">{{ botInfo.id }}</ElDescriptionsItem>
        <ElDescriptionsItem label="机器人用户名">{{ botInfo.user_name || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="机器人名称">{{ botInfo.first_name || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="Token">
          <div class="token-cell">
            <span class="token-text">{{ botInfo.token }}</span>
            <ElButton link type="primary" size="small" @click="copyToken">复制</ElButton>
          </div>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="更新时间">
          {{ botInfo.updated_at ? formatToDateTime(Number(botInfo.updated_at) * 1000) : '-' }}
        </ElDescriptionsItem>
      </ElDescriptions>

      <ElEmpty v-else-if="!loading" description="暂无通知机器人" />

      <!-- 修改机器人 Token -->
      <div class="edit-token">
        <div class="edit-token-label">修改机器人 Token</div>
        <div class="edit-token-row">
          <ElInput v-model="tokenInput" placeholder="请输入新的机器人 Token" clearable />
          <ElButton type="primary" :loading="submitting" @click="handleSave">保存</ElButton>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <ElButton @click="handleClose">关闭</ElButton>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElButton, ElDescriptions, ElDescriptionsItem, ElEmpty, ElInput } from 'element-plus'
import { Dialog } from '@/components/Dialog'
import { formatToDateTime } from '@/utils/dateUtil'
import { useClipboard } from '@/hooks/web/useClipboard'
import { handleErrorMessage, handleSuccessMessage } from '@/utils/messageHelper'
import { v1GetNotifyBot, v1SetNotifyBot, type NotifyBotInfo } from '@/api/botlist'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'success'): void
}>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const loading = ref(false)
const submitting = ref(false)
const botInfo = ref<NotifyBotInfo | null>(null)
const tokenInput = ref('')

const { copy } = useClipboard()

const fetchNotifyBot = async () => {
  loading.value = true
  try {
    const res = await v1GetNotifyBot()
    if (res.code === '000000' && res.data) {
      botInfo.value = res.data
    } else {
      botInfo.value = null
    }
  } catch (error) {
    botInfo.value = null
    handleErrorMessage(error, '获取通知机器人失败')
  } finally {
    loading.value = false
  }
}

const copyToken = () => {
  if (!botInfo.value?.token) return
  copy(botInfo.value.token)
  handleSuccessMessage('Token 已复制')
}

const handleSave = async () => {
  const token = tokenInput.value.trim()
  if (!token) {
    handleErrorMessage(new Error('请输入机器人 Token'), '请输入机器人 Token')
    return
  }

  submitting.value = true
  try {
    await v1SetNotifyBot({ token })
    handleSuccessMessage('设置成功')
    tokenInput.value = ''
    await fetchNotifyBot()
    emit('success')
  } catch (error) {
    handleErrorMessage(error, '设置失败')
  } finally {
    submitting.value = false
  }
}

const handleClose = () => {
  dialogVisible.value = false
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      botInfo.value = null
      tokenInput.value = ''
      fetchNotifyBot()
    }
  }
)
</script>

<style scoped>
.notify-bot-body {
  padding: 4px 6px;
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
</style>
