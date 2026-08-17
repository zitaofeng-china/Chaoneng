<script setup lang="tsx">
import { ResetPasswordForm } from './components'
import { useI18n } from '@/hooks/web/useI18n'
import { isOperationSystem } from '@/utils/system'
import OperationResetPasswordForm from './components/OperationResetPasswordForm.vue'

const { t } = useI18n()
const isOperation = isOperationSystem()
</script>

<template>
  <div class="login-container">
    <div class="login-form-container">
      <div class="login-form">
        <OperationResetPasswordForm v-if="isOperation" />
        <ResetPasswordForm v-else />
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: var(--el-fill-color-extra-light);
}

.login-form-container {
  width: 100%;
  max-width: 400px;
  padding: 20px;
  background-color: var(--el-bg-color);
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgb(0 0 0 / 10%);

  .dark & {
    background-color: var(--el-bg-color-overlay);
    border: 1px solid var(--el-border-color);
  }
}

.login-form {
  padding: 20px 0;
}
</style>
