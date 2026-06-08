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
        <ElButton @click="close">取消</ElButton>
        <ElButton type="primary" :loading="submitting" @click="handleRecharge">确定</ElButton>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="tsx">
import { computed, reactive, ref, watch } from 'vue'
import { ElButton, ElMessage } from 'element-plus'
import { Dialog } from '@/components/Dialog'
import { Form, FormSchema } from '@/components/Form'
import { Descriptions } from '@/components/Descriptions'
import type { DescriptionsSchema } from '@/components/Descriptions'
import { useForm } from '@/hooks/web/useForm'
import { useValidator } from '@/hooks/web/useValidator'
import { handleErrorMessage, handleSuccessMessage } from '@/utils/messageHelper'
import { v1RechargeUser } from '@/api/opertion/common/tgUser'
import type { RechargeUserParamsV1 } from '@/api/opertion/common/tgUser'

interface RechargeUserInfo {
  id?: number
  bot_user_name?: string
  bot_first_name?: string
  tg_user_id?: number | string
  tg_first_name?: string
  trx_balance?: string | number
}

interface RechargeFormData {
  coin?: string
  amount?: number
  describe?: string
}

const props = defineProps<{
  visible: boolean
  user?: RechargeUserInfo | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'success'): void
}>()

const { required } = useValidator()
const submitting = ref(false)
const { formRegister, formMethods } = useForm()

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const userAccount = computed(() => props.user || {})

const rechargeSchema = computed<DescriptionsSchema[]>(() => [
  { field: 'bot_user_name', label: '机器人用户名' },
  { field: 'bot_first_name', label: '机器人名称' },
  { field: 'tg_user_id', label: 'TG用户ID' },
  { field: 'tg_first_name', label: 'TG用户名称' },
  { field: 'trx_balance', label: 'TRX余额' }
])

const rechargeFormSchema = reactive<FormSchema[]>([
  {
    field: 'coin',
    component: 'RadioGroup',
    label: '充值类型',
    value: 'TRX',
    componentProps: {
      options: [{ label: '充值TRX', value: 'TRX' }]
    }
  },
  {
    field: 'amount',
    component: 'InputNumber',
    label: '金额',
    componentProps: {
      placeholder: '请输入金额',
      style: { width: '100%' },
      remark: () => (
        <div>
          <span>如果需要扣减余额，请输入负数</span>
          <br />
          <span>例如：输入5，则是增加5余额，输入-5，则是扣减5余额</span>
        </div>
      )
    },
    formItemProps: {
      rules: [required()]
    }
  },
  {
    field: 'describe',
    component: 'Input',
    label: '备注',
    componentProps: {
      placeholder: '请输入备注',
      type: 'textarea',
      rows: 2
    }
  }
])

const resetForm = () => {
  setTimeout(() => {
    formMethods
      .setValues({
        coin: 'TRX',
        amount: undefined,
        describe: ''
      })
      .catch((error) => handleErrorMessage(error, '初始化充值表单失败'))
  }, 200)
}

const handleRecharge = async () => {
  if (!userAccount.value.id) {
    ElMessage.warning('用户信息不完整，无法充值')
    return
  }

  try {
    const form = await formMethods.getFormExpose()
    const elForm = await formMethods.getElFormExpose()
    if (!form || !elForm) {
      ElMessage.warning('表单未初始化，请稍后再试')
      return
    }

    const valid = await elForm.validate().catch(() => false)
    if (!valid) return

    submitting.value = true
    const formData = await formMethods.getFormData<RechargeFormData>()
    const params: RechargeUserParamsV1 = {
      user_id: userAccount.value.id,
      amount: Number(formData.amount),
      coin: formData.coin || 'TRX',
      describe: formData.describe || ''
    }

    await v1RechargeUser(params)
    handleSuccessMessage('充值成功')
    close()
    emit('success')
  } catch (error) {
    handleErrorMessage(error, '充值失败')
  } finally {
    submitting.value = false
  }
}

const close = () => {
  dialogVisible.value = false
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      resetForm()
    }
  }
)
</script>
