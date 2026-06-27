<template>
  <Dialog v-model="dialogVisible" title="编辑机器人" width="1200px" max-height="600px">
    <div v-loading="loading">
      <BotInfoTab
        ref="botInfoTabRef"
        :tg-status="tgStatus"
        :syncing="syncing"
        upload-api-version="v2"
        @sync-tg-status="syncTgStatus"
      />
    </div>

    <template #footer>
      <div class="flex justify-end">
        <ElButton :disabled="submitting" @click="close">取消</ElButton>
        <ElButton type="primary" :loading="submitting" @click="submit">保存</ElButton>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { ElButton, ElMessage } from 'element-plus'
import { Dialog } from '@/components/Dialog'
import BotInfoTab from '@/management/BotManage/BotList/components/tabs/BotInfoTab.vue'
import { useBotConfigV1 } from '@/management/BotManage/BotList/components/composables/useBotConfigV1'

const emit = defineEmits(['success', 'close'])

const botInfoTabRef = ref()

const {
  dialogVisible,
  currentBot,
  tgStatus,
  syncing,
  loading,
  submitting,
  syncTgStatus,
  loadTabConfig,
  submitTabConfig
} = useBotConfigV1()

const open = async (botInfo: Record<string, any>) => {
  currentBot.value = botInfo || {}
  dialogVisible.value = true

  if (!botInfo?.id) {
    ElMessage.error('机器人信息不完整')
    return
  }

  await nextTick()

  const formMethods = botInfoTabRef.value?.formMethods
  if (!formMethods) {
    ElMessage.warning('表单未初始化，请稍后重试')
    return
  }

  await loadTabConfig(botInfo.id, 'botInfo', formMethods)
}

const close = () => {
  dialogVisible.value = false
  emit('close')
}

const submit = async () => {
  const formMethods = botInfoTabRef.value?.formMethods
  if (!formMethods) {
    ElMessage.warning('表单未找到')
    return
  }

  const success = await submitTabConfig('botInfo', formMethods)
  if (success) {
    emit('success')
  }
}

defineExpose({
  open
})
</script>
