<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElButton, ElInput, ElMessage } from 'element-plus'
import Dialog from '@/components/Dialog/src/Dialog.vue'
import { createPasskeyChallenge, deleteAdminPasskey, saveAdminPasskey } from '@/auth/admin/api'
import {
  createPasskeyCredential,
  getPasskeyDeviceId,
  isPasskeySupported
} from '@/auth/admin/passkey'
import { useAdminAuthStore } from '@/store/modules/adminAuth'
import { useUserStore } from '@/store/modules/user'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits(['update:modelValue'])
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})
const authStore = useAdminAuthStore()
const userStore = useUserStore()
const password = ref('')
const loading = ref(false)

const finish = (message: string) => {
  authStore.clearSession()
  userStore.reset()
  ElMessage.success(message)
}

const save = async (purpose: 'bind' | 'replace') => {
  if (!password.value) return ElMessage.warning('请输入当前密码')
  if (!isPasskeySupported()) return ElMessage.warning('当前环境不支持通行密钥')
  loading.value = true
  try {
    const challenge = await createPasskeyChallenge(
      { current_password: password.value, device_id: getPasskeyDeviceId(), purpose },
      authStore.getAccessToken
    )
    const credential = await createPasskeyCredential(challenge.options as any)
    await saveAdminPasskey(authStore.getAccessToken, {
      ceremony_id: challenge.ceremony_id,
      credential
    })
    finish('通行密钥已更新，请重新登录')
  } catch (error: any) {
    ElMessage.error(error?.msg || '通行密钥操作失败')
  } finally {
    loading.value = false
  }
}

const remove = async () => {
  if (!password.value) return ElMessage.warning('请输入当前密码')
  loading.value = true
  try {
    await deleteAdminPasskey(authStore.getAccessToken, password.value)
    finish('通行密钥已删除，请重新登录')
  } catch (error: any) {
    ElMessage.error(error?.msg || '删除通行密钥失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Dialog v-model="visible" title="通行密钥" width="420px">
    <ElInput
      v-model="password"
      type="password"
      show-password
      placeholder="请输入当前密码"
      autocomplete="current-password"
    />
    <template #footer>
      <ElButton @click="visible = false">取消</ElButton>
      <ElButton :loading="loading" @click="save('bind')">绑定</ElButton>
      <ElButton type="primary" :loading="loading" @click="save('replace')">替换</ElButton>
      <ElButton type="danger" :loading="loading" @click="remove">删除</ElButton>
    </template>
  </Dialog>
</template>
