<template>
  <div class="app-container">
    <ContentWrap title="能量/带宽价格配置">
      <ElForm
        ref="formRef"
        v-loading="loading"
        :model="formData"
        :rules="rules"
        label-position="top"
        class="price-form"
        :disabled="!hasEditPermission || loading || saving"
      >
        <div class="section-title">【工作日】价格：</div>
        <ElRow :gutter="24">
          <ElCol :xs="24" :sm="12" :md="8">
            <ElFormItem label="能量出售单价（SUN/天）" prop="energy_price1">
              <ElInput
                v-model="formData.energy_price1"
                placeholder="请输入金额"
                clearable
                @input="(value: string) => handleNumberInput('energy_price1', value)"
              />
            </ElFormItem>
          </ElCol>
          <ElCol :xs="24" :sm="12" :md="8">
            <ElFormItem label="带宽出售单价（SUN/天）" prop="bandwidth_price1">
              <ElInput
                v-model="formData.bandwidth_price1"
                placeholder="请输入金额"
                clearable
                @input="(value: string) => handleNumberInput('bandwidth_price1', value)"
              />
            </ElFormItem>
          </ElCol>
        </ElRow>

        <div class="section-title">【节假日】价格：</div>
        <ElRow :gutter="24">
          <ElCol :xs="24" :sm="12" :md="8">
            <ElFormItem label="能量出售单价（SUN/天）" prop="energy_price2">
              <ElInput
                v-model="formData.energy_price2"
                placeholder="请输入金额"
                clearable
                @input="(value: string) => handleNumberInput('energy_price2', value)"
              />
            </ElFormItem>
          </ElCol>
          <ElCol :xs="24" :sm="12" :md="8">
            <ElFormItem label="带宽出售单价（SUN/天）" prop="bandwidth_price2">
              <ElInput
                v-model="formData.bandwidth_price2"
                placeholder="请输入金额"
                clearable
                @input="(value: string) => handleNumberInput('bandwidth_price2', value)"
              />
            </ElFormItem>
          </ElCol>
        </ElRow>

        <div class="section-title">【最低出售数量】配置：</div>
        <ElRow :gutter="24">
          <ElCol :xs="24" :sm="12" :md="8">
            <ElFormItem label="能量最低出售数量" prop="energy_minimum">
              <ElInput
                v-model="formData.energy_minimum"
                placeholder="请输入能量最低出售数量"
                clearable
                @input="(value: string) => handleNumberInput('energy_minimum', value)"
              />
            </ElFormItem>
          </ElCol>
          <ElCol :xs="24" :sm="12" :md="8">
            <ElFormItem label="带宽最低出售数量" prop="bandwidth_minimum">
              <ElInput
                v-model="formData.bandwidth_minimum"
                placeholder="请输入带宽最低出售数量"
                clearable
                @input="(value: string) => handleNumberInput('bandwidth_minimum', value)"
              />
            </ElFormItem>
          </ElCol>
        </ElRow>

        <div class="form-actions">
          <ElButton v-if="hasEditPermission" type="primary" :loading="saving" @click="handleSave">
            保存配置
          </ElButton>
          <span class="form-tip">提示：配置保存后，系统会按最新价格进行结算。</span>
        </div>
      </ElForm>
    </ContentWrap>
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, reactive, ref } from 'vue'
import {
  ElButton,
  ElCol,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElRow,
  type FormInstance,
  type FormRules
} from 'element-plus'
import { useRoute } from 'vue-router'
import {
  getFundPriceConfig,
  updateFundPriceConfig,
  type FundPriceConfig,
  type UpdateFundPriceConfigParams
} from '@/api/opertion/FinancialManage/FinancialPrice'
import { getErrorMessage } from '@/utils/messageHelper'

type FormField =
  | 'energy_price1'
  | 'bandwidth_price1'
  | 'energy_price2'
  | 'bandwidth_price2'
  | 'energy_minimum'
  | 'bandwidth_minimum'

type FormData = Record<FormField, string>

const route = useRoute()
const formRef = ref<FormInstance>()
const loading = ref(false)
const saving = ref(false)

const decimalFields: FormField[] = [
  'energy_price1',
  'bandwidth_price1',
  'energy_price2',
  'bandwidth_price2'
]

const formData = reactive<FormData>({
  energy_price1: '',
  bandwidth_price1: '',
  energy_price2: '',
  bandwidth_price2: '',
  energy_minimum: '',
  bandwidth_minimum: ''
})

const hasEditPermission = computed(() => {
  const buttonList = (route.meta.buttonList || []) as string[]
  return buttonList.includes('edit')
})

const validatePositiveNumber = (
  _rule: unknown,
  value: string,
  callback: (error?: Error) => void
) => {
  if (!value) {
    callback(new Error('请输入数值'))
    return
  }

  const numberValue = Number(value)
  if (Number.isNaN(numberValue) || numberValue <= 0) {
    callback(new Error('请输入大于 0 的数值'))
    return
  }

  callback()
}

const rules = computed<FormRules>(() => ({
  energy_price1: [
    { required: true, message: '请填写工作日能量出售单价', trigger: 'blur' },
    { validator: validatePositiveNumber, trigger: 'blur' }
  ],
  bandwidth_price1: [
    { required: true, message: '请填写工作日带宽出售单价', trigger: 'blur' },
    { validator: validatePositiveNumber, trigger: 'blur' }
  ],
  energy_price2: [
    { required: true, message: '请填写节假日能量出售单价', trigger: 'blur' },
    { validator: validatePositiveNumber, trigger: 'blur' }
  ],
  bandwidth_price2: [
    { required: true, message: '请填写节假日带宽出售单价', trigger: 'blur' },
    { validator: validatePositiveNumber, trigger: 'blur' }
  ],
  energy_minimum: [
    { required: true, message: '请填写能量最低出售数量', trigger: 'blur' },
    { validator: validatePositiveNumber, trigger: 'blur' }
  ],
  bandwidth_minimum: [
    { required: true, message: '请填写带宽最低出售数量', trigger: 'blur' },
    { validator: validatePositiveNumber, trigger: 'blur' }
  ]
}))

const sanitizeDecimalInput = (value: string) => {
  let sanitized = value.replace(/[^\d.]/g, '')

  if (sanitized.includes('.')) {
    const [integerPart, ...decimalParts] = sanitized.split('.')
    const decimalPart = decimalParts.join('').slice(0, 2)
    sanitized = decimalPart ? `${integerPart}.${decimalPart}` : `${integerPart}.`
  }

  if (sanitized.length > 1 && sanitized.startsWith('0') && sanitized[1] !== '.') {
    sanitized = sanitized.replace(/^0+/, '0')
  }

  return sanitized
}

const sanitizeIntegerInput = (value: string) => {
  let sanitized = value.replace(/[^\d]/g, '')

  if (sanitized.length > 1) {
    sanitized = sanitized.replace(/^0+/, '') || '0'
  }

  return sanitized
}

const handleNumberInput = (field: FormField, value: string) => {
  if (value === '') {
    formData[field] = ''
    return
  }

  formData[field] = decimalFields.includes(field)
    ? sanitizeDecimalInput(value)
    : sanitizeIntegerInput(value)
}

const fillFormData = (data: FundPriceConfig) => {
  formData.energy_price1 = String(data.energy_price1 ?? '')
  formData.bandwidth_price1 = String(data.bandwidth_price1 ?? '')
  formData.energy_price2 = String(data.energy_price2 ?? '')
  formData.bandwidth_price2 = String(data.bandwidth_price2 ?? '')
  formData.energy_minimum = String(data.energy_minimum ?? '')
  formData.bandwidth_minimum = String(data.bandwidth_minimum ?? '')
}

const buildSubmitData = (): UpdateFundPriceConfigParams => ({
  energy_price1: Number(formData.energy_price1),
  bandwidth_price1: Number(formData.bandwidth_price1),
  energy_price2: Number(formData.energy_price2),
  bandwidth_price2: Number(formData.bandwidth_price2),
  energy_minimum: Number(formData.energy_minimum),
  bandwidth_minimum: Number(formData.bandwidth_minimum)
})

const loadConfig = async () => {
  loading.value = true
  try {
    const response = await getFundPriceConfig()
    if (response.data) {
      fillFormData(response.data)
    }
  } catch (error: unknown) {
    ElMessage.error(getErrorMessage(error, '加载理财价格配置失败，请稍后重试'))
  } finally {
    loading.value = false
  }
}

const handleSave = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch {
    ElMessage.warning('请检查表单填写是否正确')
    return
  }

  saving.value = true
  try {
    await updateFundPriceConfig(buildSubmitData())
    ElMessage.success('保存成功')
    await loadConfig()
  } catch (error: unknown) {
    ElMessage.error(getErrorMessage(error, '保存失败，请稍后重试'))
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadConfig()
})

onActivated(() => {
  loadConfig()
})
</script>

<style scoped>
.price-form {
  padding: 8px 4px 0;
}

.section-title {
  margin: 8px 0 16px;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.section-title + .el-row + .section-title {
  margin-top: 16px;
}

.form-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
}

.form-tip {
  font-size: 13px;
  color: var(--el-color-warning);
}

:deep(.el-form-item__label) {
  font-weight: 400;
  color: var(--el-text-color-regular);
}
</style>
