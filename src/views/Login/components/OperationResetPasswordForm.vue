<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { ElButton, ElForm, ElFormItem, ElInput, ElLink, ElMessage } from 'element-plus'
import type { FormRules } from 'element-plus'
import { useRouter } from 'vue-router'
import { resetAdminPassword, sendAdminEmailCode } from '@/auth/admin/api'
import { useAdminAuthStore } from '@/store/modules/adminAuth'
import { useUserStore } from '@/store/modules/user'
import { useValidator } from '@/hooks/web/useValidator'

const { push } = useRouter()
const { passwordPolicy } = useValidator()
const adminAuthStore = useAdminAuthStore()
const userStore = useUserStore()
const form = reactive({
  account: '',
  email_code: '',
  new_password: '',
  confirmPassword: ''
})
const loading = ref(false)
const sending = ref(false)
const seconds = ref(0)
let timer: number | undefined

const canSend = computed(() => seconds.value === 0 && !sending.value)

const rules: FormRules = {
  account: [{ required: true, message: '请输入账号或邮箱', trigger: 'blur' }],
  email_code: [
    { required: true, pattern: /^\d{6}$/, message: '请输入6位邮箱验证码', trigger: 'blur' }
  ],
  new_password: [{ required: true, message: '请输入新密码', trigger: 'blur' }, passwordPolicy()],
  confirmPassword: [{ required: true, message: '请确认新密码', trigger: 'blur' }]
}

const startCountdown = (duration: number) => {
  seconds.value = duration
  window.clearInterval(timer)
  timer = window.setInterval(() => {
    seconds.value = Math.max(0, seconds.value - 1)
    if (!seconds.value) window.clearInterval(timer)
  }, 1000)
}

const sendCode = async () => {
  const account = form.account.trim()
  if (!account) return ElMessage.warning('请先输入账号或邮箱')
  sending.value = true
  try {
    const result = await sendAdminEmailCode({ account, purpose: 'reset' })
    startCountdown(result.resend_after)
    ElMessage.success('如该账号已注册，验证码已发送到绑定邮箱')
  } catch (error: any) {
    ElMessage.error(error?.msg || '验证码发送失败，请稍后重试')
  } finally {
    sending.value = false
  }
}

const submit = async () => {
  if (form.new_password !== form.confirmPassword) {
    ElMessage.error('两次输入的密码不一致')
    return
  }
  loading.value = true
  try {
    await resetAdminPassword({
      account: form.account.trim(),
      email_code: form.email_code,
      new_password: form.new_password
    })
    adminAuthStore.clearSession()
    userStore.reset()
    ElMessage.success('重置成功，请重新登录')
    await push('/login')
  } catch (error: any) {
    ElMessage.error(error?.msg || '重置失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

onBeforeUnmount(() => window.clearInterval(timer))
</script>

<template>
  <section class="w-[100%] max-w-420px">
    <h2 class="text-2xl font-bold text-center mb-24px">重置密码</h2>
    <ElForm :model="form" :rules="rules" label-position="top" @submit.prevent>
      <ElFormItem label="账号" prop="account">
        <ElInput v-model="form.account" placeholder="请输入用户名或邮箱" autocomplete="username" />
      </ElFormItem>
      <ElFormItem label="邮箱验证码" prop="email_code">
        <div class="flex w-[100%] gap-8px">
          <ElInput v-model="form.email_code" maxlength="6" inputmode="numeric" />
          <ElButton :disabled="!canSend" :loading="sending" @click="sendCode">
            {{ seconds ? `${seconds}秒后重发` : '发送验证码' }}
          </ElButton>
        </div>
      </ElFormItem>
      <ElFormItem label="新密码" prop="new_password">
        <ElInput
          v-model="form.new_password"
          type="password"
          show-password
          autocomplete="new-password"
        />
      </ElFormItem>
      <ElFormItem label="确认新密码" prop="confirmPassword">
        <ElInput
          v-model="form.confirmPassword"
          type="password"
          show-password
          autocomplete="new-password"
        />
      </ElFormItem>
      <ElButton type="primary" class="w-[100%]" :loading="loading" @click="submit">
        重置密码
      </ElButton>
    </ElForm>
    <div class="mt-16px text-right">
      <ElLink type="primary" :underline="false" @click="push('/login')">返回登录</ElLink>
    </div>
  </section>
</template>
