<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from '@/components/Dialog/src/Dialog.vue'
import { Qrcode } from '@/components/Qrcode'
import { getGoogleKeyUrlApi, updateGoogleKeyUrlApi } from '@/api/common/login'
import { ElButton, ElEmpty, ElMessage, ElSkeleton } from 'element-plus'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const keyUrl = ref('')
const loading = ref(false)
const resetLoading = ref(false)
const actionButtonText = computed(() => (keyUrl.value ? '重置' : '开启'))
const actionButtonType = computed(() => (keyUrl.value ? 'warning' : 'success'))

const updateKeyUrl = async (showSuccess = true) => {
  const isEnable = !keyUrl.value
  resetLoading.value = true
  try {
    const res = await updateGoogleKeyUrlApi()
    keyUrl.value = res.data || ''
    if (keyUrl.value && showSuccess) {
      ElMessage.success(res.msg || (isEnable ? '开启成功' : '重置成功'))
    }
    if (!keyUrl.value) {
      ElMessage.warning('暂未获取到谷歌验证码密钥')
    }
  } catch (error) {
    console.error('重置谷歌验证码密钥失败:', error)
  } finally {
    resetLoading.value = false
  }
}

const fetchKeyUrl = async () => {
  loading.value = true
  try {
    const res = await getGoogleKeyUrlApi()
    keyUrl.value = res.data || ''
  } catch (error) {
    console.error('获取谷歌验证码密钥失败:', error)
  } finally {
    loading.value = false
  }
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      fetchKeyUrl()
    } else {
      keyUrl.value = ''
    }
  }
)
</script>

<template>
  <Dialog v-model="dialogVisible" title="谷歌验证码" width="380px" max-height="300px">
    <ElSkeleton v-if="loading && !keyUrl" animated :rows="4" />

    <div v-else-if="keyUrl" class="google-authenticator-dialog">
      <div class="qrcode-wrap">
        <Qrcode :text="keyUrl" :width="220" />
      </div>
    </div>

    <ElEmpty v-else description="暂无谷歌验证码密钥" />

    <template #footer>
      <ElButton @click="dialogVisible = false">关闭</ElButton>
      <ElButton :type="actionButtonType" :loading="resetLoading" @click="updateKeyUrl()">
        {{ actionButtonText }}
      </ElButton>
    </template>
  </Dialog>
</template>

<style scoped lang="less">
.google-authenticator-dialog {
  display: flex;
  align-items: center;
  justify-content: center;
}

.qrcode-wrap {
  padding: 16px;
  background: #fff;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}
</style>
