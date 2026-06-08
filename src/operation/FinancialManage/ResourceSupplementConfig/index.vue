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
          <ElFormItem label="供给源:" prop="origin">
            <ElSelect v-model="taskForm.origin" placeholder="请选择供给源">
              <ElOption
                v-for="item in RESOURCE_SUPPLEMENT_SOURCE_OPTIONS"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>

          <ElFormItem label="供给对象/池子:" prop="target">
            <ElInput v-model="taskForm.target" placeholder="请输入地址" />
          </ElFormItem>

          <ElFormItem label="阈值（低于则补）:" prop="minimum">
            <ElInputNumber
              v-model="taskForm.minimum"
              :min="0"
              :max="10000000000"
              :controls="false"
              placeholder="例：85000"
              style="width: 100%"
            />
          </ElFormItem>

          <ElFormItem label="补充数量:" prop="amount">
            <ElInputNumber
              v-model="taskForm.amount"
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
import type { SearchTableExpose } from '@/components/SearchTable'
import { Dialog } from '@/components/Dialog'
import type { TableColumn } from '@/components/Table'
import type { FormSchema } from '@/components/Form'
import { handleErrorMessage, handleListMessage } from '@/utils/messageHelper'
import { formatTableDateTime, hasSearchValue } from '@/utils/tableHelpers'
import {
  getChargeList,
  createChargeTask,
  updateChargeTask,
  type ChargeItem,
  type ChargeListParams,
  type ChargeTaskParams
} from '@/api/opertion/FinancialManage/common/charge'
import { RESOURCE_SUPPLEMENT_SOURCE_OPTIONS, withAllOption } from '../constants'

type ChargeTableSlot = { row: ChargeItem }
type ChargeSearchParams = ChargeListParams & Recordable

const searchTableRef = ref<SearchTableExpose | null>(null)
const formRef = ref<FormInstance>()
const dialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const editingRowId = ref<number | null>(null)

const statusOptions = withAllOption([
  { label: '启动', value: 1 },
  { label: '关闭', value: 2 }
])

const taskSourceSearchOptions = withAllOption(RESOURCE_SUPPLEMENT_SOURCE_OPTIONS)

const createDefaultTaskForm = (): ChargeTaskParams => ({
  origin: '',
  target: '',
  minimum: 0,
  amount: 0,
  status: 1
})

const taskForm = reactive(createDefaultTaskForm())

const dialogTitle = computed(() => (dialogMode.value === 'add' ? '添加任务' : '更新任务'))

const formRules: FormRules = {
  origin: [{ required: true, message: '请选择供给源', trigger: 'change' }],
  target: [{ required: true, message: '请输入供给对象/池子', trigger: 'blur' }],
  minimum: [{ required: true, message: '请输入阈值', trigger: 'blur' }],
  amount: [{ required: true, message: '请输入补充数量', trigger: 'blur' }]
}

const columns = ref<TableColumn[]>([
  {
    field: 'origin',
    label: '供给源',
    minWidth: '180px',
    formatter: (row: ChargeItem) => row.origin || '-'
  },
  {
    field: 'target',
    label: '供给对象/池子',
    minWidth: '220px',
    formatter: (row: ChargeItem) => row.target || '-'
  },
  {
    field: 'minimum',
    label: '补充阈值',
    minWidth: '120px',
    formatter: (row: ChargeItem) => row.minimum ?? '-'
  },
  {
    field: 'amount',
    label: '补充数量',
    minWidth: '120px',
    formatter: (row: ChargeItem) => row.amount ?? '-'
  },
  {
    field: 'status',
    label: '状态',
    width: '100px',
    slots: {
      default: ({ row }: ChargeTableSlot) => {
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
    formatter: (row: ChargeItem) => formatTableDateTime(row.created_at)
  },
  {
    field: 'action',
    label: '操作',
    width: '120px',
    fixed: 'right',
    slots: {
      default: ({ row }: ChargeTableSlot) => {
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
      options: taskSourceSearchOptions
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

const buildChargeListParams = (params: ChargeSearchParams = {}): ChargeListParams => {
  const apiParams: ChargeListParams = {
    current_page: Number(params.current_page) || 1,
    page_size: Number(params.page_size) || 10
  }

  if (hasSearchValue(params.keyword)) apiParams.keyword = String(params.keyword).trim()
  if (hasSearchValue(params.kind)) apiParams.kind = String(params.kind)
  if (hasSearchValue(params.status)) apiParams.status = Number(params.status)
  if (hasSearchValue(params.order)) apiParams.order = String(params.order)

  return apiParams
}

const fetchResourceSupplementList = async (params: ChargeSearchParams = {}) => {
  try {
    const apiParams = buildChargeListParams(params)
    const response = await getChargeList(apiParams)

    if (response?.code === '000000' && response.data) {
      const list = response.data.list || []
      const total = response.data.pager?.total || 0

      handleListMessage(
        list,
        [params.keyword, params.kind, params.status].some(hasSearchValue),
        '资源补充配置'
      )

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

const handleEdit = (row: ChargeItem) => {
  dialogMode.value = 'edit'
  editingRowId.value = row.id
  Object.assign(taskForm, {
    origin: row.origin || '',
    target: row.target || '',
    minimum: row.minimum ?? 0,
    amount: row.amount ?? 0,
    status: row.status ?? 1
  })
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

const handleStatusChange = async (row: ChargeItem, value: number) => {
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
    row.status = value === 1 ? 2 : 1
    handleErrorMessage(error, '状态更新失败')
  }
}

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  try {
    const payload: ChargeTaskParams = {
      origin: taskForm.origin,
      target: taskForm.target,
      minimum: taskForm.minimum || 0,
      amount: taskForm.amount || 0,
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
