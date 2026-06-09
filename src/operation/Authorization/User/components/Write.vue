<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { PropType } from 'vue'
import { Form, FormSchema } from '@/components/Form'
import { useForm } from '@/hooks/web/useForm'
import { useI18n } from '@/hooks/web/useI18n'
import { Dialog } from '@/components/Dialog'
import { useUserStore } from '@/store/modules/user'
import { getRoleListApi } from '@/api/opertion/Authorization/common/role'
import type { RoleItem } from '@/api/opertion/Authorization/common/role'
import type { ManageUserItem } from '@/api/opertion/Authorization/User'
import { handleErrorMessage } from '@/utils/messageHelper'
import type { SelectOption } from '@/utils/tableHelpers'

const { t } = useI18n()

const userStore = useUserStore()

type UserActionType = 'add' | 'edit'
type FormValidateCallback = (error?: Error) => void

export interface ManageUserFormData {
  id?: number
  username: string
  password?: string
  role_id: number
  status: number
}

const props = defineProps({
  currentRow: {
    type: Object as PropType<ManageUserItem | null | undefined>,
    default: undefined
  },
  dialogTitle: String,
  saveLoading: Boolean,
  actionType: {
    type: String as PropType<UserActionType>,
    default: 'add'
  }
})

const emit = defineEmits(['success', 'closed'])

const dialogVisible = ref(false)

const roleOptions = ref<SelectOption<number | string>[]>([])
const roleOptionsLoading = ref(false)

const fetchRoleOptions = async () => {
  roleOptionsLoading.value = true
  try {
    const res = await getRoleListApi()
    roleOptions.value = (res.data?.list || [])
      .filter((item: RoleItem) => item.status !== 2)
      .map((item: RoleItem) => ({
        label: item.name,
        value: item.id
      }))
  } catch (error) {
    handleErrorMessage(error, '获取角色列表失败')
    roleOptions.value = []
  } finally {
    roleOptionsLoading.value = false
  }
}

const handleDialogOpen = () => {
  fetchRoleOptions()
}

watch(dialogVisible, (newVal, oldVal) => {
  if (oldVal === true && newVal === false) {
    emit('closed')
  }
})

const passwordRef = ref('')

const { formRegister, formMethods } = useForm()
const { setValues, getFormData, getElFormExpose } = formMethods

const shouldShowPasswordFields = computed(() => {
  return props.actionType === 'add' || (props.actionType === 'edit' && userStore.isSuperAdmin)
})

const validateConfirmPassword = (
  _rule: unknown,
  value: unknown,
  callback: FormValidateCallback
) => {
  if (!shouldShowPasswordFields.value) {
    callback()
    return
  }
  if (passwordRef.value) {
    if (!value) {
      callback(new Error(t('userDemo.passwordPlaceholder', '请输入密码 (至少8位，不能纯数字)')))
      return
    }
    if (passwordRef.value !== String(value)) {
      callback(new Error(t('userDemo.passwordMismatch', '两次输入的密码不一致')))
    } else {
      callback()
    }
  } else {
    callback()
  }
}

const validatePassword = (_rule: unknown, value: unknown, callback: FormValidateCallback) => {
  if (!shouldShowPasswordFields.value) {
    callback()
    return
  }
  if (props.actionType === 'add' && !value) {
    callback(new Error(t('userDemo.inputPassword', '请输入密码')))
    return
  }
  if (value) {
    const password = String(value)
    if (password.length < 8) {
      callback(new Error(t('userDemo.passwordLengthError', '密码长度不能少于8位')))
      return
    }
    if (/^\d+$/.test(password)) {
      callback(new Error(t('userDemo.passwordComplexityError', '密码不能为纯数字')))
      return
    }
  }
  callback()
}

const formSchema = computed<FormSchema[]>(() => {
  const isDisabledForNonSuperAdminEdit = props.actionType === 'edit' && !userStore.isSuperAdmin
  const isDisabledForPasswordField = !shouldShowPasswordFields.value

  return [
    {
      field: 'username',
      label: t('userDemo.username'),
      component: 'Input',
      componentProps: {
        placeholder: '请输入英文或数字组合，至少4位',
        disabled: isDisabledForNonSuperAdminEdit
      }
    },
    {
      field: 'role_id',
      label: t('userDemo.role'),
      component: 'Select',
      componentProps: {
        placeholder: '请选择角色',
        options: roleOptions.value,
        disabled: isDisabledForNonSuperAdminEdit
      }
    },
    {
      field: 'status',
      label: t('userDemo.status'),
      component: 'RadioGroup',
      componentProps: {
        disabled: isDisabledForNonSuperAdminEdit,
        options: [
          { label: t('userDemo.enable'), value: 1 },
          { label: t('userDemo.disable'), value: 2 }
        ]
      }
    },
    {
      field: 'password',
      label: t('userDemo.password'),
      component: 'Input',
      componentProps: {
        type: 'password',
        showPassword: true,
        placeholder: t('userDemo.passwordPlaceholder', '请输入密码 (至少8位，不能纯数字)'),
        onInput: (val: string) => (passwordRef.value = val),
        disabled: isDisabledForPasswordField
      }
    },
    {
      field: 'confirmPassword',
      label: t('userDemo.confirmPassword'),
      component: 'Input',
      componentProps: {
        type: 'password',
        showPassword: true,
        placeholder: t('userDemo.passwordPlaceholder', '请输入密码 (至少8位，不能纯数字)'),
        disabled: isDisabledForPasswordField
      }
    }
  ]
})

const rules = {
  username: [
    {
      required: true,
      message: t('userDemo.username') + t('common.isRequired', '不能为空'),
      trigger: 'blur'
    },
    { min: 4, message: t('userDemo.usernameLengthError', '用户名长度不能少于4位'), trigger: 'blur' }
  ],
  role_id: [
    {
      required: true,
      message: t('userDemo.role') + t('common.isRequired', '不能为空'),
      trigger: 'blur'
    }
  ],
  status: [
    {
      required: true,
      message: t('userDemo.status') + t('common.isRequired', '不能为空'),
      trigger: 'change'
    }
  ],
  password: [{ validator: validatePassword, trigger: 'blur' }],
  confirmPassword: [{ validator: validateConfirmPassword, trigger: 'blur' }]
}

const open = () => {
  dialogVisible.value = true
  passwordRef.value = ''
  roleOptions.value = []
  if (!props.currentRow) {
    setValues({ username: '', status: 1, role_id: undefined, password: '', confirmPassword: '' })
  } else {
    setValues({ ...props.currentRow, password: '', confirmPassword: '' })
  }
}
const close = () => {
  dialogVisible.value = false
}
const submit = async () => {
  const elForm = await getElFormExpose()
  const valid = await elForm?.validate().catch(() => {
    return false
  })
  if (valid) {
    const formData = await getFormData(false)
    return {
      id: formData.id ? Number(formData.id) : undefined,
      username: String(formData.username || ''),
      password: formData.password ? String(formData.password) : undefined,
      role_id: Number(formData.role_id),
      status: Number(formData.status)
    } satisfies ManageUserFormData
  } else {
    return null
  }
}
defineExpose({ open, close, submit })
</script>

<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle" :fullscreen="false" @open="handleDialogOpen">
    <Form
      :rules="rules"
      @register="formRegister"
      :schema="formSchema"
      :loading="roleOptionsLoading"
    />
    <template #footer>
      <slot name="footer"></slot>
    </template>
  </Dialog>
</template>
