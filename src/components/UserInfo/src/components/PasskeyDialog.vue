<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  ElButton,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElSkeleton
} from 'element-plus'
import dayjs from 'dayjs'
import Dialog from '@/components/Dialog/src/Dialog.vue'
import { v1GetAdminMe } from '@/api/common/login'
import { buildEmailCodeVerification, getAdminSecurity, type AdminPasskey } from '@/auth/admin/types'
import {
  createAdminPasskey,
  createPasskeyChallenge,
  deleteAdminPasskey,
  listAdminPasskeys,
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
const passkeyName = ref('')
const loading = ref(false)
const sending = ref(false)
const seconds = ref(0)
const needEmail = ref(false)
const passkeys = ref<AdminPasskey[]>([])
const selectedId = ref<string>('')
const statusReady = ref(false)
const action = ref<PasskeyAction>('set')
const supported = isPasskeySupported()
let timer: number | undefined
const emailCodePurpose = computed(() => (action.value === 'set' ? 'set_passkey' : 'delete_passkey'))
const hasPasskeys = computed(() => passkeys.value.length > 0)
const selectedPasskey = computed(
  () => passkeys.value.find((item) => String(item.id) === selectedId.value) || passkeys.value[0]
)

const formatTime = (value?: string | number) => {
  if (value == null || value === '') return '—'
  const numeric = typeof value === 'number' ? value : Number(value)
  if (Number.isFinite(numeric) && numeric > 0) {
    const sec = numeric > 1e12 ? Math.floor(numeric / 1000) : Math.floor(numeric)
    return dayjs.unix(sec).format('YYYY-MM-DD HH:mm')
  }
  const parsed = dayjs(String(value))
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm') : '—'
}

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

const actions = computed(() => [
  {
    value: 'set' as const,
    title: '添加',
    desc: '为当前账号登记通行密钥',
    disabled: false
  },
  {
    value: 'remove' as const,
    title: '删除',
    desc: hasPasskeys.value ? '删除选中的通行密钥' : '当前没有可删除的通行密钥',
    disabled: !hasPasskeys.value
  }
])

const selectAction = (value: PasskeyAction, disabled?: boolean) => {
  if (disabled || loading.value) return
  if (value === 'remove' && !hasPasskeys.value) return
  action.value = value
}

const selectPasskey = (id: string | number) => {
  if (loading.value) return
  selectedId.value = String(id)
  action.value = 'remove'
}

const canSend = computed(() => seconds.value === 0 && !sending.value && !loading.value)
const confirmText = computed(() => (action.value === 'set' ? '确认添加' : '确认删除'))

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
  passkeyName.value = ''
  selectedId.value = ''
  passkeys.value = []
  action.value = 'set'
  loading.value = false
  needEmail.value = false
  statusReady.value = false
  resetCodeState()
}

const loadAccountStatus = async () => {
  statusReady.value = false
  let passkeyCount = 0
  try {
    const res = await v1GetAdminMe()
    const boundEmail = String(res.data?.email || '').trim()
    email.value = boundEmail
    needEmail.value = !boundEmail
    passkeyCount = getAdminSecurity(res.data).passkey_count
  } catch {
    email.value = ''
    needEmail.value = false
  }

  try {
    const list = await listAdminPasskeys(authStore.getAccessToken)
    passkeys.value = list
    selectedId.value = list[0] ? String(list[0].id) : ''
    action.value = list.length ? 'remove' : 'set'
    if (!list.length && passkeyCount > 0) {
      ElMessage.warning('未获取到通行密钥列表，请稍后重试')
    }
  } catch (error: unknown) {
    passkeys.value = []
    selectedId.value = ''
    action.value = 'set'
    ElMessage.error((error as { msg?: string } | undefined)?.msg || '通行密钥列表加载失败')
  } finally {
    statusReady.value = true
  }
}

watch(visible, (open) => {
  if (!open) {
    resetForm()
    return
  }
  loadAccountStatus()
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
  const name = passkeyName.value.trim()
  const challenge = await createPasskeyChallenge(
    { device_id: getPasskeyDeviceId(), purpose: 'set' },
    authStore.getAccessToken
  )
  const credential = await createPasskeyCredential(
    challenge.options as Parameters<typeof createPasskeyCredential>[0]
  )
  rememberPasskeyCredentialId(credential.id)
  const result = await createAdminPasskey(authStore.getAccessToken, {
    ceremony_id: challenge.ceremony_id,
    credential,
    name,
    ...buildEmailCodeVerification(emailCode.value)
  })
  finish(result.msg || '通行密钥设置成功，请重新登录')
}

const remove = async () => {
  const current = selectedPasskey.value
  if (!current) {
    ElMessage.warning('请选择要删除的通行密钥')
    return
  }
  await ElMessageBox.confirm(
    `删除「${current.name}」后，该密钥将无法用于登录，当前会话会立即退出。`,
    '确认删除通行密钥',
    {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger'
    }
  )
  await deleteAdminPasskey(
    authStore.getAccessToken,
    current.id,
    buildEmailCodeVerification(emailCode.value)
  )
  finish('通行密钥已删除，请重新登录')
}

const submit = async () => {
  if (action.value === 'set' && !supported) {
    return ElMessage.warning('当前环境不支持通行密钥')
  }
  if (action.value === 'set' && !passkeyName.value.trim()) {
    return ElMessage.warning('请输入通行密钥名称')
  }
  if (action.value === 'remove' && !selectedPasskey.value) {
    return ElMessage.warning('请选择要删除的通行密钥')
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
  <Dialog v-model="visible" title="通行密钥" width="520px" :fullscreen="false" max-height="auto">
    <ElSkeleton v-if="!statusReady" animated :rows="4" />
    <div v-else class="passkey-dialog">
      <p class="passkey-lead">
        添加和删除都需要邮箱验证码，不能混用。成功后全部会话会退出，需要重新登录。
      </p>

      <p v-if="!supported" class="passkey-warn"
        >当前浏览器或访问地址不支持通行密钥，请使用 HTTPS 正式域名操作。</p
      >

      <div class="passkey-list">
        <p class="passkey-list__title">已登记的通行密钥</p>
        <p v-if="!hasPasskeys" class="passkey-list__empty">尚未登记通行密钥</p>
        <button
          v-for="item in passkeys"
          :key="String(item.id)"
          type="button"
          class="passkey-item"
          :class="{
            'is-active': action === 'remove' && String(item.id) === String(selectedPasskey?.id)
          }"
          :disabled="loading"
          @click="selectPasskey(item.id)"
        >
          <span class="passkey-item__name">{{ item.name }}</span>
          <span class="passkey-item__meta">
            创建 {{ formatTime(item.created_at) }} · 最近使用 {{ formatTime(item.last_used_at) }}
          </span>
        </button>
      </div>

      <div class="passkey-actions" role="radiogroup" aria-label="通行密钥操作">
        <button
          v-for="item in actions"
          :key="item.value"
          type="button"
          class="passkey-action"
          :class="{ 'is-active': action === item.value, 'is-danger': item.value === 'remove' }"
          :disabled="loading || item.disabled"
          @click="selectAction(item.value, item.disabled)"
        >
          <span class="passkey-action__title">{{ item.title }}</span>
          <span class="passkey-action__desc">{{ item.desc }}</span>
        </button>
      </div>

      <ElForm label-position="top" @submit.prevent="submit">
        <p v-if="needEmail" class="passkey-warn">当前账号未绑定邮箱，请先设置邮箱后再操作。</p>
        <ElFormItem v-if="action === 'set'" label="名称" required>
          <ElInput
            v-model="passkeyName"
            maxlength="32"
            placeholder="例如：办公电脑"
            @keyup.enter="submit"
          />
        </ElFormItem>
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

    <template v-if="statusReady" #footer>
      <ElButton @click="visible = false">取消</ElButton>
      <ElButton
        :type="action === 'remove' ? 'danger' : 'primary'"
        :loading="loading"
        :disabled="(action === 'set' && !supported) || (action === 'remove' && !hasPasskeys)"
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
  gap: 10px;
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

.passkey-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.passkey-list__title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.passkey-list__empty {
  padding: 10px 12px;
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  border-radius: 8px;
}

.passkey-item {
  display: flex;
  padding: 8px 12px;
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
    background: var(--el-color-danger-light-9);
    border-color: var(--el-color-danger);
    box-shadow: 0 0 0 1px var(--el-color-danger-light-7);
  }
}

.passkey-item__name {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}

.passkey-item__meta {
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-secondary);
}

.passkey-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.passkey-action {
  display: flex;
  min-height: 52px;
  padding: 8px 10px;
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
  margin-bottom: 8px;
}

:deep(.el-form-item:last-child) {
  margin-bottom: 0;
}
</style>
