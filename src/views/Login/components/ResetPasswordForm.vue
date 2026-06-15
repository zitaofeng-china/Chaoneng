<script setup lang="tsx">
import { reactive, ref, computed } from 'vue'
import { Form, FormSchema } from '@/components/Form'
import { useI18n } from '@/hooks/web/useI18n'
import { ElTabs, ElTabPane, ElInput, ElMessage } from 'element-plus'
import { useForm } from '@/hooks/web/useForm'
import { useValidator } from '@/hooks/web/useValidator'
import { BaseButton } from '@/components/Button'
import { useRouter } from 'vue-router'
import { changePasswordApi, sendPhoneCodeApi, sendEmailCodeApi } from '@/api/common/login'

defineOptions({
  name: 'ResetPasswordForm'
})

const { required, email, phone } = useValidator()
const { push } = useRouter()
const { t } = useI18n()

// 重置密码方式切换
const resetType = ref('email') // 'phone' 或 'email'

// 根据重置类型使用不同的验证规则
const rules = computed(() => {
  return resetType.value === 'phone'
    ? {
        phone: [required(), phone()],
        code: [required()],
        password: [required()],
        confirmPassword: [required()]
      }
    : {
        email: [required(), email()],
        code: [required()],
        password: [required()],
        confirmPassword: [required()]
      }
})

// 倒计时相关
const countdown = ref(0)
const isCounting = computed(() => countdown.value > 0)
let timer: number | null = null

// 开始倒计时
const startCountdown = () => {
  countdown.value = 60
  timer = window.setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer!)
      timer = null
    }
  }, 1000)
}

// 发送验证码
const sendCode = async () => {
  const formRef = await getElFormExpose()

  try {
    if (resetType.value === 'phone') {
      // 验证手机号
      await formRef?.validateField('phone')
      const formData = await getFormData()

      if (!formData.phone) {
        ElMessage.warning('请输入手机号')
        return
      }

      // 发送手机验证码
      await sendPhoneCodeApi({
        mobile: formData.phone,
        channel: 'change_passwd'
      })

      ElMessage.success('验证码已发送到手机')
    } else {
      // 验证邮箱
      await formRef?.validateField('email')
      const formData = await getFormData()

      if (!formData.email) {
        ElMessage.warning('请输入邮箱')
        return
      }

      // 发送邮箱验证码
      await sendEmailCodeApi({
        email: formData.email,
        channel: 'change_passwd'
      })

      ElMessage.success('验证码已发送到邮箱')
    }

    // 启动倒计时
    startCountdown()
  } catch (error) {
    console.error('发送验证码失败:', error)
    ElMessage.error('发送验证码失败，请稍后重试')
  }
}

// 修改 schema 使用计算属性，根据当前重置类型返回对应表单
const schema = computed(() => {
  return resetType.value === 'phone' ? phoneSchema : emailSchema
})

const handleTabChange = () => {
  clearForm()
}

const clearForm = () => {
  formMethods.setValues({
    phone: '',
    email: '',
    code: '',
    password: '',
    confirmPassword: ''
  })
}

// 手机号重置表单
const phoneSchema = reactive<FormSchema[]>([
  {
    field: 'title',
    colProps: { span: 24 },
    formItemProps: {
      slots: {
        default: () => {
          return (
            <>
              <h2 class="text-2xl font-bold text-center w-[100%] mb-4">
                {t('resetPassword.resetPassword')}
              </h2>
              <ElTabs v-model={resetType.value} class="w-[100%]" onTabChange={handleTabChange}>
                {/* <ElTabPane label={t('resetPassword.phoneReset')} name="phone"></ElTabPane> */}
                <ElTabPane label={t('resetPassword.emailReset')} name="email"></ElTabPane>
              </ElTabs>
            </>
          )
        }
      }
    }
  },
  {
    field: 'phone',
    label: t('resetPassword.phoneNumber'),
    component: 'Input',
    colProps: { span: 24 },
    componentProps: {
      placeholder: t('resetPassword.inputPhoneNumber')
    }
  },
  {
    field: 'code',
    label: t('resetPassword.verificationCode'),
    component: 'Input',
    colProps: { span: 24 },
    componentProps: {
      style: { width: '100%' },
      placeholder: t('resetPassword.inputVerificationCode'),
      slots: {
        append: () => (
          <BaseButton
            type="primary"
            class="send-code-btn"
            disabled={isCounting.value}
            onClick={sendCode}
          >
            {isCounting.value ? `${countdown.value}秒` : t('resetPassword.getCode')}
          </BaseButton>
        )
      }
    }
  },
  {
    field: 'password',
    label: t('resetPassword.newPassword'),
    component: 'InputPassword',
    colProps: { span: 24 },
    componentProps: {
      style: { width: '100%' },
      placeholder: t('resetPassword.inputNewPassword')
    }
  },
  {
    field: 'confirmPassword',
    label: t('resetPassword.confirmPassword'),
    component: 'InputPassword',
    colProps: { span: 24 },
    componentProps: {
      style: { width: '100%' },
      placeholder: t('resetPassword.inputConfirmPassword')
    }
  },
  {
    field: 'submit',
    colProps: { span: 24 },
    formItemProps: {
      slots: {
        default: () => {
          return (
            <>
              <div class="w-[100%]">
                <BaseButton
                  loading={loading.value}
                  type="primary"
                  class="w-[100%]"
                  onClick={resetPassword}
                >
                  {t('resetPassword.confirmReset')}
                </BaseButton>
              </div>
              <div class="w-[100%] mt-15px">
                <BaseButton class="w-[100%]" onClick={backToLogin}>
                  {t('resetPassword.backToLogin')}
                </BaseButton>
              </div>
            </>
          )
        }
      }
    }
  }
])

// 邮箱重置表单
const emailSchema = reactive<FormSchema[]>([
  {
    field: 'title',
    colProps: { span: 24 },
    formItemProps: {
      slots: {
        default: () => {
          return (
            <>
              <h2 class="text-2xl font-bold text-center w-[100%] mb-4">
                {t('resetPassword.resetPassword')}
              </h2>
              <ElTabs v-model={resetType.value} class="w-[100%]" onTabChange={handleTabChange}>
                {/* <ElTabPane label={t('resetPassword.phoneReset')} name="phone"></ElTabPane> */}
                <ElTabPane label={t('resetPassword.emailReset')} name="email"></ElTabPane>
              </ElTabs>
            </>
          )
        }
      }
    }
  },
  {
    field: 'email',
    label: t('resetPassword.email'),
    component: 'Input',
    colProps: { span: 24 },
    componentProps: {
      placeholder: t('resetPassword.inputEmail')
    }
  },
  {
    field: 'code',
    label: t('resetPassword.verificationCode'),
    component: 'Input',
    colProps: { span: 24 },
    componentProps: {
      style: { width: '100%' },
      placeholder: t('resetPassword.inputVerificationCode'),
      slots: {
        append: () => (
          <BaseButton
            type="primary"
            class="send-code-btn"
            disabled={isCounting.value}
            onClick={sendCode}
          >
            {isCounting.value ? `${countdown.value}秒` : t('resetPassword.getCode')}
          </BaseButton>
        )
      }
    }
  },
  {
    field: 'password',
    label: t('resetPassword.newPassword'),
    component: 'InputPassword',
    colProps: { span: 24 },
    componentProps: {
      style: { width: '100%' },
      placeholder: t('resetPassword.inputNewPassword')
    }
  },
  {
    field: 'confirmPassword',
    label: t('resetPassword.confirmPassword'),
    component: 'InputPassword',
    colProps: { span: 24 },
    componentProps: {
      style: { width: '100%' },
      placeholder: t('resetPassword.inputConfirmPassword')
    }
  },
  {
    field: 'submit',
    colProps: { span: 24 },
    formItemProps: {
      slots: {
        default: () => {
          return (
            <>
              <div class="w-[100%]">
                <BaseButton
                  loading={loading.value}
                  type="primary"
                  class="w-[100%]"
                  onClick={resetPassword}
                >
                  {t('resetPassword.confirmReset')}
                </BaseButton>
              </div>
              <div class="w-[100%] mt-15px">
                <BaseButton class="w-[100%]" onClick={backToLogin}>
                  {t('resetPassword.backToLogin')}
                </BaseButton>
              </div>
            </>
          )
        }
      }
    }
  }
])

const { formRegister, formMethods } = useForm()
const { getFormData, getElFormExpose } = formMethods

const loading = ref(false)

// 重置密码提交
const resetPassword = async () => {
  const formRef = await getElFormExpose()
  await formRef?.validate(async (isValid) => {
    if (isValid) {
      loading.value = true
      const formData = await getFormData()

      try {
        // 检查确认密码是否一致
        if (formData.password !== formData.confirmPassword) {
          ElMessage.error(t('resetPassword.passwordNotMatch'))
          return
        }

        // 调用重置密码API
        if (resetType.value === 'phone') {
          const res = await changePasswordApi({
            phone: formData.phone,
            verify_code: formData.code,
            password: formData.password
          })

          if (res && res.code === '000000') {
            ElMessage.success(t('resetPassword.resetSuccess'))
            // 跳转到登录页
            backToLogin()
          } else {
            ElMessage.error(res?.msg || t('resetPassword.resetFailed'))
          }
        } else {
          const res = await changePasswordApi({
            email: formData.email,
            verify_code: formData.code,
            password: formData.password
          })

          if (res && res.code === '000000') {
            ElMessage.success(t('resetPassword.resetSuccess'))
            // 跳转到登录页
            backToLogin()
          } else {
            ElMessage.error(res?.msg || t('resetPassword.resetFailed'))
          }
        }
      } catch (error) {
        console.error('重置密码失败:', error)
        ElMessage.error(t('resetPassword.resetFailed'))
      } finally {
        loading.value = false
      }
    }
  })
}

// 返回登录页
const backToLogin = () => {
  push('/login')
}
</script>

<template>
  <Form
    :schema="schema"
    :rules="rules"
    label-position="top"
    hide-required-asterisk
    size="large"
    class="dark:(border-1 border-[var(--el-border-color)] border-solid)"
    @register="formRegister"
  />
</template>

<style scoped>
.send-code-btn {
  width: 120px;
}
</style>
