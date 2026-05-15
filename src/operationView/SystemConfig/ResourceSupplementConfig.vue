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

          <ElFormItem label="财务地址（付款）:" prop="financeAddress">
            <ElSelect v-model="taskForm.financeAddress" placeholder="请选择财务地址">
              <ElOption
                v-for="item in financeAddressOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>

          <ElFormItem label="资源类型:" prop="resourceType">
            <ElSelect v-model="taskForm.resourceType" placeholder="请选择资源类型">
              <ElOption
                v-for="item in taskResourceTypeOptions"
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
            <ElInput v-model="taskForm.threshold" placeholder="例：85000" />
          </ElFormItem>

          <ElFormItem label="补充数量:" prop="supplementAmount">
            <ElInput v-model="taskForm.supplementAmount" placeholder="例：65000" />
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

const searchTableRef = ref()
const formRef = ref<FormInstance>()
const dialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const editingRowId = ref<number | null>(null)

const sourceOptions = [
  { label: '全部', value: '' },
  { label: '能量池子', value: 3 },
  { label: '带宽池子', value: 4 },
  { label: '能量接收池子', value: 6 },
  { label: '带宽接收池子', value: 7 }
]

const resourceTypeOptions = [
  { label: '全部', value: '' },
  { label: '能量', value: 3 },
  { label: '带宽', value: 4 }
]

const statusOptions = [
  { label: '全部', value: '' },
  { label: '启动', value: 1 },
  { label: '关闭', value: 2 }
]

const taskSourceOptions = [
  { label: 'justlend.org /（能量）', value: 3 },
  { label: '带宽池子', value: 4 },
  { label: '能量接收池子', value: 6 },
  { label: '带宽接收池子', value: 7 }
]

const financeAddressOptions = [
  { label: '财务地址1', value: '财务地址1' },
  { label: '财务地址2', value: '财务地址2' },
  { label: '财务地址3', value: '财务地址3' }
]

const taskResourceTypeOptions = [
  { label: '能量', value: 3 },
  { label: '带宽', value: 4 }
]

const sourceMap: Record<number, string> = {
  3: '能量池子',
  4: '带宽池子',
  6: '能量接收池子',
  7: '带宽接收池子'
}

const resourceTypeMap: Record<number, string> = {
  3: '能量',
  4: '带宽'
}

const createDefaultTaskForm = () => ({
  source: 3,
  financeAddress: '财务地址2',
  resourceType: 3,
  targetPool: '',
  threshold: '',
  supplementAmount: '',
  status: 1
})

const taskForm = reactive(createDefaultTaskForm())

const dialogTitle = computed(() => (dialogMode.value === 'add' ? '添加任务' : '编辑任务'))

const formRules: FormRules = {
  source: [{ required: true, message: '请选择供给源', trigger: 'change' }],
  financeAddress: [{ required: true, message: '请选择财务地址', trigger: 'change' }],
  resourceType: [{ required: true, message: '请选择资源类型', trigger: 'change' }],
  targetPool: [{ required: true, message: '请输入供给对象/池子', trigger: 'blur' }],
  threshold: [{ required: true, message: '请输入阈值', trigger: 'blur' }],
  supplementAmount: [{ required: true, message: '请输入补充数量', trigger: 'blur' }]
}

const columns = ref<TableColumn[]>([
  {
    field: 'source',
    label: '供给源',
    width: '140px',
    formatter: (row) => sourceMap[row.source] || '-'
  },
  {
    field: 'resource_type',
    label: '资源类型',
    width: '120px',
    formatter: (row) => resourceTypeMap[row.resource_type] || '-'
  },
  {
    field: 'finance_address',
    label: '财务地址',
    minWidth: '220px',
    formatter: (row) => row.finance_address || '-'
  },
  {
    field: 'target_pool',
    label: '供给对象/池子',
    minWidth: '180px',
    formatter: (row) => row.target_pool || '-'
  },
  {
    field: 'threshold',
    label: '补充阈值',
    minWidth: '120px',
    formatter: (row) => row.threshold || '-'
  },
  {
    field: 'supplement_amount',
    label: '补充数量',
    minWidth: '120px',
    formatter: (row) => row.supplement_amount || '-'
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
    label: '关键字',
    componentProps: {
      placeholder: '请输入关键字搜索',
      clearable: true
    }
  },
  {
    field: 'source',
    component: 'Select',
    label: '供给源',
    componentProps: {
      placeholder: '请选择供给源',
      clearable: true,
      options: sourceOptions
    }
  },
  {
    field: 'resource_type',
    component: 'Select',
    label: '资源类型',
    componentProps: {
      placeholder: '请选择资源类型',
      clearable: true,
      options: resourceTypeOptions
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
    if (params?.source) apiParams.source = params.source
    if (params?.resource_type) apiParams.resource_type = params.resource_type
    if (params?.status) apiParams.status = params.status
    if (params?.order) apiParams.order = params.order

    const sourceValues = [3, 4, 6, 7]
    const resourceTypeValues = [3, 4]
    const financeAddresses = ['财务地址1', '财务地址2', '财务地址3']
    const thresholds = [10000, 25000, 50000, 85000, 1000000]
    const supplementAmounts = [5000, 12000, 30000, 65000, 500000]

    const mockList = Array.from({ length: 54 }, (_, index) => {
      const id = index + 1
      const source = sourceValues[index % sourceValues.length]
      const resourceType = resourceTypeValues[index % resourceTypeValues.length]
      const financeAddress = financeAddresses[index % financeAddresses.length]
      const threshold = thresholds[index % thresholds.length]
      const supplementAmount = supplementAmounts[index % supplementAmounts.length]
      const status = index % 3 === 0 ? 2 : 1

      return {
        id,
        source,
        resource_type: resourceType,
        finance_address: financeAddress,
        target_pool: `TQx7YUkP7qf4ExampleAddress${String(id).padStart(3, '0')}`,
        threshold,
        supplement_amount: supplementAmount,
        status,
        created_at: Math.floor(Date.now() / 1000) - index * 3600
      }
    })

    const mockData = {
      list: mockList,
      total: mockList.length
    }

    let list = mockData.list || []

    if (params?.keyword) {
      const keyword = String(params.keyword).toLowerCase()
      list = list.filter(
        (item) =>
          String(item.finance_address).toLowerCase().includes(keyword) ||
          String(item.target_pool).toLowerCase().includes(keyword)
      )
    }

    if (params?.source) {
      list = list.filter((item) => item.source === params.source)
    }

    if (params?.resource_type) {
      list = list.filter((item) => item.resource_type === params.resource_type)
    }

    if (params?.status) {
      list = list.filter((item) => item.status === params.status)
    }

    const total = list.length
    const currentPage = Number(params?.current_page || 1)
    const pageSize = Number(params?.page_size || 10)

    if (pageSize > 0) {
      const startIndex = (currentPage - 1) * pageSize
      const endIndex = startIndex + pageSize
      list = list.slice(startIndex, endIndex)
    }

    handleListMessage(
      list,
      !!(params?.keyword || params?.source || params?.resource_type || params?.status),
      '资源补充配置'
    )

    return {
      list,
      total
    }
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
    source: row.source,
    financeAddress: row.finance_address || '财务地址2',
    resourceType: row.resource_type,
    targetPool: row.target_pool || '',
    threshold: row.threshold != null ? String(row.threshold) : '',
    supplementAmount: row.supplement_amount != null ? String(row.supplement_amount) : '',
    status: row.status ?? 1
  })
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

const handleStatusChange = (row: any, value: number) => {
  row.status = value
  ElMessage.success(value === 1 ? '已启动' : '已关闭')
  // TODO: 接入更新状态接口
}

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  console.log(dialogMode.value === 'add' ? '添加任务提交' : '编辑任务提交', {
    id: editingRowId.value,
    ...taskForm
  })
  ElMessage.success(dialogMode.value === 'add' ? '添加任务成功' : '编辑任务成功')
  dialogVisible.value = false
  reloadTable()
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
