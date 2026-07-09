<script setup lang="ts">
import { ElDropdown, ElDropdownMenu, ElDropdownItem, ElMessage } from 'element-plus'
import { useI18n } from '@/hooks/web/useI18n'
import { useDesign } from '@/hooks/web/useDesign'
import LockDialog from './components/LockDialog.vue'
import { ref, computed, onMounted } from 'vue'
import LockPage from './components/LockPage.vue'
import { useLockStore } from '@/store/modules/lock'
import { useUserStore } from '@/store/modules/user'
import { useRouter } from 'vue-router'
import ChangePasswordDialog from './components/ChangepasswordDialog.vue'
import GoogleAuthenticatorDialog from './components/GoogleAuthenticatorDialog.vue'
import { isOperationSystem } from '@/utils/system'

const { push } = useRouter()

const userStore = useUserStore()

const lockStore = useLockStore()

const getIsLock = computed(() => lockStore.getLockInfo?.isLock ?? false)

const { getPrefixCls } = useDesign()

const prefixCls = getPrefixCls('user-info')

const { t } = useI18n()

const loginOut = () => {
  userStore.logoutConfirm()
}

const dialogVisible = ref<boolean>(false)
const changePasswordDialogVisible = ref<boolean>(false)
const googleAuthenticatorDialogVisible = ref<boolean>(false)

// 锁定屏幕
const lockScreen = () => {
  dialogVisible.value = true
}

const toDocument = () => {
  window.open('https://element-plus-admin-doc.cn/')
}

const toPage = (path: string) => {
  push(path)
}

const changePassword = () => {
  changePasswordDialogVisible.value = true
}

const openGoogleAuthenticator = () => {
  googleAuthenticatorDialogVisible.value = true
}

onMounted(() => {
  if (isOperationSystem() && sessionStorage.getItem('forceGoogleAuthenticatorSetup') === '1') {
    sessionStorage.removeItem('forceGoogleAuthenticatorSetup')
    googleAuthenticatorDialogVisible.value = true
    ElMessage.warning('请先设置谷歌验证码')
  }
})
</script>

<template>
  <ElDropdown class="custom-hover" :class="prefixCls" trigger="click">
    <div class="flex items-center">
      <!-- <img
        src="@/assets/imgs/avatar.jpg"
        alt=""
        class="w-[calc(var(--logo-height)-25px)] rounded-[50%]"
      /> -->
      <span class="<lg:hidden text-14px pl-[5px] text-[var(--top-header-text-color)]">{{
        userStore.getUserInfo?.username
      }}</span>
    </div>
    <template #dropdown>
      <ElDropdownMenu>
        <!-- <ElDropdownItem>
        <div @click="toPage('/personal/personal-center')">
          {{ t('router.personalCenter') }}
        </div>
      </ElDropdownItem> -->
        <!-- <ElDropdownItem>
        <div @click="toDocument">{{ t('common.document') }}</div>
      </ElDropdownItem> -->
        <!-- <ElDropdownItem divided>
        <div @click="lockScreen">{{ t('lock.lockScreen') }}</div>
      </ElDropdownItem> -->
        <ElDropdownItem v-if="isOperationSystem()">
          <div @click="changePassword">
            {{ '修改密码' }}
          </div>
        </ElDropdownItem>
        <ElDropdownItem v-if="isOperationSystem()">
          <div @click="openGoogleAuthenticator">
            {{ '谷歌验证码' }}
          </div>
        </ElDropdownItem>
        <ElDropdownItem>
          <div @click="loginOut">{{ t('common.loginOut') }}</div>
        </ElDropdownItem>
      </ElDropdownMenu>
    </template>
  </ElDropdown>

  <LockDialog v-if="dialogVisible" v-model="dialogVisible" />
  <ChangePasswordDialog v-model="changePasswordDialogVisible" />
  <GoogleAuthenticatorDialog v-model="googleAuthenticatorDialogVisible" />
  <teleport to="body">
    <transition name="fade-bottom" mode="out-in">
      <LockPage v-if="getIsLock" />
    </transition>
  </teleport>
</template>

<style scoped lang="less">
.fade-bottom-enter-active,
.fade-bottom-leave-active {
  transition:
    opacity 0.25s,
    transform 0.3s;
}

.fade-bottom-enter-from {
  opacity: 0;
  transform: translateY(-10%);
}

.fade-bottom-leave-to {
  opacity: 0;
  transform: translateY(10%);
}
</style>
