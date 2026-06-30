<template>
  <Dialog
    v-model="dialogVisible"
    title="修改密码"
    width="500px"
    max-height="140px"
    @close="handleClose"
  >
    <ElForm
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="100px"
      style="padding: 15px 10px"
    >
      <ElFormItem label="账号" prop="account" style="margin-bottom: 16px">
        <ElInput v-model="formData.account" disabled />
      </ElFormItem>

      <ElFormItem label="新密码" prop="newPassword" style="margin-bottom: 8px">
        <ElInput
          v-model="formData.newPassword"
          type="password"
          placeholder="请输入新密码"
          show-password
        />
      </ElFormItem>
    </ElForm>

    <template #footer>
      <ElButton
        type="success"
        :loading="loading"
        :disabled="loading"
        @click="handleSubmit"
        style="width: 100%; height: 42px; font-size: 16px"
      >
        确定
      </ElButton>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { Dialog } from '@/components/Dialog'
import { ElButton, ElForm, ElFormItem, ElInput } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { handleErrorMessage, handleSuccessMessage } from '@/utils/messageHelper'
import { v1AdminChangePassword } from '@/api/opertion/common/tgUser'
import type { AdminChangePasswordParamsV1 } from '@/api/opertion/common/tgUser'

interface PasswordUserInfo {
  id?: number
  username?: string
  tg_user_name?: string
}

const props = defineProps<{
  visible: boolean
  user?: PasswordUserInfo | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'success'): void
}>()

const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const loading = ref(false)

const formData = reactive({
  account: '',
  newPassword: ''
})

const rules: FormRules = {
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ]
}

watch(
  () => props.visible,
  (val) => {
    dialogVisible.value = val
    if (val && props.user) {
      formData.account = props.user.username || props.user.tg_user_name || ''
      formData.newPassword = ''
      formRef.value?.clearValidate()
    }
  }
)

watch(dialogVisible, (val) => {
  emit('update:visible', val)
})

const handleClose = () => {
  if (loading.value) return
  dialogVisible.value = false
  formRef.value?.resetFields()
}

const handleSubmit = async () => {
  if (!formRef.value || loading.value) return
  if (!props.user?.id) {
    handleErrorMessage(new Error('缺少用户ID'), '密码修改失败')
    return
  }

  try {
    await formRef.value.validate()
    loading.value = true

    const params: AdminChangePasswordParamsV1 = {
      id: props.user.id,
      password: formData.newPassword
    }
    await v1AdminChangePassword(params)

    handleSuccessMessage('密码修改成功')
    emit('success')
    dialogVisible.value = false
    formRef.value?.resetFields()
  } catch (error) {
    if (error !== false) {
      handleErrorMessage(error, '密码修改失败')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
:deep(.el-form-item) {
  align-items: center;
}

:deep(.el-form-item__label) {
  padding-right: 12px;
  font-size: 14px;
  font-weight: 500;
  text-align: right;
}

:deep(.el-input.is-disabled .el-input__wrapper) {
  background-color: #f5f7fa;
}

:deep(.el-input__wrapper) {
  padding: 8px 12px;
}

:deep(.el-input__inner) {
  height: 32px;
  font-size: 14px;
  line-height: 32px;
}

:deep(.el-dialog__body) {
  padding: 15px 0 10px;
}

:deep(.el-dialog__footer) {
  padding: 10px 20px 20px;
}

:deep(.el-dialog__header) {
  padding: 15px 20px;
}
</style>
