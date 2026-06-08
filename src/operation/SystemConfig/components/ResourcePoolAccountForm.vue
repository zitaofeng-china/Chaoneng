<template>
  <Dialog v-model="visible" :title="dialogTitle">
    <Form :schema="formSchema" @register="formRegister" :isCol="true" :gridColumns="1" />
    <template #footer>
      <div class="flex justify-end">
        <ElButton @click="visible = false">取消</ElButton>
        <ElButton type="primary" @click="handleSubmit" :loading="submitting">确定</ElButton>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="tsx">
import { ref, computed, nextTick } from 'vue'

import { ElButton } from 'element-plus'
import { Dialog } from '@/components/Dialog'
import { Form, FormSchema } from '@/components/Form'
import { useForm } from '@/hooks/web/useForm'
import { v2CreatePool, v2UpdatePool } from '@/api/opertion/SystemConfig/ResourcePool'
import {
  isReceivePoolKind,
  isThresholdPoolKind,
  RESOURCE_POOL_TYPE_OPTIONS
} from '../ResourcePool/constants'
import type {
  V2PoolItem,
  V2CreatePoolParams,
  V2UpdatePoolParams
} from '@/api/opertion/SystemConfig/ResourcePool/resource_pool_account_types'
import { handleErrorMessage, handleSuccessMessage } from '@/utils/messageHelper'

interface ResourcePoolFormData {
  id?: number
  kind?: string | number
  address?: string
  status?: number
  limit?: number | string
  permission_name?: string
}

interface OpenParams {
  mode: 'add' | 'edit'
  data?: Partial<V2PoolItem & ResourcePoolFormData>
}

type ResourcePoolFormValue = string | number | undefined
type ResourcePoolFormValues = Record<string, ResourcePoolFormValue>

const emit = defineEmits(['success'])
const visible = ref(false)
const submitting = ref(false)
const formMode = ref<'add' | 'edit'>('add')
const currentData = ref<Partial<V2PoolItem & ResourcePoolFormData>>({})

// 弹窗标题
const dialogTitle = computed(() => {
  return formMode.value === 'add' ? '新增资源池账户' : '编辑资源池账户'
})

// --- Schema 定义 --- START ---
const baseSchema: FormSchema[] = [
  {
    field: 'address',
    component: 'Input',
    label: '公钥：',
    componentProps: {
      placeholder: '请输入公钥',
      maxlength: 200,
      remark: () => {
        return <span class="text-red-500 text-xs">请填写拥有者账户公钥地址</span>
      }
    },
    formItemProps: {
      rules: [{ required: true, message: ' ', trigger: 'blur' }]
    }
  }
]

const permissionNameSchema: FormSchema[] = [
  {
    field: 'permission_name',
    component: 'Input',
    label: '授权账户权限名称：',
    componentProps: {
      placeholder: '请输入权限名称',
      maxlength: 100,
      remark: () => {
        return <span class="text-red-500 text-xs">请填写活跃权限名称</span>
      }
    },
    formItemProps: {
      rules: [{ required: true, message: ' ', trigger: 'blur' }]
    }
  }
]

const energyPoolSchema: FormSchema[] = [
  {
    field: 'limit',
    component: 'InputNumber',
    label: '阈值：',
    componentProps: {
      placeholder: '请输入阈值',
      precision: 2,
      remark: '说明：当达到阈值时，自动切换至最高优先级备用地址'
    }
  }
]

const buildSchema = (type: number | string | undefined): FormSchema[] => {
  let numericType: number | undefined = typeof type === 'string' ? parseInt(type, 10) : type
  if (numericType === undefined || isNaN(numericType)) {
    numericType = 1
  }

  const configSchema: FormSchema = {
    field: 'kind',
    component: 'Select',
    label: '配置类型：',
    componentProps: {
      placeholder: '请选择配置类型',
      options: RESOURCE_POOL_TYPE_OPTIONS,
      onChange: handleConfigTypeChange
    },
    formItemProps: {
      rules: [{ required: true, message: ' ', trigger: 'change' }]
    }
  }

  let specificSchema: FormSchema[] = []
  if (isThresholdPoolKind(numericType)) {
    specificSchema = energyPoolSchema
  } else if (isReceivePoolKind(numericType)) {
    specificSchema = permissionNameSchema
  }

  return [configSchema, ...baseSchema, ...specificSchema]
}

const handleConfigTypeChange = (value: number | string | undefined) => {
  const newSchema = buildSchema(value)
  formSchema.value = newSchema

  nextTick(async () => {
    const { getFormData, setValues } = formMethods
    const currentValues = await getFormData()
    const newSchemaFields = new Set(newSchema.map((item) => item.field))
    const valuesToClear: ResourcePoolFormValues = {}

    for (const key in currentValues) {
      if (key === 'kind') continue
      if (!newSchemaFields.has(key)) {
        valuesToClear[key] = undefined
      }
    }

    if (Object.keys(valuesToClear).length > 0) {
      await setValues(valuesToClear)
    }
  })
}

const formSchema = ref<FormSchema[]>(buildSchema(1))

const { formRegister, formMethods } = useForm()
const { setValues, getFormData, getElFormExpose } = formMethods

const open = async (params: OpenParams) => {
  formMode.value = params.mode
  visible.value = true
  currentData.value = params.data || {}

  let initialConfigType: number | undefined =
    typeof currentData.value.kind === 'string'
      ? parseInt(currentData.value.kind, 10)
      : currentData.value.kind

  if (initialConfigType === undefined || isNaN(initialConfigType)) {
    initialConfigType = 1
  }

  formSchema.value = buildSchema(initialConfigType)
  await nextTick()

  const valuesToSet: ResourcePoolFormValues = {
    kind: initialConfigType,
    address: currentData.value.address || '',
    limit: undefined,
    permission_name: undefined
  }
  if (isThresholdPoolKind(initialConfigType)) {
    valuesToSet.limit = currentData.value.limit ?? undefined
  }
  if (isReceivePoolKind(initialConfigType)) {
    valuesToSet.permission_name = currentData.value.permission_name || ''
  }
  await setValues(valuesToSet)
  const elForm = await getElFormExpose()
  elForm?.clearValidate()
}

const handleSubmit = async () => {
  const elForm = await getElFormExpose()
  const valid = await elForm?.validate().catch(() => false)
  if (!valid) return

  const formData = (await getFormData()) as ResourcePoolFormValues
  const kind = Number(formData.kind)
  const address = String(formData.address || '').trim()
  const limit = Number(formData.limit) || 0
  const permissionName = String(formData.permission_name || '').trim()
  submitting.value = true

  try {
    if (formMode.value === 'add') {
      const createParams: V2CreatePoolParams = {
        address,
        kind,
        limit,
        permission_name: isReceivePoolKind(kind) ? permissionName : ''
      }

      const res = await v2CreatePool(createParams)
      if (res.code === '000000') {
        visible.value = false
        handleSuccessMessage('新增成功')
      }
    } else {
      const updateParams: V2UpdatePoolParams = {
        id: currentData.value.id!,
        address,
        kind,
        status: currentData.value.status
      }
      if (isThresholdPoolKind(kind)) {
        updateParams.limit = limit
      }
      if (isReceivePoolKind(kind)) {
        updateParams.permission_name = permissionName
      }

      const res = await v2UpdatePool(updateParams)
      if (res.code === '000000') {
        visible.value = false
        handleSuccessMessage('更新成功')
      }
    }
    emit('success')
  } catch (error) {
    handleErrorMessage(error, '保存失败')
  } finally {
    submitting.value = false
  }
}

defineExpose({
  open
})
</script>
