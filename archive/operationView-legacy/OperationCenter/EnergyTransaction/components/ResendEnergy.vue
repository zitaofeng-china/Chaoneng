<template>
  <Dialog v-model="visible" title="能量补发">
    <Form :schema="formSchema" @register="formRegister" />
    <template #footer>
      <div class="flex justify-end">
        <ElButton @click="visible = false">取消</ElButton>
        <ElButton type="primary" @click="handleSubmit">确认补发</ElButton>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="tsx">
import { ref, reactive } from 'vue'
import { ElButton, ElMessage } from 'element-plus'
import { Dialog } from '@/components/Dialog'
import { Form, FormSchema } from '@/components/Form'
import { useForm } from '@/hooks/web/useForm'
import { useValidator } from '@/hooks/web/useValidator'
import { formatToDateTime } from '@/utils/dateUtil'
import { updateEnergyTransactionStatusApi } from '@/api/energy_transaction'

const emit = defineEmits(['success'])
const { required } = useValidator()
const visible = ref(false)
const currentOrder = ref<any>(null)

// 表单配置
const formSchema = reactive<FormSchema[]>([
  {
    field: 'agentName',
    component: 'Input' as const,
    label: '代理名称：',
    componentProps: {
      placeholder: '请输入代理名称'
    },
    colProps: {
      span: 24
    }
  },
  {
    field: 'agentId',
    component: 'Input' as const,
    label: '代理ID：',
    componentProps: {
      placeholder: '请输入代理ID'
    },
    colProps: {
      span: 24
    }
  },
  {
    field: 'remainingEnergy',
    component: 'Input' as const,
    label: '应发能量数：',
    componentProps: {
      placeholder: '请输入应发能量数'
    },
    colProps: {
      span: 24
    }
  },
  {
    field: 'energyToRecycle',
    component: 'Input' as const,
    label: '补发能量数：',
    componentProps: {
      placeholder: '请输入补发能量数'
    },
    colProps: {
      span: 24
    },
    formItemProps: {
      rules: [required()]
    }
  },
  {
    field: 'remark',
    component: 'Input' as const,
    label: '备注：',
    componentProps: {
      placeholder: '请输入备注信息',
      type: 'textarea',
      rows: 3,
      maxlength: 200,
      showWordLimit: true
    },
    colProps: {
      span: 24
    }
  }
]) as FormSchema[]
// 使用表单Hook
const { formRegister, formMethods } = useForm()

// 打开弹窗
const open = (row: any) => {
  currentOrder.value = row
  visible.value = true

  // 计算应补发量：应发放 - 实际发放
  const energyDifference = (parseInt(row.energyToBeIssued) || 0) - (parseInt(row.energyIssued) || 0)
  const resendAmount = energyDifference > 0 ? energyDifference : 0

  // 初始化表单
  formMethods.setValues({
    energyToResend: resendAmount,
    reason: 1,
    validDuration: 30,
    remark: ''
  })
}

// 提交表单
const handleSubmit = async () => {
  if (!currentOrder.value) return

  const elForm = await formMethods.getElFormExpose()

  await elForm?.validate(async (valid) => {
    if (!valid) return

    const formData = await formMethods.getFormData()

    try {
      // 调用API进行能量补发
      await updateEnergyTransactionStatusApi({
        id: currentOrder.value.id,
        issueStatus: 2 // 已发放状态
      })

      ElMessage.success('能量补发成功')
      visible.value = false
      emit('success')
    } catch (error) {
      console.error('补发能量失败:', error)
      ElMessage.error('补发能量失败，请重试')
    }
  })
}

defineExpose({
  open
})
</script>
