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
          <ElFormItem label="收款地址类型:" prop="kind">
            <ElSelect
              v-model="addressForm.kind"
              placeholder="请选择收款地址类型"
              class="w-full"
              :disabled="isAddressKindDisabled"
              @change="handleAddressKindChange"
            >
              <ElOption
                v-for="item in addressKindOptions"
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

      <!-- 批量导入弹窗 (保持不变) -->
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
  ElSelect,
  ElOption,
  ElSelectV2
} from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { Icon } from '@/components/Icon'
import { Dialog } from '@/components/Dialog'
import { Form, FormSchema } from '@/components/Form' // 移除 UploadFile
// import { Search } from '@/components/Search' // 移除
import { useForm } from '@/hooks/web/useForm'
// import { useSearch } from '@/hooks/web/useSearch' // 移除
import { formatToDateTime } from '@/utils/dateUtil'
// import TrxAddressForm from './components/TrxAddressForm.vue' // Commented out
import { BaseButton } from '@/components/Button'
import { SearchTable } from '@/components/SearchTable' // 引入
import type { TableColumn } from '@/components/Table' // 引入
import { downloadByData, downloadByBase64 } from '@/utils/download' // Revert import path

import {
  v2GetAddressList, // 新接口 - 获取列表
  v2CreateAddress, // 新接口 - 创建地址
  v2UpdateAddress, // 新接口 - 更新地址
  v2DeleteAddress, // 新接口 - 删除地址
  v2ExportAddressModule, // 新接口 - 导出模版
  v2BatchImportAddress // 新接口 - 批量导入
} from '@/api/marketing/trx_address'
import { handleErrorMessage, handleSuccessMessage } from '@/utils/messageHelper'
import { v1GetMessageAgentList, v1GetMessageBotList } from '@/api/message'

// Separate imports for clarity

// 表格和表单引用
const searchTableRef = ref<InstanceType<typeof SearchTable> | null>(null) // SearchTable 引用
const submitting = ref(false)
const batchImportVisible = ref(false)
const addressDialogVisible = ref(false)
const addressDialogMode = ref<'add' | 'edit'>('add')
const currentAddress = ref<any>(null)
const addressFormRef = ref<FormInstance>()
const agentList = ref<Array<{ label: string; value: number }>>([])
const botList = ref<Array<{ label: string; value: number; agent_id: number }>>([])

const addressForm = reactive({
  kind: 1,
  agent_id: undefined as number | undefined,
  bot_id: undefined as number | undefined,
  address: ''
})

// 使用表单Hook - 导入表单
const { formRegister: importFormRegister, formMethods: importFormMethods } = useForm()

const addressKindMap: Record<number, { label: string; className: string }> = {
  1: { label: '代理余额充值', className: 'kind-agent' },
  2: { label: '用户余额充值', className: 'kind-user' },
  3: { label: '闪兑', className: 'kind-exchange' },
  4: { label: '闪租能量', className: 'kind-flash' },
  5: { label: '笔数能量', className: 'kind-count' },
  6: { label: '福利能量', className: 'kind-welfare' }
}

const addressKindOptions = Object.entries(addressKindMap).map(([value, item]) => ({
  label: item.label,
  value: Number(value)
}))

const allowedAddressKinds = new Set(addressKindOptions.map((item) => item.value))

const isAddressKindDisabled = computed(() => addressDialogMode.value !== 'add')

const showAgentField = computed(() => {
  const kind = Number(addressForm.kind)
  if (addressDialogMode.value === 'edit') {
    return kind === 1
  }
  return ![1, 6].includes(kind)
})

const showBotField = computed(() => {
  const kind = Number(addressForm.kind)
  if (addressDialogMode.value === 'edit') {
    return false
  }
  return ![1, 6].includes(kind)
})

const isMultiAddressKind = computed(() => [1, 6].includes(Number(addressForm.kind)))

const isAddressTextarea = computed(
  () => addressDialogMode.value === 'add' && isMultiAddressKind.value
)

const isAgentRequired = computed(
  () =>
    showAgentField.value && !(addressDialogMode.value === 'edit' && Number(addressForm.kind) === 1)
)

const isBotRequired = computed(() => showBotField.value)

const addressDialogTitle = computed(() =>
  addressDialogMode.value === 'add' ? '新增地址' : '编辑地址'
)

const filteredBotList = computed(() => botList.value)

const validateAgent = (
  _rule: any,
  value: number | undefined,
  callback: (error?: Error) => void
) => {
  if (!isAgentRequired.value || value) {
    callback()
    return
  }
  callback(new Error('请选择代理'))
}

const validateBot = (_rule: any, value: number | undefined, callback: (error?: Error) => void) => {
  if (!isBotRequired.value || value) {
    callback()
    return
  }
  callback(new Error('请选择机器人'))
}

const addressFormRules: FormRules = {
  kind: [{ required: true, message: '请选择收款地址类型', trigger: 'change' }],
  agent_id: [{ validator: validateAgent, trigger: 'change' }],
  bot_id: [{ validator: validateBot, trigger: 'change' }],
  address: [{ required: true, message: '请输入地址', trigger: 'blur' }]
}

const getAddressKindInfo = (kind: number | string) => {
  const kindValue = Number(kind)
  return (
    addressKindMap[kindValue] || {
      label: kind ? `未知类型(${kind})` : '-',
      className: 'kind-default'
    }
  )
}

// 表格列配置 - 根据新接口 v2 的响应字段调整
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
    formatter: (row) => {
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
    formatter: (row) => {
      return row.bot_user_name || row.bot_name || row.user_name || '——'
    }
  },
  {
    field: 'created_by',
    label: '创建人',
    width: '120px',
    formatter: (row) => row.created_by || '-'
  },
  {
    field: 'kind',
    label: '收款地址类型',
    minWidth: '220px',
    formatter: (row) => {
      const kindInfo = getAddressKindInfo(row.kind)
      return <span class={['address-kind', kindInfo.className]}>{kindInfo.label}</span>
    }
  },
  {
    field: 'status',
    label: '状态',
    width: '100px',
    formatter: (row) => {
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
    formatter: (row) => formatToDateTime(row.created_at * 1000) // Unix时间戳转换
  },
  {
    field: 'updated_at',
    label: '修改时间',
    sortable: 'custom',
    width: '180px',
    formatter: (row) => formatToDateTime(row.updated_at * 1000) // Unix时间戳转换
  },
  {
    label: '操作',
    field: 'action',
    width: '160px',
    fixed: 'right',
    showOverflowTooltip: false,
    formatter: (row) => {
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
    label: '收款地址类型',
    componentProps: {
      placeholder: '全部',
      clearable: true,
      options: addressKindOptions
    }
  }
])

// 数据获取函数，供 SearchTable 使用
const fetchData = async (params) => {
  try {
    // 处理关键字：如果包含括号，删除括号及后面的所有内容
    const processedParams = { ...params }
    if (processedParams.keyword) {
      // 删除括号及后面的内容，例如 "代理名称 (邮箱)" -> "代理名称"
      processedParams.keyword = processedParams.keyword.replace(/\s*[\(（].*$/g, '').trim()
    }

    // 处理排序参数
    if (params.order) {
      const fieldMapping: Record<string, string> = {
        created_at: 'created_at',
        updated_at: 'updated_at'
      }

      const orderParts = params.order.split(' ')
      if (orderParts.length === 2) {
        const [field, direction] = orderParts
        const mappedField = fieldMapping[field] || field
        processedParams.order = `${mappedField} ${direction}`
      }
    }

    const res = await v2GetAddressList(processedParams)
    const data = res.data || {}
    const list = (data.list || []).filter((item) => allowedAddressKinds.has(Number(item.kind)))

    // 新接口返回的数据结构：{ list: [...], pager: { current_page, page_size, total } }
    // SearchTable 需要的格式：{ list: [...], totalCount: number }
    return {
      list,
      totalCount: data.pager?.total || 0
    }
  } catch (error) {
    handleErrorMessage(error, '获取地址列表失败')
    return { list: [], totalCount: 0 }
  }
}

// --- Agent List Loading ---
const getAgentList = async (bound?: boolean) => {
  try {
    const res = await v1GetMessageAgentList(bound === undefined ? undefined : { bound })
    agentList.value = (res.data || []).map((agent: any) => ({
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
    botList.value = (res.data || []).map((bot: any) => ({
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
    address: ''
  })
  addressDialogVisible.value = true
  nextTick(() => {
    addressFormRef.value?.clearValidate()
  })
}

const handleEdit = (row: any) => {
  addressDialogMode.value = 'edit'
  currentAddress.value = row
  const kind = Number(row.kind) || 1
  if (kind === 1) {
    getAgentList(false)
  }
  getBotList()
  Object.assign(addressForm, {
    kind,
    agent_id: row.agent_id ? Number(row.agent_id) : undefined,
    bot_id: row.bot_id ? Number(row.bot_id) : undefined,
    address: row.address || ''
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
    const formDataRaw = await importFormMethods.getFormData()
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
  } catch (error: any) {
    console.error('批量导入失败:', error)
    // 检查是否有返回的错误文件
    if (error?.data instanceof Blob) {
      downloadByBase64(error.data, '批量导入失败.xlsx')
      ElMessage.error('批量导入失败，请查看下载的错误文件')
    } else {
      handleErrorMessage(error, '批量导入失败')
    }
  } finally {
    submitting.value = false
  }
}

// 删除地址
const handleDelete = async (row) => {
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
    const agentId = showAgentField.value
      ? Number(addressForm.agent_id || 0)
      : Number(currentAddress.value?.agent_id || 0)
    const botId = showBotField.value
      ? Number(addressForm.bot_id || 0)
      : Number(currentAddress.value?.bot_id || 0)

    submitting.value = true
    if (addressDialogMode.value === 'edit' && currentAddress.value?.id) {
      await v2UpdateAddress({
        ...currentAddress.value,
        id: currentAddress.value.id,
        address,
        kind,
        agent_id: agentId,
        bot_id: botId
      })
      handleSuccessMessage('编辑成功')
    } else {
      await v2CreateAddress({
        kind,
        agent_id: showAgentField.value ? agentId : undefined,
        bot_id: showBotField.value ? botId : undefined,
        list: addressList
      })
      handleSuccessMessage('新增成功')
    }
    addressDialogVisible.value = false
    reloadTable()
  } catch (error: any) {
    if (error === false) return
    const errorCode = error?.code
    const errorMsg = error?.msg || error?.message || ''

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
