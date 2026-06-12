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
import { ref, reactive, computed, nextTick } from 'vue'
import { ElButton, ElMessage } from 'element-plus'
import { Dialog } from '@/components/Dialog'
import { Form, FormSchema } from '@/components/Form'
import { useForm } from '@/hooks/web/useForm'
import { useValidator } from '@/hooks/web/useValidator'

// 定义类型
interface FormData {
  id?: number
  address: string
  agentId?: string
  status: number
  [key: string]: any
}

interface OpenParams {
  mode: 'add' | 'edit'
  data?: Partial<FormData>
}

// Mock API 请求 - 实际使用时替换为真实API
const createTrxAddressApi = async (data) => {
  console.log('创建TRX地址:', data)
  await new Promise((resolve) => setTimeout(resolve, 500))
  return { code: 0, message: 'success' }
}

const updateTrxAddressApi = async (data) => {
  console.log('更新TRX地址:', data)
  await new Promise((resolve) => setTimeout(resolve, 500))
  return { code: 0, message: 'success' }
}

const emit = defineEmits(['success'])
const visible = ref(false)
const submitting = ref(false)
const formMode = ref<'add' | 'edit'>('add')
const currentData = ref<Partial<FormData>>({})
const { required } = useValidator()

// 弹窗标题
const dialogTitle = computed(() => {
  return formMode.value === 'add' ? '新增TRX收款地址' : '编辑TRX收款地址'
})

// 表单配置 - 移除电话和备注字段
const formSchema = reactive<FormSchema[]>([
  {
    field: 'address',
    component: 'Input',
    label: 'TRX收款地址：',
    componentProps: {
      maxlength: 100,
      disabled: true
    },
    formItemProps: {
      rules: [required()]
    }
  },
  {
    field: 'agentId',
    component: 'Input',
    label: '代理商ID：',
    componentProps: {
      placeholder: '请输入代理商ID',
      maxlength: 50
    }
  },
  {
    field: 'agentType',
    component: 'Select',
    label: '所属代理商：',
    componentProps: {
      placeholder: '请选择代理商类型',
      options: []
    }
  }
  // {
  //   field: 'status',
  //   component: 'RadioGroup',
  //   label: '状态：',
  //   componentProps: {
  //     options: [
  //       { label: '启用', value: 1 },
  //       { label: '禁用', value: 0 }
  //     ]
  //   }
  // }
]) as FormSchema[]

// 使用表单Hook
const { formRegister, formMethods } = useForm()

// 打开弹窗
const open = async (params: OpenParams) => {
  formMode.value = params.mode
  visible.value = true
  currentData.value = params.data || {}

  await nextTick()

  // 获取表单暴露的方法
  const formExpose = await formMethods.getFormExpose()
  if (formExpose) {
    // 设置表单值 - 移除了agentPhone和remark
    formMethods.setValues({
      address: currentData.value.address || '',
      agentId: currentData.value.agentId || '',
      status: currentData.value.status === undefined ? 1 : currentData.value.status
    })
  }
}

// 提交表单
const handleSubmit = async () => {
  const elForm = await formMethods.getElFormExpose()

  await elForm?.validate(async (valid: boolean) => {
    if (!valid) return

    const formData = await formMethods.getFormData()
    submitting.value = true

    try {
      // 添加或更新TRX地址
      if (formMode.value === 'add') {
        await createTrxAddressApi(formData)
        ElMessage.success('新增成功')
      } else {
        await updateTrxAddressApi({
          id: currentData.value.id,
          ...formData
        })
        ElMessage.success('更新成功')
      }

      visible.value = false
      emit('success')
    } catch (error) {
      console.error('提交失败:', error)
      ElMessage.error('操作失败: ' + (error instanceof Error ? error.message : '未知错误'))
    } finally {
      submitting.value = false
    }
  })
}

defineExpose({
  open
})
</script>
