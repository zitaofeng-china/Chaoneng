<script setup lang="ts">
import { ElDropdown, ElDropdownMenu, ElDropdownItem } from 'element-plus'
import { useI18n } from '@/hooks/web/useI18n'
import { useDesign } from '@/hooks/web/useDesign'
import LockDialog from './components/LockDialog.vue'
import { ref, computed } from 'vue'
import LockPage from './components/LockPage.vue'
import { useLockStore } from '@/store/modules/lock'
import { useUserStore } from '@/store/modules/user'
import { useRouter } from 'vue-router'
import ChangePasswordDialog from './components/ChangepasswordDialog.vue'
import TotpDialog from './components/TotpDialog.vue'
import { isOperationSystem } from '@/utils/system'
import { ADMIN_TOTP_ENABLED } from '@/auth/admin/types'

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
const totpDialogVisible = ref(false)

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

const openTotp = () => {
  totpDialogVisible.value = true
}
</script>

<template>
  <ElDropdown
    class="custom-hover"
    :class="prefixCls"
    trigger="hover"
    :show-timeout="0"
    :hide-timeout="200"
  >
    <div class="user-info-trigger">
      <span class="user-info-name">{{ userStore.getUserInfo?.username || '账户' }}</span>
    </div>
    <template #dropdown>
      <ElDropdownMenu>
        <ElDropdownItem v-if="isOperationSystem()">
          <div @click="toPage('/personal/personal-center')">个人中心</div>
        </ElDropdownItem>
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
        <ElDropdownItem v-if="isOperationSystem() && ADMIN_TOTP_ENABLED">
          <div @click="openTotp">动态验证码</div>
        </ElDropdownItem>
        <ElDropdownItem>
          <div @click="loginOut">{{ t('common.loginOut') }}</div>
        </ElDropdownItem>
      </ElDropdownMenu>
    </template>
  </ElDropdown>

  <LockDialog v-if="dialogVisible" v-model="dialogVisible" />
  <ChangePasswordDialog v-model="changePasswordDialogVisible" />
  <TotpDialog v-if="isOperationSystem() && ADMIN_TOTP_ENABLED" v-model="totpDialogVisible" />
  <teleport to="body">
    <transition name="fade-bottom" mode="out-in">
      <LockPage v-if="getIsLock" />
    </transition>
  </teleport>
</template>

<style scoped lang="less">
.user-info-trigger {
  display: inline-flex;
  align-items: center;
  max-width: 160px;
  min-height: var(--top-tool-height);
  padding: 0 8px;
  cursor: pointer;
}

.user-info-name {
  overflow: hidden;
  font-size: 14px;
  line-height: 22px;
  color: var(--top-header-text-color);
  text-overflow: ellipsis;
  white-space: nowrap;
}

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
