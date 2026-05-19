<template>
  <Dialog v-model="visible" :title="title" max-height="600px" width="640px">
    <ElForm ref="formRef" :model="formData" :rules="rules" label-position="top" class="menu-form">
      <ElFormItem label="菜单名称" prop="menu_name">
        <ElInput
          v-model="formData.menu_name"
          placeholder="请输入菜单名称"
          maxlength="50"
          clearable
        />
      </ElFormItem>

      <ElFormItem label="菜单类型" prop="menu_type">
        <ElSelect v-model="formData.menu_type" placeholder="请选择菜单类型" class="w-full">
          <ElOption label="菜单" :value="1" />
          <ElOption label="按钮" :value="2" />
        </ElSelect>
      </ElFormItem>

      <ElFormItem label="状态" prop="status">
        <ElRadioGroup v-model="formData.status">
          <ElRadio :value="1">启用</ElRadio>
          <ElRadio :value="2">禁用</ElRadio>
        </ElRadioGroup>
      </ElFormItem>

      <div class="section-divider">
        <span class="section-title">权限控制配置</span>
      </div>

      <ElFormItem label="可见范围" prop="visibility">
        <ElInput :model-value="visibilityText" disabled />
      </ElFormItem>

      <ElFormItem label="指定代理" prop="agent_ids">
        <ElSelect
          v-model="formData.agent_ids"
          multiple
          filterable
          remote
          allow-create
          default-first-option
          :reserve-keyword="false"
          :remote-method="handleRemoteSearchAgent"
          :loading="agentSearchLoading"
          placeholder="请输入代理用户名/代理ID搜索添加"
          class="w-full"
        >
          <ElOption
            v-for="item in agentOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </ElSelect>
      </ElFormItem>
    </ElForm>

    <template #footer>
      <div class="flex justify-end">
        <ElButton @click="handleCancel">取消</ElButton>
        <ElButton type="primary" :loading="submitting" @click="handleConfirm"> 确定 </ElButton>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick } from 'vue'
import {
  ElForm,
  ElFormItem,
  ElInput,
  ElSelect,
  ElOption,
  ElRadio,
  ElRadioGroup,
  ElButton
} from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Dialog } from '@/components/Dialog'

interface AgentOption {
  label: string
  value: number | string
}

interface MenuFormData {
  id?: number
  menu_name: string
  menu_type: number
  status: number
  visibility: number
  agent_ids: (number | string)[]
}

interface Props {
  modelValue: boolean
  title?: string
  initialData?: Partial<MenuFormData> | null
}

const props = withDefaults(defineProps<Props>(), {
  title: '新增菜单',
  initialData: null
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'submit', data: MenuFormData): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const formRef = ref<FormInstance>()
const submitting = ref(false)
const agentSearchLoading = ref(false)
const agentOptions = ref<AgentOption[]>([])

const defaultFormData = (): MenuFormData => ({
  menu_name: '',
  menu_type: 1,
  status: 1,
  visibility: 1,
  agent_ids: []
})

const formData = reactive<MenuFormData>(defaultFormData())

const visibilityText = computed(() => {
  const map: Record<number, string> = {
    1: '指定用户可见'
  }
  return map[formData.visibility] || '指定用户可见'
})

const rules: FormRules = {
  menu_name: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
  menu_type: [{ required: true, message: '请选择菜单类型', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
  agent_ids: [
    {
      required: true,
      validator: (_, value, callback) => {
        if (!value || value.length === 0) {
          callback(new Error('请至少选择一个代理'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ]
}

// 远程搜索代理（接口未就绪，这里先做本地占位）
const handleRemoteSearchAgent = async (query: string) => {
  if (!query) {
    agentOptions.value = []
    return
  }
  agentSearchLoading.value = true
  try {
    // TODO: 接口就绪后替换为真实代理搜索接口
    // const res = await searchAgentApi({ query })
    // agentOptions.value = res.data.list.map(item => ({
    //   label: item.name || item.username,
    //   value: item.id
    // }))
    await new Promise((resolve) => setTimeout(resolve, 200))
    agentOptions.value = [
      { label: `代理A (匹配: ${query})`, value: `agent_a_${query}` },
      { label: `代理B (匹配: ${query})`, value: `agent_b_${query}` }
    ]
  } finally {
    agentSearchLoading.value = false
  }
}

const resetForm = () => {
  Object.assign(formData, defaultFormData())
  agentOptions.value = []
  nextTick(() => {
    formRef.value?.clearValidate()
  })
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      const init = props.initialData || {}
      Object.assign(formData, defaultFormData(), init)
      // 编辑时保证已选代理在选项中可显示
      if (Array.isArray(init.agent_ids) && init.agent_ids.length) {
        agentOptions.value = init.agent_ids.map((id) => ({
          label: String(id),
          value: id
        }))
      }
      nextTick(() => {
        formRef.value?.clearValidate()
      })
    } else {
      resetForm()
    }
  }
)

const handleCancel = () => {
  visible.value = false
}

const handleConfirm = async () => {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
    submitting.value = true
    emit('submit', { ...formData })
  } catch {
    // 表单校验失败
  } finally {
    submitting.value = false
  }
}

defineExpose({
  closeLoading: () => {
    submitting.value = false
  },
  close: () => {
    visible.value = false
  }
})
</script>

<style lang="less" scoped>
.menu-form {
  padding: 0 4px;

  :deep(.el-form-item) {
    margin-bottom: 18px;
  }

  :deep(.el-form-item__label) {
    padding-bottom: 6px;
    font-weight: 500;
  }
}

.w-full {
  width: 100%;
}

.section-divider {
  position: relative;
  padding-top: 16px;
  margin: 8px 0 18px;
  border-top: 1px solid var(--el-border-color-lighter);

  .section-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-regular);
  }
}
</style>
