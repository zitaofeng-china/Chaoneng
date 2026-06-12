<template>
  <div class="app-container">
    <ContentWrap>
      <SearchTable
        ref="searchTableRef"
        :columns="columns"
        :search-schema="searchSchema"
        :fetch-data-api="fetchResourceSupplementList"
        :show-add-button="true"
        add-button-text="添加任务"
        @add="handleAdd"
        :table-props="{
          rowKey: 'id',
          highlightCurrentRow: false,
          reserveSelection: false
        }"
        :search-props="{
          layout: 'inline',
          buttonPosition: 'center'
        }"
      />

      <Dialog v-model="dialogVisible" :title="dialogTitle" width="700px">
        <ElForm
          ref="formRef"
          class="task-form"
          :model="taskForm"
          :rules="formRules"
          label-width="140px"
        >
          <ElFormItem label="供给源:" prop="source">
            <ElSelect v-model="taskForm.source" placeholder="请选择供给源">
              <ElOption
                v-for="item in taskSourceOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>

          <ElFormItem label="供给对象/池子:" prop="targetPool">
            <ElInput v-model="taskForm.targetPool" placeholder="请输入地址" />
          </ElFormItem>

          <ElFormItem label="阈值（低于则补）:" prop="threshold">
            <ElInputNumber
              v-model="taskForm.threshold"
              :min="0"
              :max="10000000000"
              :controls="false"
              placeholder="例：85000"
              style="width: 100%"
            />
          </ElFormItem>

          <ElFormItem label="补充数量:" prop="supplementAmount">
            <ElInputNumber
              v-model="taskForm.supplementAmount"
              :min="0"
              :max="10000000000"
              :controls="false"
              placeholder="例：65000"
              style="width: 100%"
            />
          </ElFormItem>

          <ElFormItem label="状态:" prop="status">
            <ElSwitch v-model="taskForm.status" :active-value="1" :inactive-value="2" />
          </ElFormItem>
        </ElForm>

        <template #footer>
          <div class="dialog-footer">
            <ElButton @click="dialogVisible = false">取消</ElButton>
            <ElButton type="primary" @click="handleSubmit">保存</ElButton>
          </div>
        </template>
      </Dialog>
    </ContentWrap>
  </div>
</template>

<script setup lang="tsx">
import { computed, reactive, ref } from 'vue'
import type { FormRules, FormInstance } from 'element-plus'
import {
  ElButton,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElOption,
  ElSelect,
  ElSwitch
} from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { SearchTable } from '@/components/SearchTable'
import { Dialog } from '@/components/Dialog'
import type { TableColumn } from '@/components/Table'
import type { FormSchema } from '@/components/Form'
import { formatToDateTime } from '@/utils/dateUtil'
import { handleErrorMessage, handleListMessage } from '@/utils/messageHelper'
import { getChargeList, createChargeTask, updateChargeTask } from '@/api/charge'

const searchTableRef = ref()
const formRef = ref<FormInstance>()
const dialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const editingRowId = ref<number | null>(null)

const statusOptions = [
  { label: '全部', value: '' },
  { label: '启动', value: 1 },
  { label: '关闭', value: 2 }
]

const taskSourceOptions = [
  { label: '能量收购池 能量', value: '能量收购池 能量' },
  { label: '带宽收购池 带宽', value: '带宽收购池 带宽' },
  { label: 'https://justlend.org 能量', value: 'https://justlend.org 能量' },
  { label: 'https://feee.io 带宽', value: 'https://feee.io 带宽' },
  { label: 'https://trxfee.io 带宽', value: 'https://trxfee.io 带宽' }
]

const createDefaultTaskForm = () => ({
  source: '',
  targetPool: '',
  threshold: 0,
  supplementAmount: 0,
  status: 1
})

const taskForm = reactive(createDefaultTaskForm())

const dialogTitle = computed(() => (dialogMode.value === 'add' ? '添加任务' : '更新任务'))

const formRules: FormRules = {
  source: [{ required: true, message: '请选择供给源', trigger: 'change' }],
  targetPool: [{ required: true, message: '请输入供给对象/池子', trigger: 'blur' }],
  threshold: [{ required: true, message: '请输入阈值', trigger: 'blur' }],
  supplementAmount: [{ required: true, message: '请输入补充数量', trigger: 'blur' }]
}

const columns = ref<TableColumn[]>([
  {
    field: 'origin',
    label: '供给源',
    minWidth: '180px',
    formatter: (row) => row.origin || '-'
  },
  {
    field: 'target',
    label: '供给对象/池子',
    minWidth: '220px',
    formatter: (row) => row.target || '-'
  },
  {
    field: 'minimum',
    label: '补充阈值',
    minWidth: '120px',
    formatter: (row) => row.minimum ?? '-'
  },
  {
    field: 'amount',
    label: '补充数量',
    minWidth: '120px',
    formatter: (row) => row.amount ?? '-'
  },
  {
    field: 'status',
    label: '状态',
    width: '100px',
    slots: {
      default: ({ row }) => {
        return (
          <ElSwitch
            modelValue={row.status}
            activeValue={1}
            inactiveValue={2}
            onChange={(value: number) => handleStatusChange(row, value)}
          />
        )
      }
    }
  },
  {
    field: 'created_at',
    label: '创建时间',
    width: '180px',
    sortable: 'custom',
    formatter: (row) => (row.created_at ? formatToDateTime(new Date(row.created_at * 1000)) : '-')
  },
  {
    field: 'action',
    label: '操作',
    width: '120px',
    fixed: 'right',
    slots: {
      default: ({ row }) => {
        return (
          <ElButton type="primary" onClick={() => handleEdit(row)}>
            编辑
          </ElButton>
        )
      }
    }
  }
])

const searchSchema = reactive<FormSchema[]>([
  {
    field: 'keyword',
    component: 'Input',
    label: '供给对象',
    componentProps: {
      placeholder: '请输入供给对象搜索',
      clearable: true
    }
  },
  {
    field: 'kind',
    component: 'Select',
    label: '供给源',
    componentProps: {
      placeholder: '请选择供给源',
      clearable: true,
      options: [
        { label: '全部', value: '' },
        { label: '能量收购池 能量', value: '能量收购池 能量' },
        { label: '带宽收购池 带宽', value: '带宽收购池 带宽' },
        { label: 'https://justlend.org 能量', value: 'https://justlend.org 能量' },
        { label: 'https://feee.io 带宽', value: 'https://feee.io 带宽' },
        { label: 'https://trxfee.io 带宽', value: 'https://trxfee.io 带宽' }
      ]
    }
  },
  {
    field: 'status',
    component: 'Select',
    label: '状态',
    componentProps: {
      placeholder: '请选择状态',
      clearable: true,
      options: statusOptions
    }
  }
])

const fetchResourceSupplementList = async (params: any = {}) => {
  try {
    const apiParams: any = {
      current_page: params?.current_page || 1,
      page_size: params?.page_size || 10
    }

    if (params?.keyword) apiParams.keyword = params.keyword
    if (params?.kind) apiParams.kind = params.kind
    if (params?.status) apiParams.status = params.status
    if (params?.order) apiParams.order = params.order

    const response = await getChargeList(apiParams)

    if (response?.code === '000000' && response.data) {
      const list = response.data.list || []
      const total = response.data.pager?.total || 0

      handleListMessage(list, !!(params?.keyword || params?.kind || params?.status), '资源补充配置')

      return { list, total }
    }

    return { list: [], total: 0 }
  } catch (error) {
    handleErrorMessage(error, '获取资源补充配置列表失败')
    return { list: [], total: 0 }
  }
}

const handleAdd = () => {
  dialogMode.value = 'add'
  editingRowId.value = null
  Object.assign(taskForm, createDefaultTaskForm())
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

const handleEdit = (row: any) => {
  dialogMode.value = 'edit'
  editingRowId.value = row.id
  Object.assign(taskForm, {
    source: row.origin || '',
    targetPool: row.target || '',
    threshold: row.minimum ?? 0,
    supplementAmount: row.amount ?? 0,
    status: row.status ?? 1
  })
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

const handleStatusChange = async (row: any, value: number) => {
  row.status = value
  try {
    await updateChargeTask({
      id: row.id,
      origin: row.origin,
      target: row.target || '',
      minimum: row.minimum || 0,
      amount: row.amount || 0,
      status: value
    })
    ElMessage.success(value === 1 ? '已启动' : '已关闭')
  } catch (error) {
    // 恢复原状态
    row.status = value === 1 ? 2 : 1
    handleErrorMessage(error, '状态更新失败')
  }
}

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  try {
    const payload = {
      origin: taskForm.source,
      target: taskForm.targetPool,
      minimum: taskForm.threshold || 0,
      amount: taskForm.supplementAmount || 0,
      status: taskForm.status
    }

    if (dialogMode.value === 'add') {
      await createChargeTask(payload)
      ElMessage.success('添加任务成功')
    } else {
      await updateChargeTask({ ...payload, id: editingRowId.value! })
      ElMessage.success('更新任务成功')
    }

    dialogVisible.value = false
    reloadTable()
  } catch (error) {
    handleErrorMessage(error, dialogMode.value === 'add' ? '添加任务失败' : '更新任务失败')
  }
}

const reloadTable = () => {
  searchTableRef.value?.reload()
}
</script>

<style scoped>
.app-container {
  width: 100%;
}

.dialog-footer {
  display: flex;
  justify-content: center;
  gap: 24px;
}

.task-form {
  padding: 8px 20px 0;
}

:deep(.task-form .el-select) {
  width: 100%;
}

:deep(.task-form .el-form) {
  padding: 8px 20px 0;
}
</style>
