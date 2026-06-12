<template>
  <Dialog v-model="visible" title="补发TRX">
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
import { ref, reactive, nextTick } from 'vue'
import { ElButton, ElMessage } from 'element-plus'
import { Dialog } from '@/components/Dialog'
import { Form, FormSchema } from '@/components/Form'
import { useForm } from '@/hooks/web/useForm'
import { useValidator } from '@/hooks/web/useValidator'
import { resendTrxApi } from '@/api/exchange_transaction'
// Import final types
import type { ExchangeOrderListItem, ResendTrxParams } from '@/api/exchange_transaction/types'

const emit = defineEmits(['success'])
const { required } = useValidator()
const visible = ref(false)
const currentOrderDetail = ref<ExchangeOrderListItem | null>(null) // Use final type

// 表单配置 (Keep original fields, adjust types/names later if needed)
const formSchema = reactive<FormSchema[]>([
  {
    field: 'order_id', // Use order_id from final type
    component: 'Input' as const,
    label: '订单号:',
    componentProps: { placeholder: '订单号', disabled: true },
    colProps: { span: 24 }
  },
  {
    field: 'username', // Use username from final type
    component: 'Input' as const,
    label: '用户名:',
    componentProps: { placeholder: '用户名', disabled: true },
    colProps: { span: 24 }
  },
  {
    field: 'receive_address', // Use receive_address from final type
    component: 'Input' as const,
    label: '接收地址:',
    componentProps: { placeholder: '接收地址', disabled: true },
    colProps: { span: 24 }
  },
  {
    field: 'originalTrxAmount',
    component: 'InputNumber' as const,
    label: '应发数量:', // Label might need clarification
    componentProps: {
      placeholder: '应发数量 (需确认)', // Placeholder indicates uncertainty
      disabled: true,
      precision: 2,
      slots: { suffix: () => <span>TRX</span> }
    },
    colProps: { span: 24 }
    // Note: Calculation logic needs confirmation
  },
  {
    field: 'resendTrxAmount',
    component: 'InputNumber' as const,
    label: '补发数量:',
    componentProps: {
      placeholder: '请输入补发TRX数量',
      min: 0,
      precision: 2,
      slots: { suffix: () => <span>TRX</span> }
    },
    formItemProps: { rules: [required()] },
    colProps: { span: 24 }
  },
  {
    field: 'describe',
    component: 'Input' as const,
    label: '备注:',
    componentProps: {
      placeholder: '请输入备注信息',
      type: 'textarea',
      rows: 3,
      maxlength: 200,
      showWordLimit: true
    },
    colProps: { span: 24 }
  }
]) as FormSchema[]

// 使用表单Hook
const { formRegister, formMethods } = useForm()

// 修改 open 函数以接收 ScreenshotTransactionItem
const open = (order: ExchangeOrderListItem) => {
  // Use final type
  currentOrderDetail.value = order
  visible.value = true

  // --- Calculate/Determine Original TRX Amount ---
  // !! CRITICAL: This logic needs verification. 'exchange_amount' is what the user RECEIVED.
  // What field represents the amount that *should* have been sent, which needs resending?
  // Using exchange_amount as a placeholder, likely incorrect.
  let originalAmount: number | string = order.exchange_amount ?? 'N/A'
  if (typeof originalAmount === 'string' && originalAmount !== 'N/A') {
    originalAmount = isNaN(Number(originalAmount)) ? 'N/A' : Number(originalAmount)
  }

  // Initialize form using final type fields
  formMethods.setValues({
    order_id: order.order_id,
    username: order.username, // Use username
    receive_address: order.receive_address,
    originalTrxAmount: originalAmount, // Needs verification!
    resendTrxAmount: 0,
    reason: '',
    remark: ''
  })
  // Clear validation state
  nextTick(() => {
    formMethods.getElFormExpose().then((form) => form?.clearValidate())
  })
}

// 提交表单 (Adjusted to use correct id type)
const handleSubmit = async () => {
  if (!currentOrderDetail.value) return

  const elForm = await formMethods.getElFormExpose()

  await elForm?.validate(async (valid) => {
    if (!valid) return

    const formData = await formMethods.getFormData()

    try {
      const params: ResendTrxParams = {
        id: currentOrderDetail.value!.id, // Use the number id from final type
        amount: formData.resendTrxAmount,
        reason: formData.reason,
        remark: formData.remark
      }

      // Recall: resendTrxApi implementation is currently commented out in index.ts
      const result = await resendTrxApi(params)

      // Handle response (assuming { code: number, data: boolean, message: string })
      if ((result as any)?.code === 200 && (result as any)?.data === true) {
        ElMessage.success('TRX补发请求已提交') // Adjust message if needed
        visible.value = false
        emit('success')
      } else if ((result as any)?.code === 999) {
        // Handle the placeholder response
        ElMessage.warning((result as any)?.message || '补发功能暂未启用')
      } else {
        ElMessage.error((result as any)?.message || 'TRX补发失败')
      }
    } catch (error) {
      console.error('TRX补发出错:', error)
      ElMessage.error('TRX补发失败')
    }
  })
}

defineExpose({
  open
})
</script>
