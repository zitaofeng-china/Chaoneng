<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElButton, ElForm, ElFormItem, ElInput, ElLink, ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { v1GetAdminMe } from '@/api/common/login'
import { createAdminPasskey, createPasskeyChallenge, sendAdminEmailCode } from '@/auth/admin/api'
import { buildUserTypeFromAdminMe } from '@/auth/admin/me'
import {
  createPasskeyCredential,
  getPasskeyDeviceId,
  getPasskeyErrorMessage,
  isPasskeySupported,
  rememberPasskeyCredentialId
} from '@/auth/admin/passkey'
import { getAdminSecurity, hasAdminPasskey } from '@/auth/admin/types'
import { enterOperationWorkspace } from '@/auth/admin/workspace'
import { useAdminAuthStore } from '@/store/modules/adminAuth'
import { useUserStore } from '@/store/modules/user'

const route = useRoute()
const router = useRouter()
const authStore = useAdminAuthStore()
const userStore = useUserStore()

const form = reactive({ name: '', email_code: '' })
const needEmail = ref(false)
const loading = ref(false)
const sending = ref(false)
const leaving = ref(false)
const seconds = ref(0)
const supported = isPasskeySupported()
let timer: number | undefined

const canSend = computed(
  () => seconds.value === 0 && !sending.value && !loading.value && !needEmail.value
)
const redirect = computed(() => {
  const value = route.query.redirect
  return typeof value === 'string' ? value : undefined
})

const startCountdown = (duration: number) => {
  seconds.value = duration
  window.clearInterval(timer)
  timer = window.setInterval(() => {
    seconds.value = Math.max(0, seconds.value - 1)
    if (!seconds.value) window.clearInterval(timer)
  }, 1000)
}

const isNoAccountEmailError = (error: unknown) => {
  const text = String((error as { msg?: string; message?: string } | undefined)?.msg || '')
  return /邮箱/.test(text) && /未绑定|未设置|没有|为空|不存在|未填写/.test(text)
}

const loadAccount = async () => {
  try {
    const res = await v1GetAdminMe()
    const me = res.data
    if (!me) return
    needEmail.value = !String(me.email || '').trim()
    userStore.setUserInfo(await buildUserTypeFromAdminMe(me, userStore.getUserInfo?.username))
    if (hasAdminPasskey(getAdminSecurity(me).passkey_count)) {
      await enterOperationWorkspace(router, redirect.value)
    }
  } catch {
    /* 仍停留在绑定页，稍后可重试 */
  }
}

const sendCode = async () => {
  if (!canSend.value) return
  if (needEmail.value) {
    return ElMessage.warning('当前账号未绑定邮箱，请先设置邮箱')
  }

  sending.value = true
  try {
    const result = await sendAdminEmailCode({ purpose: 'set_passkey' }, authStore.getAccessToken)
    startCountdown(result.resend_after)
    ElMessage.success('验证码已发送到当前账号邮箱')
  } catch (error: unknown) {
    if (isNoAccountEmailError(error)) needEmail.value = true
    ElMessage.error((error as { msg?: string } | undefined)?.msg || '验证码发送失败，请稍后重试')
  } finally {
    sending.value = false
  }
}

const enterAfterBind = async () => {
  try {
    const res = await v1GetAdminMe()
    if (res?.data) {
      const nextUser = await buildUserTypeFromAdminMe(res.data, userStore.getUserInfo?.username)
      if (!hasAdminPasskey(nextUser.passkey_count)) {
        nextUser.passkey_count = 1
      }
      userStore.setUserInfo(nextUser)
    } else {
      userStore.setUserInfo({
        username: userStore.getUserInfo?.username || '',
        permissions: userStore.getUserInfo?.permissions,
        role_ID: userStore.getUserInfo?.role_ID,
        role_name: userStore.getUserInfo?.role_name,
        passkey_count: 1
      })
    }
    await enterOperationWorkspace(router, redirect.value)
    ElMessage.success('通行密钥已绑定')
  } catch {
    ElMessage.success('通行密钥已绑定，请使用通行密钥登录')
    userStore.reset()
  }
}

const submit = async () => {
  if (!supported) {
    return ElMessage.warning('当前环境不支持通行密钥')
  }
  const name = form.name.trim()
  if (!name) {
    return ElMessage.warning('请输入通行密钥名称')
  }
  if (needEmail.value) {
    return ElMessage.warning('当前账号未绑定邮箱，请先设置邮箱')
  }
  if (!/^\d{6}$/.test(form.email_code)) {
    return ElMessage.warning('请输入6位邮箱验证码')
  }

  loading.value = true
  try {
    const challenge = await createPasskeyChallenge(
      { device_id: getPasskeyDeviceId(), purpose: 'set' },
      authStore.getAccessToken
    )
    const credential = await createPasskeyCredential(
      challenge.options as Parameters<typeof createPasskeyCredential>[0]
    )
    rememberPasskeyCredentialId(credential.id)
    await createAdminPasskey(authStore.getAccessToken, {
      ceremony_id: challenge.ceremony_id,
      credential,
      name,
      verification_method: 'email_code',
      email_code: form.email_code
    })
    await enterAfterBind()
  } catch (error: any) {
    const message = getPasskeyErrorMessage(error, '通行密钥绑定失败')
    ElMessage[error?.name === 'NotAllowedError' ? 'info' : 'error'](message)
  } finally {
    loading.value = false
  }
}

const backToLogin = async () => {
  if (leaving.value) return
  leaving.value = true
  try {
    await authStore.logout('current').catch(() => {})
    userStore.reset()
  } finally {
    leaving.value = false
  }
}

onMounted(() => {
  loadAccount()
})

onBeforeUnmount(() => window.clearInterval(timer))
</script>

<template>
  <div class="bind-passkey-page">
    <section class="bind-passkey-card">
      <h2 class="bind-passkey-title">绑定通行密钥</h2>
      <p class="bind-passkey-desc">当前账号尚未绑定通行密钥，绑定成功后即可进入系统。</p>
      <p v-if="!supported" class="bind-passkey-warn">
        当前浏览器或访问地址不支持通行密钥，请使用 HTTPS 正式域名操作。
      </p>
      <p v-if="needEmail" class="bind-passkey-warn">当前账号未绑定邮箱，请先设置邮箱后再绑定。</p>
      <ElForm label-position="top" @submit.prevent="submit">
        <ElFormItem label="名称" required>
          <ElInput
            v-model="form.name"
            maxlength="32"
            placeholder="例如：办公电脑"
            :disabled="loading"
            @keyup.enter="submit"
          />
        </ElFormItem>
        <ElFormItem label="邮箱验证码" required>
          <div class="bind-passkey-code">
            <ElInput
              v-model="form.email_code"
              maxlength="6"
              inputmode="numeric"
              placeholder="请输入6位验证码"
              :disabled="loading"
              @keyup.enter="submit"
            />
            <ElButton :disabled="!canSend" :loading="sending" @click="sendCode">
              {{ seconds ? `${seconds}秒后重发` : '发送验证码' }}
            </ElButton>
          </div>
        </ElFormItem>
        <ElButton
          type="primary"
          class="w-[100%]"
          :loading="loading"
          :disabled="!supported"
          @click="submit"
        >
          绑定并进入系统
        </ElButton>
      </ElForm>
      <div class="bind-passkey-footer">
        <ElLink type="primary" :underline="false" :disabled="leaving" @click="backToLogin">
          返回登录
        </ElLink>
      </div>
    </section>
  </div>
</template>

<style lang="less" scoped>
.bind-passkey-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 24px 16px;
  background-color: var(--el-fill-color-extra-light);
}

.bind-passkey-card {
  width: 100%;
  max-width: 420px;
  padding: 32px 28px;
  background-color: var(--el-bg-color);
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgb(0 0 0 / 10%);

  .dark & {
    background-color: var(--el-bg-color-overlay);
    border: 1px solid var(--el-border-color);
  }
}

.bind-passkey-title {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  text-align: center;
}

.bind-passkey-desc,
.bind-passkey-warn {
  margin: 0 0 20px;
  font-size: 13px;
  line-height: 1.6;
}

.bind-passkey-desc {
  color: var(--el-text-color-regular);
  text-align: center;
}

.bind-passkey-warn {
  padding: 8px 12px;
  color: var(--el-color-warning-dark-2);
  background: var(--el-color-warning-light-9);
  border-radius: 6px;
}

.bind-passkey-code {
  display: flex;
  width: 100%;
  gap: 8px;
}

.bind-passkey-footer {
  display: flex;
  justify-content: flex-start;
  margin-top: 16px;
}

:deep(.el-form-item:last-of-type) {
  margin-bottom: 18px;
}
</style>
