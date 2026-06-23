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
        <ElButton :disabled="submitting" @click="close">取消</ElButton>
        <ElButton type="primary" :loading="submitting" @click="handleRecharge">确定</ElButton>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="tsx">
import { ref, computed, reactive, watch, nextTick } from 'vue'
import { ElButton, ElMessage } from 'element-plus'
import { Dialog } from '@/components/Dialog'
import { Form, FormSchema } from '@/components/Form'
import { Descriptions } from '@/components/Descriptions'
import type { DescriptionsSchema } from '@/components/Descriptions'
import { useForm } from '@/hooks/web/useForm'
import { useValidator } from '@/hooks/web/useValidator'
import { v1RechargeUser } from '@/api/management/common/tgUser'
import type { RechargeUserParamsV1 } from '@/api/management/common/tgUser/types'
import { handleErrorMessage } from '@/utils/messageHelper'

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

const emit = defineEmits(['update:visible', 'success'])

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
      field: 'bot_user_name',
      label: '机器人用户名'
    },
    {
      field: 'bot_first_name',
      label: '机器人名称'
    },
    {
      field: 'tg_user_id',
      label: 'TG用户ID'
    },
    {
      field: 'tg_first_name',
      label: 'TG用户名称'
    },
    {
      field: 'trx_balance',
      label: 'TRX余额'
    }
  ]
})

// 充值表单结构定义
const rechargeFormSchema = reactive<FormSchema[]>([
  {
    field: 'unit',
    component: 'RadioGroup',
    label: '充值类型',
    value: 'TRX',
    componentProps: {
      options: [
        {
          label: '充值TRX',
          value: 'TRX'
        }
        // {
        //   label: '充值USDT',
        //   value: 'USDT'
        // }
      ]
    }
  },
  {
    field: 'amount',
    component: 'InputNumber',
    label: '金额',
    componentProps: {
      placeholder: '请输入金额',
      style: {
        width: '100%'
      },
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

// 初始化表单
const initForm = () => {
  nextTick(() => {
    formMethods
      .setValues({
        unit: 'TRX',
        amount: '',
        describe: ''
      })
      .catch((err) => handleErrorMessage(err, '初始化充值表单失败'))
  })
}

// 处理充值
const handleRecharge = async () => {
  if (submitting.value) return
  if (!userAccount.value?.id) {
    ElMessage.warning('用户信息不完整，无法充值')
    return
  }

  try {
    // 验证表单是否已注册
    const form = await formMethods.getFormExpose()
    if (!form) {
      ElMessage.warning('表单未初始化，请稍后再试')
      return
    }

    // 表单验证
    const elForm = await formMethods.getElFormExpose()
    if (!elForm) {
      ElMessage.warning('表单未初始化，请稍后再试')
      return
    }

    const valid = await elForm.validate().catch(() => false)
    if (!valid) return

    submitting.value = true

    try {
      // 获取表单数据
      const formData = await formMethods.getFormData()

      // 构建参数（使用新接口 v1RechargeUser）
      const params: RechargeUserParamsV1 = {
        user_id: userAccount.value.id,
        amount: formData.amount,
        coin: formData.unit, // unit → coin
        describe: formData.describe
      }

      // 调用充值API - 使用新接口
      await v1RechargeUser(params)

      ElMessage.success('充值成功')
      close()
      emit('success')
    } catch (error) {
      handleErrorMessage(error, '充值失败')
    } finally {
      submitting.value = false
    }
  } catch (error) {
    handleErrorMessage(error, '表单操作失败，请稍后再试')
  }
}

// 关闭弹窗
const close = () => {
  if (submitting.value) return
  dialogVisible.value = false
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      initForm()
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.dialog-form {
  width: 100%;
}
</style>
