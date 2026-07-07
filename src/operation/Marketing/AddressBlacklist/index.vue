<template>
  <div class="app-container">
    <ContentWrap>
      <SearchTable
        ref="searchTableRef"
        :columns="columns"
        :search-schema="searchSchema"
        :fetch-data-api="fetchData"
        :table-props="{ rowKey: 'id' }"
        add-button-text="新增黑名单"
        @add="handleAdd"
      />

      <Dialog v-model="formDialogVisible" :title="formDialogTitle" width="720px" max-height="520px">
        <ElForm ref="formRef" :model="formData" :rules="formRules" label-width="120px">
          <ElFormItem label="黑名单地址:" prop="address">
            <ElInput v-model="formData.address" placeholder="请输入地址" clearable />
          </ElFormItem>
          <ElFormItem label="限制订单类型:" prop="scopes">
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
          <ElFormItem label="状态:" prop="status">
            <ElSwitch
              v-model="formData.status"
              :active-value="1"
              :inactive-value="2"
              active-text="启用"
              inactive-text="禁用"
            />
          </ElFormItem>
          <ElFormItem label="备注:" prop="describe">
            <ElInput
              v-model="formData.describe"
              type="textarea"
              :rows="4"
              placeholder="请输入备注"
              maxlength="200"
              show-word-limit
            />
          </ElFormItem>
        </ElForm>
        <template #footer>
          <div class="flex justify-end">
            <ElButton :disabled="submitting" @click="formDialogVisible = false">取消</ElButton>
            <ElButton type="primary" :loading="submitting" @click="submitForm">确定</ElButton>
          </div>
        </template>
      </Dialog>
    </ContentWrap>
  </div>
</template>

<script setup lang="tsx">
import { computed, reactive, ref } from 'vue'
import {
  ElButton,
  ElCheckbox,
  ElCheckboxGroup,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessageBox,
  ElSwitch,
  ElTag
} from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { BaseButton } from '@/components/Button'
import { ContentWrap } from '@/components/ContentWrap'
import { Dialog } from '@/components/Dialog'
import { SearchTable } from '@/components/SearchTable'
import type { FormSchema } from '@/components/Form'
import type { TableColumn } from '@/components/Table'
import {
  createAddressBlacklist,
  deleteAddressBlacklist,
  getAddressBlacklist,
  updateAddressBlacklist,
  type AddressBlacklistItem,
  type AddressBlacklistListParams,
  type SaveAddressBlacklistParams
} from '@/api/opertion/Marketing/AddressBlacklist'
import {
  BLACKLIST_DEFAULT_STATUS,
  BLACKLIST_PLATFORM_AGENT_ID,
  BLACKLIST_SCOPE_LABEL_MAP,
  BLACKLIST_SCOPE_OPTIONS,
  BLACKLIST_STATUS_OPTIONS
} from '@/constants/blacklist'
import { handleErrorMessage, handleSuccessMessage } from '@/utils/messageHelper'
import { createPageParams, formatTableDateTime, hasSearchValue } from '@/utils/tableHelpers'

type AddressBlacklistSearchParams = Omit<AddressBlacklistListParams, 'scope' | 'status'> & {
  scope?: number | string | Array<number | string>
  status?: number | string
}

const searchTableRef = ref<InstanceType<typeof SearchTable> | null>(null)
const formRef = ref<FormInstance>()
const formDialogVisible = ref(false)
const submitting = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')

const formData = reactive({
  id: undefined as number | undefined,
  address: '',
  agent_id: BLACKLIST_PLATFORM_AGENT_ID as number | undefined,
  scopes: [] as number[],
  status: BLACKLIST_DEFAULT_STATUS,
  describe: ''
})

const formDialogTitle = computed(() => (dialogMode.value === 'add' ? '新增黑名单' : '编辑黑名单'))
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

const normalizeScopes = (value: AddressBlacklistItem | number[] | string | undefined) => {
  const rawValue = Array.isArray(value) || typeof value === 'string' ? value : value?.scopes || []
  if (Array.isArray(rawValue)) return rawValue.map(Number).filter((item) => !Number.isNaN(item))
  if (!rawValue) return []
  return String(rawValue)
    .split(/[,，\s]+/)
    .map((item) => Number(item))
    .filter((item) => !Number.isNaN(item))
}

const getOperator = (row: AddressBlacklistItem) => row.created_by || row.operator || '-'
const getDescribe = (row: AddressBlacklistItem) => row.describe || '-'
const getAgentText = (row: AddressBlacklistItem) => {
  if (row.agent_name)
    return row.agent_id ? `${row.agent_name}（ID: ${row.agent_id}）` : row.agent_name
  return row.agent_id ? `ID: ${row.agent_id}` : '-'
}

const columns: TableColumn[] = [
  {
    field: 'address',
    label: '黑名单地址',
    minWidth: 260
  },
  {
    field: 'agent_name',
    label: '代理',
    minWidth: 160,
    formatter: (row: AddressBlacklistItem) => getAgentText(row)
  },
  {
    field: 'scopes',
    label: '限制订单类型',
    minWidth: 260,
    formatter: (row: AddressBlacklistItem) => (
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
    formatter: (row: AddressBlacklistItem) => (
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
    field: 'created_by',
    label: '创建人',
    width: 140,
    formatter: (row: AddressBlacklistItem) => getOperator(row)
  },
  {
    field: 'created_at',
    label: '创建时间',
    sortable: 'custom',
    width: 180,
    formatter: (row: AddressBlacklistItem) => formatTableDateTime(row.created_at)
  },
  {
    field: 'describe',
    label: '备注',
    minWidth: 180,
    formatter: (row: AddressBlacklistItem) => getDescribe(row)
  },
  {
    field: 'action',
    label: '操作',
    width: 210,
    minWidth: 210,
    fixed: 'right',
    showOverflowTooltip: false,
    formatter: (row: AddressBlacklistItem) => (
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
]

const searchSchema = reactive<FormSchema[]>([
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
])

const normalizeSearchScopeParam = (value?: AddressBlacklistSearchParams['scope']) => {
  if (Array.isArray(value)) {
    const scopes = value.map(Number).filter((item) => !Number.isNaN(item))
    return scopes.length > 0 ? scopes : undefined
  }
  if (!hasSearchValue(value)) return undefined
  const scope = Number(value)
  return Number.isNaN(scope) ? undefined : scope
}

const buildListParams = (params: AddressBlacklistSearchParams = {}): AddressBlacklistListParams => {
  const apiParams: AddressBlacklistListParams = {
    ...createPageParams(params),
    order: params.order || 'created_at DESC'
  }

  if (hasSearchValue(params.address)) apiParams.address = String(params.address).trim()
  const scope = normalizeSearchScopeParam(params.scope)
  if (scope !== undefined) apiParams.scope = scope
  if (hasSearchValue(params.status)) apiParams.status = Number(params.status)

  return apiParams
}

const fetchData = async (params: AddressBlacklistSearchParams = {}) => {
  try {
    const res = await getAddressBlacklist(buildListParams(params))
    const data = res.data || {}
    return {
      list: data.list || [],
      total: data.pager?.total || 0
    }
  } catch (error) {
    handleErrorMessage(error, '获取黑名单列表失败')
    return { list: [], total: 0 }
  }
}

const resetForm = (row?: AddressBlacklistItem) => {
  formData.id = row?.id
  formData.address = row?.address || ''
  formData.agent_id = row?.agent_id || BLACKLIST_PLATFORM_AGENT_ID
  formData.scopes = row ? normalizeScopes(row) : []
  formData.status = Number(row?.status) === 2 ? 2 : BLACKLIST_DEFAULT_STATUS
  formData.describe = row?.describe || ''
}

const openFormDialog = () => {
  formDialogVisible.value = true
  setTimeout(() => formRef.value?.clearValidate())
}

const handleAdd = () => {
  dialogMode.value = 'add'
  resetForm()
  openFormDialog()
}

const handleEdit = (row: AddressBlacklistItem) => {
  dialogMode.value = 'edit'
  resetForm(row)
  openFormDialog()
}

const reloadTable = () => searchTableRef.value?.reload()

const buildSavePayload = (): SaveAddressBlacklistParams => ({
  id: formData.id,
  address: formData.address.trim(),
  agent_id: formData.agent_id ? Number(formData.agent_id) : undefined,
  scopes: [...formData.scopes],
  status: formData.status,
  describe: formData.describe.trim()
})

const submitForm = async () => {
  if (submitting.value) return
  try {
    await formRef.value?.validate()
    submitting.value = true
    const payload = buildSavePayload()
    if (dialogMode.value === 'edit') {
      await updateAddressBlacklist(payload)
    } else {
      await createAddressBlacklist(payload)
    }
    formDialogVisible.value = false
    await reloadTable()
    handleSuccessMessage(dialogMode.value === 'edit' ? '编辑成功' : '新增成功')
  } catch (error) {
    if (error !== false) {
      handleErrorMessage(error, dialogMode.value === 'edit' ? '编辑黑名单失败' : '新增黑名单失败')
    }
  } finally {
    submitting.value = false
  }
}

const handleStatusChange = async (row: AddressBlacklistItem, enabled: boolean) => {
  const nextStatus = enabled ? 1 : 2
  const previousStatus = row.status
  row.status = nextStatus
  try {
    await updateAddressBlacklist({
      id: row.id,
      address: row.address,
      agent_id: row.agent_id,
      scopes: normalizeScopes(row),
      status: nextStatus,
      describe: row.describe || ''
    })
    handleSuccessMessage(nextStatus === 1 ? '启用成功' : '禁用成功')
  } catch (error) {
    row.status = previousStatus
    handleErrorMessage(error, '状态更新失败')
  }
}

const handleDelete = async (row: AddressBlacklistItem) => {
  try {
    await ElMessageBox.confirm(`确认要删除地址 ${row.address} 吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteAddressBlacklist({ id: row.id, address: row.address })
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
