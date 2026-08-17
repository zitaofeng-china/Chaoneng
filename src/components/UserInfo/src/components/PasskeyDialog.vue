<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElButton, ElForm, ElFormItem, ElInput, ElMessage, ElMessageBox } from 'element-plus'
import Dialog from '@/components/Dialog/src/Dialog.vue'
import { createPasskeyChallenge, deleteAdminPasskey, saveAdminPasskey } from '@/auth/admin/api'
import {
  createPasskeyCredential,
  getPasskeyDeviceId,
  getPasskeyErrorMessage,
  isPasskeySupported
} from '@/auth/admin/passkey'
import { useAdminAuthStore } from '@/store/modules/adminAuth'
import { useUserStore } from '@/store/modules/user'

type PasskeyAction = 'bind' | 'replace' | 'remove'

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
const action = ref<PasskeyAction>('bind')
const supported = isPasskeySupported()

const actions: Array<{
  value: PasskeyAction
  title: string
  desc: string
}> = [
  { value: 'bind', title: '绑定', desc: '为当前设备登记通行密钥' },
  { value: 'replace', title: '替换', desc: '覆盖已有通行密钥' },
  { value: 'remove', title: '删除', desc: '关闭通行密钥登录' }
]

const confirmText = computed(() => {
  if (action.value === 'bind') return '确认绑定'
  if (action.value === 'replace') return '确认替换'
  return '确认删除'
})

const finish = (message: string) => {
  authStore.clearSession()
  userStore.reset()
  ElMessage.success(message)
  visible.value = false
}

const resetForm = () => {
  password.value = ''
  action.value = 'bind'
  loading.value = false
}

watch(visible, (open) => {
  if (!open) resetForm()
})

const save = async (purpose: 'bind' | 'replace') => {
  if (!supported) return ElMessage.warning('当前环境不支持通行密钥')
  const challenge = await createPasskeyChallenge(
    { current_password: password.value, device_id: getPasskeyDeviceId(), purpose },
    authStore.getAccessToken
  )
  const credential = await createPasskeyCredential(challenge.options)
  await saveAdminPasskey(authStore.getAccessToken, {
    ceremony_id: challenge.ceremony_id,
    credential
  })
  finish(purpose === 'bind' ? '通行密钥已绑定，请重新登录' : '通行密钥已替换，请重新登录')
}

const remove = async () => {
  await ElMessageBox.confirm(
    '删除后将无法使用通行密钥登录，当前会话会立即退出。',
    '确认删除通行密钥',
    {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger'
    }
  )
  await deleteAdminPasskey(authStore.getAccessToken, password.value)
  finish('通行密钥已删除，请重新登录')
}

const submit = async () => {
  if (!password.value) return ElMessage.warning('请输入当前密码')
  loading.value = true
  try {
    if (action.value === 'remove') {
      await remove()
    } else {
      await save(action.value)
    }
  } catch (error: any) {
    if (error === 'cancel' || error === 'close') return
    const message = getPasskeyErrorMessage(error, '通行密钥操作失败')
    ElMessage[error?.name === 'NotAllowedError' ? 'info' : 'error'](message)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Dialog v-model="visible" title="通行密钥" width="460px" :fullscreen="false" max-height="320px">
    <div class="passkey-dialog">
      <p class="passkey-lead">
        用设备指纹、面容或安全密钥登录。操作成功后会退出当前会话，请重新登录。
      </p>

      <p v-if="!supported" class="passkey-warn"
        >当前浏览器或访问地址不支持通行密钥，请使用 HTTPS 正式域名操作。</p
      >

      <div class="passkey-actions" role="radiogroup" aria-label="通行密钥操作">
        <button
          v-for="item in actions"
          :key="item.value"
          type="button"
          class="passkey-action"
          :class="{ 'is-active': action === item.value, 'is-danger': item.value === 'remove' }"
          :disabled="loading"
          @click="action = item.value"
        >
          <span class="passkey-action__title">{{ item.title }}</span>
          <span class="passkey-action__desc">{{ item.desc }}</span>
        </button>
      </div>

      <ElForm label-position="top" @submit.prevent="submit">
        <ElFormItem label="当前密码" required>
          <ElInput
            v-model="password"
            type="password"
            show-password
            placeholder="请输入当前登录密码"
            autocomplete="current-password"
            @keyup.enter="submit"
          />
        </ElFormItem>
      </ElForm>
    </div>

    <template #footer>
      <ElButton @click="visible = false">取消</ElButton>
      <ElButton
        :type="action === 'remove' ? 'danger' : 'primary'"
        :loading="loading"
        :disabled="!supported && action !== 'remove'"
        @click="submit"
      >
        {{ confirmText }}
      </ElButton>
    </template>
  </Dialog>
</template>

<style lang="less" scoped>
.passkey-dialog {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.passkey-lead,
.passkey-warn {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
}

.passkey-lead {
  color: var(--el-text-color-regular);
}

.passkey-warn {
  padding: 8px 12px;
  color: var(--el-color-warning-dark-2);
  background: var(--el-color-warning-light-9);
  border-radius: 6px;
}

.passkey-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.passkey-action {
  display: flex;
  min-height: 72px;
  padding: 10px 12px;
  color: var(--el-text-color-primary);
  text-align: left;
  cursor: pointer;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  transition:
    border-color 0.2s,
    background-color 0.2s,
    box-shadow 0.2s;
  flex-direction: column;
  gap: 4px;

  &:hover:not(:disabled) {
    border-color: var(--el-color-primary-light-5);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }

  &.is-active {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary);
    box-shadow: 0 0 0 1px var(--el-color-primary-light-7);
  }

  &.is-danger.is-active {
    background: var(--el-color-danger-light-9);
    border-color: var(--el-color-danger);
    box-shadow: 0 0 0 1px var(--el-color-danger-light-7);
  }
}

.passkey-action__title {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}

.passkey-action__desc {
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-secondary);
}

:deep(.el-form-item) {
  margin-bottom: 0;
}
</style>
