<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import {
  ElButton,
  ElForm,
  ElFormItem,
  ElInput,
  ElLink,
  ElMessage,
  ElTabPane,
  ElTabs
} from 'element-plus'
import { useRouter } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { createPasskeyChallenge, loginWithPasskey, loginWithPassword } from '@/auth/admin/api'
import {
  getPasskeyAssertion,
  getPasskeyDeviceId,
  getPasskeyErrorMessage,
  isPasskeySupported,
  rememberPasskeyCredentialId
} from '@/auth/admin/passkey'
import { useAdminAuthStore } from '@/store/modules/adminAuth'
import { useUserStore } from '@/store/modules/user'
import { useAppStore } from '@/store/modules/app'
import { usePermissionStore } from '@/store/modules/permission'
import { v1GetAdminMe } from '@/api/common/login'
import { buildUserTypeFromAdminMe } from '@/auth/admin/me'
import { getFirstAccessibleRoutePath } from '@/utils/routerHelper'
import { isOperationSystem } from '@/utils/system'

const emit = defineEmits(['to-register'])
const { currentRoute, addRoute, push, replace } = useRouter()
const adminAuthStore = useAdminAuthStore()
const userStore = useUserStore()
const appStore = useAppStore()
const permissionStore = usePermissionStore()
const isOperation = isOperationSystem()

const mode = ref<'passkey' | 'password'>(isOperation ? 'passkey' : 'password')
const loading = ref(false)
const passkeyAvailable = isPasskeySupported()
const passwordForm = reactive({ account: '', password: '' })
const passwordFormRef = ref<InstanceType<typeof ElForm>>()

const passwordRules = {
  account: [{ required: true, message: '请输入账号或邮箱', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ]
}

const redirect = computed(() => currentRoute.value.query.redirect as string | undefined)

const completeLogin = async (fallbackName: string) => {
  if (!isOperation) {
    userStore.setUserInfo({ username: fallbackName })
  } else {
    try {
      const userInfo = await v1GetAdminMe()
      if (userInfo?.data) {
        userStore.setUserInfo(await buildUserTypeFromAdminMe(userInfo.data, fallbackName))
      } else {
        userStore.setUserInfo({ username: fallbackName })
      }
    } catch {
      userStore.setUserInfo({ username: fallbackName })
    }
  }

  appStore.$patch({ dynamicRouter: false, serverDynamicRouter: false })
  await permissionStore.generateRoutes('static')
  permissionStore.getAddRouters.forEach((route) => addRoute(route as RouteRecordRaw))
  permissionStore.setIsAddRouters(true)
  await replace({
    path: redirect.value || getFirstAccessibleRoutePath(permissionStore.getAddRouters) || '/home'
  })
}

const signInWithPasskey = async () => {
  if (!passkeyAvailable) {
    mode.value = 'password'
    ElMessage.warning('当前浏览器不支持通行密钥，请使用密码登录')
    return
  }
  loading.value = true
  try {
    const device_id = getPasskeyDeviceId()
    const challenge = await createPasskeyChallenge({ device_id, purpose: 'login' })
    const credential = await getPasskeyAssertion(challenge.options)
    rememberPasskeyCredentialId(credential.id)
    const session = await loginWithPasskey({
      ceremony_id: challenge.ceremony_id,
      credential,
      device_id
    })
    adminAuthStore.applySession(session)
    await completeLogin('管理员')
    ElMessage.success('登录成功')
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
    const session = await loginWithPassword(passwordForm)
    adminAuthStore.applySession(session)
    await completeLogin(passwordForm.account)
    ElMessage.success('登录成功')
  } catch (error: any) {
    ElMessage.error(error?.msg || '登录失败，请检查账号和密码')
  } finally {
    loading.value = false
  }
}
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
          @submit.prevent
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
              @keyup.enter="signInWithPassword"
            />
          </ElFormItem>
          <ElButton type="primary" class="w-[100%]" :loading="loading" @click="signInWithPassword">
            密码登录
          </ElButton>
        </ElForm>
      </ElTabPane>
    </ElTabs>
    <div class="flex mt-16px" :class="isOperation ? 'justify-start' : 'justify-between'">
      <ElLink type="primary" :underline="false" @click="push('/reset-password')">忘记密码</ElLink>
      <ElLink v-if="!isOperation" type="primary" :underline="false" @click="emit('to-register')">
        注册账号
      </ElLink>
    </div>
  </section>
</template>
