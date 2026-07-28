<template>
  <Dialog v-model="dialogVisible" title="充值">
    <Descriptions :schema="rechargeSchema" :data="userAccount" :column="2" border class="mb-4" />

    <Form
      ref="formRef"
      :schema="rechargeFormSchema"
      @register="formRegister"
      :showActionButtonGroup="false"
    />

    <template #footer>
      <div class="flex justify-end">
        <ElButton @click="close" :disabled="submitting">取消</ElButton>
        <ElButton type="primary" :loading="submitting" @click="handleRecharge">确定</ElButton>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="tsx">
import { ref, computed, watch, nextTick } from 'vue'
import { ElButton } from 'element-plus'
import { Dialog } from '@/components/Dialog'
import { Form } from '@/components/Form'
import { Descriptions } from '@/components/Descriptions'
import type { DescriptionsSchema } from '@/components/Descriptions'
import { useForm } from '@/hooks/web/useForm'
import { useValidator } from '@/hooks/web/useValidator'
import { rechargeTrxApi } from '@/api/opertion/Agent/AgentList'
import {
  createRechargeFormDefaults,
  createRechargeFormSchema,
  DIRECT_RECHARGE_COIN
} from './rechargeDialogShared'
import { handleErrorMessage, handleWarningMessage } from '@/utils/messageHelper'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  user: {
    type: Object,
    default: () => ({})
  }
})

interface RechargeFormData {
  amount?: number
  secret?: string
  describe?: string
}

interface RechargeSuccessPayload {
  amount: number
  coin: string
}

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'success', payload: RechargeSuccessPayload): void
}>()

// 表单校验
const { required } = useValidator()

// 弹窗状态
const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

// 用户账户数据
const userAccount = computed(() => props.user)

// 提交状态
const submitting = ref(false)

// 表单管理
const { formRegister, formMethods } = useForm()

// 充值用户信息展示
const rechargeSchema = computed<DescriptionsSchema[]>(() => {
  return [
    {
      field: 'username',
      label: '代理名称'
    },
    {
      field: 'email',
      label: '联系方式'
    },
    {
      field: 'trx_balance',
      label: 'TRX余额'
    }
    // {
    //   field: 'usdt_balance',
    //   label: 'USDT余额',
    //   hidden: true
    // }
  ]
})

// 充值表单结构定义
const rechargeFormSchema = createRechargeFormSchema({ includeSecret: true, required })

// 初始化表单
const initForm = async () => {
  await nextTick()
  formMethods.setValues(createRechargeFormDefaults(true)).catch((error) => {
    handleErrorMessage(error, '初始化充值表单失败')
  })
}

// 处理充值
const handleRecharge = async () => {
  if (submitting.value) {
    return
  }

  if (!userAccount.value?.id) {
    handleWarningMessage('用户信息不完整，无法充值')
    return
  }

  try {
    // 验证表单是否已注册
    const form = await formMethods.getFormExpose()
    if (!form) {
      handleWarningMessage('表单未初始化，请稍后再试')
      return
    }

    // 表单验证
    const elForm = await formMethods.getElFormExpose()
    if (!elForm) {
      handleWarningMessage('表单未初始化，请稍后再试')
      return
    }

    const valid = await elForm.validate().catch(() => false)
    if (!valid) return

    submitting.value = true

    try {
      // 获取表单数据
      const formData = await formMethods.getFormData<RechargeFormData>()
      const coin = DIRECT_RECHARGE_COIN
      const amount = Number(formData.amount)

      // 构建参数（符合API要求的类型）
      const params = {
        agent_id: userAccount.value.id,
        amount,
        coin,
        secret: formData.secret || '',
        describe: formData.describe
      }

      // 调用充值API
      await rechargeTrxApi(params)

      dialogVisible.value = false
      emit('success', {
        amount,
        coin
      })
    } catch (error) {
      handleErrorMessage(error, '充值失败')
    } finally {
      submitting.value = false
    }
  } catch (error) {
    handleErrorMessage(error, '表单操作失败')
  }
}

// 关闭弹窗
const close = () => {
  if (submitting.value) {
    return
  }

  dialogVisible.value = false
}

// 监听弹窗变化
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      initForm()
    }
  }
)
</script>

<style scoped>
.dialog-form {
  width: 100%;
}
</style>
