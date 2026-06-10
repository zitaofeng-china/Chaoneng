<template>
  <div class="app-container">
    <ContentWrap>
      <!-- 使用 SearchTable 组件 -->
      <SearchTable
        ref="searchTableRef"
        :columns="columns"
        :search-schema="searchSchema"
        :fetch-data-api="fetchData"
        :table-props="{ rowKey: 'id' }"
        @add="handleAdd"
      >
        <!-- 搜索按钮插槽 -->
        <template #searchButtons>
          <ElButton type="success" @click="handleBatchImport">
            <Icon icon="ep:upload" class="mr-5px" />
            批量导入
          </ElButton>
          <!-- 添加导出模版按钮 -->
          <ElButton type="primary" plain @click="handleExportTemplate">
            <Icon icon="ep:download" class="mr-5px" />
            下载模版
          </ElButton>
        </template>
        <!-- 工具栏插槽 -->
        <template #toolbar>
          <ElButton type="primary" @click="handleAdd">
            <Icon icon="ep:plus" class="mr-5px" />
            新增地址
          </ElButton>
        </template>

        <!-- 操作列内容通过 columns formatter 定义 -->
      </SearchTable>
      <Dialog
        v-model="addressDialogVisible"
        :title="addressDialogTitle"
        width="560px"
        max-height="360px"
      >
        <ElForm
          ref="addressFormRef"
          :model="addressForm"
          :rules="addressFormRules"
          label-width="100px"
        >
          <ElFormItem label="收款类型:" prop="kind">
            <ElSelect
              v-model="addressForm.kind"
              placeholder="请选择收款类型"
              class="w-full"
              :disabled="isAddressKindDisabled"
              @change="handleAddressKindChange"
            >
              <ElOption
                v-for="item in PAYMENT_ADDRESS_KIND_OPTIONS"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem
            v-if="showAgentField"
            label="代理:"
            prop="agent_id"
            :required="isAgentRequired"
          >
            <ElSelectV2
              v-model="addressForm.agent_id"
              placeholder="请选择代理"
              :options="agentList"
              class="w-full"
              filterable
              clearable
              @change="handleAddressAgentChange"
            />
          </ElFormItem>
          <ElFormItem v-if="showBotField" label="机器人:" prop="bot_id" :required="isBotRequired">
            <ElSelectV2
              v-model="addressForm.bot_id"
              :placeholder="addressForm.agent_id ? '请选择机器人' : '请先选择代理'"
              :options="filteredBotList"
              class="w-full"
              filterable
              clearable
              :disabled="!addressForm.agent_id"
            />
          </ElFormItem>
          <ElFormItem label="收款地址:" prop="address">
            <ElInput
              v-model="addressForm.address"
              :type="isAddressTextarea ? 'textarea' : 'text'"
              :rows="isAddressTextarea ? 6 : undefined"
              :placeholder="isAddressTextarea ? '请输入地址，每行一个' : '请输入地址'"
              clearable
            />
          </ElFormItem>
          <ElFormItem label="过期时间:" prop="expired_at">
            <ElDatePicker
              v-model="addressForm.expired_at"
              type="datetime"
              value-format="X"
              placeholder="请选择过期时间"
              class="w-full"
              clearable
            />
          </ElFormItem>
        </ElForm>
        <template #footer>
          <div class="flex justify-end">
            <ElButton @click="addressDialogVisible = false">取消</ElButton>
            <ElButton type="primary" @click="submitAddAddresses" :loading="submitting"
              >确定</ElButton
            >
          </div>
        </template>
      </Dialog>

      <!-- 批量导入弹窗 -->
      <Dialog v-model="batchImportVisible" title="批量导入地址" width="500px" max-height="200px">
        <Form :schema="importFormSchema" @register="importFormRegister" />
        <template #footer>
          <div class="flex justify-end">
            <ElButton @click="batchImportVisible = false">取消</ElButton>
            <ElButton type="primary" @click="submitBatchImport" :loading="submitting"
              >确定</ElButton
            >
          </div>
        </template>
      </Dialog>
    </ContentWrap>
  </div>
</template>

<script setup lang="tsx">
import { computed, ref, reactive, nextTick, onMounted } from 'vue'
import {
  ElButton,
  ElMessageBox,
  ElMessage,
  ElTag,
  ElForm,
  ElFormItem,
  ElInput,
  ElDatePicker,
  ElSelect,
  ElOption,
  ElSelectV2
} from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { Icon } from '@/components/Icon'
import { Dialog } from '@/components/Dialog'
import { Form, FormSchema } from '@/components/Form'
import { useForm } from '@/hooks/web/useForm'
import { BaseButton } from '@/components/Button'
import { SearchTable } from '@/components/SearchTable'
import type { TableColumn } from '@/components/Table'
import { downloadByData } from '@/utils/download'

import {
  v2GetAddressList,
  v2CreateAddress,
  v2UpdateAddress,
  v2DeleteAddress,
  v2ExportAddressModule,
  v2BatchImportAddress,
  type V2AddressItem,
  type V2AddressListParams
} from '@/api/opertion/Marketing/Payment'
import { handleErrorMessage, handleSuccessMessage } from '@/utils/messageHelper'
import {
  v1GetMessageAgentList,
  v1GetMessageBotList,
  type MessageAgentItem,
  type MessageBotItem
} from '@/api/opertion/common/message'
import { createPageParams, formatTableDateTime, hasSearchValue } from '@/utils/tableHelpers'
import {
  ALLOWED_PAYMENT_ADDRESS_KINDS,
  PAYMENT_ADDRESS_KIND_MAP,
  PAYMENT_ADDRESS_KIND_OPTIONS,
  PAYMENT_AGENT_BALANCE_ADDRESS_KIND,
  PAYMENT_MULTI_ADDRESS_KINDS
} from '../constants'
import type { SelectOption } from '@/utils/tableHelpers'

// 表格和表单引用
const searchTableRef = ref<InstanceType<typeof SearchTable> | null>(null) // SearchTable 引用
const submitting = ref(false)
const batchImportVisible = ref(false)
const addressDialogVisible = ref(false)
const addressDialogMode = ref<'add' | 'edit'>('add')
const currentAddress = ref<V2AddressItem | null>(null)
const addressFormRef = ref<FormInstance>()
type AgentOption = SelectOption<number>
type BotOption = SelectOption<number> & { agent_id: number }

const agentList = ref<AgentOption[]>([])
const botList = ref<BotOption[]>([])

type AddressSearchParams = Omit<V2AddressListParams, 'kind'> & {
  kind?: number | string
}

interface UploadFormData {
  file?: Array<{ raw?: File; name?: string }>
}

const isBlobError = (error: unknown): error is { data: Blob } => {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { data?: unknown }).data instanceof Blob
  )
}

const addressForm = reactive({
  kind: 1,
  agent_id: undefined as number | undefined,
  bot_id: undefined as number | undefined,
  address: '',
  expired_at: ''
})

// 使用表单Hook - 导入表单
const { formRegister: importFormRegister, formMethods: importFormMethods } = useForm()

const isAddressKindDisabled = computed(() => addressDialogMode.value !== 'add')

const showAgentField = computed(() => {
  const kind = Number(addressForm.kind)
  if (addressDialogMode.value === 'edit') {
    return kind === PAYMENT_AGENT_BALANCE_ADDRESS_KIND
  }
  return !PAYMENT_MULTI_ADDRESS_KINDS.has(kind)
})

const showBotField = computed(() => {
  const kind = Number(addressForm.kind)
  if (addressDialogMode.value === 'edit') {
    return false
  }
  return !PAYMENT_MULTI_ADDRESS_KINDS.has(kind)
})

const isMultiAddressKind = computed(() => PAYMENT_MULTI_ADDRESS_KINDS.has(Number(addressForm.kind)))

const isAddressTextarea = computed(
  () => addressDialogMode.value === 'add' && isMultiAddressKind.value
)

const isAgentRequired = computed(
  () =>
    showAgentField.value &&
    !(
      addressDialogMode.value === 'edit' &&
      Number(addressForm.kind) === PAYMENT_AGENT_BALANCE_ADDRESS_KIND
    )
)

const isBotRequired = computed(() => showBotField.value)

const addressDialogTitle = computed(() =>
  addressDialogMode.value === 'add' ? '新增地址' : '编辑地址'
)

const filteredBotList = computed(() => botList.value)

const validateAgent = (
  _rule: unknown,
  value: number | undefined,
  callback: (error?: Error) => void
) => {
  if (!isAgentRequired.value || value) {
    callback()
    return
  }
  callback(new Error('请选择代理'))
}

const validateBot = (
  _rule: unknown,
  value: number | undefined,
  callback: (error?: Error) => void
) => {
  if (!isBotRequired.value || value) {
    callback()
    return
  }
  callback(new Error('请选择机器人'))
}

const addressFormRules: FormRules = {
  kind: [{ required: true, message: '请选择收款类型', trigger: 'change' }],
  agent_id: [{ validator: validateAgent, trigger: 'change' }],
  bot_id: [{ validator: validateBot, trigger: 'change' }],
  address: [{ required: true, message: '请输入地址', trigger: 'blur' }]
}

const normalizeExpiredAtValue = (value: unknown) => {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value === 'number') {
    return String(value > 9999999999 ? Math.floor(value / 1000) : value)
  }

  const text = String(value).trim()
  if (!text) return ''
  if (/^\d+$/.test(text)) {
    return text.length > 10 ? String(Math.floor(Number(text) / 1000)) : text
  }

  const timestamp = new Date(text).getTime()
  return Number.isNaN(timestamp) ? '' : String(Math.floor(timestamp / 1000))
}

const buildExpiredAtPayload = () => {
  const value = normalizeExpiredAtValue(addressForm.expired_at)
  return value ? Number(value) : 0
}

const getAddressKindInfo = (kind: number | string) => {
  const kindValue = Number(kind)
  return (
    PAYMENT_ADDRESS_KIND_MAP[kindValue] || {
      label: kind ? `未知类型(${kind})` : '-',
      className: 'kind-default'
    }
  )
}

const columns = ref<TableColumn[]>([
  {
    field: 'address',
    label: 'TRX收款地址',
    minWidth: '240px'
  },
  {
    field: 'agent_name',
    label: '代理信息',
    minWidth: '200px',
    formatter: (row: V2AddressItem) => {
      if (row.agent_name && row.email) {
        return `${row.agent_name} (${row.email})`
      }
      return row.agent_name || '-'
    }
  },
  {
    field: 'bot_id',
    label: '机器人',
    minWidth: '140px',
    formatter: (row: V2AddressItem) => {
      return row.bot_user_name || row.bot_name || '——'
    }
  },
  {
    field: 'created_by',
    label: '创建人',
    width: '120px',
    formatter: (row: V2AddressItem) => row.created_by || '-'
  },
  {
    field: 'kind',
    label: '收款类型',
    minWidth: '220px',
    formatter: (row: V2AddressItem) => {
      const kindInfo = getAddressKindInfo(row.kind)
      return <span class={['address-kind', kindInfo.className]}>{kindInfo.label}</span>
    }
  },
  {
    field: 'status',
    label: '状态',
    width: '100px',
    formatter: (row: V2AddressItem) => {
      // 根据 agent_id 判断是否绑定
      const isBound = !!row.agent_id && row.agent_id > 0
      return isBound ? <ElTag type="success">已绑定</ElTag> : <ElTag type="info">未绑定</ElTag>
    }
  },
  {
    field: 'created_at',
    label: '创建时间',
    sortable: 'custom',
    width: '180px',
    formatter: (row: V2AddressItem) => formatTableDateTime(row.created_at)
  },
  {
    field: 'updated_at',
    label: '修改时间',
    sortable: 'custom',
    width: '180px',
    formatter: (row: V2AddressItem) => formatTableDateTime(row.updated_at)
  },
  {
    label: '操作',
    field: 'action',
    width: '160px',
    fixed: 'right',
    showOverflowTooltip: false,
    formatter: (row: V2AddressItem) => {
      return (
        <div class="address-action-buttons">
          <BaseButton type="primary" onClick={() => handleEdit(row)}>
            编辑
          </BaseButton>
          <BaseButton type="danger" onClick={() => handleDelete(row)}>
            删除
          </BaseButton>
        </div>
      )
    }
  }
])

// 搜索项配置 - 移除状态下拉框，只保留关键字
const searchSchema = reactive<FormSchema[]>([
  {
    field: 'keyword',
    component: 'Input',
    label: '关键字',
    componentProps: {
      placeholder: 'TRX地址/代理信息',
      clearable: true
    }
  },
  {
    field: 'kind',
    component: 'Select',
    label: '收款类型',
    componentProps: {
      placeholder: '全部',
      clearable: true,
      options: PAYMENT_ADDRESS_KIND_OPTIONS
    }
  }
])

// 数据获取函数，供 SearchTable 使用
const fetchData = async (params: AddressSearchParams = {}) => {
  try {
    const processedParams: V2AddressListParams = {
      ...createPageParams(params)
    }
    if (params.keyword) {
      processedParams.keyword = params.keyword.replace(/\s*[\(（].*$/g, '').trim()
    }
    if (hasSearchValue(params.kind)) processedParams.kind = Number(params.kind)
    if (params.order) processedParams.order = params.order

    const res = await v2GetAddressList(processedParams)
    const data = res.data || {}
    const list = (data.list || []).filter((item) =>
      ALLOWED_PAYMENT_ADDRESS_KINDS.has(Number(item.kind))
    )

    return {
      list,
      total: data.pager?.total || 0
    }
  } catch (error) {
    handleErrorMessage(error, '获取地址列表失败')
    return { list: [], total: 0 }
  }
}

// --- Agent List Loading ---
const getAgentList = async (bound?: boolean) => {
  try {
    const res = await v1GetMessageAgentList(bound === undefined ? undefined : { bound })
    agentList.value = (res.data || []).map((agent: MessageAgentItem) => ({
      label: `${agent.username} ${agent.email ? `(${agent.email})` : ''}`,
      value: Number(agent.id)
    }))
  } catch (error) {
    handleErrorMessage(error, '获取代理列表失败')
    agentList.value = []
  }
}

const getBotList = async (agentId?: number | string) => {
  if (!agentId) {
    botList.value = []
    return
  }
  try {
    const res = await v1GetMessageBotList({ agent_id: agentId })
    botList.value = (res.data || []).map((bot: MessageBotItem) => ({
      label: bot.user_name || bot.first_name || '未命名机器人',
      value: Number(bot.id),
      agent_id: Number(bot.agent_id || 0)
    }))
  } catch (error) {
    handleErrorMessage(error, '获取机器人列表失败')
    botList.value = []
  }
}

// 刷新表格方法
const reloadTable = () => {
  searchTableRef.value?.reload() // 调用 SearchTable 的 reload
}

// 新增地址
const handleAdd = () => {
  addressDialogMode.value = 'add'
  currentAddress.value = null
  getAgentList()
  getBotList()
  Object.assign(addressForm, {
    kind: 1,
    agent_id: undefined,
    bot_id: undefined,
    address: '',
    expired_at: ''
  })
  addressDialogVisible.value = true
  nextTick(() => {
    addressFormRef.value?.clearValidate()
  })
}

const handleEdit = (row: V2AddressItem) => {
  addressDialogMode.value = 'edit'
  currentAddress.value = row
  const kind = Number(row.kind) || PAYMENT_AGENT_BALANCE_ADDRESS_KIND
  if (kind === PAYMENT_AGENT_BALANCE_ADDRESS_KIND) {
    getAgentList(false)
  }
  getBotList()
  Object.assign(addressForm, {
    kind,
    agent_id: row.agent_id ? Number(row.agent_id) : undefined,
    bot_id: row.bot_id ? Number(row.bot_id) : undefined,
    address: row.address || '',
    expired_at: normalizeExpiredAtValue(row.expired_at)
  })
  addressDialogVisible.value = true
  nextTick(() => {
    addressFormRef.value?.clearValidate()
  })
}

const handleAddressKindChange = () => {
  if (!showAgentField.value) {
    addressForm.agent_id = undefined
  }
  if (!showBotField.value) {
    addressForm.bot_id = undefined
    botList.value = []
  } else if (addressForm.agent_id) {
    getBotList(addressForm.agent_id)
  }
  nextTick(() => {
    addressFormRef.value?.clearValidate(['agent_id', 'bot_id'])
  })
}

const handleAddressAgentChange = () => {
  addressForm.bot_id = undefined
  if (showBotField.value && addressForm.agent_id) {
    getBotList(addressForm.agent_id)
  } else {
    botList.value = []
  }
}

const parseAddressList = () => {
  if (!isAddressTextarea.value) {
    return addressForm.address.trim() ? [addressForm.address.trim()] : []
  }

  return addressForm.address
    .split(/[\n\r]+/)
    .map((address) => address.trim())
    .filter(Boolean)
}

// 批量导入按钮点击
const handleBatchImport = () => {
  batchImportVisible.value = true
  // 重置表单状态
  nextTick(() => {
    importFormMethods.setValues({ file: [] }) // 清空已上传文件列表
  })
}

// 提交批量导入
const importFormSchema = reactive<FormSchema[]>([
  {
    field: 'file',
    label: '选择文件',
    component: 'Upload',
    componentProps: {
      limit: 1,
      accept: '.xlsx,.xls',
      autoUpload: false,
      multiple: false,
      // 添加 onExceed 处理
      onExceed: () => {
        ElMessage.warning('只能上传一个文件')
      },
      // 添加 slots 以自定义按钮和提示
      slots: {
        default: () => <BaseButton type="primary">选择文件</BaseButton>,
        tip: () => (
          <div class="el-upload__tip text-red">
            只支持 .xlsx 或 .xls 格式的文件，不支持 .csv
            格式。请先下载模板，按照模板格式填写后上传。
          </div>
        )
      }
    },
    formItemProps: {
      rules: [{ required: true, message: '请选择上传文件', trigger: 'blur' }]
    },
    colProps: {
      span: 24
    }
  }
])
// 提交批量导入
const submitBatchImport = async () => {
  try {
    const formDataRaw = await importFormMethods.getFormData<UploadFormData>()
    const fileList = formDataRaw.file

    if (!fileList || fileList.length === 0) {
      ElMessage.warning('请先选择文件')
      return
    }

    const file = fileList[0]?.raw
    if (!file) {
      ElMessage.error('无法获取文件对象')
      return
    }

    // 验证文件格式
    const fileName = file.name
    const fileExtension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
    if (!['.xlsx', '.xls'].includes(fileExtension)) {
      ElMessage.error('只支持 .xlsx 或 .xls 格式的文件，不支持 .csv 格式')
      return
    }

    const formData = new FormData()
    formData.append('file', file) // 将文件添加到 FormData

    submitting.value = true
    await v2BatchImportAddress(formData)
    handleSuccessMessage('批量导入成功')
    batchImportVisible.value = false
    reloadTable()
  } catch (error: unknown) {
    // 检查是否有返回的错误文件
    if (isBlobError(error)) {
      downloadByData(error.data, '批量导入失败.xlsx')
      ElMessage.error('批量导入失败，请查看下载的错误文件')
    } else {
      handleErrorMessage(error, '批量导入失败')
    }
  } finally {
    submitting.value = false
  }
}

// 删除地址
const handleDelete = async (row: V2AddressItem) => {
  try {
    await ElMessageBox.confirm(`确认要删除地址 ${row.address} 吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await v2DeleteAddress({ list: [row.address] })
    handleSuccessMessage('删除成功')
    reloadTable()
  } catch (error) {
    if (error !== 'cancel') {
      handleErrorMessage(error, '删除失败')
    }
  }
}

const submitAddAddresses = async () => {
  try {
    await addressFormRef.value?.validate()
    const kind = Number(addressForm.kind)
    const addressList = parseAddressList()
    if (addressList.length === 0) {
      ElMessage.warning('请输入地址')
      return
    }
    if (addressDialogMode.value === 'edit' && addressList.length > 1) {
      ElMessage.warning('编辑时只能填写一个地址')
      return
    }
    const address = addressList[0]
    const selectedAddress = currentAddress.value
    const agentId = showAgentField.value
      ? Number(addressForm.agent_id || 0)
      : Number(selectedAddress?.agent_id || 0)
    const botId = showBotField.value
      ? Number(addressForm.bot_id || 0)
      : Number(selectedAddress?.bot_id || 0)

    submitting.value = true
    if (addressDialogMode.value === 'edit' && selectedAddress?.id) {
      await v2UpdateAddress({
        id: selectedAddress.id,
        address,
        kind,
        agent_id: agentId,
        bot_id: botId,
        created_at: selectedAddress.created_at,
        created_by: selectedAddress.created_by,
        updated_at: selectedAddress.updated_at,
        expired_at: buildExpiredAtPayload()
      })
      handleSuccessMessage('编辑成功')
    } else {
      await v2CreateAddress({
        kind,
        agent_id: showAgentField.value ? agentId : undefined,
        bot_id: showBotField.value ? botId : undefined,
        list: addressList,
        expired_at: buildExpiredAtPayload() || undefined
      })
      handleSuccessMessage('新增成功')
    }
    addressDialogVisible.value = false
    reloadTable()
  } catch (error: unknown) {
    if (error === false) return
    const errorInfo = error as { code?: string; msg?: string; message?: string }
    const errorCode = errorInfo?.code
    const errorMsg = errorInfo?.msg || errorInfo?.message || ''

    if (errorCode === '000007') {
      ElMessage.error('地址重复，请检查后重新输入')
    } else if (errorMsg) {
      ElMessage.error(errorMsg)
    } else {
      ElMessage.error(addressDialogMode.value === 'add' ? '新增地址失败' : '编辑地址失败')
    }
  } finally {
    submitting.value = false
  }
}

// --- 导出模版处理函数 ---
const handleExportTemplate = async () => {
  try {
    const res = await v2ExportAddressModule()
    // 使用下载工具处理 blob 数据
    if (res.data instanceof Blob) {
      downloadByData(res.data, '地址导入模版.xlsx')
      handleSuccessMessage('模版下载成功')
    } else {
      ElMessage.error('文件数据格式错误')
    }
  } catch (error) {
    handleErrorMessage(error, '模版下载失败')
  }
}

onMounted(() => {
  getAgentList()
  getBotList()
})
</script>

<style scoped>
.address-kind {
  font-weight: 500;
}

.kind-agent {
  color: #e67e22;
}

.kind-user {
  color: #303133;
}

.kind-flash {
  color: #1890ff;
}

.kind-count {
  color: #722ed1;
}

.kind-exchange {
  color: #1d39c4;
}

.kind-welfare {
  color: #409eff;
}

.kind-default {
  color: #606266;
}

.address-action-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
}
</style>
