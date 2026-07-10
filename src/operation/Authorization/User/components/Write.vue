<script setup lang="tsx">
import { ref, watch, computed, nextTick } from 'vue'
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
import EmailInput from '@/operation/Agent/components/EmailInput.vue'

const { t } = useI18n()

const userStore = useUserStore()

type UserActionType = 'add' | 'edit'
type FormValidateCallback = (error?: Error) => void

export interface ManageUserFormData {
  id?: number
  username: string
  email?: string
  password?: string
  role_id: number
  status: number
}

/** 打开弹窗时由父组件显式传入，避免 props 尚未同步导致新增/编辑串数据 */
export interface ManageUserOpenOptions {
  mode: UserActionType
  row?: ManageUserItem | null
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
/** 弹窗内部使用的模式（以 open 入参为准，不依赖 props 时序） */
const activeMode = ref<UserActionType>('add')

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

watch(dialogVisible, (newVal, oldVal) => {
  if (oldVal === true && newVal === false) {
    emit('closed')
  }
})

const passwordRef = ref('')

const { formRegister, formMethods } = useForm()
const { setValues, getFormData, getElFormExpose } = formMethods

const shouldShowPasswordFields = computed(() => {
  return activeMode.value === 'add' || (activeMode.value === 'edit' && userStore.isSuperAdmin)
})

const passwordPlaceholder = computed(() => {
  if (activeMode.value === 'edit') {
    return '留空则不修改密码（至少8位，不能纯数字）'
  }
  return t('userDemo.passwordPlaceholder', '请输入密码 (至少8位，不能纯数字)')
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
      callback(new Error(t('userDemo.inputConfirmPassword', '请确认密码')))
      return
    }
    if (passwordRef.value !== String(value)) {
      callback(new Error(t('userDemo.passwordMismatch', '两次输入的密码不一致')))
    } else {
      callback()
    }
  } else {
    // 编辑时密码与确认密码都留空：不修改密码
    callback()
  }
}

const validatePassword = (_rule: unknown, value: unknown, callback: FormValidateCallback) => {
  if (!shouldShowPasswordFields.value) {
    callback()
    return
  }
  if (activeMode.value === 'add' && !value) {
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

const validateUsername = (_rule: unknown, value: unknown, callback: FormValidateCallback) => {
  if (String(value || '').includes('@')) {
    callback(new Error('用户名不能包含@符号'))
    return
  }
  callback()
}

const validateEmail = (_rule: unknown, value: unknown, callback: FormValidateCallback) => {
  if (!value) {
    callback()
    return
  }
  if (!/^(\w-*\.*)+@(\w-?)+(\.\w{2,})+$/.test(String(value))) {
    callback(new Error('请输入正确的邮箱'))
    return
  }
  callback()
}

const formSchema = computed<FormSchema[]>(() => {
  const isDisabledForNonSuperAdminEdit = activeMode.value === 'edit' && !userStore.isSuperAdmin
  const showPassword = shouldShowPasswordFields.value
  const passwordLabel = activeMode.value === 'edit' ? '新密码' : t('userDemo.password')

  return [
    {
      field: 'username',
      label: t('userDemo.username'),
      component: 'Input',
      componentProps: {
        placeholder: '请输入英文或数字组合，至少4位',
        disabled: isDisabledForNonSuperAdminEdit,
        autocomplete: 'off',
        name: 'operation-user-name-no-autofill'
      }
    },
    {
      field: 'email',
      label: '邮箱',
      component: 'Input',
      componentProps: {
        placeholder: '请输入邮箱',
        disabled: isDisabledForNonSuperAdminEdit
      },
      formItemProps: {
        slots: {
          default: (formModel: ManageUserFormData) => (
            <EmailInput
              v-model={formModel.email}
              disabled={isDisabledForNonSuperAdminEdit}
              autocomplete="off"
              name="operation-user-email-no-autofill"
              style={{ width: '100%' }}
            />
          )
        }
      }
    },
    {
      field: 'password',
      label: passwordLabel,
      component: 'Input',
      // 无权限修改密码时从 schema 移除，避免校验干扰
      remove: !showPassword,
      componentProps: {
        type: 'password',
        showPassword: true,
        placeholder: passwordPlaceholder.value,
        onInput: (val: string) => {
          passwordRef.value = val
        },
        autocomplete: 'new-password',
        name: 'operation-user-password-no-autofill'
      }
    },
    {
      field: 'confirmPassword',
      label: t('userDemo.confirmPassword', '确认密码'),
      component: 'Input',
      remove: !showPassword,
      componentProps: {
        type: 'password',
        showPassword: true,
        placeholder: t('userDemo.inputConfirmPassword', '请确认密码'),
        autocomplete: 'new-password',
        name: 'operation-user-confirm-password-no-autofill'
      }
    },
    {
      field: 'role_id',
      label: t('userDemo.role'),
      component: 'Select',
      componentProps: {
        placeholder: '请选择角色',
        options: roleOptions.value,
        disabled: isDisabledForNonSuperAdminEdit,
        clearable: false
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
    }
  ]
})

const rules = computed(() => ({
  username: [
    {
      required: true,
      message: t('userDemo.username') + t('common.isRequired', '不能为空'),
      trigger: 'blur'
    },
    {
      min: 4,
      message: t('userDemo.usernameLengthError', '用户名长度不能少于4位'),
      trigger: 'blur'
    },
    { validator: validateUsername, trigger: 'blur' }
  ],
  email: [{ validator: validateEmail, trigger: 'blur' }],
  role_id: [
    {
      required: true,
      message: t('userDemo.role') + t('common.isRequired', '不能为空'),
      trigger: 'change'
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
}))

const getEmptyFormValues = () => ({
  id: undefined,
  username: '',
  email: '',
  status: 1,
  role_id: undefined as number | undefined,
  password: '',
  confirmPassword: ''
})

const getEditFormValues = (row: ManageUserItem) => ({
  id: row.id,
  username: row.username || '',
  email: row.email || '',
  role_id: row.role_id,
  status: row.status ?? 1,
  password: '',
  confirmPassword: ''
})

const fillForm = async (mode: UserActionType, row?: ManageUserItem | null) => {
  passwordRef.value = ''
  activeMode.value = mode

  // Dialog destroy-on-close：等表单重新挂载后再赋值
  await nextTick()
  const elForm = await getElFormExpose().catch(() => null)
  elForm?.clearValidate()

  if (mode === 'add' || !row) {
    await setValues(getEmptyFormValues())
  } else {
    await setValues(getEditFormValues(row))
  }

  await nextTick()
  elForm?.clearValidate()
}

const open = async (options?: ManageUserOpenOptions) => {
  const mode = options?.mode ?? props.actionType ?? 'add'
  // 优先使用 open 入参中的 row，避免父组件 props 尚未同步
  const row = options && 'row' in options ? options.row : props.currentRow

  activeMode.value = mode
  dialogVisible.value = true
  passwordRef.value = ''

  // 角色列表不先清空，避免下拉闪空；后台刷新
  void fetchRoleOptions()

  await fillForm(mode, row ?? null)
}

const close = () => {
  dialogVisible.value = false
}

const submit = async () => {
  const elForm = await getElFormExpose()
  const valid = await elForm?.validate().catch(() => {
    return false
  })
  if (!valid) {
    return null
  }

  const formData = await getFormData(false)
  const emailRaw = formData.email != null ? String(formData.email).trim() : ''
  const passwordRaw = formData.password != null ? String(formData.password) : ''

  return {
    id: formData.id ? Number(formData.id) : undefined,
    username: String(formData.username || '').trim(),
    email: emailRaw || undefined,
    // 编辑留空表示不改密码
    password: passwordRaw || undefined,
    role_id: Number(formData.role_id),
    status: Number(formData.status)
  } satisfies ManageUserFormData
}

defineExpose({ open, close, submit })
</script>

<template>
  <Dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    :fullscreen="false"
    width="640px"
    max-height="auto"
  >
    <Form
      :rules="rules"
      @register="formRegister"
      :schema="formSchema"
      :loading="roleOptionsLoading"
      :is-col="false"
    />
    <template #footer>
      <slot name="footer"></slot>
    </template>
  </Dialog>
</template>
