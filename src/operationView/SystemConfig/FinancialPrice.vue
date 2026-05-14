<template>
  <div class="app-container">
    <ContentWrap title="能量/带宽价格配置">
      <ElForm
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-position="top"
        class="price-form"
        :disabled="!hasEditPermission || loading"
      >
        <template v-for="section in sections" :key="section.key">
          <div class="section-title">{{ section.title }}</div>
          <ElRow :gutter="24">
            <ElCol
              v-for="field in section.fields"
              :key="field.key"
              :xs="24"
              :sm="12"
              :md="8"
              :lg="8"
              :xl="8"
            >
              <ElFormItem :label="field.label" :prop="`${section.key}_${field.key}`">
                <ElInput
                  v-model="formData[`${section.key}_${field.key}` as FieldKey]"
                  :placeholder="field.placeholder"
                  clearable
                  @input="
                    (v: string) => handleNumberInput(section.key, field.key, v, field.integer)
                  "
                />
              </ElFormItem>
            </ElCol>
          </ElRow>
        </template>

        <div class="form-actions">
          <ElButton v-if="hasEditPermission" type="primary" :loading="saving" @click="handleSave">
            保存配置
          </ElButton>
          <span class="form-tip">提示：配置保存后每次凌晨按照最新的价格来结算</span>
        </div>
      </ElForm>
    </ContentWrap>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import {
  ElForm,
  ElFormItem,
  ElInput,
  ElRow,
  ElCol,
  ElButton,
  ElMessage,
  type FormInstance,
  type FormRules
} from 'element-plus'
import { useRoute } from 'vue-router'

interface PriceField {
  key: string
  label: string
  placeholder: string
  integer?: boolean
  span?: number
}

interface PriceSection {
  key: 'workday' | 'holiday'
  title: string
  fields: PriceField[]
}

const sharedFields: PriceField[] = [
  { key: 'energy_price', label: '能量出售单价（SUN/天）：', placeholder: '请输入金额' },
  { key: 'bandwidth_price', label: '带宽出售单价（SUN/天）：', placeholder: '请输入金额' },
  {
    key: 'min_duration',
    label: '最低出售时长（小时）：',
    placeholder: '请输入时长',
    integer: true
  },
  {
    key: 'bandwidth_min_sell',
    label: '带宽最低售卖数：',
    placeholder: '请输入时长',
    integer: true
  },
  {
    key: 'energy_min_sell',
    label: '能量最低售卖数：',
    placeholder: '请输入时长',
    integer: true
  }
]

const sections: PriceSection[] = [
  { key: 'workday', title: '【工作日】价格：', fields: sharedFields },
  { key: 'holiday', title: '【节假日】价格：', fields: sharedFields }
]

type FieldKey = `${PriceSection['key']}_${string}`

const buildInitialData = () => {
  const data: Record<string, string> = {}
  sections.forEach((s) => {
    s.fields.forEach((f) => {
      data[`${s.key}_${f.key}`] = ''
    })
  })
  return data as Record<FieldKey, string>
}

const route = useRoute()
const formRef = ref<FormInstance>()
const saving = ref(false)
const loading = ref(false)

const hasEditPermission = computed(() => {
  const buttonList = (route.meta.buttonList || []) as string[]
  return buttonList.includes('edit')
})

const formData = reactive<Record<FieldKey, string>>(buildInitialData())

const rules = computed<FormRules>(() => {
  const r: FormRules = {}
  sections.forEach((s) => {
    s.fields.forEach((f) => {
      const prop = `${s.key}_${f.key}`
      r[prop] = [
        {
          required: true,
          message: `请填写${f.label.replace(/[（(][^）)]*[）)]?：?/g, '').replace(/：$/, '')}`,
          trigger: 'blur'
        }
      ]
    })
  })
  return r
})

const handleNumberInput = (
  sectionKey: PriceSection['key'],
  fieldKey: string,
  value: string,
  integer?: boolean
) => {
  if (value === '') return
  const pattern = integer ? /[^\d]/g : /[^\d.]/g
  let clean = value.replace(pattern, '')
  if (!integer) {
    const parts = clean.split('.')
    if (parts.length > 2) {
      clean = `${parts[0]}.${parts.slice(1).join('')}`
    }
  }
  const prop = `${sectionKey}_${fieldKey}` as FieldKey
  if (clean !== value) {
    formData[prop] = clean
  }
}

const loadConfig = async () => {
  loading.value = true
  try {
    // TODO: 对接后端接口获取配置详情，返回后按字段赋值到 formData
  } catch (err) {
    console.error('加载配置失败:', err)
    ElMessage.error('加载配置失败')
  } finally {
    loading.value = false
  }
}

const handleSave = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    // TODO: 对接后端接口保存配置，传 { ...formData }
    ElMessage.success('保存成功')
  } catch (err) {
    console.error('保存配置失败:', err)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
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
