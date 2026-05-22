<script setup lang="tsx">
import { ref, computed, watch, reactive, h } from 'vue'
import {
  ElButton,
  ElTable,
  ElTableColumn,
  ElTag,
  ElSwitch,
  ElMessage,
  ElMessageBox,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElSelect,
  ElOption
} from 'element-plus'
import { Dialog } from '@/components/Dialog'
import {
  v1GetInnerButtonList,
  v1CreateInnerButton,
  v1UpdateInnerButton,
  v1DeleteInnerButton
} from '@/api/menu_list'
import type {
  InnerButtonItem,
  CreateInnerButtonParams,
  UpdateInnerButtonParams
} from '@/api/menu_list/types'
import { formatToDateTime } from '@/utils/dateUtil'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 列表数据
const loading = ref(false)
const list = ref<InnerButtonItem[]>([])

// 表单弹窗
const formVisible = ref(false)
const formTitle = ref('添加内联按钮')
const submitting = ref(false)
const formRef = ref<InstanceType<typeof ElForm> | null>(null)

interface FormState {
  id?: number
  text: string
  inner_type: 'url' | 'call'
  inner_value: string
  callback_type: string
  order_num: number
  status: number
}

const form = reactive<FormState>({
  id: undefined,
  text: '',
  inner_type: 'url',
  inner_value: '',
  callback_type: '',
  order_num: 0,
  status: 1
})

const rules = {
  text: [{ required: true, message: '请输入按钮文本', trigger: 'blur' }],
  inner_type: [{ required: true, message: '请选择内联类型', trigger: 'change' }],
  inner_value: [{ required: true, message: '请输入内联值', trigger: 'blur' }],
  order_num: [{ required: true, message: '请输入排序', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
}

const resetForm = () => {
  form.id = undefined
  form.text = ''
  form.inner_type = 'url'
  form.inner_value = ''
  form.callback_type = ''
  form.order_num = 0
  form.status = 1
}

// 获取列表
const fetchList = async () => {
  try {
    loading.value = true
    const res = await v1GetInnerButtonList()
    if (res.code === '000000' && res.data) {
      const arr = Array.isArray(res.data) ? res.data : []
      // 按 order_num 倒序
      list.value = [...arr].sort(
        (a: InnerButtonItem, b: InnerButtonItem) => b.order_num - a.order_num
      )
    } else {
      list.value = []
    }
  } catch (e) {
    console.error('获取内联按钮列表失败:', e)
    ElMessage.error('获取内联按钮列表失败')
    list.value = []
  } finally {
    loading.value = false
  }
}

// 新增
const handleAdd = () => {
  resetForm()
  formTitle.value = '添加内联按钮'
  formVisible.value = true
}

// 编辑
const handleEdit = (row: InnerButtonItem) => {
  form.id = row.id
  form.text = row.text || ''
  form.inner_type = (row.inner_type as 'url' | 'call') || 'url'
  form.inner_value = row.inner_value || ''
  form.callback_type = row.callback_type || ''
  form.order_num = row.order_num ?? 0
  form.status = row.status ?? 1
  formTitle.value = '编辑内联按钮'
  formVisible.value = true
}

// 删除
const handleDelete = async (row: InnerButtonItem) => {
  try {
    await ElMessageBox.confirm(`确定删除内联按钮「${row.text}」吗？`, '提示', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
    const res = await v1DeleteInnerButton(row.id)
    if (res.code === '000000') {
      ElMessage.success('删除成功')
      fetchList()
    } else {
      ElMessage.error((res as any).msg || '删除失败')
    }
  } catch (e: any) {
    if (e !== 'cancel') {
      console.error('删除内联按钮失败:', e)
      ElMessage.error('删除失败')
    }
  }
}

// 状态切换
const handleStatusChange = async (row: InnerButtonItem) => {
  try {
    const params: UpdateInnerButtonParams = {
      id: row.id,
      text: row.text,
      inner_type: row.inner_type,
      inner_value: row.inner_value,
      callback_type: row.callback_type,
      order_num: row.order_num,
      status: row.status
    }
    const res = await v1UpdateInnerButton(params)
    if (res.code === '000000') {
      ElMessage.success('状态更新成功')
    } else {
      ElMessage.error((res as any).msg || '状态更新失败')
      row.status = row.status === 1 ? 2 : 1
    }
  } catch (e) {
    console.error('状态更新失败:', e)
    ElMessage.error('状态更新失败')
    row.status = row.status === 1 ? 2 : 1
  }
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch (e) {
    return
  }

  // call 类型时 callback_type 必填
  if (form.inner_type === 'call' && !form.callback_type) {
    ElMessage.warning('内联类型为 call 时，回调类型不能为空')
    return
  }

  try {
    submitting.value = true
    if (form.id) {
      const params: UpdateInnerButtonParams = {
        id: form.id,
        text: form.text,
        inner_type: form.inner_type,
        inner_value: form.inner_value,
        callback_type: form.callback_type || undefined,
        order_num: form.order_num,
        status: form.status
      } as UpdateInnerButtonParams
      const res = await v1UpdateInnerButton(params)
      if (res.code === '000000') {
        ElMessage.success('更新成功')
        formVisible.value = false
        fetchList()
      } else {
        ElMessage.error((res as any).msg || '更新失败')
      }
    } else {
      const params: CreateInnerButtonParams = {
        text: form.text,
        inner_type: form.inner_type,
        inner_value: form.inner_value,
        callback_type: form.callback_type || undefined,
        order_num: form.order_num,
        status: form.status
      } as CreateInnerButtonParams
      const res = await v1CreateInnerButton(params)
      if (res.code === '000000') {
        ElMessage.success('添加成功')
        formVisible.value = false
        fetchList()
      } else {
        ElMessage.error((res as any).msg || '添加失败')
      }
    }
  } catch (e) {
    console.error('保存失败:', e)
    ElMessage.error('保存失败')
  } finally {
    submitting.value = false
  }
}

watch(
  () => visible.value,
  (val) => {
    if (val) fetchList()
  }
)
</script>

<template>
  <Dialog v-model="visible" title="内联按钮管理" width="900px">
    <div class="inline-button-container" v-loading="loading">
      <div class="toolbar">
        <ElButton type="primary" @click="handleAdd">添加内联按钮</ElButton>
      </div>

      <ElTable :data="list" border stripe style="width: 100%">
        <ElTableColumn prop="text" label="按钮文本" min-width="140" show-overflow-tooltip />
        <ElTableColumn label="内联类型" width="100" align="center">
          <template #default="{ row }">
            <ElTag :type="row.inner_type === 'url' ? 'success' : 'warning'" size="small">
              {{ row.inner_type === 'url' ? 'URL' : 'CALL' }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="inner_value" label="内联值" min-width="180" show-overflow-tooltip />
        <ElTableColumn prop="callback_type" label="回调类型" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.callback_type || '-' }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="order_num" label="排序" width="80" align="center" />
        <ElTableColumn label="状态" width="90" align="center">
          <template #default="{ row }">
            <ElSwitch
              v-model="row.status"
              :active-value="1"
              :inactive-value="2"
              @change="() => handleStatusChange(row)"
            />
          </template>
        </ElTableColumn>
        <ElTableColumn label="创建时间" min-width="160">
          <template #default="{ row }">
            <span>{{ row.created_at ? formatToDateTime(row.created_at) : '-' }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="160" fixed="right" align="center">
          <template #default="{ row }">
            <ElButton type="primary" size="small" @click="handleEdit(row)">编辑</ElButton>
            <ElButton type="danger" size="small" @click="handleDelete(row)">删除</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </div>

    <!-- 表单弹窗 -->
    <Dialog v-model="formVisible" :title="formTitle" width="560px" append-to-body>
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="100px">
        <ElFormItem label="按钮文本" prop="text">
          <ElInput
            v-model="form.text"
            placeholder="请输入按钮文本"
            maxlength="64"
            show-word-limit
          />
        </ElFormItem>
        <ElFormItem label="内联类型" prop="inner_type">
          <ElSelect v-model="form.inner_type" placeholder="请选择内联类型" style="width: 100%">
            <ElOption label="URL（跳转链接）" value="url" />
            <ElOption label="CALL（回调）" value="call" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="内联值" prop="inner_value">
          <ElInput
            v-model="form.inner_value"
            :placeholder="form.inner_type === 'url' ? '请输入跳转链接' : '请输入回调标识'"
          />
        </ElFormItem>
        <ElFormItem label="回调类型" prop="callback_type" v-if="form.inner_type === 'call'">
          <ElInput v-model="form.callback_type" placeholder="请输入回调类型" />
        </ElFormItem>
        <ElFormItem label="排序" prop="order_num">
          <ElInputNumber
            v-model="form.order_num"
            :min="0"
            :max="9999"
            placeholder="数字越小越靠前"
            style="width: 100%"
          />
        </ElFormItem>
        <ElFormItem label="状态" prop="status">
          <ElSelect v-model="form.status" placeholder="请选择状态" style="width: 100%">
            <ElOption label="启用" :value="1" />
            <ElOption label="禁用" :value="2" />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <div class="flex justify-end">
          <ElButton @click="formVisible = false">取消</ElButton>
          <ElButton type="primary" :loading="submitting" @click="handleSubmit">提交</ElButton>
        </div>
      </template>
    </Dialog>
  </Dialog>
</template>

<style scoped>
.inline-button-container {
  min-height: 320px;
}

.toolbar {
  display: flex;
  margin-bottom: 12px;
  justify-content: flex-end;
}
</style>
