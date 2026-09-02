<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import {
  ElButton,
  ElForm,
  ElFormItem,
  ElInput,
  ElLink,
  ElMessage,
  ElMessageBox,
  ElTabPane,
  ElTabs
} from 'element-plus'
import { useRouter } from 'vue-router'
import {
  createAdminPasskey,
  createPasskeyChallenge,
  loginWithPasskey,
  loginWithPassword,
  sendAdminEmailCode
} from '@/auth/admin/api'
import { collectPasskeyAssertion } from '@/auth/admin/assertion'
import { EMAIL_CODE_RESEND_SECONDS } from '@/auth/admin/emailCode'
import { buildUserTypeFromAdminMe } from '@/auth/admin/me'
import {
  createPasskeyCredential,
  getPasskeyDeviceId,
  getPasskeyErrorMessage,
  isPasskeySupported,
  rememberPasskeyCredentialId,
  suggestPasskeyDisplayName
} from '@/auth/admin/passkey'
import {
  ADMIN_TOTP_ENABLED,
  getAdminSecurity,
  hasAdminPasskey,
  PASSKEY_REQUIRED_CODE
} from '@/auth/admin/types'
import { enterOperationWorkspace } from '@/auth/admin/workspace'
import { v1GetAdminMe } from '@/api/common/login'
import { useAdminAuthStore } from '@/store/modules/adminAuth'
import { useUserStore } from '@/store/modules/user'
import { isOperationSystem } from '@/utils/system'
import PasskeyVerifyDialog from '@/operation/Personal/components/PasskeyVerifyDialog.vue'

const emit = defineEmits(['to-register'])
const router = useRouter()
const { currentRoute, push } = router
const adminAuthStore = useAdminAuthStore()
const userStore = useUserStore()
const isOperation = isOperationSystem()

const mode = ref<'passkey' | 'password'>(isOperation ? 'passkey' : 'password')
const loading = ref(false)
const sending = ref(false)
const seconds = ref(0)
const passkeyAvailable = isPasskeySupported()
const passwordForm = reactive({ account: '', password: '', email_code: '', totp_code: '' })
const passwordFormRef = ref<InstanceType<typeof ElForm>>()
const bindVisible = ref(false)
const bindSubmitting = ref(false)
const bindEmail = ref('')
const bindDefaultName = ref('')
const bindPhase = ref<'none' | 'form' | 'result'>('none')
let timer: number | undefined

const canSend = computed(() => seconds.value === 0 && !sending.value && !loading.value)

const passwordRules = computed(() => ({
  account: [{ required: true, message: '请输入账号或邮箱', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  ...(isOperation
    ? {
        email_code: [
          { required: true, pattern: /^\d{6}$/, message: '请输入6位邮箱验证码', trigger: 'blur' }
        ]
      }
    : {})
}))

const startCountdown = (duration: number) => {
  seconds.value = duration
  window.clearInterval(timer)
  timer = window.setInterval(() => {
    seconds.value = Math.max(0, seconds.value - 1)
    if (!seconds.value) window.clearInterval(timer)
  }, 1000)
}

const sendLoginCode = async () => {
  if (!canSend.value) return
  const account = passwordForm.account.trim()
  if (!account) return ElMessage.warning('请先输入账号或邮箱')

  sending.value = true
  try {
    await sendAdminEmailCode({ account, purpose: 'login' })
    startCountdown(EMAIL_CODE_RESEND_SECONDS)
    ElMessage.success('验证码已发送到该账号绑定的邮箱')
  } catch (error: any) {
    ElMessage.error(error?.msg || '验证码发送失败，请稍后重试')
  } finally {
    sending.value = false
  }
}

const redirect = computed(() => currentRoute.value.query.redirect as string | undefined)

const abortBindLogin = async () => {
  await adminAuthStore.logout('current').catch(() => {})
  userStore.setToken('')
  userStore.setTokenExpiredAt(undefined)
  userStore.setUserInfo(undefined)
}

const openBindDialog = (email: string) => {
  bindEmail.value = email
  bindPhase.value = 'form'
  bindVisible.value = true
  if (!bindDefaultName.value.trim()) {
    void suggestPasskeyDisplayName().then((name) => {
      if (!bindDefaultName.value.trim()) bindDefaultName.value = name.slice(0, 32)
    })
  }
}

const completeLogin = async (fallbackName: string) => {
  if (!isOperation) {
    userStore.setUserInfo({ username: fallbackName })
    await enterOperationWorkspace(router, redirect.value)
    return true
  }

  try {
    const userInfo = await v1GetAdminMe()
    if (!userInfo?.data) {
      ElMessage.error('获取账号信息失败')
      return false
    }
    userStore.setUserInfo(await buildUserTypeFromAdminMe(userInfo.data, fallbackName))
    if (!hasAdminPasskey(getAdminSecurity(userInfo.data).passkey_count)) {
      openBindDialog(String(userInfo.data.email || '').trim())
      return false
    }
  } catch {
    return false
  }

  await enterOperationWorkspace(router, redirect.value)
  return true
}

const finishBindSuccess = async () => {
  await abortBindLogin()
  mode.value = 'passkey'
  ElMessage.success('通行密钥绑定成功，请使用通行密钥登录')
}

const onBindConfirm = async (payload: { email_code: string; name: string }) => {
  if (bindSubmitting.value) return
  const account = bindEmail.value.trim()
  if (!account) {
    ElMessage.warning('当前账号未绑定邮箱，请先设置邮箱')
    return
  }
  bindSubmitting.value = true
  try {
    const challenge = await createPasskeyChallenge({
      purpose: 'set',
      account,
      email_code: payload.email_code
    })
    const credential = await createPasskeyCredential(
      challenge.options as Parameters<typeof createPasskeyCredential>[0]
    )
    rememberPasskeyCredentialId(credential.id)
    const result = await createAdminPasskey(adminAuthStore.getAccessToken, {
      ceremony_id: challenge.ceremony_id,
      credential,
      name: payload.name,
      account,
      device_id: getPasskeyDeviceId(),
      email_code: payload.email_code
    })
    bindPhase.value = 'result'
    bindVisible.value = false
    await ElMessageBox.alert(result.msg || '通行密钥绑定成功', '绑定成功', {
      type: 'success',
      confirmButtonText: '确定'
    }).catch(() => {})
    bindPhase.value = 'none'
    await finishBindSuccess()
  } catch (error: any) {
    const message = getPasskeyErrorMessage(error, '通行密钥绑定失败')
    if (error?.name === 'NotAllowedError') {
      ElMessage.info(message)
      return
    }
    bindPhase.value = 'result'
    bindVisible.value = false
    await ElMessageBox.alert(message, '绑定失败', {
      type: 'error',
      confirmButtonText: '确定'
    }).catch(() => {})
    bindSubmitting.value = false
    bindPhase.value = 'form'
    bindVisible.value = true
  } finally {
    bindSubmitting.value = false
  }
}

watch(bindVisible, async (open) => {
  if (open || bindPhase.value !== 'form') return
  bindPhase.value = 'none'
  await abortBindLogin()
  ElMessage.info('已取消绑定通行密钥，请重新登录')
})

onMounted(async () => {
  if (!isOperation || !adminAuthStore.isAuthenticated || bindVisible.value) return
  try {
    const userInfo = await v1GetAdminMe()
    if (!userInfo?.data) return
    const fallbackName = userStore.getUserInfo?.username || userInfo.data.username || '管理员'
    userStore.setUserInfo(await buildUserTypeFromAdminMe(userInfo.data, fallbackName))
    if (!hasAdminPasskey(getAdminSecurity(userInfo.data).passkey_count)) {
      openBindDialog(String(userInfo.data.email || '').trim())
    }
  } catch {
    /* 保持登录页 */
  }
})

const signInWithPasskey = async () => {
  if (!passkeyAvailable) {
    mode.value = 'password'
    ElMessage.warning('当前浏览器不支持通行密钥，请使用密码登录')
    return
  }
  loading.value = true
  try {
    const session = await loginWithPasskey(await collectPasskeyAssertion('login'))
    adminAuthStore.applySession(session)
    if (await completeLogin('管理员')) {
      ElMessage.success('登录成功')
    }
  } catch (error: any) {
    const message = getPasskeyErrorMessage(error, '通行密钥验证失败，请重试或使用密码登录')
    ElMessage[error?.name === 'NotAllowedError' ? 'info' : 'error'](message)
  } finally {
    loading.value = false
  }
}

const signInWithPassword = async () => {
  const valid = await passwordFormRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const totpCode = passwordForm.totp_code.trim()
    const emailCode = passwordForm.email_code.trim()
    const account = passwordForm.account.trim()
    const session = await loginWithPassword({
      account,
      password: passwordForm.password,
      ...(isOperation ? { email_code: emailCode } : {}),
      ...(ADMIN_TOTP_ENABLED && totpCode ? { totp_code: totpCode } : {})
    })
    adminAuthStore.applySession(session)
    if (await completeLogin(account)) {
      ElMessage.success('登录成功')
    }
  } catch (error: any) {
    if (isOperation && String(error?.code ?? '') === PASSKEY_REQUIRED_CODE) {
      const data = error?.data
      const bindAccount = String(
        (data && typeof data === 'object' && (data.email || data.account)) || passwordForm.account
      ).trim()
      openBindDialog(bindAccount)
      return
    }
    ElMessage.error(error?.msg || '登录失败，请检查账号、密码或验证码')
  } finally {
    loading.value = false
  }
}

onBeforeUnmount(() => window.clearInterval(timer))
</script>

<template>
  <section class="w-[100%] max-w-420px">
    <h2 class="text-2xl font-bold text-center mb-24px">{{
      isOperation ? '运营端登录' : '代理端登录'
    }}</h2>
    <ElTabs v-model="mode" stretch>
      <ElTabPane v-if="isOperation" label="通行密钥登录" name="passkey">
        <div class="py-16px">
          <ElButton type="primary" class="w-[100%]" :loading="loading" @click="signInWithPasskey">
            使用通行密钥登录
          </ElButton>
        </div>
      </ElTabPane>
      <ElTabPane label="密码登录" name="password">
        <ElForm
          ref="passwordFormRef"
          :model="passwordForm"
          :rules="passwordRules"
          label-position="top"
          @submit.prevent="signInWithPassword"
        >
          <ElFormItem label="账号" prop="account">
            <ElInput
              v-model="passwordForm.account"
              placeholder="请输入用户名或邮箱"
              autocomplete="username"
            />
          </ElFormItem>
          <ElFormItem label="密码" prop="password">
            <ElInput
              v-model="passwordForm.password"
              type="password"
              show-password
              placeholder="请输入密码"
              autocomplete="current-password"
            />
          </ElFormItem>
          <ElFormItem v-if="isOperation" label="邮箱验证码" prop="email_code">
            <div class="flex w-[100%] gap-8px">
              <ElInput
                v-model="passwordForm.email_code"
                maxlength="6"
                inputmode="numeric"
                placeholder="请输入6位验证码"
                @keyup.enter="signInWithPassword"
              />
              <ElButton :disabled="!canSend" :loading="sending" @click="sendLoginCode">
                {{ seconds ? `${seconds}秒后重发` : '发送验证码' }}
              </ElButton>
            </div>
          </ElFormItem>
          <ElFormItem v-if="ADMIN_TOTP_ENABLED" label="动态验证码" prop="totp_code">
            <ElInput
              v-model="passwordForm.totp_code"
              maxlength="6"
              inputmode="numeric"
              placeholder="未绑定可留空"
              @keyup.enter="signInWithPassword"
            />
          </ElFormItem>
          <ElButton type="primary" class="w-[100%]" :loading="loading" @click="signInWithPassword">
            密码登录
          </ElButton>
        </ElForm>
      </ElTabPane>
    </ElTabs>
    <div
      v-if="mode === 'password' || !isOperation"
      class="flex mt-16px"
      :class="isOperation ? 'justify-start' : 'justify-between'"
    >
      <ElLink
        v-if="mode === 'password'"
        type="primary"
        :underline="false"
        @click="push('/reset-password')"
      >
        忘记密码
      </ElLink>
      <ElLink v-if="!isOperation" type="primary" :underline="false" @click="emit('to-register')">
        注册账号
      </ElLink>
    </div>
    <PasskeyVerifyDialog
      v-if="isOperation"
      v-model="bindVisible"
      action="set"
      title="绑定通行密钥"
      confirm-text="确认绑定"
      description="当前账号尚未绑定通行密钥，请先完成绑定后再进入系统。"
      :default-name="bindDefaultName"
      :email="bindEmail"
      :need-email="!bindEmail"
      :submitting="bindSubmitting"
      @confirm="onBindConfirm"
    />
  </section>
</template>
