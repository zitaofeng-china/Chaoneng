<template>
  <Dialog
    v-if="props.modelValue"
    :model-value="props.modelValue"
    @update:modelValue="handleModelUpdate"
    :title="dialogTitle"
    @close="handleClose"
    :close-on-click-modal="false"
  >
    <ElForm ref="elFormRef" :model="formData" :rules="formRules" label-width="100px">
      <!-- 新增模式：机器人选择 -->
      <ElFormItem v-if="!props.isEdit" label="机器人" prop="bot_id">
        <ElSelect
          v-model="formData.bot_id"
          placeholder="请选择机器人"
          filterable
          style="width: 100%"
        >
          <ElOption
            v-for="opt in props.botOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </ElSelect>
      </ElFormItem>

      <!-- 新增模式：关键词 -->
      <ElFormItem v-if="!props.isEdit" label="关键词" prop="keyword">
        <ElInput v-model="formData.keyword" placeholder="请输入关键词" />
      </ElFormItem>

      <!-- 回复内容编辑器 -->
      <ElFormItem label="回复内容" prop="content">
        <ElInput
          ref="contentTextareaRef"
          v-model="formData.content"
          type="textarea"
          :rows="5"
          placeholder="请输入回复内容"
        />
      </ElFormItem>

      <!-- 格式化按钮 - 与 MessageDialog 一致 -->
      <div class="formatting-buttons">
        <component :is="renderFormattingButtons()" />
      </div>

      <!-- 状态 -->
      <ElFormItem label="状态" prop="status">
        <ElRadioGroup v-model="formData.status">
          <ElRadioButton :label="1">启用</ElRadioButton>
          <ElRadioButton :label="2">禁用</ElRadioButton>
        </ElRadioGroup>
      </ElFormItem>
    </ElForm>

    <template #footer>
      <div class="flex justify-end">
        <ElButton @click="handleClose">取消</ElButton>
        <ElButton type="primary" :loading="submitLoading" @click="handleSubmit">确定</ElButton>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed, type PropType } from 'vue'
import {
  ElButton,
  ElMessage,
  ElForm,
  ElFormItem,
  ElInput,
  ElSelect,
  ElOption,
  ElRadioGroup,
  ElRadioButton,
  type FormInstance
} from 'element-plus'
import { Dialog } from '@/components/Dialog'
import { useValidator } from '@/hooks/web/useValidator'
import type {
  ReplyItem,
  ReplySaveParams,
  BotOption
} from '@/api/management/BotManage/ReplyList/types'
import { useHtmlInsert } from '@/hooks/web/useHtmlInsert'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  isEdit: { type: Boolean, default: false },
  rowData: { type: Object as PropType<ReplyItem | null>, default: null },
  botOptions: { type: Array as PropType<BotOption[]>, default: () => [] }
})

const emit = defineEmits(['update:modelValue', 'submitted'])

const { required } = useValidator()

// 表单 ref
const elFormRef = ref<FormInstance>()
// textarea ref（用于 useHtmlInsert 支持选中文字包裹）
const contentTextareaRef = ref()

const submitLoading = ref(false)

const dialogTitle = computed(() => (props.isEdit ? '编辑关键词回复' : '新增关键词回复'))

// 表单数据
const formData = ref({
  bot_id: undefined as number | undefined,
  keyword: '',
  content: '',
  status: 1 as number
})

// 格式化按钮（传入 textareaRef，支持选中文字包裹）
const getContent = async () => formData.value.content || ''
const setContent = async (newContent: string) => {
  formData.value.content = newContent
}
const { renderFormattingButtons } = useHtmlInsert(getContent, setContent, contentTextareaRef)

// 验证规则
const formRules = computed(() => {
  const rules: Record<string, any[]> = {
    content: [required('回复内容不能为空')],
    status: [required('请选择状态')]
  }
  if (!props.isEdit) {
    rules.bot_id = [required('请选择机器人')]
    rules.keyword = [required('关键词不能为空')]
  }
  return rules
})

// 监听弹窗打开，回填数据
watch(
  () => props.modelValue,
  async (val) => {
    if (val) {
      await elFormRef.value?.resetFields()
      if (props.isEdit && props.rowData) {
        formData.value = {
          bot_id: undefined,
          keyword: '',
          content: props.rowData.content || '',
          status: props.rowData.status ?? 1
        }
      } else {
        formData.value = {
          bot_id: props.botOptions.length > 0 ? (props.botOptions[0].value as number) : undefined,
          keyword: '',
          content: '',
          status: 1
        }
      }
    }
  }
)

const handleModelUpdate = (value: boolean) => {
  emit('update:modelValue', value)
}

const handleClose = () => {
  emit('update:modelValue', false)
}

const handleSubmit = async () => {
  const valid = await elFormRef.value?.validate().catch(() => false)
  if (!valid) {
    ElMessage.error('表单验证失败，请检查填写内容')
    return
  }

  submitLoading.value = true
  try {
    let params: ReplySaveParams

    if (props.isEdit && props.rowData?.id) {
      if (
        typeof props.rowData.tg_bot_id !== 'number' ||
        typeof props.rowData.key_name !== 'string'
      ) {
        ElMessage.error('无法编辑：原始机器人ID或关键词信息丢失')
        return
      }
      const originalKeyName = props.rowData.key_name.trim()
      params = {
        id: props.rowData.id,
        tg_bot_id: props.rowData.tg_bot_id,
        key_name: originalKeyName ? [originalKeyName] : [],
        content: formData.value.content,
        status: formData.value.status
      }
    } else {
      const processedKeywords = formData.value.keyword
        ? formData.value.keyword
            .split(',')
            .map((k) => k.trim())
            .filter((k) => k)
        : []
      const botIdAsNumber = Number(formData.value.bot_id)
      if (isNaN(botIdAsNumber)) {
        ElMessage.error('机器人ID无效，请重新选择')
        return
      }
      params = {
        tg_bot_id: botIdAsNumber,
        key_name: processedKeywords,
        content: formData.value.content,
        status: formData.value.status
      }
    }

    emit('submitted', params)
  } catch (error) {
    console.error('表单数据处理失败:', error)
    ElMessage.error('表单数据处理失败')
  } finally {
    submitLoading.value = false
  }
}

defineExpose({ submitLoading })
</script>

<style scoped>
.formatting-buttons {
  display: flex;
  padding-left: 100px; /* 与 label-width 对齐 */
  margin-top: -12px;
  margin-bottom: 18px;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
