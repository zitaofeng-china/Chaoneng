<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElButton, ElForm, ElFormItem, ElInput, ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { loginWithPassword } from '@/auth/admin/api'
import { useAdminAuthStore } from '@/store/modules/adminAuth'
import { useUserStore } from '@/store/modules/user'
import { useAppStore } from '@/store/modules/app'
import { usePermissionStore } from '@/store/modules/permission'
import { getUserInfoApi } from '@/api/common/login'
import { getFirstAccessibleRoutePath } from '@/utils/routerHelper'
import { isOperationSystem } from '@/utils/system'

const { currentRoute, addRoute, replace } = useRouter()
const adminAuthStore = useAdminAuthStore()
const userStore = useUserStore()
const appStore = useAppStore()
const permissionStore = usePermissionStore()
const isOperation = isOperationSystem()

const loading = ref(false)
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
      const userInfo = await getUserInfoApi()
      if (userInfo?.data) {
        const { permissions, name, role_ID, role_name } = userInfo.data
        userStore.setUserInfo({ permissions, username: name, role_ID, role_name })
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
    <h2 class="text-2xl font-bold text-center mb-24px">
      {{ isOperation ? '运营端登录' : '代理端登录' }}
    </h2>
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
  </section>
</template>
