<template>
  <div class="app-container">
    <ContentWrap>
      <SearchTable
        ref="searchTableRef"
        :columns="columns"
        :search-schema="searchSchema"
        :fetch-data-api="fetchBlackListData"
        :table-props="{ rowKey: 'id' }"
        add-button-text="新增黑名单"
        @add="handleAdd"
      />
    </ContentWrap>

    <ElDialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="680px"
      :close-on-click-modal="!submitting"
    >
      <ElForm ref="formRef" :model="formData" label-width="110px" :rules="formRules">
        <ElFormItem label="地址" prop="address">
          <ElInput v-model="formData.address" placeholder="请输入地址" clearable />
        </ElFormItem>
        <ElFormItem label="限制订单类型" prop="scopes">
          <ElCheckbox
            :model-value="isAllScopesSelected"
            :indeterminate="isScopeIndeterminate"
            class="blacklist-scope-check-all"
            @change="handleCheckAllScopes"
          >
            全选
          </ElCheckbox>
          <ElCheckboxGroup v-model="formData.scopes" class="blacklist-scope-checkboxes">
            <ElCheckbox
              v-for="item in BLACKLIST_SCOPE_OPTIONS"
              :key="item.value"
              :label="item.value"
            >
              {{ item.label }}
            </ElCheckbox>
          </ElCheckboxGroup>
        </ElFormItem>
        <ElFormItem label="状态" prop="status">
          <ElSwitch
            v-model="formData.status"
            :active-value="1"
            :inactive-value="2"
            active-text="启用"
            inactive-text="禁用"
          />
        </ElFormItem>
        <ElFormItem label="描述" prop="describe">
          <ElInput
            v-model="formData.describe"
            type="textarea"
            :rows="4"
            placeholder="请输入描述"
            maxlength="200"
            show-word-limit
          />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton :disabled="submitting" @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="submitting" @click="submitForm">确定</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="tsx">
import { computed, reactive, ref } from 'vue'
import {
  ElButton,
  ElCheckbox,
  ElCheckboxGroup,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessageBox,
  ElSwitch,
  ElTag
} from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { SearchTable } from '@/components/SearchTable'
import { BaseButton } from '@/components/Button'
import type { TableColumn } from '@/components/Table'
import type { FormSchema } from '@/components/Form'
import {
  v1GetBlackList,
  v1CreateBlackList,
  v1UpdateBlackList,
  v1DeleteBlackList
} from '@/api/management/Black/BlackList'
import type {
  BlackListItemV1,
  BlackListParamsV1,
  CreateBlackListParamsV1
} from '@/api/management/Black/BlackList/types'
import {
  BLACKLIST_DEFAULT_STATUS,
  BLACKLIST_SCOPE_LABEL_MAP,
  BLACKLIST_SCOPE_OPTIONS,
  BLACKLIST_STATUS_OPTIONS
} from '@/constants/blacklist'
import { handleListMessage, handleErrorMessage, handleSuccessMessage } from '@/utils/messageHelper'
import { createPageParams, formatTableDateTime, hasSearchValue } from '@/utils/tableHelpers'

const searchTableRef = ref<InstanceType<typeof SearchTable> | null>(null)
const DEFAULT_CREATED_AT_ORDER = 'created_at DESC'

const dialogVisible = ref(false)
const submitting = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const formRef = ref<FormInstance>()
const formData = reactive({
  id: undefined as number | undefined,
  address: '',
  agent_id: undefined as number | undefined,
  scopes: [] as number[],
  status: BLACKLIST_DEFAULT_STATUS,
  describe: ''
})

const dialogTitle = computed(() => (dialogMode.value === 'add' ? '新增黑名单' : '编辑黑名单'))
const allScopeValues = BLACKLIST_SCOPE_OPTIONS.map((item) => item.value)
const isAllScopesSelected = computed(
  () =>
    formData.scopes.length === allScopeValues.length &&
    allScopeValues.every((item) => formData.scopes.includes(item))
)
const isScopeIndeterminate = computed(
  () => formData.scopes.length > 0 && !isAllScopesSelected.value
)

const handleCheckAllScopes = (checked: boolean) => {
  formData.scopes = checked ? [...allScopeValues] : []
}

const validateScopes = (_rule: unknown, value: number[], callback: (error?: Error) => void) => {
  if (value.length > 0) {
    callback()
    return
  }
  callback(new Error('请选择限制订单类型'))
}

const formRules: FormRules = {
  address: [
    { required: true, message: '请输入地址', trigger: 'blur' },
    {
      pattern: /^[^\u4e00-\u9fa5]+$/,
      message: '地址不能包含汉字',
      trigger: 'blur'
    }
  ],
  scopes: [{ validator: validateScopes, trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
}

const normalizeScopes = (value: BlackListItemV1 | number[] | string | undefined) => {
  const rawValue = Array.isArray(value) || typeof value === 'string' ? value : value?.scopes || []
  if (Array.isArray(rawValue)) return rawValue.map(Number).filter((item) => !Number.isNaN(item))
  if (!rawValue) return []
  return String(rawValue)
    .split(/[,，\s]+/)
    .map((item) => Number(item))
    .filter((item) => !Number.isNaN(item))
}

const getDescribe = (row: BlackListItemV1) => row.describe || '-'
const getAgentText = (row: BlackListItemV1) => {
  if (row.agent_name)
    return row.agent_id ? `${row.agent_name}（ID: ${row.agent_id}）` : row.agent_name
  return row.agent_id ? `ID: ${row.agent_id}` : '-'
}

const columns: TableColumn[] = [
  {
    field: 'address',
    label: '地址',
    minWidth: 260
  },
  {
    field: 'scopes',
    label: '限制订单类型',
    minWidth: 260,
    formatter: (row: BlackListItemV1) => (
      <div class="blacklist-type-tags">
        {normalizeScopes(row).length === 0 ? (
          <span>-</span>
        ) : (
          normalizeScopes(row).map((item) => (
            <ElTag key={item} size="small" effect="plain">
              {BLACKLIST_SCOPE_LABEL_MAP[item] || `未知类型(${item})`}
            </ElTag>
          ))
        )}
      </div>
    )
  },
  {
    field: 'status',
    label: '状态',
    width: 110,
    formatter: (row: BlackListItemV1) => (
      <ElSwitch
        modelValue={Number(row.status) === 1}
        activeText="启用"
        inactiveText="禁用"
        inlinePrompt
        onChange={(enabled: boolean) => handleStatusChange(row, enabled)}
      />
    )
  },
  {
    field: 'agent_name',
    label: '代理',
    minWidth: 140,
    formatter: (row: BlackListItemV1) => getAgentText(row)
  },
  {
    field: 'created_by',
    label: '创建人',
    width: 120,
    formatter: (row: BlackListItemV1) => row.created_by || '-'
  },
  {
    field: 'created_at',
    label: '创建时间',
    sortable: 'custom',
    width: 180,
    formatter: (row: BlackListItemV1) => formatTableDateTime(row.created_at)
  },
  {
    field: 'describe',
    label: '描述',
    minWidth: 180,
    formatter: (row: BlackListItemV1) => getDescribe(row)
  },
  {
    field: 'action',
    label: '操作',
    width: 210,
    minWidth: 210,
    fixed: 'right',
    showOverflowTooltip: false,
    slots: {
      default: (data: { row: BlackListItemV1 }) => {
        const row = data.row
        return (
          <div
            class="blacklist-action-buttons"
            style="display: inline-flex; flex-wrap: nowrap; gap: 8px; align-items: center; justify-content: center; min-width: 150px; white-space: nowrap;"
          >
            <BaseButton
              type="primary"
              style="margin-left: 0; flex-shrink: 0;"
              onClick={() => handleEdit(row)}
            >
              编辑
            </BaseButton>
            <BaseButton
              type="danger"
              style="margin-left: 0; flex-shrink: 0;"
              onClick={() => handleDelete(row)}
            >
              删除
            </BaseButton>
          </div>
        )
      }
    }
  }
]

const searchSchema: FormSchema[] = [
  {
    field: 'address',
    label: '地址',
    component: 'Input',
    componentProps: {
      placeholder: '请输入地址',
      clearable: true
    }
  },
  {
    field: 'scope',
    label: '限制订单类型',
    component: 'Select',
    componentProps: {
      placeholder: '全部',
      clearable: true,
      multiple: true,
      collapseTags: true,
      collapseTagsTooltip: true,
      options: BLACKLIST_SCOPE_OPTIONS
    }
  },
  {
    field: 'status',
    label: '状态',
    component: 'Select',
    componentProps: {
      placeholder: '全部',
      clearable: true,
      options: BLACKLIST_STATUS_OPTIONS
    }
  }
]

const normalizeSearchScopeParam = (value?: BlackListParamsV1['scope']) => {
  if (Array.isArray(value)) {
    const scopes = value.map(Number).filter((item) => !Number.isNaN(item))
    return scopes.length > 0 ? scopes : undefined
  }
  if (!hasSearchValue(value)) return undefined
  const scope = Number(value)
  return Number.isNaN(scope) ? undefined : scope
}

const buildListParams = (params: BlackListParamsV1 = {}): BlackListParamsV1 => {
  const queryParams: BlackListParamsV1 = {
    ...createPageParams(params),
    order: params.order || DEFAULT_CREATED_AT_ORDER
  }

  if (hasSearchValue(params.address)) queryParams.address = String(params.address).trim()
  const scope = normalizeSearchScopeParam(params.scope)
  if (scope !== undefined) queryParams.scope = scope
  if (hasSearchValue(params.status)) queryParams.status = Number(params.status)

  return queryParams
}

const fetchBlackListData = async (params: BlackListParamsV1 = {}) => {
  try {
    const queryParams = buildListParams(params)
    const res = await v1GetBlackList(queryParams)

    if (res.code === '000000' && res.data) {
      const list = res.data.list || []
      const hasSearchCondition = !!(queryParams.address || queryParams.scope || queryParams.status)
      handleListMessage(list, hasSearchCondition, '黑名单')

      return {
        list,
        total: res.data.pager?.total || 0
      }
    }

    handleErrorMessage(res, '获取黑名单列表失败')
    return { list: [], total: 0 }
  } catch (error) {
    handleErrorMessage(error, '获取黑名单列表失败')
    return { list: [], total: 0 }
  }
}

const resetForm = (row?: BlackListItemV1) => {
  formData.id = row?.id
  formData.address = row?.address || ''
  formData.agent_id = row?.agent_id
  formData.scopes = row ? normalizeScopes(row) : []
  formData.status = Number(row?.status) === 2 ? 2 : BLACKLIST_DEFAULT_STATUS
  formData.describe = row?.describe || ''
}

const handleAdd = () => {
  dialogMode.value = 'add'
  resetForm()
  dialogVisible.value = true
  setTimeout(() => formRef.value?.clearValidate())
}

const handleEdit = (row: BlackListItemV1) => {
  dialogMode.value = 'edit'
  resetForm(row)
  dialogVisible.value = true
  setTimeout(() => formRef.value?.clearValidate())
}

const reloadTable = () => searchTableRef.value?.reload()

const buildSavePayload = (): CreateBlackListParamsV1 => ({
  address: formData.address.trim(),
  agent_id: formData.agent_id,
  describe: formData.describe.trim(),
  scopes: [...formData.scopes],
  status: formData.status
})

const submitForm = async () => {
  if (!formRef.value || submitting.value) return
  try {
    submitting.value = true
    await formRef.value.validate()
    const payload = buildSavePayload()
    if (dialogMode.value === 'edit') {
      await v1UpdateBlackList({ ...payload, id: formData.id })
    } else {
      await v1CreateBlackList(payload)
    }
    await reloadTable()
    dialogVisible.value = false
    handleSuccessMessage(dialogMode.value === 'edit' ? '编辑成功' : '新增成功')
  } catch (error) {
    if (error !== false) {
      handleErrorMessage(error, dialogMode.value === 'edit' ? '编辑黑名单失败' : '新增黑名单失败')
    }
  } finally {
    submitting.value = false
  }
}

const handleStatusChange = async (row: BlackListItemV1, enabled: boolean) => {
  const nextStatus = enabled ? 1 : 2
  const previousStatus = row.status
  row.status = nextStatus
  try {
    await v1UpdateBlackList({
      id: row.id,
      address: row.address,
      agent_id: row.agent_id,
      describe: row.describe || '',
      scopes: normalizeScopes(row),
      status: nextStatus
    })
    handleSuccessMessage(nextStatus === 1 ? '启用成功' : '禁用成功')
  } catch (error) {
    row.status = previousStatus
    handleErrorMessage(error, '状态更新失败')
  }
}

const handleDelete = async (row: BlackListItemV1) => {
  try {
    await ElMessageBox.confirm(`确认要删除地址 ${row.address} 吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await v1DeleteBlackList({ id: row.id, address: row.address })
    await reloadTable()
    handleSuccessMessage('删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      handleErrorMessage(error, '删除黑名单失败')
    }
  }
}
</script>

<style scoped>
.blacklist-type-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.blacklist-action-buttons {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  align-items: center;
  justify-content: center;
  min-width: 136px;
  white-space: nowrap;
}

.blacklist-action-buttons :deep(.el-button + .el-button) {
  margin-left: 0;
}

.blacklist-scope-checkboxes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px 12px;
}

.blacklist-scope-check-all {
  display: block;
  margin-bottom: 8px;
}
</style>
