<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ElButton, ElForm, ElFormItem, ElInput, ElMessage, ElMessageBox } from 'element-plus'
import Dialog from '@/components/Dialog/src/Dialog.vue'
import { v1GetAdminMe } from '@/api/common/login'
import {
  createPasskeyChallenge,
  deleteAdminPasskey,
  saveAdminPasskey,
  sendAdminEmailCode
} from '@/auth/admin/api'
import {
  createPasskeyCredential,
  getPasskeyDeviceId,
  getPasskeyErrorMessage,
  isPasskeySupported,
  rememberPasskeyCredentialId
} from '@/auth/admin/passkey'
import { useAdminAuthStore } from '@/store/modules/adminAuth'
import { useUserStore } from '@/store/modules/user'

type PasskeyAction = 'set' | 'remove'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits(['update:modelValue'])
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})
const authStore = useAdminAuthStore()
const userStore = useUserStore()
const email = ref('')
const emailCode = ref('')
const loading = ref(false)
const sending = ref(false)
const seconds = ref(0)
const needEmail = ref(false)
const action = ref<PasskeyAction>('set')
const supported = isPasskeySupported()
let timer: number | undefined
const emailCodePurpose = computed(() => (action.value === 'set' ? 'set_passkey' : 'delete_passkey'))

const isNoAccountEmailError = (error: unknown) => {
  const text = String((error as { msg?: string; message?: string } | undefined)?.msg || '')
  return /邮箱/.test(text) && /未绑定|未设置|没有|为空|不存在|未填写/.test(text)
}

const getEmailCodeErrorMessage = (error: unknown) => {
  if (isNoAccountEmailError(error)) {
    return '当前账号未绑定邮箱，请先设置邮箱'
  }
  return (error as { msg?: string } | undefined)?.msg || '验证码发送失败，请稍后重试'
}

const actions: Array<{
  value: PasskeyAction
  title: string
  desc: string
}> = [
  { value: 'set', title: '设置', desc: '为当前账号登记通行密钥' },
  { value: 'remove', title: '删除', desc: '关闭通行密钥登录' }
]

const canSend = computed(() => seconds.value === 0 && !sending.value && !loading.value)
const confirmText = computed(() => (action.value === 'set' ? '确认设置' : '确认删除'))

const startCountdown = (duration: number) => {
  seconds.value = duration
  window.clearInterval(timer)
  timer = window.setInterval(() => {
    seconds.value = Math.max(0, seconds.value - 1)
    if (!seconds.value) window.clearInterval(timer)
  }, 1000)
}

const finish = (message: string) => {
  authStore.clearSession()
  userStore.reset()
  ElMessage.success(message)
  visible.value = false
}

const resetCodeState = () => {
  emailCode.value = ''
  seconds.value = 0
  sending.value = false
  window.clearInterval(timer)
}

const resetForm = () => {
  email.value = ''
  action.value = 'set'
  loading.value = false
  needEmail.value = false
  resetCodeState()
}

const loadAccountEmail = async () => {
  try {
    const res = await v1GetAdminMe()
    const boundEmail = String(res.data?.email || '').trim()
    email.value = boundEmail
    needEmail.value = !boundEmail
  } catch {
    email.value = ''
    needEmail.value = false
  }
}

watch(visible, (open) => {
  if (!open) {
    resetForm()
    return
  }
  loadAccountEmail()
})

watch(action, () => {
  resetCodeState()
})

const sendCode = async () => {
  if (!canSend.value) return
  if (needEmail.value) {
    return ElMessage.warning('当前账号未绑定邮箱，请先设置邮箱')
  }

  sending.value = true
  try {
    const result = await sendAdminEmailCode(
      { purpose: emailCodePurpose.value },
      authStore.getAccessToken
    )
    startCountdown(result.resend_after)
    ElMessage.success('验证码已发送到当前账号邮箱')
  } catch (error: unknown) {
    if (isNoAccountEmailError(error)) needEmail.value = true
    ElMessage.error(getEmailCodeErrorMessage(error))
  } finally {
    sending.value = false
  }
}

const save = async () => {
  const challenge = await createPasskeyChallenge(
    { device_id: getPasskeyDeviceId(), purpose: 'set' },
    authStore.getAccessToken
  )
  const credential = await createPasskeyCredential(
    challenge.options as Parameters<typeof createPasskeyCredential>[0]
  )
  rememberPasskeyCredentialId(credential.id)
  await saveAdminPasskey(authStore.getAccessToken, {
    ceremony_id: challenge.ceremony_id,
    credential,
    verification_method: 'email_code',
    email_code: emailCode.value
  })
  finish('通行密钥已设置，请重新登录')
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
  await deleteAdminPasskey(authStore.getAccessToken, {
    verification_method: 'email_code',
    email_code: emailCode.value
  })
  finish('通行密钥已删除，请重新登录')
}

const submit = async () => {
  if (action.value === 'set' && !supported) {
    return ElMessage.warning('当前环境不支持通行密钥')
  }
  if (needEmail.value) {
    return ElMessage.warning('当前账号未绑定邮箱，请先设置邮箱')
  }
  if (!/^\d{6}$/.test(emailCode.value)) {
    return ElMessage.warning('请输入6位邮箱验证码')
  }

  loading.value = true
  try {
    if (action.value === 'remove') {
      await remove()
    } else {
      await save()
    }
  } catch (error: any) {
    if (error === 'cancel' || error === 'close') return
    const message = getPasskeyErrorMessage(error, '通行密钥操作失败')
    ElMessage[error?.name === 'NotAllowedError' ? 'info' : 'error'](message)
  } finally {
    loading.value = false
  }
}

onBeforeUnmount(() => window.clearInterval(timer))
</script>

<template>
  <Dialog v-model="visible" title="通行密钥" width="460px" :fullscreen="false" max-height="420px">
    <div class="passkey-dialog">
      <p class="passkey-lead">
        设置和删除都需要邮箱验证码，两种验证码不能混用。验证码会发到当前账号已绑定的邮箱；没有邮箱时请先设置邮箱。成功后全部会话会退出，需要重新登录。
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
        <p v-if="needEmail" class="passkey-warn">当前账号未绑定邮箱，请先设置邮箱后再操作。</p>
        <ElFormItem label="邮箱验证码" required>
          <div class="passkey-code">
            <ElInput
              v-model="emailCode"
              maxlength="6"
              inputmode="numeric"
              placeholder="请输入6位验证码"
              @keyup.enter="submit"
            />
            <ElButton :disabled="!canSend || needEmail" :loading="sending" @click="sendCode">
              {{ seconds ? `${seconds}秒后重发` : '发送验证码' }}
            </ElButton>
          </div>
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
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

.passkey-code {
  display: flex;
  width: 100%;
  gap: 8px;
}

:deep(.el-form-item) {
  margin-bottom: 12px;
}

:deep(.el-form-item:last-child) {
  margin-bottom: 0;
}
</style>
