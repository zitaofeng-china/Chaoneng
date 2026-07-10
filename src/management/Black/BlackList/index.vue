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
          <div class="blacklist-scope-checkboxes">
            <ElCheckbox
              :model-value="isAllScopesSelected"
              :indeterminate="isScopeIndeterminate"
              class="blacklist-scope-check-all"
              @change="handleCheckAllScopes"
            >
              全选
            </ElCheckbox>
            <ElCheckboxGroup v-model="formData.scopes" class="blacklist-scope-options">
              <ElCheckbox
                v-for="item in BLACKLIST_SCOPE_OPTIONS"
                :key="item.value"
                :label="item.value"
              >
                {{ item.label }}
              </ElCheckbox>
            </ElCheckboxGroup>
          </div>
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
import { computed, onMounted, reactive, ref } from 'vue'
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
  ElTag,
  ElTooltip
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
import { v1GetMessageAgentList, type MessageAgentItem } from '@/api/management/common/message'
import {
  BLACKLIST_DEFAULT_STATUS,
  BLACKLIST_PLATFORM_AGENT_ID,
  BLACKLIST_SCOPE_LABEL_MAP,
  BLACKLIST_SCOPE_OPTIONS,
  BLACKLIST_STATUS_OPTIONS
} from '@/constants/blacklist'
import { handleListMessage, handleErrorMessage, handleSuccessMessage } from '@/utils/messageHelper'
import {
  createPageParams,
  formatTableDateTime,
  hasSearchValue,
  type SelectOption
} from '@/utils/tableHelpers'

type AgentOption = SelectOption<number>
type BlackListSearchParams = BlackListParamsV1 & {
  agent_id?: number | string
}

const searchTableRef = ref<InstanceType<typeof SearchTable> | null>(null)
const DEFAULT_CREATED_AT_ORDER = 'created_at DESC'
const platformAgentOption: AgentOption = {
  label: '平台',
  value: BLACKLIST_PLATFORM_AGENT_ID
}

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
const hasAllScopes = (scopes: number[]) => allScopeValues.every((item) => scopes.includes(item))
const isAllScopesSelected = computed(() => hasAllScopes(formData.scopes))
const isScopeIndeterminate = computed(
  () => formData.scopes.length > 0 && !isAllScopesSelected.value
)

const handleCheckAllScopes = (checked: boolean) => {
  formData.scopes = checked ? [...allScopeValues] : []
}

/** 提交用：全选时传空数组 */
const toSubmitScopes = (scopes: number[]) => (hasAllScopes(scopes) ? [] : [...scopes])

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
  const scopes = Array.isArray(rawValue)
    ? rawValue.map(Number)
    : String(rawValue || '')
        .split(/[,，\s]+/)
        .map((item) => Number(item))

  return [...new Set(scopes)].filter((item) => !Number.isNaN(item) && allScopeValues.includes(item))
}

/** 列表中最多直接展示的标签数，超出部分折叠为 +N */
const MAX_VISIBLE_SCOPE_TAGS = 2

const renderScopeTag = (item: number, opts?: { emphasis?: boolean }) => (
  <ElTag
    key={item}
    size="small"
    effect={opts?.emphasis ? 'light' : 'plain'}
    type={opts?.emphasis ? 'primary' : undefined}
    class={opts?.emphasis ? 'blacklist-scope-tooltip-tag' : undefined}
  >
    {BLACKLIST_SCOPE_LABEL_MAP[item] || `未知类型(${item})`}
  </ElTag>
)

const renderScopeTags = (scopes: number[]) => {
  // 空数组或全选均表示限制全部类型
  if (scopes.length === 0 || hasAllScopes(scopes)) {
    return (
      <ElTag size="small" effect="plain">
        全部
      </ElTag>
    )
  }

  const visibleScopes = scopes.slice(0, MAX_VISIBLE_SCOPE_TAGS)
  const hiddenCount = scopes.length - visibleScopes.length

  const tagsNode = (
    <div class="blacklist-type-tags">
      {visibleScopes.map((item) => renderScopeTag(item))}
      {hiddenCount > 0 && (
        <ElTag size="small" type="primary" effect="plain" class="blacklist-scope-more">
          +{hiddenCount}
        </ElTag>
      )}
    </div>
  )

  // 有折叠时：整列标签区域都可悬停弹出完整类型
  if (hiddenCount <= 0) return tagsNode

  return (
    <ElTooltip placement="top" effect="light" popperClass="blacklist-scope-tooltip" showAfter={80}>
      {{
        default: () => tagsNode,
        content: () => (
          <div class="blacklist-scope-tooltip-panel">
            <div class="blacklist-scope-tooltip-title">限制订单类型</div>
            <div class="blacklist-scope-tooltip-tags">
              {scopes.map((item) => renderScopeTag(item, { emphasis: true }))}
            </div>
          </div>
        )
      }}
    </ElTooltip>
  )
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
    minWidth: 220,
    showOverflowTooltip: false,
    formatter: (row: BlackListItemV1) => renderScopeTags(normalizeScopes(row))
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
    field: 'agent_id',
    label: '代理',
    component: 'Select',
    componentProps: {
      placeholder: '全部',
      clearable: true,
      options: [platformAgentOption]
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

const setAgentOptions = (options: AgentOption[]) => {
  const agentField = searchSchema.find((item) => item.field === 'agent_id')
  if (agentField?.componentProps) {
    agentField.componentProps.options = options
  }
}

const loadAgentOptions = async () => {
  try {
    const response = await v1GetMessageAgentList()
    const agentOptions: AgentOption[] = (response.data || [])
      .filter((agent: MessageAgentItem) => Number(agent.id) !== BLACKLIST_PLATFORM_AGENT_ID)
      .map((agent: MessageAgentItem) => ({
        label: agent.username || agent.email || `代理 ${agent.id}`,
        value: Number(agent.id)
      }))

    setAgentOptions([platformAgentOption, ...agentOptions])
  } catch (error) {
    setAgentOptions([platformAgentOption])
    handleErrorMessage(error, '获取代理列表失败')
  }
}

const normalizeSearchScopeParam = (value?: BlackListParamsV1['scope']) => {
  if (Array.isArray(value)) {
    const scopes = value.map(Number).filter((item) => !Number.isNaN(item))
    return scopes.length > 0 ? scopes : undefined
  }
  if (!hasSearchValue(value)) return undefined
  const scope = Number(value)
  return Number.isNaN(scope) ? undefined : scope
}

const buildListParams = (params: BlackListSearchParams = {}): BlackListParamsV1 => {
  const queryParams: BlackListParamsV1 = {
    ...createPageParams(params),
    order: params.order || DEFAULT_CREATED_AT_ORDER
  }

  if (hasSearchValue(params.address)) queryParams.address = String(params.address).trim()
  if (hasSearchValue(params.agent_id)) queryParams.agent_id = Number(params.agent_id)
  const scope = normalizeSearchScopeParam(params.scope)
  if (scope !== undefined) queryParams.scope = scope
  if (hasSearchValue(params.status)) queryParams.status = Number(params.status)

  return queryParams
}

const fetchBlackListData = async (params: BlackListSearchParams = {}) => {
  try {
    const queryParams = buildListParams(params)
    const res = await v1GetBlackList(queryParams)

    if (res.code === '000000' && res.data) {
      const list = res.data.list || []
      const hasSearchCondition = !!(
        queryParams.address ||
        queryParams.agent_id ||
        queryParams.scope ||
        queryParams.status
      )
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
  // 后端空数组表示全选，表单回显为全部勾选
  if (row) {
    const scopes = normalizeScopes(row)
    formData.scopes = scopes.length === 0 ? [...allScopeValues] : scopes
  } else {
    formData.scopes = []
  }
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
  scopes: toSubmitScopes(formData.scopes),
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
      scopes: toSubmitScopes(normalizeScopes(row)),
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

onMounted(() => {
  loadAgentOptions()
})
</script>

<style scoped>
.blacklist-type-tags {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  max-width: 100%;
  cursor: default;
}

.blacklist-scope-more {
  font-weight: 600;
  cursor: pointer;
  user-select: none;
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
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 4px 12px;
}

.blacklist-scope-options {
  display: contents;
}

.blacklist-scope-check-all {
  margin-right: 0;
}
</style>

<!-- Tooltip 挂载到 body，样式需非 scoped -->
<style>
.blacklist-scope-tooltip.el-popper {
  max-width: none !important;
  padding: 0 !important;
  background: #fff !important;
  border: 1px solid var(--el-color-primary-light-5) !important;
  border-radius: 8px !important;
  box-shadow:
    0 6px 16px rgb(64 158 255 / 14%),
    0 2px 8px rgb(0 0 0 / 8%) !important;
}

.blacklist-scope-tooltip.el-popper .el-popper__arrow::before {
  background: #fff !important;
  border: 1px solid var(--el-color-primary-light-5) !important;
}

.blacklist-scope-tooltip-panel {
  max-width: 360px;
  min-width: 240px;
  padding: 12px 14px;
  background: linear-gradient(180deg, #f5f9ff 0%, #fff 48%);
  border-radius: 8px;
}

.blacklist-scope-tooltip-title {
  padding-bottom: 8px;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--el-color-primary);
  border-bottom: 1px dashed var(--el-color-primary-light-5);
}

.blacklist-scope-tooltip .blacklist-scope-tooltip-tags {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  align-items: center;
}

.blacklist-scope-tooltip .blacklist-scope-tooltip-tag {
  justify-content: center;
  width: 100%;
  margin: 0;
  font-weight: 500;
}
</style>
