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
import QRCode from 'qrcode'
import Dialog from '@/components/Dialog/src/Dialog.vue'
import { v1GetAdminMe } from '@/api/common/login'
import { bindAdminTotp, deleteAdminTotp, sendAdminEmailCode } from '@/auth/admin/api'
import { getAdminSecurity } from '@/auth/admin/types'
import { useAdminAuthStore } from '@/store/modules/adminAuth'
import { useUserStore } from '@/store/modules/user'

type TotpAction = 'set' | 'remove'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits(['update:modelValue'])
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})
const authStore = useAdminAuthStore()
const userStore = useUserStore()
const emailCode = ref('')
const loading = ref(false)
const sending = ref(false)
const seconds = ref(0)
const needEmail = ref(false)
const totpEnabled = ref(false)
const statusReady = ref(false)
const action = ref<TotpAction>('set')
const qrCodeDataUrl = ref('')
let timer: number | undefined

const emailCodePurpose = computed(() => (action.value === 'set' ? 'set_totp' : 'delete_totp'))
const canSend = computed(
  () => seconds.value === 0 && !sending.value && !loading.value && !needEmail.value
)

const isNoAccountEmailError = (error: unknown) => {
  const text = String((error as { msg?: string; message?: string } | undefined)?.msg || '')
  return /邮箱/.test(text) && /未绑定|未设置|没有|为空|不存在|未填写/.test(text)
}

const startCountdown = (duration: number) => {
  seconds.value = duration
  window.clearInterval(timer)
  timer = window.setInterval(() => {
    seconds.value = Math.max(0, seconds.value - 1)
    if (!seconds.value) window.clearInterval(timer)
  }, 1000)
}

const logoutToLogin = (message: string) => {
  qrCodeDataUrl.value = ''
  authStore.clearSession()
  userStore.reset()
  ElMessage.success(message)
  visible.value = false
}

const resetForm = () => {
  emailCode.value = ''
  loading.value = false
  sending.value = false
  seconds.value = 0
  needEmail.value = false
  qrCodeDataUrl.value = ''
  statusReady.value = false
  window.clearInterval(timer)
}

const loadTotpStatus = async () => {
  statusReady.value = false
  try {
    const res = await v1GetAdminMe()
    totpEnabled.value = getAdminSecurity(res.data).totp_enabled
    action.value = totpEnabled.value ? 'remove' : 'set'
  } catch {
    totpEnabled.value = false
    action.value = 'set'
  } finally {
    statusReady.value = true
  }
}

watch(visible, (open) => {
  if (!open) {
    if (qrCodeDataUrl.value) {
      logoutToLogin('动态验证码已绑定，请重新登录')
      return
    }
    resetForm()
    return
  }
  resetForm()
  loadTotpStatus()
})

const sendCode = async () => {
  if (!canSend.value) return
  if (needEmail.value) return ElMessage.warning('当前账号未绑定邮箱，请先设置邮箱')

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
    ElMessage.error(
      isNoAccountEmailError(error)
        ? '当前账号未绑定邮箱，请先设置邮箱'
        : (error as { msg?: string } | undefined)?.msg || '验证码发送失败，请稍后重试'
    )
  } finally {
    sending.value = false
  }
}

const buildVerifyPayload = () => ({
  verification_method: 'email_code' as const,
  email_code: emailCode.value
})

const save = async () => {
  const result = await bindAdminTotp(authStore.getAccessToken, buildVerifyPayload())
  const keyUrl = result?.key_url || ''
  if (!keyUrl) {
    logoutToLogin('动态验证码已绑定，请重新登录')
    return
  }
  qrCodeDataUrl.value = await QRCode.toDataURL(keyUrl, {
    width: 200,
    margin: 2,
    errorCorrectionLevel: 'M'
  })
  ElMessage.success('请先用验证器扫描二维码，确认后再重新登录')
}

const remove = async () => {
  await ElMessageBox.confirm(
    '删除后密码登录将不再需要动态验证码，当前会话会立即退出。',
    '确认删除动态验证码',
    {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger'
    }
  )
  await deleteAdminTotp(authStore.getAccessToken, buildVerifyPayload())
  logoutToLogin('动态验证码已删除，请重新登录')
}

const submit = async () => {
  if (needEmail.value) {
    return ElMessage.warning('当前账号未绑定邮箱，请先设置邮箱')
  }
  if (!/^\d{6}$/.test(emailCode.value)) {
    return ElMessage.warning('请输入6位邮箱验证码')
  }
  if (action.value === 'set' && totpEnabled.value) {
    return ElMessage.warning('已绑定动态验证码，请先删除后再重新绑定')
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
    ElMessage.error(error?.msg || '动态验证码操作失败')
  } finally {
    loading.value = false
  }
}

onBeforeUnmount(() => window.clearInterval(timer))
</script>

<template>
  <Dialog v-model="visible" title="动态验证码" width="460px" :fullscreen="false" max-height="auto">
    <div v-if="qrCodeDataUrl" class="totp-dialog">
      <p class="totp-lead">请使用验证器扫描二维码完成绑定。不要截图上传或转发该二维码。</p>
      <div class="totp-qr">
        <img :src="qrCodeDataUrl" alt="动态验证码二维码" />
      </div>
    </div>
    <ElSkeleton v-else-if="!statusReady" animated :rows="4" />
    <div v-else class="totp-dialog">
      <p class="totp-lead">
        绑定后密码登录需要 6 位动态验证码。通行密钥登录不受影响。成功后需重新登录。
      </p>
      <p v-if="needEmail" class="totp-warn">当前账号未绑定邮箱，请先设置邮箱后再使用邮箱验证。</p>

      <div class="totp-actions" role="radiogroup" aria-label="动态验证码操作">
        <button
          type="button"
          class="totp-action"
          :class="{ 'is-active': action === 'set' }"
          :disabled="loading || totpEnabled"
          @click="action = 'set'"
        >
          <span class="totp-action__title">绑定</span>
          <span class="totp-action__desc">{{
            totpEnabled ? '已绑定，需先删除' : '为当前账号开启动态验证码'
          }}</span>
        </button>
        <button
          type="button"
          class="totp-action is-danger"
          :class="{ 'is-active': action === 'remove' }"
          :disabled="loading || !totpEnabled"
          @click="action = 'remove'"
        >
          <span class="totp-action__title">删除</span>
          <span class="totp-action__desc">关闭密码登录的动态验证码</span>
        </button>
      </div>

      <ElForm label-position="top" @submit.prevent="submit">
        <ElFormItem label="邮箱验证码" required>
          <div class="totp-code">
            <ElInput
              v-model="emailCode"
              maxlength="6"
              inputmode="numeric"
              placeholder="请输入6位验证码"
              @keyup.enter="submit"
            />
            <ElButton :disabled="!canSend" :loading="sending" @click="sendCode">
              {{ seconds ? `${seconds}秒后重发` : '发送验证码' }}
            </ElButton>
          </div>
        </ElFormItem>
      </ElForm>
    </div>

    <template #footer>
      <ElButton
        v-if="qrCodeDataUrl"
        type="primary"
        @click="logoutToLogin('请使用新的动态验证码重新登录')"
      >
        我已添加，重新登录
      </ElButton>
      <template v-else-if="statusReady">
        <ElButton @click="visible = false">取消</ElButton>
        <ElButton
          :type="action === 'remove' ? 'danger' : 'primary'"
          :loading="loading"
          :disabled="(action === 'set' && totpEnabled) || (action === 'remove' && !totpEnabled)"
          @click="submit"
        >
          {{ action === 'set' ? '确认绑定' : '确认删除' }}
        </ElButton>
      </template>
    </template>
  </Dialog>
</template>

<style lang="less" scoped>
.totp-dialog {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.totp-lead,
.totp-warn {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
}

.totp-lead {
  color: var(--el-text-color-regular);
}

.totp-warn {
  padding: 8px 12px;
  color: var(--el-color-warning-dark-2);
  background: var(--el-color-warning-light-9);
  border-radius: 6px;
}

.totp-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.totp-action {
  display: flex;
  min-height: 52px;
  padding: 8px 10px;
  color: var(--el-text-color-primary);
  text-align: left;
  cursor: pointer;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  flex-direction: column;
  gap: 4px;

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

.totp-action__title {
  font-size: 14px;
  font-weight: 600;
}

.totp-action__desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.totp-code {
  display: flex;
  width: 100%;
  gap: 8px;
}

.totp-qr {
  display: flex;
  justify-content: center;

  img {
    width: 160px;
    height: 160px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
  }
}

:deep(.el-form-item) {
  margin-bottom: 8px;
}

:deep(.el-form-item:last-child) {
  margin-bottom: 0;
}
</style>
