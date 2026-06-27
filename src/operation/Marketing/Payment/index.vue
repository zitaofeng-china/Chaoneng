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
          <ElButton type="primary" :loading="exporting" @click="handleExport">
            <Icon icon="ep:download" class="mr-5px" />
            导出
          </ElButton>
          <ElButton type="primary" plain @click="handleExportTemplate">
            <Icon icon="ep:download" class="mr-5px" />
            下载模板
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
        :width="addressDialogWidth"
        max-height="360px"
      >
        <ElForm
          ref="addressFormRef"
          :model="addressForm"
          :rules="addressFormRules"
          label-width="120px"
        >
          <ElFormItem label="收款地址类型:" prop="kind">
            <ElSelect
              v-model="addressForm.kind"
              placeholder="请选择收款地址类型"
              class="address-form-field"
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
              class="address-form-field"
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
              class="address-form-field"
              filterable
              clearable
              :disabled="!addressForm.agent_id"
            />
          </ElFormItem>
          <ElFormItem label="收款地址:" prop="address">
            <ElInput
              v-if="isAddressTextarea"
              v-model="addressForm.address"
              class="address-form-field"
              type="textarea"
              :rows="6"
              placeholder="请输入地址，每行一个"
            />
            <ElInput
              v-else
              v-model="addressForm.address"
              class="address-form-field"
              type="text"
              placeholder="请输入地址"
              clearable
            />
          </ElFormItem>
          <ElFormItem label="过期时间:" prop="expired_at">
            <ElDatePicker
              v-model="addressForm.expired_at"
              type="datetime"
              value-format="X"
              placeholder="请选择过期时间"
              class="address-form-field"
              clearable
              :disabled-date="disabledExpiredDate"
              :disabled-hours="disabledExpiredHours"
              :disabled-minutes="disabledExpiredMinutes"
              :disabled-seconds="disabledExpiredSeconds"
            />
          </ElFormItem>
        </ElForm>
        <template #footer>
          <div class="flex justify-end">
            <ElButton @click="addressDialogVisible = false" :disabled="submitting">取消</ElButton>
            <ElButton type="primary" @click="submitAddAddresses" :loading="submitting"
              >确定</ElButton
            >
          </div>
        </template>
      </Dialog>
      <div v-if="showAddressDragMask" class="global-drag-mask">
        <div class="global-drag-mask__content">释放鼠标以解析地址模板</div>
      </div>
    </ContentWrap>
  </div>
</template>

<script setup lang="tsx">
import { computed, ref, reactive, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import * as XLSX from 'xlsx'
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
import type { FormSchema } from '@/components/Form'
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
  type V2AddressItem,
  type V2AddressListParams
} from '@/api/opertion/Marketing/Payment'
import {
  handleErrorMessage,
  handleSuccessMessage,
  handleWarningMessage
} from '@/utils/messageHelper'
import {
  v1GetMessageAgentList,
  v1GetMessageBotList,
  type MessageAgentItem,
  type MessageBotItem
} from '@/api/opertion/common/message'
import {
  createPageParams,
  exportTableData,
  formatTableDateTime,
  hasSearchValue
} from '@/utils/tableHelpers'
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
const exporting = ref(false)
const showAddressDragMask = ref(false)
const addressDragCounter = ref(0)
const addressDialogVisible = ref(false)
const addressDialogMode = ref<'add' | 'edit'>('add')
const currentAddress = ref<V2AddressItem | null>(null)
const addressFormRef = ref<FormInstance>()
const DEFAULT_CREATED_AT_ORDER = 'created_at DESC'
const EXCEL_FILE_EXTENSIONS = ['.xlsx', '.xls']
const TRX_ADDRESS_PATTERN = /T[1-9A-HJ-NP-Za-km-z]{33}/g
const ADDRESS_HEADER_KEYWORDS = ['地址', 'address', 'trx']
type AgentOption = SelectOption<number>
type BotOption = SelectOption<number> & { agent_id: number }

const agentList = ref<AgentOption[]>([])
const botList = ref<BotOption[]>([])

type AddressSearchParams = Omit<V2AddressListParams, 'kind'> & {
  kind?: number | string
}

type ExcelCellValue = string | number | boolean | null | undefined
type ExcelRow = ExcelCellValue[]

const addressForm = reactive({
  kind: 1,
  agent_id: undefined as number | undefined,
  bot_id: undefined as number | undefined,
  address: '',
  expired_at: ''
})

const DEFAULT_ADDRESS_FORM = {
  kind: 1,
  agent_id: undefined as number | undefined,
  bot_id: undefined as number | undefined,
  address: '',
  expired_at: ''
}

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

const canParseDroppedAddressFile = computed(
  () => addressDialogVisible.value && isAddressTextarea.value
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

const addressDialogWidth = computed(() => (addressDialogMode.value === 'edit' ? '760px' : '620px'))

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

const getExpiredAtDate = () => {
  const value = normalizeExpiredAtValue(addressForm.expired_at)
  return value ? new Date(Number(value) * 1000) : null
}

const isSameDate = (date: Date, target: Date) =>
  date.getFullYear() === target.getFullYear() &&
  date.getMonth() === target.getMonth() &&
  date.getDate() === target.getDate()

const createNumberRange = (start: number, end: number) => {
  const result: number[] = []
  for (let value = start; value <= end; value++) {
    result.push(value)
  }
  return result
}

const disabledExpiredDate = (time: Date) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return time.getTime() < today.getTime()
}

const disabledExpiredHours = () => {
  const selectedDate = getExpiredAtDate()
  if (!selectedDate) return []

  const now = new Date()
  if (!isSameDate(selectedDate, now)) return []
  return createNumberRange(0, now.getHours() - 1)
}

const disabledExpiredMinutes = (hour: number) => {
  const selectedDate = getExpiredAtDate()
  if (!selectedDate) return []

  const now = new Date()
  if (!isSameDate(selectedDate, now) || hour !== now.getHours()) return []
  return createNumberRange(0, now.getMinutes() - 1)
}

const disabledExpiredSeconds = (hour: number, minute: number) => {
  const selectedDate = getExpiredAtDate()
  if (!selectedDate) return []

  const now = new Date()
  if (!isSameDate(selectedDate, now) || hour !== now.getHours() || minute !== now.getMinutes()) {
    return []
  }
  return createNumberRange(0, now.getSeconds() - 1)
}

const validateExpiredAt = (
  _rule: unknown,
  value: string | number | undefined,
  callback: (error?: Error) => void
) => {
  const normalizedValue = normalizeExpiredAtValue(value)
  if (!normalizedValue) {
    callback()
    return
  }

  if (Number(normalizedValue) < Math.floor(Date.now() / 1000)) {
    callback(new Error('过期时间不能选择过去的时间'))
    return
  }

  callback()
}

const addressFormRules: FormRules = {
  kind: [{ required: true, message: '请选择收款地址类型', trigger: 'change' }],
  agent_id: [{ validator: validateAgent, trigger: 'change' }],
  bot_id: [{ validator: validateBot, trigger: 'change' }],
  address: [{ required: true, message: '请输入地址', trigger: 'blur' }],
  expired_at: [{ validator: validateExpiredAt, trigger: 'change' }]
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

const formatAgentInfo = (item: V2AddressItem) => {
  if (item.agent_name && item.email) {
    return `${item.agent_name} (${item.email})`
  }
  return item.agent_name || '-'
}

const formatBotInfo = (item: V2AddressItem) => item.bot_user_name || item.bot_name || '-'

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
      return formatAgentInfo(row)
    }
  },
  {
    field: 'bot_id',
    label: '机器人',
    minWidth: '140px',
    formatter: (row: V2AddressItem) => {
      return formatBotInfo(row)
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
    label: '收款地址类型',
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
      placeholder: 'TRX收款地址/代理信息',
      clearable: true
    }
  },
  {
    field: 'kind',
    component: 'Select',
    label: '收款地址类型',
    componentProps: {
      placeholder: '全部',
      clearable: true,
      options: PAYMENT_ADDRESS_KIND_OPTIONS
    }
  }
])

const buildAddressListParams = (params: AddressSearchParams = {}): V2AddressListParams => {
  const processedParams: V2AddressListParams = {
    ...createPageParams(params)
  }
  if (params.keyword) {
    processedParams.keyword = params.keyword.replace(/\s*[\(（].*$/g, '').trim()
  }
  if (hasSearchValue(params.kind)) processedParams.kind = Number(params.kind)
  processedParams.order = params.order || DEFAULT_CREATED_AT_ORDER

  return processedParams
}

// 数据获取函数，供 SearchTable 使用
const fetchData = async (params: AddressSearchParams = {}) => {
  try {
    const res = await v2GetAddressList(buildAddressListParams(params))
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
  return searchTableRef.value?.reload() // 调用 SearchTable 的 reload
}

const resetAddressForm = (payload?: Partial<typeof DEFAULT_ADDRESS_FORM>) => {
  Object.assign(addressForm, DEFAULT_ADDRESS_FORM, payload)
}

const openAddressDialog = () => {
  addressDialogVisible.value = true
  nextTick(() => {
    addressFormRef.value?.clearValidate()
  })
}

// 新增地址
const handleAdd = () => {
  addressDialogMode.value = 'add'
  currentAddress.value = null
  getAgentList()
  botList.value = []
  resetAddressForm()
  openAddressDialog()
}

const handleEdit = (row: V2AddressItem) => {
  addressDialogMode.value = 'edit'
  currentAddress.value = row
  const kind = Number(row.kind) || PAYMENT_AGENT_BALANCE_ADDRESS_KIND
  if (kind === PAYMENT_AGENT_BALANCE_ADDRESS_KIND) {
    getAgentList(false)
  }
  botList.value = []
  resetAddressForm({
    kind,
    agent_id: row.agent_id ? Number(row.agent_id) : undefined,
    bot_id: row.bot_id ? Number(row.bot_id) : undefined,
    address: row.address || '',
    expired_at: normalizeExpiredAtValue(row.expired_at)
  })
  openAddressDialog()
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

const uniqueAddressList = (list: string[]) => {
  const addressSet = new Set<string>()
  const result: string[] = []
  list.forEach((address) => {
    const value = address.trim()
    if (!value || addressSet.has(value)) return
    addressSet.add(value)
    result.push(value)
  })
  return result
}

const getFileExtension = (fileName: string) => {
  const extensionIndex = fileName.lastIndexOf('.')
  return extensionIndex >= 0 ? fileName.substring(extensionIndex).toLowerCase() : ''
}

const isExcelFile = (file: File) => EXCEL_FILE_EXTENSIONS.includes(getFileExtension(file.name))

const readFileAsArrayBuffer = (file: File) =>
  new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result)
        return
      }
      reject(new Error('文件读取失败'))
    }
    reader.onerror = () => reject(reader.error || new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })

const isAddressHeader = (value: string) => {
  const lowerValue = value.toLowerCase()
  return ADDRESS_HEADER_KEYWORDS.some((keyword) => lowerValue.includes(keyword))
}

const splitAddressCellText = (value: string) =>
  value
    .split(/[\s,，;；]+/)
    .map((item) => item.trim())
    .filter(Boolean)

const extractAddressCandidates = (value: string, allowRawValue: boolean) => {
  const matchedAddresses = value.match(TRX_ADDRESS_PATTERN)
  if (matchedAddresses?.length) {
    return matchedAddresses
  }

  if (!allowRawValue) return []
  return splitAddressCellText(value).filter((item) => !isAddressHeader(item))
}

const extractAddressesFromWorkbook = (workbook: XLSX.WorkBook) => {
  const addresses: string[] = []

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      blankrows: false,
      defval: ''
    }) as ExcelRow[]

    const headerRowIndex = rows.findIndex((row) =>
      row.some((cell) => isAddressHeader(String(cell || '').trim()))
    )
    const addressColumnIndexes = new Set<number>()

    if (headerRowIndex >= 0) {
      rows[headerRowIndex].forEach((cell, columnIndex) => {
        if (isAddressHeader(String(cell || '').trim())) {
          addressColumnIndexes.add(columnIndex)
        }
      })
    }

    rows.forEach((row, rowIndex) => {
      row.forEach((cell, columnIndex) => {
        const cellText = String(cell || '').trim()
        if (!cellText) return

        const allowRawValue = headerRowIndex >= 0 && rowIndex > headerRowIndex
        addresses.push(
          ...extractAddressCandidates(
            cellText,
            allowRawValue && addressColumnIndexes.has(columnIndex)
          )
        )
      })
    })
  })

  return uniqueAddressList(addresses)
}

const parseAddressExcelFile = async (file: File) => {
  const buffer = await readFileAsArrayBuffer(file)
  const workbook = XLSX.read(buffer, { type: 'array' })
  return extractAddressesFromWorkbook(workbook)
}

const isFileDragEvent = (event: DragEvent) => event.dataTransfer?.types?.includes('Files')

const updateAddressDragMask = (visible: boolean) => {
  showAddressDragMask.value = visible && canParseDroppedAddressFile.value
}

const handleAddressWindowDragEnter = (event: DragEvent) => {
  if (!canParseDroppedAddressFile.value || !isFileDragEvent(event)) return
  event.preventDefault()
  addressDragCounter.value += 1
  updateAddressDragMask(true)
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy'
  }
}

const handleAddressWindowDragOver = (event: DragEvent) => {
  if (!canParseDroppedAddressFile.value || !isFileDragEvent(event)) return
  event.preventDefault()
  updateAddressDragMask(true)
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy'
  }
}

const handleAddressWindowDragLeave = (event: DragEvent) => {
  if (!canParseDroppedAddressFile.value || !isFileDragEvent(event)) return
  event.preventDefault()
  addressDragCounter.value = Math.max(0, addressDragCounter.value - 1)
  if (addressDragCounter.value === 0) {
    updateAddressDragMask(false)
  }
}

const handleAddressWindowDrop = async (event: DragEvent) => {
  if (!canParseDroppedAddressFile.value || !isFileDragEvent(event)) return
  event.preventDefault()
  addressDragCounter.value = 0
  updateAddressDragMask(false)
  const file = Array.from(event.dataTransfer?.files || [])[0]
  if (!file) return

  if (!isExcelFile(file)) {
    handleWarningMessage('只支持 .xlsx 或 .xls 文件')
    return
  }

  try {
    const parsedAddresses = await parseAddressExcelFile(file)
    if (parsedAddresses.length === 0) {
      handleWarningMessage('未解析到地址')
      return
    }

    addressForm.address = uniqueAddressList([...parseAddressList(), ...parsedAddresses]).join('\n')
    await nextTick()
    addressFormRef.value?.clearValidate('address')
    handleSuccessMessage(`已解析 ${parsedAddresses.length} 个地址`)
  } catch (error) {
    handleErrorMessage(error, '解析地址文件失败')
  }
}

const registerAddressGlobalDragEvents = () => {
  window.addEventListener('dragenter', handleAddressWindowDragEnter)
  window.addEventListener('dragover', handleAddressWindowDragOver)
  window.addEventListener('dragleave', handleAddressWindowDragLeave)
  window.addEventListener('drop', handleAddressWindowDrop)
}

const unregisterAddressGlobalDragEvents = () => {
  window.removeEventListener('dragenter', handleAddressWindowDragEnter)
  window.removeEventListener('dragover', handleAddressWindowDragOver)
  window.removeEventListener('dragleave', handleAddressWindowDragLeave)
  window.removeEventListener('drop', handleAddressWindowDrop)
  addressDragCounter.value = 0
  updateAddressDragMask(false)
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
    await reloadTable()
    handleSuccessMessage('删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      handleErrorMessage(error, '删除失败')
    }
  }
}

const submitAddAddresses = async () => {
  if (submitting.value) {
    return
  }

  try {
    await addressFormRef.value?.validate()
    const kind = Number(addressForm.kind)
    const addressList = parseAddressList()
    if (addressList.length === 0) {
      handleWarningMessage('请输入地址')
      return
    }
    if (addressDialogMode.value === 'edit' && addressList.length > 1) {
      handleWarningMessage('编辑时只能填写一个地址')
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
    } else {
      await v2CreateAddress({
        kind,
        agent_id: showAgentField.value ? agentId : undefined,
        bot_id: showBotField.value ? botId : undefined,
        list: addressList,
        expired_at: buildExpiredAtPayload() || undefined
      })
    }
    await reloadTable()
    addressDialogVisible.value = false
    handleSuccessMessage(addressDialogMode.value === 'add' ? '新增成功' : '编辑成功')
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

const handleExport = async () => {
  if (exporting.value) return
  exporting.value = true

  try {
    await exportTableData<V2AddressItem, AddressSearchParams, V2AddressListParams>({
      searchTableRef,
      filename: '地址管理列表',
      fetchData: v2GetAddressList,
      buildParams: buildAddressListParams,
      getList: (res) =>
        (res.data?.list || []).filter((item) =>
          ALLOWED_PAYMENT_ADDRESS_KINDS.has(Number(item.kind))
        ),
      mapItem: (item) => {
        const kindInfo = getAddressKindInfo(item.kind)
        return {
          TRX收款地址: item.address || '-',
          代理信息: formatAgentInfo(item),
          机器人: formatBotInfo(item),
          创建人: item.created_by || '-',
          收款地址类型: kindInfo.label,
          状态: item.agent_id && item.agent_id > 0 ? '已绑定' : '未绑定',
          创建时间: formatTableDateTime(item.created_at),
          修改时间: formatTableDateTime(item.updated_at),
          过期时间: formatTableDateTime(item.expired_at)
        }
      },
      successMessage: '地址导出成功'
    })
  } catch (error) {
    handleErrorMessage(error, '地址导出失败')
  } finally {
    exporting.value = false
  }
}

const handleExportTemplate = async () => {
  try {
    const res = await v2ExportAddressModule()
    if (res.data instanceof Blob) {
      downloadByData(res.data, '地址导入模板.xlsx')
      handleSuccessMessage('模板下载成功')
    } else {
      ElMessage.error('文件数据格式错误')
    }
  } catch (error) {
    handleErrorMessage(error, '模板下载失败')
  }
}

watch(
  () => addressDialogVisible.value,
  (visible) => {
    if (visible) {
      registerAddressGlobalDragEvents()
    } else {
      unregisterAddressGlobalDragEvents()
    }
  }
)

watch(canParseDroppedAddressFile, (enabled) => {
  if (!enabled) {
    addressDragCounter.value = 0
    updateAddressDragMask(false)
  }
})

onMounted(() => {
  getAgentList()
})

onBeforeUnmount(() => {
  unregisterAddressGlobalDragEvents()
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

.kind-instant {
  color: #13c2c2;
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

.address-form-field {
  width: 400px;
  max-width: 100%;
}

.global-drag-mask {
  position: fixed;
  z-index: 3000;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  background: rgb(0 0 0 / 28%);
}

.global-drag-mask__content {
  padding: 16px 28px;
  font-size: 16px;
  font-weight: 500;
  color: #409eff;
  background: #fff;
  border: 1px dashed #409eff;
  border-radius: 4px;
  box-shadow: 0 6px 18px rgb(0 0 0 / 12%);
}
</style>
