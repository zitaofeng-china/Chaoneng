<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { ElButton, ElForm, ElFormItem, ElInput, ElLink, ElMessage } from 'element-plus'
import type { FormRules } from 'element-plus'
import { registerAdmin, sendAdminEmailCode } from '@/auth/admin/api'
import { useValidator } from '@/hooks/web/useValidator'

const emit = defineEmits(['to-login'])
const { passwordPolicy } = useValidator()
const loading = ref(false)
const sending = ref(false)
const seconds = ref(0)
let timer: number | undefined

const form = reactive({
  email: '',
  email_code: '',
  password: '',
  confirmPassword: '',
  username: ''
})
const canSend = computed(() => seconds.value === 0 && !sending.value)
const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { max: 32, message: '用户名不能超过32个字符', trigger: 'blur' },
    { pattern: /^[^@]+$/, message: '用户名不能包含@符号', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' },
    { max: 32, message: '邮箱不能超过32个字符', trigger: 'blur' }
  ],
  email_code: [
    { required: true, pattern: /^\d{6}$/, message: '请输入6位邮箱验证码', trigger: 'blur' }
  ],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }, passwordPolicy()],
  confirmPassword: [{ required: true, message: '请确认密码', trigger: 'blur' }]
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
  if (!form.email) {
    ElMessage.warning('请先输入邮箱')
    return
  }
  sending.value = true
  try {
    const result = await sendAdminEmailCode({ email: form.email, purpose: 'register' })
    startCountdown(result.resend_after)
    ElMessage.success('验证码已发送')
  } catch (error: any) {
    ElMessage.error(error?.msg || '验证码发送失败，请稍后重试')
  } finally {
    sending.value = false
  }
}

const submit = async () => {
  if (form.password !== form.confirmPassword) {
    ElMessage.error('两次输入的密码不一致')
    return
  }
  loading.value = true
  try {
    await registerAdmin({
      email: form.email,
      email_code: form.email_code,
      password: form.password,
      username: form.username
    })
    ElMessage.success('注册成功，请登录')
    emit('to-login')
  } catch (error: any) {
    ElMessage.error(error?.msg || '注册失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

onBeforeUnmount(() => window.clearInterval(timer))
</script>

<template>
  <section class="w-[100%] max-w-420px">
    <h2 class="text-2xl font-bold text-center mb-24px">注册运营账号</h2>
    <ElForm :model="form" :rules="rules" label-position="top" @submit.prevent>
      <ElFormItem label="用户名" prop="username"
        ><ElInput v-model="form.username" maxlength="32"
      /></ElFormItem>
      <ElFormItem label="邮箱" prop="email"
        ><ElInput v-model="form.email" maxlength="32" autocomplete="email"
      /></ElFormItem>
      <ElFormItem label="邮箱验证码" prop="email_code">
        <div class="flex w-[100%] gap-8px">
          <ElInput v-model="form.email_code" maxlength="6" inputmode="numeric" />
          <ElButton :disabled="!canSend" :loading="sending" @click="sendCode">
            {{ seconds ? `${seconds}秒后重发` : '发送验证码' }}
          </ElButton>
        </div>
      </ElFormItem>
      <ElFormItem label="密码" prop="password"
        ><ElInput v-model="form.password" type="password" show-password autocomplete="new-password"
      /></ElFormItem>
      <ElFormItem label="确认密码" prop="confirmPassword"
        ><ElInput
          v-model="form.confirmPassword"
          type="password"
          show-password
          autocomplete="new-password"
      /></ElFormItem>
      <ElButton type="primary" class="w-[100%]" :loading="loading" @click="submit">注册</ElButton>
    </ElForm>
    <div class="mt-16px text-right"
      ><ElLink type="primary" :underline="false" @click="emit('to-login')"
        >已有账号，去登录</ElLink
      ></div
    >
  </section>
</template>
