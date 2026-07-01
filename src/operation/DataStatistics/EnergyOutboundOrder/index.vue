<template>
  <div class="app-container energy-outbound-page">
    <ContentWrap>
      <SearchTable
        ref="searchTableRef"
        :columns="columns"
        :search-schema="searchSchema"
        :fetch-data-api="fetchEnergyOutboundOrderList"
        :showAddButton="false"
        :default-params="defaultParams"
        :search-props="searchProps"
        :table-props="tableProps"
      >
        <template #beforeTable>
          <div class="summary-grid">
            <div v-for="card in summaryCards" :key="card.key" class="summary-card">
              <div class="summary-label">{{ card.label }}</div>
              <div class="summary-value" :class="card.valueClass">{{ card.value }}</div>
            </div>
          </div>
        </template>
      </SearchTable>

      <Dialog v-model="detailVisible" title="能量出账订单详情" width="760px">
        <div v-if="currentDetail" class="detail-grid">
          <div v-for="item in detailItems" :key="item.label" class="detail-item">
            <span class="detail-label">{{ item.label }}</span>
            <span class="detail-value">{{ item.value }}</span>
          </div>
        </div>
        <template #footer>
          <div class="dialog-footer">
            <BaseButton @click="detailVisible = false">关闭</BaseButton>
          </div>
        </template>
      </Dialog>
    </ContentWrap>
  </div>
</template>

<script setup lang="tsx">
import { computed, h, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ContentWrap } from '@/components/ContentWrap'
import { SearchTable } from '@/components/SearchTable'
import type { SearchTableExpose } from '@/components/SearchTable'
import { Dialog } from '@/components/Dialog'
import { BaseButton } from '@/components/Button'
import type { TableColumn } from '@/components/Table'
import type { FormSchema } from '@/components/Form'
import {
  getEnergyOutboundOrderList,
  type EnergyOutboundOrderItem,
  type EnergyOutboundOrderListParams,
  type EnergyOutboundOrderListResponse,
  type EnergyOutboundOrderSummary
} from '@/api/opertion/DataStatistics/EnergyOutboundOrder'
import { handleErrorMessage, handleListMessage } from '@/utils/messageHelper'
import {
  createPageParams,
  dateRangeToSeconds,
  formatTableDateTime,
  getStatusLabel,
  hasSearchValue,
  renderStatusTag,
  type DateRangeValue,
  type TableSlot
} from '@/utils/tableHelpers'
import { SETTLEMENT_RECORD_STATUS_MAP } from '@/operation/FinancialManage/constants'

interface SummaryStats {
  settlementCount: number
  expenseAmount: number
  energyAmount: number
}

interface DetailDisplayItem {
  label: string
  value: string
}

type EnergyOutboundTableSlot = TableSlot<EnergyOutboundOrderItem>
type EnergyOutboundSearchParams = EnergyOutboundOrderListParams &
  Recordable & {
    outbound_date?: DateRangeValue
  }

const router = useRouter()
const searchTableRef = ref<SearchTableExpose | null>(null)
const detailVisible = ref(false)
const currentDetail = ref<EnergyOutboundOrderItem | null>(null)
const DEFAULT_CREATED_AT_ORDER = 'created_at DESC'

const defaultParams = { order: DEFAULT_CREATED_AT_ORDER }
const tableProps = { defaultSort: { prop: 'created_at', order: 'descending' } }
const searchProps = { layout: 'inline', buttonPosition: 'center' }

const summaryStats = ref<SummaryStats>({ settlementCount: 0, expenseAmount: 0, energyAmount: 0 })

const toNumber = (value: unknown) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

const pickValue = <T extends Record<string, unknown>>(record: T | undefined, keys: string[]) => {
  if (!record) return undefined
  for (const key of keys) {
    const value = record[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

const formatNumber = (value: unknown, fractionDigits = 0) => {
  return toNumber(value).toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  })
}

const formatMoney = (value: unknown) => formatNumber(value, 6).replace(/\.0+$/, '')
const getOrderId = (row: EnergyOutboundOrderItem) => row.order_id || row.id || 0
const getPeriod = (row: EnergyOutboundOrderItem) => row.period || row.settlement_period || '-'
const getExpenseAmount = (row: EnergyOutboundOrderItem) =>
  pickValue(row as Record<string, unknown>, ['expense', 'profit'])
const getRemark = (row: EnergyOutboundOrderItem) => row.describe || row.remark || '-'

const formatDuration = (duration: number | string | undefined) => {
  if (duration === undefined || duration === null || duration === '') return '-'
  if (typeof duration === 'string' && Number.isNaN(Number(duration))) return duration
  const ns = Number(duration)
  if (!Number.isFinite(ns) || ns <= 0) return '-'
  const totalSeconds = Math.floor(ns / 1000000000)
  const totalMinutes = Math.floor(totalSeconds / 60)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  const parts: string[] = []
  if (days > 0) parts.push(`${days}天`)
  if (hours > 0) parts.push(`${hours}小时`)
  if (minutes > 0 && days === 0) parts.push(`${minutes}分钟`)
  return parts.length > 0 ? parts.join('') : '-'
}

const formatTxid = (txid?: string) => {
  if (!txid) return '-'
  if (txid.length <= 20) return txid
  return `${txid.slice(0, 8)}******${txid.slice(-10)}`
}

const summaryCards = computed(() => [
  {
    key: 'count',
    label: '结算笔数',
    value: formatNumber(summaryStats.value.settlementCount),
    valueClass: ''
  },
  {
    key: 'expense',
    label: '结算支出（TRX）',
    value: formatMoney(summaryStats.value.expenseAmount),
    valueClass: 'green-value'
  },
  {
    key: 'energy',
    label: '收购能量数量',
    value: formatNumber(summaryStats.value.energyAmount, 2),
    valueClass: 'orange-value'
  }
])

const detailItems = computed<DetailDisplayItem[]>(() => {
  const row = currentDetail.value
  if (!row) return []
  return [
    { label: '订单ID', value: String(getOrderId(row) || '-') },
    { label: '代理名称', value: row.agent_name || '-' },
    { label: '机器人名称', value: row.bot_name || '-' },
    { label: '结算周期', value: getPeriod(row) },
    { label: '数量', value: formatNumber(row.amount) },
    { label: 'SUN/天', value: String(row.price ?? '-') },
    { label: '时长', value: formatDuration(row.duration) },
    { label: '支出金额', value: `${formatMoney(getExpenseAmount(row))} TRX` },
    { label: '结算状态', value: getStatusLabel(SETTLEMENT_RECORD_STATUS_MAP, row.status, '未知') },
    { label: '交易哈希', value: row.txid || '-' },
    { label: '创建时间', value: formatTableDateTime(row.created_at) },
    { label: '备注', value: getRemark(row) }
  ]
})

const columns: TableColumn[] = [
  {
    field: 'order_id',
    label: '订单ID',
    width: 100,
    slots: {
      default: ({ row }: EnergyOutboundTableSlot) =>
        h(
          BaseButton,
          { type: 'primary', link: true, onClick: () => handleGoResourceOrder(row) },
          () => String(getOrderId(row) || '-')
        )
    }
  },
  {
    field: 'agent_name',
    label: '代理名称',
    width: 120,
    formatter: (row: EnergyOutboundOrderItem) => row.agent_name || '-'
  },
  {
    field: 'bot_name',
    label: '机器人名称',
    width: 140,
    formatter: (row: EnergyOutboundOrderItem) => row.bot_name || '-'
  },
  {
    field: 'period',
    label: '结算周期',
    width: 130,
    formatter: (row: EnergyOutboundOrderItem) => getPeriod(row)
  },
  {
    field: 'amount',
    label: '数量',
    width: 110,
    formatter: (row: EnergyOutboundOrderItem) => formatNumber(row.amount)
  },
  {
    field: 'price',
    label: 'SUN/天',
    width: 100,
    formatter: (row: EnergyOutboundOrderItem) => row.price ?? '-'
  },
  {
    field: 'duration',
    label: '时长',
    width: 130,
    formatter: (row: EnergyOutboundOrderItem) => formatDuration(row.duration)
  },
  {
    field: 'expense',
    label: '支出金额',
    width: 120,
    slots: {
      default: ({ row }: EnergyOutboundTableSlot) =>
        h('span', { class: 'expense-text' }, formatMoney(getExpenseAmount(row)))
    }
  },
  {
    field: 'status',
    label: '结算状态',
    width: 110,
    slots: {
      default: ({ row }: EnergyOutboundTableSlot) =>
        renderStatusTag(SETTLEMENT_RECORD_STATUS_MAP, row.status, '未知')
    }
  },
  {
    field: 'txid',
    label: '交易哈希',
    minWidth: 210,
    formatter: (row: EnergyOutboundOrderItem) => formatTxid(row.txid)
  },
  {
    field: 'created_at',
    label: '创建时间',
    sortable: 'custom',
    width: 180,
    formatter: (row: EnergyOutboundOrderItem) => formatTableDateTime(row.created_at)
  },
  {
    field: 'describe',
    label: '备注',
    minWidth: 140,
    formatter: (row: EnergyOutboundOrderItem) => getRemark(row)
  },
  {
    field: 'action',
    label: '操作',
    width: 120,
    fixed: 'right',
    slots: {
      default: ({ row }: EnergyOutboundTableSlot) =>
        h(BaseButton, { type: 'primary', onClick: () => handleViewDetail(row) }, () => '查看详情')
    }
  }
]

const searchSchema = ref<FormSchema[]>([
  {
    field: 'keyword',
    component: 'Input' as const,
    label: '关键词',
    componentProps: {
      placeholder: '机器人ID/机器人用户名/订单ID',
      clearable: true,
      style: { width: '260px' }
    }
  },
  {
    field: 'outbound_date',
    component: 'DatePicker' as const,
    label: '出账日期',
    componentProps: {
      type: 'daterange',
      unlinkPanels: true,
      rangeSeparator: '~',
      startPlaceholder: '开始日期',
      endPlaceholder: '结束日期',
      valueFormat: 'YYYY-MM-DD',
      clearable: true,
      style: { width: '260px' }
    }
  }
])

const buildEnergyOutboundOrderParams = (
  params: EnergyOutboundSearchParams = {}
): EnergyOutboundOrderListParams => {
  const apiParams: EnergyOutboundOrderListParams = { ...createPageParams(params) }
  if (hasSearchValue(params.keyword)) apiParams.keyword = String(params.keyword).trim()
  Object.assign(apiParams, dateRangeToSeconds(params.outbound_date))
  apiParams.order = hasSearchValue(params.order) ? String(params.order) : DEFAULT_CREATED_AT_ORDER
  return apiParams
}

const applySummaryStats = (
  data: EnergyOutboundOrderListResponse,
  list: EnergyOutboundOrderItem[],
  total: number
) => {
  const summary = data.summary as EnergyOutboundOrderSummary | undefined
  const summaryRecord = summary as Record<string, unknown> | undefined
  summaryStats.value = {
    settlementCount: toNumber(
      pickValue(summaryRecord, ['count', 'total_count', 'settlement_count']) ?? total
    ),
    expenseAmount: toNumber(
      pickValue(summaryRecord, ['expense', 'expense_sum', 'profit_sum', 'trx_sum']) ??
        list.reduce((sum, item) => sum + toNumber(getExpenseAmount(item)), 0)
    ),
    energyAmount: toNumber(
      pickValue(summaryRecord, ['amount', 'amount_sum', 'energy_sum']) ??
        list.reduce((sum, item) => sum + toNumber(item.amount), 0)
    )
  }
}

const fetchEnergyOutboundOrderList = async (params: EnergyOutboundSearchParams = {}) => {
  try {
    const apiParams = buildEnergyOutboundOrderParams(params)
    const res = await getEnergyOutboundOrderList(apiParams)
    if (res?.code === '000000' && res.data) {
      const list = res.data.list || []
      const total = res.data.pager?.total || 0
      applySummaryStats(res.data, list, total)
      handleListMessage(
        list,
        [params.keyword, params.outbound_date].some(hasSearchValue),
        '能量出账订单'
      )
      return { list, total }
    }
    applySummaryStats({ list: [], pager: { current_page: 1, page_size: 10, total: 0 } }, [], 0)
    return { list: [], total: 0 }
  } catch (error) {
    handleErrorMessage(error, '获取能量出账订单失败')
    applySummaryStats({ list: [], pager: { current_page: 1, page_size: 10, total: 0 } }, [], 0)
    return { list: [], total: 0 }
  }
}

const handleGoResourceOrder = (row: EnergyOutboundOrderItem) => {
  const orderId = getOrderId(row)
  router.push({
    path: '/financial_manage/resource_order',
    query: orderId ? { keyword: String(orderId) } : undefined
  })
}

const handleViewDetail = (row: EnergyOutboundOrderItem) => {
  currentDetail.value = row
  detailVisible.value = true
}
</script>

<style scoped>
.energy-outbound-page {
  padding: 0;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 32px;
  max-width: 980px;
  margin: 8px 0 28px;
}

.summary-card {
  min-height: 70px;
  padding: 14px 22px;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.summary-label {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.summary-value {
  font-feature-settings: 'tnum';
  font-size: 16px;
  font-weight: 700;
  color: #303133;
}

.green-value,
.expense-text {
  color: #67c23a;
}

.orange-value {
  color: #e67e22;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 20px;
}

.detail-item {
  display: flex;
  min-width: 0;
  line-height: 24px;
}

.detail-label {
  flex-shrink: 0;
  width: 86px;
  color: #909399;
}

.detail-value {
  min-width: 0;
  overflow-wrap: anywhere;
  color: #303133;
}

@media (width <= 1200px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width <= 768px) {
  .summary-grid,
  .detail-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
