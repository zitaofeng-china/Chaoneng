<template>
  <div class="app-container">
    <ContentWrap>
      <!-- 使用 SearchTable 组件 -->
      <SearchTable
        :columns="columns"
        :search-schema="searchSchema"
        :fetch-data-api="getResourcePoolData"
        @add="handleAdd"
        :table-props="{ rowKey: 'id' }"
        ref="searchTableRef"
      >
        <!-- 工具栏插槽 -->
        <template #toolbar>
          <ElButton v-hasPermi="'ResourcePool.add'" type="primary" @click="handleAdd">
            <Icon icon="ep:plus" class="mr-5px" />
            新增
          </ElButton>
          <ElButton type="success" @click="handleNotifyConfig"> 通知配置 </ElButton>
        </template>
      </SearchTable>

      <!-- 表单弹窗 -->
      <ResourcePoolAccountForm ref="formRef" @success="handleSuccess" />
      <NotifyBotDialog v-model:visible="notifyBotDialogVisible" mode="resourcePool" />
    </ContentWrap>
  </div>
</template>

<script setup lang="tsx">
import { ref, reactive, onActivated } from 'vue'
import { ElButton, ElMessageBox, ElMessage, ElSelect, ElOption } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { Icon } from '@/components/Icon'
import type { FormSchema } from '@/components/Form'
import ResourcePoolAccountForm from './components/ResourcePoolAccountForm.vue'
import NotifyBotDialog from '@/operation/Agent/components/NotifyBotDialog.vue'
import { SearchTable } from '@/components/SearchTable'
import type { TableColumn } from '@/components/Table'
import {
  v2GetPoolList,
  v2UpdatePool,
  type V2PoolItem,
  type V2PoolListParams
} from '@/api/opertion/SystemConfig/ResourcePool'
import {
  getResourcePoolStatusClassName,
  getResourcePoolStatusLabel,
  isThresholdPoolKind,
  RESOURCE_POOL_STATUS_MAP,
  RESOURCE_POOL_STATUS_SEARCH_OPTIONS,
  RESOURCE_POOL_TYPE_MAP,
  RESOURCE_POOL_TYPE_SEARCH_OPTIONS
} from './constants'
import { isPermission } from '@/utils/is'
import { handleListMessage, handleErrorMessage, handleSuccessMessage } from '@/utils/messageHelper'
import {
  buildBackendOrder,
  createPageParams,
  formatTableDateTime,
  hasSearchValue,
  type TableSlot
} from '@/utils/tableHelpers'

const formRef = ref<InstanceType<typeof ResourcePoolAccountForm>>()
const searchTableRef = ref<InstanceType<typeof SearchTable>>()
const notifyBotDialogVisible = ref(false)
const hasActivatedOnce = ref(false)
const DEFAULT_CREATED_AT_ORDER = 'created_at DESC'

type ResourcePoolSearchParams = Omit<V2PoolListParams, 'kind' | 'status'> & {
  kind?: number | string
  status?: number | string
}
type ResourcePoolTableSlot = TableSlot<V2PoolItem>
type EditableThresholdField = 'amount_threshold' | 'bucket_threshold'

const THRESHOLD_EDIT_CONFIG: Record<
  EditableThresholdField,
  {
    title: string
    prompt: string
    unchangedMessage: string
    successMessage: string
    errorMessage: string
  }
> = {
  amount_threshold: {
    title: '编辑可用数量阈值',
    prompt: '请输入新的可用数量阈值 (输入0或留空表示不设阈值)',
    unchangedMessage: '可用数量阈值未改变',
    successMessage: '可用数量阈值更新成功',
    errorMessage: '更新可用数量阈值失败'
  },
  bucket_threshold: {
    title: '编辑桶阈值',
    prompt: '请输入新的桶阈值 (输入0或留空表示不设阈值)',
    unchangedMessage: '桶阈值未改变',
    successMessage: '桶阈值更新成功',
    errorMessage: '更新桶阈值失败'
  }
}

const formatPoolAmount = (value: V2PoolItem['amount']) => {
  if (value === undefined || value === null || value === '') return '-'

  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? Math.floor(numericValue) : value
}

const formatThresholdValue = (value?: string | number | null) => {
  return value === undefined || value === null || value === '' ? 0 : value
}

const getThresholdUpdatePayload = (
  row: V2PoolItem,
  overrides: Partial<Record<EditableThresholdField, number>>
) => {
  const currentAmountThreshold = Number.parseInt(String(row.amount_threshold ?? 0), 10) || 0
  const currentBucketThreshold = Number.parseInt(String(row.bucket_threshold ?? 0), 10) || 0

  return {
    amount_threshold: overrides.amount_threshold ?? currentAmountThreshold,
    bucket_threshold: overrides.bucket_threshold ?? currentBucketThreshold
  }
}

const columns = ref<TableColumn[]>([
  {
    field: 'kind',
    label: '配置类型',
    width: '120px',
    formatter: (row: V2PoolItem) => {
      return RESOURCE_POOL_TYPE_MAP[row.kind] || '未知类型'
    }
  },
  {
    field: 'address',
    label: '公钥',
    minWidth: '180px',
    formatter: (row: V2PoolItem) => row.address || '-'
  },
  {
    field: 'permission_name',
    label: '权限名称',
    minWidth: '180px',
    formatter: (row: V2PoolItem) => row.permission_name || '-'
  },
  {
    field: '',
    label: '可用数量/阈值',
    minWidth: '180px',
    formatter: (row: V2PoolItem) => {
      const amount = formatPoolAmount(row.amount)
      const threshold = formatThresholdValue(row.amount_threshold)
      const displayValue = `${amount} / ${threshold}`

      return (
        <span
          onDblclick={() => handleEditThresholdValue(row, 'amount_threshold')}
          style={{ cursor: 'pointer' }}
        >
          {displayValue}
        </span>
      )
    }
  },
  {
    field: '',
    label: '桶数量/阈值',
    minWidth: '180px',
    formatter: (row: V2PoolItem) => {
      const bucket = formatPoolAmount(row.bucket)
      const threshold = formatThresholdValue(row.bucket_threshold)

      const displayValue = `${bucket} / ${threshold}`

      return (
        <span
          onDblclick={() => handleEditThresholdValue(row, 'bucket_threshold')}
          style={{ cursor: 'pointer' }}
        >
          {displayValue}
        </span>
      )
    }
  },
  {
    field: 'created_by',
    label: '创建人',
    width: '120px',
    formatter: (row: V2PoolItem) => row.created_by || '-'
  },
  {
    field: 'status',
    label: '状态',
    width: '100px',
    slots: {
      default: ({ row }: ResourcePoolTableSlot) => {
        const disableOthers = row.status === 1
        return (
          <ElSelect
            modelValue={row.status}
            onChange={(newValue: number) => handleStatusChangeAttempt(row, newValue)}
            placeholder="请选择"
            disabled={!isPermission('ResourcePool.edit')}
            class="status-select"
          >
            {{
              prefix: () => {
                return (
                  <span class={getResourcePoolStatusClassName(row.status)}>
                    {getResourcePoolStatusLabel(row.status)}
                  </span>
                )
              },
              default: () => {
                return Object.entries(RESOURCE_POOL_STATUS_MAP).map(([value, label]) => (
                  <ElOption
                    key={value}
                    label={label}
                    value={parseInt(value, 10)}
                    disabled={disableOthers && parseInt(value, 10) !== 1}
                  >
                    <span class={getResourcePoolStatusClassName(parseInt(value, 10))}>{label}</span>
                  </ElOption>
                ))
              }
            }}
          </ElSelect>
        )
      }
    }
  },
  {
    field: 'created_at',
    label: '创建时间',
    width: '180px',
    sortable: 'custom',
    formatter: (row: V2PoolItem) => formatTableDateTime(row.created_at)
  },
  {
    field: 'updated_at',
    label: '更新时间',
    width: '180px',
    sortable: 'custom',
    formatter: (row: V2PoolItem) => formatTableDateTime(row.updated_at)
  }
])

const searchSchema = reactive<FormSchema[]>([
  {
    field: 'keyword',
    component: 'Input',
    label: '关键字：',
    componentProps: {
      placeholder: '请输入公钥/权限名称',
      clearable: true
    }
  },
  {
    field: 'kind',
    component: 'Select',
    label: '配置类型：',
    componentProps: {
      placeholder: '请选择配置类型',
      clearable: true,
      options: RESOURCE_POOL_TYPE_SEARCH_OPTIONS
    }
  },
  {
    field: 'status',
    component: 'Select',
    label: '状态：',
    componentProps: {
      placeholder: '请选择状态',
      clearable: true,
      options: RESOURCE_POOL_STATUS_SEARCH_OPTIONS
    }
  }
])

const getResourcePoolData = async (params: ResourcePoolSearchParams = {}) => {
  try {
    const apiParams: V2PoolListParams = {
      ...createPageParams(params)
    }

    if (params.keyword) {
      apiParams.keyword = params.keyword
    }

    if (hasSearchValue(params.kind)) {
      apiParams.kind = Number(params.kind)
    }

    if (hasSearchValue(params.status)) {
      apiParams.status = Number(params.status)
    }

    apiParams.order = buildBackendOrder(params.order) || DEFAULT_CREATED_AT_ORDER

    const response = await v2GetPoolList(apiParams)

    if (response?.data) {
      const data = response.data
      const list = data.list || []
      const total = data.pager?.total || 0
      const hasSearchCondition =
        hasSearchValue(params.keyword) ||
        hasSearchValue(params.kind) ||
        hasSearchValue(params.status)
      handleListMessage(list, hasSearchCondition, '资源池账户')

      return {
        list,
        total
      }
    }

    return { list: [], total: 0 }
  } catch (error) {
    handleErrorMessage(error, '获取列表失败')
    return { list: [], total: 0 }
  }
}

const handleAdd = () => {
  formRef.value?.open({
    mode: 'add',
    data: {}
  })
}

const handleNotifyConfig = () => {
  notifyBotDialogVisible.value = true
}

const reloadTable = async () => {
  await searchTableRef.value?.reload()
}

const handleStatusChangeAttempt = async (row: V2PoolItem, newValue: number) => {
  const originalStatus = row.status
  const intendedStatus = newValue

  if (originalStatus === intendedStatus) {
    return
  }

  const actionText = getResourcePoolStatusLabel(intendedStatus)
  let msg = `确认要将状态更改为 "${actionText}" 吗？`
  if (isThresholdPoolKind(row.kind)) {
    msg = `确认要将状态更改为 "${actionText}" ${intendedStatus === 1 ? '(设为主账户)' : intendedStatus === 3 ? '(设为备用账户)' : ''} 吗？`
  }

  try {
    await ElMessageBox.confirm(msg, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await v2UpdatePool({
      id: row.id,
      status: intendedStatus,
      ...getThresholdUpdatePayload(row, {})
    })

    await reloadTable()
    handleSuccessMessage(`状态已更新为 "${actionText}"`)
  } catch (error) {
    if (error === 'cancel') {
      ElMessage.info('操作已取消')
    } else {
      handleErrorMessage(error, '操作失败')
    }
  }
}

const handleSuccess = async () => {
  await reloadTable()
}

const handleEditThresholdValue = async (row: V2PoolItem, field: EditableThresholdField) => {
  const config = THRESHOLD_EDIT_CONFIG[field]

  try {
    const currentThreshold = Number(row[field]) || 0
    const { value } = await ElMessageBox.prompt(config.prompt, config.title, {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: currentThreshold === 0 ? '' : String(currentThreshold),
      inputPattern: /^\d*$/,
      inputErrorMessage: '请输入有效的非负整数'
    })

    if (value === null) {
      return
    }

    const newThreshold = value === '' ? 0 : parseInt(value, 10)

    if (newThreshold === currentThreshold) {
      ElMessage.info(config.unchangedMessage)
      return
    }

    await v2UpdatePool({
      id: row.id,
      ...getThresholdUpdatePayload(row, { [field]: newThreshold }),
      status: row.status
    })

    await reloadTable()
    handleSuccessMessage(config.successMessage)
  } catch (error) {
    if (error !== 'cancel') {
      handleErrorMessage(error, config.errorMessage)
    }
  }
}

// 当页面被激活时（从缓存中恢复或首次进入），重新加载数据
onActivated(() => {
  if (!hasActivatedOnce.value) {
    hasActivatedOnce.value = true
    return
  }

  reloadTable()
})
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}

/* 隐藏 ElSelect 中的默认文字，只显示 prefix 插槽的内容 */
:deep(.status-select .el-select__selected-item) {
  display: none;
}

:deep(.status-select .el-select__prefix) {
  display: flex;
  align-items: center;
}
</style>
