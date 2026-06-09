<template>
  <div class="app-container">
    <ContentWrap>
      <SearchTable
        ref="searchTableRef"
        :columns="columns"
        :searchSchema="searchSchema"
        :fetchDataApi="getAgentList"
        @selection-change="handleSelectionChange"
        :show-add-button="false"
        :pagination="{ pageSize: 8, pageSizes: [8, 10, 20, 30, 50, 100] }"
      >
        <template #leftToolbar>
          <BaseButton type="primary" @click="handleAddAgent">新增代理</BaseButton>
          <template v-if="!isBatchEditMode">
            <BaseButton type="warning" @click="handleBatchEdit">批量修改</BaseButton>
            <BaseButton type="success" @click="handleNotifyBot">通知机器人</BaseButton>
          </template>
          <template v-else>
            <BaseButton type="success" @click="handleBatchSave">保存</BaseButton>
            <BaseButton @click="handleBatchCancel">取消</BaseButton>
          </template>
        </template>
        <template #searchButtons>
          <BaseButton type="primary" @click="handleExport">
            <Icon icon="ep:download" class="mr-5px" />
            导出
          </BaseButton>
        </template>
        <template #beforeTable>
          <div v-if="agentStats" class="agent-stats-row">
            <div class="stat-box">
              <div class="stat-label">代理数量</div>
              <div class="stat-value">{{ agentTotal }}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">代理余额</div>
              <div class="stat-value">{{ formatStatNum(agentStats.sum_balance_trx) }}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">关注量</div>
              <div class="stat-value">{{ agentStats.sum_user_count ?? 0 }}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">机器人数量</div>
              <div class="stat-value">{{ agentStats.sum_bot_count ?? 0 }}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">代理收入TRX</div>
              <div class="stat-value">{{ formatStatNum(agentStats.sum_income_trx) }}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">代理收入USDT</div>
              <div class="stat-value">{{ formatStatNum(agentStats.sum_income_usdt) }}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">代理充值</div>
              <div class="stat-value">{{ formatStatNum(agentStats.sum_deposit_trx) }}</div>
              <div class="stat-sub">只统计线上数据</div>
            </div>
          </div>
        </template>
      </SearchTable>
    </ContentWrap>

    <RechargeDialog
      v-model:visible="rechargeDialogVisible"
      :user="currentAccount"
      @success="handleRechargeSuccess"
    />

    <NotifyBotDialog v-model:visible="notifyBotDialogVisible" />

    <AgentForm ref="agentFormRef" @success="handleAgentSuccess" @error="handleAgentError" />
  </div>
</template>

<script setup lang="tsx">
import { ref, nextTick, reactive, computed, h } from 'vue'
import {
  ElMessage,
  ElSelect,
  ElOption,
  ElSwitch,
  ElAutocomplete,
  ElForm,
  ElFormItem,
  ElLink
} from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useRouter } from 'vue-router'
import { SearchTable } from '@/components/SearchTable'
import type { SearchTableExpose } from '@/components/SearchTable'
import type { FormSchema } from '@/components/Form'
import type { TableColumn } from '@/components/Table'
import {
  getAgentListApi,
  updateAgentApi,
  batchUpdateAgentApi,
  type AgentQueryParams,
  type AgentItem,
  type AgentStats,
  type UpdateAgentPayload
} from '@/api/opertion/Agent/AgentList'
import { ContentWrap } from '@/components/ContentWrap'
import { BaseButton } from '@/components/Button'
import RechargeDialog from '../components/RechargeDialog.vue'
import AgentForm from '../components/AgentForm.vue'
import NotifyBotDialog from '../components/NotifyBotDialog.vue'
import { handleListMessage, handleErrorMessage, handleSuccessMessage } from '@/utils/messageHelper'
import {
  createDefaultDateTimeRange,
  createPageParams,
  dateRangeToSeconds,
  exportTableData,
  formatTableDateTime,
  getStatusLabel,
  hasSearchValue
} from '@/utils/tableHelpers'
import {
  AGENT_LEVEL_LABELS,
  AGENT_LEVEL_OPTIONS,
  AGENT_LEVEL_SEARCH_OPTIONS,
  AGENT_STATUS_MAP,
  AGENT_STATUS_OPTIONS,
  BATCH_AGENT_LEVEL_OPTIONS
} from '../constants'

// 状态管理
const router = useRouter()
const searchTableRef = ref<SearchTableExpose | null>(null)
const agentFormRef = ref<InstanceType<typeof AgentForm>>()
const rechargeDialogVisible = ref(false)
const currentAccount = ref<AgentItem>()

// 通知机器人弹窗
const notifyBotDialogVisible = ref(false)

// 代理统计数据
const agentStats = ref<AgentStats | null>(null)
const agentTotal = ref(0)

// 批量修改状态
const isBatchEditMode = ref(false)
const selectedAgentIds = ref<number[]>([])
const batchPriceId = ref<number>(0) // 0 表示未选择

// 联系方式编辑状态
const editingEmailId = ref<number | null>(null)
const editingEmailValue = ref('')
const emailFormData = reactive({ email: '' })
const emailFormRef = ref<FormInstance>()
let autoExitTimer: ReturnType<typeof setTimeout> | null = null

type AgentDateRange = [string | number | Date, string | number | Date]
type AgentSearchParams = AgentQueryParams & {
  dateRange?: AgentDateRange
}

interface EmailSuggestion {
  value: string
}

const emailRules: FormRules<typeof emailFormData> = {
  email: [
    {
      validator: (_rule: unknown, value: string, callback: (error?: Error) => void) => {
        if (!value) {
          callback()
          return
        }
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
        if (!emailRegex.test(value)) {
          callback(new Error('请输入正确的邮箱格式'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 常用邮箱后缀
const EMAIL_SUFFIXES = [
  '@qq.com',
  '@gmail.com',
  '@163.com',
  '@126.com',
  '@sina.com',
  '@outlook.com',
  '@hotmail.com',
  '@yahoo.com'
]

// 导出
const handleExport = async () => {
  try {
    await exportTableData<AgentItem, AgentSearchParams, AgentQueryParams>({
      searchTableRef,
      filename: '代理列表',
      fetchData: getAgentListApi,
      buildParams: buildAgentListParams,
      mapItem: (item) => ({
        联系方式: item.email || '-',
        代理名称: item.username || '-',
        代理等级: getAgentLevelText(item.price_id),
        机器人数量: item.bot_count ?? 0,
        总用户数: item.user_count ?? 0,
        TRX余额: item.trx_balance ? parseFloat(item.trx_balance).toFixed(2) : '-',
        TRX收入: item.trx_income ?? '0',
        USDT收入: item.usdt_income ?? '0',
        是否赠送带宽: item.gift_bandwidth ? '赠送' : '不赠送',
        状态: getStatusLabel(AGENT_STATUS_MAP, item.status, '未知'),
        创建时间: formatTableDateTime(item.created_at)
      })
    })
  } catch (error) {
    handleErrorMessage(error, '导出失败')
  }
}

const buildAgentListParams = (
  params: AgentSearchParams = {},
  pageSize?: number
): AgentQueryParams => {
  const apiParams: AgentQueryParams = {
    ...createPageParams(params, 8, pageSize)
  }

  if (params.keyword) apiParams.keyword = params.keyword
  if (hasSearchValue(params.status)) apiParams.status = params.status
  if (hasSearchValue(params.price_id)) apiParams.price_id = params.price_id
  if (params.order) apiParams.order = params.order

  return {
    ...apiParams,
    ...dateRangeToSeconds(params.dateRange)
  }
}

const buildUpdatePayload = (
  id: number | string,
  row: AgentItem,
  updates: Partial<UpdateAgentPayload>
): UpdateAgentPayload => ({
  id,
  email: row.email || undefined,
  gift_bandwidth: row.gift_bandwidth,
  status: row.status,
  price_id: row.price_id,
  ...updates
})

const resetBatchEditState = () => {
  isBatchEditMode.value = false
  selectedAgentIds.value = []
  batchPriceId.value = 0
}

const getAgentLevelText = (priceId?: number): string => {
  return priceId ? AGENT_LEVEL_LABELS[priceId] || '未设置' : '未设置'
}

const formatStatNum = (value?: string | number): string => {
  if (value === undefined || value === null || value === '') return '0'
  const num = Number(value)
  if (isNaN(num)) return '0'
  return num.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

const getAgentList = async (
  params: AgentSearchParams = {}
): Promise<{ list: AgentItem[]; total: number }> => {
  try {
    const res = await getAgentListApi(buildAgentListParams(params))
    const data = res?.data
    const list = data?.list || []
    const total = data?.pager?.total || 0

    if (data.stats) {
      agentStats.value = data.stats
    }
    agentTotal.value = total

    const hasSearchCondition = [
      params.keyword,
      params.status,
      params.price_id,
      params.dateRange
    ].some(hasSearchValue)
    handleListMessage(list, hasSearchCondition, '代理')

    return {
      list: list,
      total: total
    }
  } catch (error) {
    handleErrorMessage(error, '获取代理列表失败')
    return { list: [], total: 0 }
  }
}

const updateAgentStatus = async (id: number | string, status: number, row: AgentItem) => {
  try {
    await updateAgentApi(buildUpdatePayload(id, row, { status }))
    handleSuccessMessage(status === 1 ? '启用成功' : '禁用成功')
    searchTableRef.value?.reload()
  } catch (error) {
    handleErrorMessage(error, '更新代理状态失败')
  }
}

// 更新代理等级
const updateAgentLevel = async (id: number | string, priceId: number, row: AgentItem) => {
  try {
    await updateAgentApi(buildUpdatePayload(id, row, { price_id: priceId }))
    handleSuccessMessage('代理等级更新成功')
    searchTableRef.value?.reload()
  } catch (error) {
    handleErrorMessage(error, '更新代理等级失败')
  }
}

// 更新是否赠送带宽
const updateGiftBandwidth = async (id: number | string, giftBandwidth: boolean, row: AgentItem) => {
  try {
    await updateAgentApi(buildUpdatePayload(id, row, { gift_bandwidth: giftBandwidth }))
    handleSuccessMessage(giftBandwidth ? '已开启赠送带宽' : '已关闭赠送带宽')
    searchTableRef.value?.reload()
  } catch (error) {
    handleErrorMessage(error, '更新赠送带宽状态失败')
    searchTableRef.value?.reload()
  }
}

// 联系方式编辑相关函数
const handleEmailDoubleClick = (row: AgentItem) => {
  // 清除之前的定时器
  if (autoExitTimer) {
    clearTimeout(autoExitTimer)
    autoExitTimer = null
  }

  editingEmailId.value = row.id
  editingEmailValue.value = row.email || ''
  emailFormData.email = row.email || ''

  // 下一帧自动聚焦到输入框
  nextTick(() => {
    const autocomplete = document.querySelector(
      '.email-edit-wrapper .el-autocomplete input'
    ) as HTMLInputElement
    if (autocomplete) {
      autocomplete.focus()
      // 将光标移到末尾
      autocomplete.setSelectionRange(autocomplete.value.length, autocomplete.value.length)
    }
  })
}

// el-autocomplete 的查询建议函数
const queryEmailSuggestions = (
  queryString: string,
  cb: (suggestions: EmailSuggestion[]) => void
) => {
  if (!queryString) {
    cb([])
    return
  }

  // 如果已经包含 @，只返回当前输入
  if (queryString.includes('@')) {
    cb([{ value: queryString }])
    return
  }

  // 根据输入的前缀生成建议列表
  const suggestions = EMAIL_SUFFIXES.map((suffix) => ({
    value: queryString + suffix
  }))

  cb(suggestions)
}

// 处理选择建议
const handleSelectSuggestion = (item: { value: string }) => {
  editingEmailValue.value = item.value
  emailFormData.email = item.value
}

// 输入时更新值
const handleEmailInput = (value: string) => {
  editingEmailValue.value = value
  emailFormData.email = value

  // 清除自动退出定时器(用户正在输入)
  if (autoExitTimer) {
    clearTimeout(autoExitTimer)
    autoExitTimer = null
  }

  // 检查邮箱格式
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  const isValidEmail = !value || emailRegex.test(value)

  // 如果格式错误，启动5秒自动退出定时器
  if (!isValidEmail) {
    autoExitTimer = setTimeout(() => {
      editingEmailId.value = null
      autoExitTimer = null
    }, 5000)
  }
}

const handleEmailBlur = async (row: AgentItem) => {
  // 延迟关闭,以便点击建议时能触发
  setTimeout(async () => {
    // 验证表单
    try {
      await emailFormRef.value?.validate()
    } catch (error) {
      // 验证失败,不保存
      return
    }

    // 如果值没有变化,直接取消编辑
    if (emailFormData.email === (row.email || '')) {
      editingEmailId.value = null
      return
    }

    // 更新邮箱
    try {
      await updateAgentApi(
        buildUpdatePayload(row.id, row, { email: emailFormData.email || undefined })
      )
      handleSuccessMessage('联系方式更新成功')
      editingEmailId.value = null
      searchTableRef.value?.reload()
    } catch (error) {
      handleErrorMessage(error, '更新联系方式失败')
      editingEmailId.value = null
    }
  }, 200)
}

// 处理表格选择变化
const handleSelectionChange = (selection: AgentItem[]) => {
  selectedAgentIds.value = selection.map((item) => item.id)
}

// 表单配置
const searchSchema = ref<FormSchema[]>([
  {
    field: 'keyword',
    component: 'Input',
    label: '关键字',
    componentProps: {
      placeholder: '联系方式/代理名称'
    }
  },
  {
    field: 'status',
    component: 'Select',
    label: '状态',
    componentProps: {
      placeholder: '请选择状态',
      clearable: true,
      options: AGENT_STATUS_OPTIONS
    }
  },
  {
    field: 'price_id',
    component: 'Select',
    label: '代理等级',
    componentProps: {
      placeholder: '请选择代理等级',
      clearable: true,
      options: AGENT_LEVEL_SEARCH_OPTIONS
    }
  },
  {
    field: 'dateRange',
    component: 'DatePicker',
    label: '创建时间',
    componentProps: {
      type: 'datetimerange',
      valueFormat: 'x',
      startPlaceholder: '开始日期',
      endPlaceholder: '结束日期',
      defaultTime: createDefaultDateTimeRange()
    }
  }
])

// 表格列配置
const columns = computed<TableColumn[]>(() => [
  // 批量修改模式下的复选框列
  {
    field: 'selection',
    label: '',
    type: 'selection',
    width: '55px',
    align: 'center',
    headerAlign: 'center',
    hidden: !isBatchEditMode.value
  },
  {
    field: 'username',
    label: '代理用户名',
    minWidth: 120,
    formatter: (row: AgentItem) => row.username || '-'
  },
  {
    field: 'email',
    label: '代理邮箱',
    minWidth: 180,
    formatter: (row: AgentItem) => {
      const isEditing = editingEmailId.value === row.id
      if (isEditing) {
        return (
          <div class="email-edit-wrapper">
            <ElForm ref={emailFormRef} model={emailFormData} rules={emailRules}>
              <ElFormItem prop="email">
                <ElAutocomplete
                  modelValue={emailFormData.email}
                  onInput={(val: string) => handleEmailInput(val)}
                  fetchSuggestions={queryEmailSuggestions}
                  clearable
                  onSelect={handleSelectSuggestion}
                  onBlur={() => handleEmailBlur(row)}
                  style="width: 100%"
                >
                  {{
                    default: ({ item }: { item: { value: string } }) => (
                      <div class="suggestion-item">{item.value}</div>
                    )
                  }}
                </ElAutocomplete>
              </ElFormItem>
            </ElForm>
          </div>
        )
      }
      return (
        <div class="email-display" onDblclick={() => handleEmailDoubleClick(row)}>
          {row.email || '-'}
        </div>
      )
    }
  },
  {
    field: 'price_id',
    label: '代理等级',
    minWidth: 145,
    slots: {
      header: () => {
        // 批量修改模式下，表头只显示下拉选择框
        if (isBatchEditMode.value) {
          return (
            <div
              style="display: flex; align-items: center; justify-content: center;"
              onClick={(e: Event) => {
                // 只阻止点击 div 本身时的排序，不阻止下拉框的点击
                if ((e.target as HTMLElement).tagName === 'DIV') {
                  e.stopPropagation()
                }
              }}
            >
              <ElSelect
                modelValue={batchPriceId.value}
                onChange={(value: number) => handleBatchPriceLevelChange(value)}
                size="small"
                placeholder="选择等级"
                style="width: 100px"
              >
                {BATCH_AGENT_LEVEL_OPTIONS.map((option) => (
                  <ElOption key={option.value} label={option.label} value={option.value} />
                ))}
              </ElSelect>
            </div>
          )
        }
        return <span>代理等级</span>
      }
    },
    formatter: (row: AgentItem) => {
      // 批量修改模式下，单元格只显示文本
      if (isBatchEditMode.value) {
        return getAgentLevelText(row.price_id)
      }
      // 正常模式下，显示下拉选择框
      return (
        <ElSelect
          modelValue={row.price_id || 1}
          onChange={(value: number) => updateAgentLevel(row.id, value, row)}
          size="small"
          style="width: 120px"
        >
          {AGENT_LEVEL_OPTIONS.map((option) => (
            <ElOption key={option.value} label={option.label} value={option.value} />
          ))}
        </ElSelect>
      )
    }
  },
  {
    field: 'notify_chat_id',
    label: '代理TG_ID',
    minWidth: 130,
    formatter: (row: AgentItem) => row.notify_chat_id || '未开启'
  },
  {
    field: 'notify_threshold',
    label: '提醒阈值',
    minWidth: 110,
    formatter: (row: AgentItem) =>
      row.notify_threshold !== undefined &&
      row.notify_threshold !== null &&
      row.notify_threshold !== ''
        ? row.notify_threshold
        : '未开启'
  },
  {
    field: 'bot_count',
    label: '机器人数量',
    minWidth: 110,
    slots: {
      default: ({ row }: { row: AgentItem }) => {
        const count = row.bot_count ?? 0
        return h(
          ElLink,
          {
            type: 'primary',
            onClick: () =>
              router.push({ path: '/agent/bot_list', query: { keyword: row.username, status: '' } })
          },
          () => count
        )
      }
    }
  },
  {
    field: 'user_count',
    label: '总用户数',
    minWidth: 100,
    slots: {
      default: ({ row }: { row: AgentItem }) => {
        const count = row.user_count ?? 0
        return h(
          ElLink,
          {
            type: 'primary',
            onClick: () =>
              router.push({ path: '/agent/user_list', query: { keyword: row.username } })
          },
          () => count
        )
      }
    }
  },
  {
    field: 'trx_balance',
    label: 'TRX余额',
    minWidth: 110,
    sortable: 'custom',
    formatter: (row: AgentItem) => {
      const val = parseFloat(row.trx_balance)
      return isNaN(val) ? '-' : val.toFixed(2)
    }
  },
  {
    field: 'trx_income',
    label: '代理收入TRX',
    minWidth: 100,
    formatter: (row: AgentItem) => row.trx_income ?? '0'
  },
  {
    field: 'usdt_income',
    label: '代理收入USDT',
    minWidth: 110,
    formatter: (row: AgentItem) => row.usdt_income ?? '0'
  },
  {
    field: 'gift_bandwidth',
    label: '是否赠送带宽',
    minWidth: 140,
    formatter: (row: AgentItem) => {
      return (
        <ElSwitch
          modelValue={row.gift_bandwidth}
          onChange={(value: boolean) => updateGiftBandwidth(row.id, value, row)}
          activeText="赠送"
          inactiveText="不赠送"
          inline-prompt
        />
      )
    }
  },
  {
    field: 'status',
    label: '状态',
    minWidth: 110,
    formatter: (row: AgentItem) => {
      return (
        <ElSwitch
          modelValue={row.status === 1}
          onChange={(value: boolean) => updateAgentStatus(row.id, value ? 1 : 2, row)}
          activeText="启用"
          inactiveText="禁用"
          inline-prompt
        />
      )
    }
  },
  {
    field: 'created_at',
    label: '创建时间',
    minWidth: 170,
    sortable: 'custom',
    formatter: (row: AgentItem) => formatTableDateTime(row.created_at)
  },
  {
    field: 'action',
    label: '操作',
    minWidth: 180,
    fixed: 'right',
    formatter: (row: AgentItem) => renderActionButtons(row)
  }
])

// 渲染操作按钮
const renderActionButtons = (row: AgentItem) => {
  return (
    <div class="action-buttons">
      <BaseButton type="primary" onClick={() => handleEditAgent(row)}>
        修改密码
      </BaseButton>
      <BaseButton type="primary" onClick={() => handleRecharge(row)}>
        充值
      </BaseButton>
    </div>
  )
}

// 事件处理
const handleAddAgent = () => {
  agentFormRef.value?.openDialog('add')
}

const handleBatchEdit = () => {
  resetBatchEditState()
  isBatchEditMode.value = true
}

// 通知机器人
const handleNotifyBot = () => {
  notifyBotDialogVisible.value = true
}

const handleBatchSave = async () => {
  if (!selectedAgentIds.value.length) {
    ElMessage.warning('请先选择要修改的代理')
    return
  }

  if (batchPriceId.value === 0) {
    ElMessage.warning('请选择要修改的代理等级')
    return
  }

  try {
    await batchUpdateAgentApi({
      ids: selectedAgentIds.value,
      price_id: batchPriceId.value
    })
    handleSuccessMessage(`成功修改 ${selectedAgentIds.value.length} 个代理的等级`)
    resetBatchEditState()
    searchTableRef.value?.reload()
  } catch (error) {
    handleErrorMessage(error, '批量修改代理等级失败')
  }
}

const handleBatchCancel = () => {
  resetBatchEditState()
}

// 批量修改代理等级（只保存选择）
const handleBatchPriceLevelChange = (priceId: number) => {
  batchPriceId.value = priceId
}

const handleEditAgent = (row: AgentItem) => {
  const editData = {
    id: row.id,
    username: row.username,
    email: row.email || undefined,
    status: row.status,
    gift_bandwidth: row.gift_bandwidth ? 1 : 0, // 保留用于编辑时保持原值
    price_id: row.price_id // 保留用于编辑时保持原值
  }
  agentFormRef.value?.openDialog('edit', editData)
}

const handleRecharge = (row: AgentItem) => {
  currentAccount.value = row
  rechargeDialogVisible.value = true
}

const handleRechargeSuccess = (amount: number) => {
  ElMessage.success(`充值成功 ${amount} TRX`)
  searchTableRef.value?.reload()
}

const handleAgentSuccess = () => {
  searchTableRef.value?.reload()
}

const handleAgentError = (error: { type: 'add' | 'edit'; error: unknown }) => {
  handleErrorMessage(error.error, `代理${error.type === 'add' ? '新增' : '编辑'}失败`)
}
</script>

<style scoped>
.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-buttons .el-button {
  margin: 0;
}

/* 联系方式编辑样式 */
.email-display {
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.email-display:hover {
  background-color: #f5f7fa;
}

.email-edit-wrapper {
  width: 100%;
}

.email-edit-wrapper .el-form {
  margin: 0;
}

.email-edit-wrapper .el-form-item {
  margin-bottom: 0;
}

.email-edit-wrapper .el-autocomplete {
  width: 100%;
}

.suggestion-item {
  padding: 4px 0;
  font-size: 14px;
}

/* 代理统计盒子 */
.agent-stats-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.stat-box {
  min-width: 120px;
  padding: 12px 16px;
  text-align: center;
  background: #fff;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  flex: 1;
}

.stat-label {
  margin-bottom: 6px;
  font-size: 13px;
  color: #909399;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.stat-sub {
  margin-top: 4px;
  font-size: 11px;
  color: #c0c4cc;
}
</style>
