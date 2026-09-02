<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ElButton, ElForm, ElFormItem, ElInput, ElMessage } from 'element-plus'
import Dialog from '@/components/Dialog/src/Dialog.vue'
import { sendAdminEmailCode } from '@/auth/admin/api'
import { EMAIL_CODE_RESEND_SECONDS } from '@/auth/admin/emailCode'
import { suggestPasskeyDisplayName } from '@/auth/admin/passkey'
import { useAdminAuthStore } from '@/store/modules/adminAuth'

type PasskeyVerifyAction = 'remove' | 'set'

const props = defineProps<{
  action: PasskeyVerifyAction
  confirmText?: string
  defaultName?: string
  description?: string
  email?: string
  modelValue: boolean
  needEmail: boolean
  selectedName?: string
  submitting?: boolean
  title?: string
}>()

const emit = defineEmits<{
  confirm: [payload: { email_code: string; name: string }]
  'update:modelValue': [value: boolean]
}>()

const authStore = useAdminAuthStore()
const emailCode = ref('')
const passkeyName = ref('')
const sending = ref(false)
const seconds = ref(0)
let timer: number | undefined

const visible = computed({
  get: () => props.modelValue,
  set: (value) => {
    if (!value && props.submitting) return
    emit('update:modelValue', value)
  }
})

const emailCodePurpose = computed(() => (props.action === 'set' ? 'set_passkey' : 'delete_passkey'))
const title = computed(
  () => props.title || (props.action === 'set' ? '添加通行密钥' : '删除通行密钥')
)
const confirmText = computed(
  () => props.confirmText || (props.action === 'set' ? '确认添加' : '确认删除')
)
const description = computed(
  () =>
    props.description ||
    (props.action === 'set'
      ? '添加需要邮箱验证码。同一台设备原生通常只能保存一把，多把请换其他设备。确认后将调起本机指纹、面容、屏幕锁定或安全密钥。'
      : `删除「${props.selectedName || '通行密钥'}」后将无法用于登录，当前会话会立即退出。`)
)
const canSend = computed(
  () => seconds.value === 0 && !sending.value && !props.submitting && !props.needEmail
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

const resetForm = () => {
  emailCode.value = ''
  passkeyName.value = ''
  seconds.value = 0
  sending.value = false
  window.clearInterval(timer)
}

watch(visible, (open) => {
  if (!open) {
    resetForm()
    return
  }
  passkeyName.value = props.defaultName || ''
  if (props.action === 'set' && !passkeyName.value.trim()) {
    void suggestPasskeyDisplayName().then((name) => {
      if (!passkeyName.value.trim()) passkeyName.value = name.slice(0, 32)
    })
  }
})

const sendCode = async () => {
  if (!canSend.value) return
  if (props.needEmail) {
    return ElMessage.warning('当前账号未绑定邮箱，请先设置邮箱')
  }
  const account = String(props.email || '').trim()
  if (!account) {
    return ElMessage.warning('当前账号未绑定邮箱，请先设置邮箱')
  }

  sending.value = true
  try {
    const result = await sendAdminEmailCode(
      { account, purpose: emailCodePurpose.value },
      authStore.getAccessToken
    )
    startCountdown(result.resend_after || EMAIL_CODE_RESEND_SECONDS)
    ElMessage.success('验证码已发送到当前账号邮箱')
  } catch (error: unknown) {
    ElMessage.error(
      isNoAccountEmailError(error)
        ? '当前账号未绑定邮箱，请先设置邮箱'
        : (error as { msg?: string } | undefined)?.msg || '验证码发送失败，请稍后重试'
    )
  } finally {
    sending.value = false
  }
}

const submit = () => {
  if (props.needEmail) {
    return ElMessage.warning('当前账号未绑定邮箱，请先设置邮箱')
  }
  if (props.action === 'set' && !passkeyName.value.trim()) {
    return ElMessage.warning('请输入通行密钥名称')
  }
  if (!/^\d{6}$/.test(emailCode.value)) {
    return ElMessage.warning('请输入6位邮箱验证码')
  }
  emit('confirm', { email_code: emailCode.value, name: passkeyName.value.trim() })
}

onBeforeUnmount(() => window.clearInterval(timer))
</script>

<template>
  <Dialog v-model="visible" :title="title" width="480px" :fullscreen="false" max-height="auto">
    <div class="passkey-verify">
      <p class="passkey-verify__lead">{{ description }}</p>
      <p v-if="needEmail" class="passkey-verify__warn">
        当前账号未绑定邮箱，请先设置邮箱后再操作。
      </p>
      <ElForm label-position="top" @submit.prevent="submit">
        <ElFormItem v-if="action === 'set'" label="名称" required>
          <ElInput
            v-model="passkeyName"
            maxlength="32"
            placeholder="例如：办公电脑"
            :disabled="submitting"
            @keyup.enter="submit"
          />
        </ElFormItem>
        <ElFormItem label="邮箱验证码" required>
          <div class="passkey-verify__code">
            <ElInput
              v-model="emailCode"
              maxlength="6"
              inputmode="numeric"
              placeholder="请输入6位验证码"
              :disabled="submitting"
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
      <ElButton :disabled="submitting" @click="visible = false">取消</ElButton>
      <ElButton
        :type="action === 'remove' ? 'danger' : 'primary'"
        :loading="submitting"
        :disabled="needEmail"
        @click="submit"
      >
        {{ confirmText }}
      </ElButton>
    </template>
  </Dialog>
</template>

<style lang="less" scoped>
.passkey-verify {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.passkey-verify__lead,
.passkey-verify__warn {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
}

.passkey-verify__lead {
  color: var(--el-text-color-regular);
}

.passkey-verify__warn {
  padding: 8px 12px;
  color: var(--el-color-warning-dark-2);
  background: var(--el-color-warning-light-9);
  border-radius: 6px;
}

.passkey-verify__code {
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
