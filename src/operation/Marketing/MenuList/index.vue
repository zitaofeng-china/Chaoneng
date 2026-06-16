<template>
  <div class="app-container">
    <ContentWrap>
      <SearchTable
        ref="searchTableRef"
        :columns="columns"
        :fetch-data-api="fetchMenuList"
        :fetch-del-api="deleteMenu"
        :action-column="actionColumn"
        :table-props="{ pagination: undefined }"
        :search-schema="[]"
        :search-props="{ showSearch: false }"
        :immediate="true"
        @loaded="handleDataLoaded"
        @add="handleAdd"
      >
        <template #leftToolbar>
          <BaseButton @click="handleRefresh">刷新</BaseButton>
        </template>
        <template #rightToolbar>
          <BaseButton type="primary" @click="handlePreview">点我预览</BaseButton>
          <BaseButton type="warning" @click="handleInlineButton">内联按钮</BaseButton>
        </template>
      </SearchTable>

      <Dialog v-model="dialogVisible" :title="dialogTitle" width="680px">
        <ElForm
          ref="formRef"
          :model="formData"
          :rules="formRules"
          label-position="top"
          class="menu-form"
        >
          <ElFormItem label="菜单名称" prop="menu_name">
            <ElInput
              v-model="formData.menu_name"
              placeholder="请输入菜单名称"
              maxlength="50"
              clearable
            />
          </ElFormItem>

          <ElFormItem label="排序" prop="order_num">
            <ElInputNumber
              v-model="formData.order_num"
              placeholder="请输入排序（数字越小越靠前）"
              :min="0"
              class="w-full"
            />
          </ElFormItem>

          <ElFormItem label="状态" prop="status">
            <ElSelect v-model="formData.status" placeholder="请选择状态" class="w-full">
              <ElOption label="启用" :value="1" />
              <ElOption label="禁用" :value="2" />
            </ElSelect>
          </ElFormItem>

          <ElFormItem label="可见范围" prop="visibility_scope">
            <ElRadioGroup v-model="formData.visibility_scope">
              <ElRadio :value="VISIBLE_SCOPE_ALL">默认全部</ElRadio>
              <ElRadio :value="VISIBLE_SCOPE_PARTIAL">指定部分代理可见</ElRadio>
            </ElRadioGroup>
          </ElFormItem>

          <ElFormItem
            v-if="showVisibleAgentSelect"
            label="代理账号列表"
            prop="agent_ids"
            class="agent-select-form-item"
          >
            <ElSelectV2
              v-model="formData.agent_ids"
              :options="agentOptions"
              multiple
              filterable
              clearable
              placeholder="请选择代理"
              style="width: 100%"
              :loading="agentLoading"
              collapse-tags
              collapse-tags-tooltip
              :max-collapse-tags="3"
            />
          </ElFormItem>
        </ElForm>

        <template #footer>
          <div class="flex justify-end">
            <ElButton @click="dialogVisible = false">取消</ElButton>
            <ElButton type="primary" :loading="submitting" @click="handleSubmit">提交</ElButton>
          </div>
        </template>
      </Dialog>

      <MenuPreview v-model="previewVisible" @update:modelValue="previewHandleClose" />
      <InlineButtonDialog v-model="inlineButtonDialogVisible" />
    </ContentWrap>
  </div>
</template>

<script setup lang="tsx">
import { computed, h, nextTick, reactive, ref } from 'vue'
import {
  ElButton,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElOption,
  ElRadio,
  ElRadioGroup,
  ElSelect,
  ElSelectV2,
  ElSwitch,
  ElTag
} from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { Dialog } from '@/components/Dialog'
import { SearchTable } from '@/components/SearchTable'
import { BaseButton } from '@/components/Button'
import type { TableColumn } from '@/components/Table'
import type { SearchTableExpose } from '@/components/SearchTable'
import {
  getBotMenuList,
  addBotMenu,
  deleteBotMenu,
  batchUpdateBotMenu,
  type GetBotMenuListParams,
  type AddBotMenuParams,
  type BatchUpdateBotMenuParams,
  type BotMenuItem
} from '@/api/opertion/common/menuList'
import { v1GetMessageAgentList, type MessageAgentItem } from '@/api/opertion/common/message'
import {
  handleDataFormatError,
  handleErrorMessage,
  handleListMessage,
  handleSuccessMessage,
  handleWarningMessage
} from '@/utils/messageHelper'
import {
  formatTableDateTime,
  hasSearchValue,
  type SelectOption,
  type TableSlot
} from '@/utils/tableHelpers'
import MenuPreview from './components/MenuPreview.vue'
import InlineButtonDialog from '@/operation/components/InlineButtonDialog.vue'

const VISIBLE_SCOPE_ALL = 1
const VISIBLE_SCOPE_PARTIAL = 2

interface MenuFormValues {
  id?: number
  menu_name: string
  order_num: number
  status: number
  visibility_scope: number
  agent_ids: number[]
}

type MenuTableSlot = TableSlot<BotMenuItem>
type AgentOption = SelectOption<number>

const searchTableRef = ref<SearchTableExpose | null>(null)
const formRef = ref<FormInstance>()
const previewVisible = ref(false)
const inlineButtonDialogVisible = ref(false)
const dialogVisible = ref(false)
const dialogTitle = ref('添加菜单')
const isLoaded = ref(false)
const submitting = ref(false)
const agentLoading = ref(false)
const agentOptions = ref<AgentOption[]>([])

const formData = reactive<MenuFormValues>({
  menu_name: '',
  order_num: 0,
  status: 1,
  visibility_scope: VISIBLE_SCOPE_ALL,
  agent_ids: []
})

const showVisibleAgentSelect = computed(() => formData.visibility_scope === VISIBLE_SCOPE_PARTIAL)

const formRules: FormRules<MenuFormValues> = {
  menu_name: [{ required: true, message: '菜单名称不能为空', trigger: 'blur' }],
  order_num: [{ required: true, message: '排序不能为空', trigger: 'change' }],
  status: [{ required: true, message: '状态不能为空', trigger: 'change' }],
  visibility_scope: [{ required: true, message: '请选择可见范围', trigger: 'change' }],
  agent_ids: [
    {
      validator: (_rule, value, callback) => {
        if (formData.visibility_scope !== VISIBLE_SCOPE_PARTIAL) {
          callback()
          return
        }
        if (Array.isArray(value) && value.length > 0) {
          callback()
          return
        }
        callback(new Error('请选择至少一个代理'))
      },
      trigger: 'change'
    }
  ]
}

const resetFormData = () => {
  Object.assign(formData, {
    id: undefined,
    menu_name: '',
    order_num: 0,
    status: 1,
    visibility_scope: VISIBLE_SCOPE_ALL,
    agent_ids: []
  })
}

const hydrateVisibilityFields = (row?: Partial<Record<string, unknown>>) => {
  const rawWhitelist = row?.whitelist
  const rawAgentIds = row?.agent_ids
  const sourceIds = Array.isArray(rawWhitelist) ? rawWhitelist : rawAgentIds
  const normalizedAgentIds = Array.isArray(sourceIds)
    ? sourceIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
    : []

  const rawVisibilityScope = Number(row?.visibility_scope)
  const visibilityScope =
    rawVisibilityScope === VISIBLE_SCOPE_PARTIAL ||
    (normalizedAgentIds.length > 0 && rawVisibilityScope !== VISIBLE_SCOPE_ALL)
      ? VISIBLE_SCOPE_PARTIAL
      : VISIBLE_SCOPE_ALL

  formData.visibility_scope = visibilityScope
  formData.agent_ids = normalizedAgentIds
}

const ensureSelectedAgentOptions = (selectedIds: number[]) => {
  if (!selectedIds.length) return

  const existingIds = new Set(agentOptions.value.map((item) => item.value))
  const missingIds = selectedIds.filter((id) => !existingIds.has(id))
  if (!missingIds.length) return

  const placeholderOptions = missingIds.map((id) => ({
    label: `代理 ${id}`,
    value: id
  }))
  agentOptions.value = [...placeholderOptions, ...agentOptions.value]
}

type MenuDialogRow = Partial<BotMenuItem> & {
  whitelist?: unknown
  visibility_scope?: unknown
  agent_ids?: unknown
}

const fetchAgentOptions = async () => {
  agentLoading.value = true
  try {
    const response = await v1GetMessageAgentList()
    agentOptions.value = (response.data || []).map((agent: MessageAgentItem) => ({
      label: agent.email ? `${agent.username} (${agent.email})` : agent.username,
      value: Number(agent.id)
    }))

    ensureSelectedAgentOptions(formData.agent_ids)
  } catch (error) {
    agentOptions.value = []
    handleErrorMessage(error, '获取代理列表失败')
  } finally {
    agentLoading.value = false
  }
}

const openDialog = async (title: string, row?: MenuDialogRow) => {
  dialogTitle.value = title
  dialogVisible.value = true
  resetFormData()

  if (row) {
    Object.assign(formData, {
      id: row.id ? Number(row.id) : undefined,
      menu_name: row.menu_name ? String(row.menu_name) : '',
      order_num: row.order_num ? Number(row.order_num) : 0,
      status: row.status ? Number(row.status) : 1
    })
    hydrateVisibilityFields(row)
  }

  await fetchAgentOptions()
  ensureSelectedAgentOptions(formData.agent_ids)

  await nextTick()
  formRef.value?.clearValidate()
}

const buildVisibilityPayload = () => {
  if (formData.visibility_scope !== VISIBLE_SCOPE_PARTIAL) {
    return {
      whitelist: [] as number[]
    }
  }

  return {
    whitelist: [...formData.agent_ids]
  }
}

const columns: TableColumn[] = [
  {
    field: 'menu_name',
    label: '菜单名称',
    minWidth: 150,
    slots: {
      default: ({ row }: MenuTableSlot) =>
        h(
          'span',
          {
            style: { color: '#333', fontWeight: '500' }
          },
          row.menu_name
        )
    }
  },
  {
    field: 'order_num',
    label: '排序',
    width: 100,
    slots: {
      default: ({ row }: MenuTableSlot) =>
        h(
          ElTag,
          {
            type: 'info',
            size: 'small'
          },
          () => row.order_num
        )
    }
  },
  {
    field: 'status',
    label: '状态',
    width: 100,
    slots: {
      default: ({ row }: MenuTableSlot) => (
        <ElSwitch
          v-model={row.status}
          activeValue={1}
          inactiveValue={2}
          onChange={() => handleStatusChange(row)}
        />
      )
    }
  },
  {
    field: 'created_at',
    label: '创建时间',
    minWidth: 170,
    sortable: 'custom',
    formatter: (row: BotMenuItem) => formatTableDateTime(row.created_at)
  },
  {
    field: 'updated_at',
    label: '更新时间',
    minWidth: 170,
    sortable: 'custom',
    formatter: (row: BotMenuItem) => formatTableDateTime(row.updated_at)
  }
]

const actionColumn = {
  field: 'action',
  label: '操作',
  width: 240,
  fixed: 'right',
  slots: {
    default: ({ row }: MenuTableSlot) => (
      <>
        <BaseButton type="primary" onClick={() => handleEdit(row)}>
          编辑
        </BaseButton>
        <BaseButton type="danger" onClick={() => handleDelete(row)}>
          删除
        </BaseButton>
      </>
    )
  }
}

const fetchMenuList = async (params: Partial<GetBotMenuListParams> = {}) => {
  try {
    const queryParams: GetBotMenuListParams = {
      bot_id: params.bot_id || 0,
      status: hasSearchValue(params.status) ? params.status : undefined
    }

    const response = await getBotMenuList(queryParams)

    if (response.code === '000000' && response.data) {
      const list = Array.isArray(response.data) ? response.data : []
      list.sort((a, b) => b.order_num - a.order_num)
      handleListMessage(list, hasSearchValue(params.status), '菜单')

      return {
        list,
        total: list.length
      }
    }

    handleDataFormatError('菜单列表')
    return { list: [], total: 0 }
  } catch (error) {
    handleErrorMessage(error, '获取菜单列表失败')
    return { list: [], total: 0 }
  }
}

const deleteMenu = async (): Promise<boolean> => {
  const row = searchTableRef.value?.currentRow
  if (!row?.id) {
    handleWarningMessage('删除失败：数据不完整')
    return false
  }

  try {
    const response = await deleteBotMenu(row.id)
    if (response.code === '000000') {
      handleSuccessMessage('删除成功')
      return true
    }
    handleErrorMessage(response.msg || '删除失败', '删除失败')
    return false
  } catch (error) {
    handleErrorMessage(error, '删除菜单失败')
    return false
  }
}

const handleDelete = (row: BotMenuItem) => {
  searchTableRef.value?.delete(row)
}

const handleAdd = async () => {
  await openDialog('添加菜单')
}

const handleEdit = async (row: BotMenuItem) => {
  await openDialog('编辑菜单', row)
}

const handlePreview = () => {
  previewVisible.value = true
}

const handleInlineButton = () => {
  inlineButtonDialogVisible.value = true
}

const handleRefresh = () => {
  searchTableRef.value?.reload()
  ElMessage.success('刷新成功')
}

const handleSubmit = async () => {
  if (!formRef.value || submitting.value) return

  try {
    await formRef.value.validate()

    const currentList: BotMenuItem[] = searchTableRef.value?.tableState?.dataList?.value || []
    const duplicated = currentList.find(
      (item) =>
        Number(item.order_num) === Number(formData.order_num) &&
        (!formData.id || item.id !== formData.id)
    )
    if (duplicated) {
      ElMessage.warning(`排序号 ${formData.order_num} 已被「${duplicated.menu_name}」占用，请更换`)
      return
    }

    submitting.value = true
    const visibilityPayload = buildVisibilityPayload()

    if (formData.id) {
      const updateParams: BatchUpdateBotMenuParams = {
        bot_id: 0,
        menus: [
          {
            id: formData.id,
            menu_name: formData.menu_name,
            order_num: formData.order_num,
            status: formData.status,
            ...visibilityPayload
          }
        ]
      }

      await batchUpdateBotMenu(updateParams)
      ElMessage.success('更新成功')
    } else {
      const addParams: AddBotMenuParams = {
        menu_name: formData.menu_name,
        order_num: formData.order_num,
        status: formData.status,
        ...visibilityPayload
      }

      await addBotMenu(addParams)
      ElMessage.success('添加成功')
    }

    dialogVisible.value = false
    searchTableRef.value?.reload()
  } catch (error) {
    if (error instanceof Error && error.message) {
      ElMessage.error(error.message)
      return
    }
    ElMessage.error('表单验证失败，请检查填写内容')
  } finally {
    submitting.value = false
  }
}

const previewHandleClose = () => {
  previewVisible.value = false
  searchTableRef.value?.reload()
}

const handleDataLoaded = ({
  data,
  success
}: {
  data: BotMenuItem[]
  total: number
  success: boolean
}) => {
  nextTick(() => {
    isLoaded.value = true
  })

  if (data?.length === 0 && success) {
    ElMessage.info('未查询到符合条件的数据')
  }
}

const handleStatusChange = async (row: BotMenuItem) => {
  if (!isLoaded.value) return

  const previousStatus = row.status === 1 ? 2 : 1
  try {
    const updateParams: BatchUpdateBotMenuParams = {
      bot_id: 0,
      menus: [
        {
          id: row.id,
          menu_name: row.menu_name,
          order_num: row.order_num,
          status: row.status,
          whitelist: Array.isArray(row.whitelist)
            ? row.whitelist.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
            : []
        }
      ]
    }

    await batchUpdateBotMenu(updateParams)
    ElMessage.success('状态更新成功')
    searchTableRef.value?.reload()
  } catch (error) {
    handleErrorMessage(error, '状态更新失败')
    row.status = previousStatus
  }
}
</script>

<style scoped>
.menu-form {
  padding: 0 4px;
}

.menu-form :deep(.el-form-item) {
  margin-bottom: 18px;
}

.menu-form :deep(.el-form-item__label) {
  padding-bottom: 6px;
  font-weight: 500;
}

.w-full {
  width: 100%;
}

.agent-select-form-item :deep(.el-select) {
  width: 100%;
}
</style>
