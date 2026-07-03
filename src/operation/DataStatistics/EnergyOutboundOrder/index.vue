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

      <Dialog v-model="detailVisible" title="结算明细详情" width="820px">
        <div v-loading="detailLoading" class="detail-panel">
          <div v-if="currentSettlement || currentDetail" class="detail-sections">
            <section v-for="section in detailSections" :key="section.title" class="detail-section">
              <h3 class="detail-section-title">{{ section.title }}</h3>
              <div class="detail-list">
                <div v-for="item in section.items" :key="item.label" class="detail-item">
                  <span class="detail-label">{{ item.label }}</span>
                  <span class="detail-value" :class="item.valueClass">
                    <ElLink
                      v-if="item.href"
                      type="primary"
                      :href="item.href"
                      target="_blank"
                      :underline="false"
                    >
                      {{ item.value }}
                    </ElLink>
                    <template v-else>{{ item.value }}</template>
                  </span>
                </div>
              </div>
            </section>
          </div>
          <div v-else class="detail-empty">
            <span>暂无详情</span>
          </div>
        </div>
        <template #footer>
          <div class="dialog-footer">
            <BaseButton type="primary" @click="detailVisible = false">确定</BaseButton>
          </div>
        </template>
      </Dialog>
    </ContentWrap>
  </div>
</template>

<script setup lang="tsx">
import { computed, h, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElLink, ElTooltip } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { SearchTable } from '@/components/SearchTable'
import type { SearchTableExpose } from '@/components/SearchTable'
import { Dialog } from '@/components/Dialog'
import { BaseButton } from '@/components/Button'
import type { TableColumn } from '@/components/Table'
import type { FormSchema } from '@/components/Form'
import {
  getEnergyOutboundOrderDetail,
  getEnergyOutboundOrderList,
  type EnergyOutboundOrderDetail,
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
  hasSearchValue,
  renderStatusTag,
  type DateRangeValue,
  type TableSlot
} from '@/utils/tableHelpers'
import { getTronscanTransactionUrl } from '@/utils/tronscan'
import { SETTLEMENT_RECORD_STATUS_MAP } from '@/operation/FinancialManage/constants'

interface SummaryStats {
  settlementCount: number
  expenseAmount: number
  energyAmount: number
  bandwidthAmount: number
}

interface DetailDisplayItem {
  label: string
  value: string
  valueClass?: string
  href?: string
}

interface DetailDisplaySection {
  title: string
  items: DetailDisplayItem[]
}

type EnergyOutboundTableSlot = TableSlot<EnergyOutboundOrderItem>
type EnergyOutboundSearchParams = EnergyOutboundOrderListParams &
  Recordable & {
    outbound_date?: DateRangeValue
  }

const router = useRouter()
const searchTableRef = ref<SearchTableExpose | null>(null)
const detailVisible = ref(false)
const detailLoading = ref(false)
const currentSettlement = ref<EnergyOutboundOrderItem | null>(null)
const currentDetail = ref<EnergyOutboundOrderDetail | null>(null)
const DEFAULT_CREATED_AT_ORDER = 'created_at DESC'

const defaultParams = { order: DEFAULT_CREATED_AT_ORDER }
const tableProps = { defaultSort: { prop: 'created_at', order: 'descending' } }
const searchProps = { layout: 'inline', buttonPosition: 'center' }

const createEmptySummaryStats = (): SummaryStats => ({
  settlementCount: 0,
  expenseAmount: 0,
  energyAmount: 0,
  bandwidthAmount: 0
})

const summaryStats = ref<SummaryStats>(createEmptySummaryStats())

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

const getTxidHref = (txid?: string) => {
  if (!txid) return ''
  return getTronscanTransactionUrl(txid)
}

const renderTxidLink = (txid?: string) => {
  if (!txid) return h('span', '-')

  return h(
    ElTooltip,
    {
      content: txid,
      placement: 'top'
    },
    () =>
      h(
        ElLink,
        {
          type: 'primary',
          href: getTxidHref(txid),
          target: '_blank',
          underline: false
        },
        () => formatTxid(txid)
      )
  )
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
  },
  {
    key: 'bandwidth',
    label: '收购带宽数量',
    value: formatNumber(summaryStats.value.bandwidthAmount, 2),
    valueClass: 'orange-value'
  }
])

const detailSections = computed<DetailDisplaySection[]>(() => {
  const row = currentSettlement.value
  const detail = currentDetail.value
  if (!row && !detail) return []

  const orderId = row ? getOrderId(row) : detail?.id
  const amount = row?.amount ?? detail?.amount
  const expenseAmount = row ? formatMoney(getExpenseAmount(row)) : '-'
  const txid = row?.txid || ''

  return [
    {
      title: '订单记录',
      items: [
        { label: '订单ID', value: String(orderId || '-') },
        { label: '代理名称', value: detail?.agent_name || row?.agent_name || '-' },
        { label: '机器人名称', value: detail?.bot_name || row?.bot_name || '-' },
        { label: '结算周期', value: row ? getPeriod(row) : '-' },
        { label: '数量', value: formatNumber(amount) },
        { label: 'SUN/天', value: String(row?.price ?? '-') },
        { label: '时长', value: formatDuration(row?.duration) },
        {
          label: '支出金额',
          value: row ? `${expenseAmount} TRX` : '-',
          valueClass: 'green-value'
        },
        {
          label: '结算状态',
          value: SETTLEMENT_RECORD_STATUS_MAP[Number(row?.status)]?.label || '-',
          valueClass: row?.status ? 'green-value' : undefined
        },
        {
          label: '交易哈希',
          value: txid || '-',
          href: getTxidHref(txid)
        },
        { label: '创建时间', value: row ? formatTableDateTime(row.created_at) : '-' },
        { label: '备注', value: row ? getRemark(row) : '-' }
      ]
    },
    {
      title: '地址信息',
      items: [
        { label: '用户发送地址', value: detail?.source || '-' },
        { label: '用户接收地址', value: detail?.receiver || '-' },
        { label: '系统结算地址', value: detail?.target || '-' }
      ]
    }
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
    slots: {
      default: ({ row }: EnergyOutboundTableSlot) => renderTxidLink(row.txid)
    }
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
      placeholder: '订单ID/代理名称/机器人名称',
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
  if (hasSearchValue(params.order_id)) apiParams.order_id = Number(params.order_id)
  if (hasSearchValue(params.status)) apiParams.status = Number(params.status)
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
  const statsRecord = data.stats as Record<string, unknown> | undefined
  summaryStats.value = {
    settlementCount: toNumber(
      pickValue(summaryRecord, ['count', 'total_count', 'settlement_count']) ?? total
    ),
    expenseAmount: toNumber(
      pickValue(statsRecord, ['sum_profit', 'sum_expense', 'profit_sum', 'trx_sum']) ??
        pickValue(summaryRecord, ['expense', 'expense_sum', 'profit_sum', 'trx_sum']) ??
        list.reduce((sum, item) => sum + toNumber(getExpenseAmount(item)), 0)
    ),
    energyAmount: toNumber(
      pickValue(statsRecord, ['sum_energy', 'amount', 'amount_sum', 'energy_sum']) ??
        pickValue(summaryRecord, ['amount', 'amount_sum', 'energy_sum']) ??
        list.reduce((sum, item) => sum + toNumber(item.amount), 0)
    ),
    bandwidthAmount: toNumber(
      pickValue(statsRecord, ['sum_bandwidth', 'bandwidth_sum']) ??
        pickValue(summaryRecord, ['sum_bandwidth', 'bandwidth_sum']) ??
        0
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
        '理财结算记录'
      )
      return { list, total }
    }
    summaryStats.value = createEmptySummaryStats()
    return { list: [], total: 0 }
  } catch (error) {
    handleErrorMessage(error, '获取理财结算记录失败')
    summaryStats.value = createEmptySummaryStats()
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

const handleViewDetail = async (row: EnergyOutboundOrderItem) => {
  currentSettlement.value = row
  currentDetail.value = null
  detailVisible.value = true
  const orderId = getOrderId(row)
  if (!orderId) return

  detailLoading.value = true
  try {
    const res = await getEnergyOutboundOrderDetail(orderId)
    if (res?.code === '000000' && res.data) {
      currentDetail.value = res.data
    }
  } catch (error) {
    handleErrorMessage(error, '获取理财结算记录详情失败')
  } finally {
    detailLoading.value = false
  }
}
</script>

<style scoped>
.energy-outbound-page {
  padding: 0;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 32px;
  max-width: 1200px;
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

.detail-panel {
  min-height: 360px;
}

.detail-sections {
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.detail-section {
  padding: 0 30px 24px;
  border-bottom: 1px solid #ebeef5;
}

.detail-section:last-child {
  border-bottom: 0;
}

.detail-section-title {
  display: flex;
  height: 42px;
  padding: 0 28px;
  margin: 0 -30px 18px;
  font-size: 15px;
  font-weight: 700;
  line-height: 22px;
  color: #1f2d3d;
  background: #f7f9fc;
  align-items: center;
}

.detail-section-title::before {
  width: 3px;
  height: 16px;
  margin-right: 10px;
  background: #409eff;
  border-radius: 2px;
  content: '';
}

.detail-section-title::after {
  height: 1px;
  margin-left: 14px;
  background: #e4e7ed;
  content: '';
  flex: 1;
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-item {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  column-gap: 12px;
  align-items: start;
  min-width: 0;
  font-size: 13px;
  line-height: 22px;
}

.detail-label {
  font-weight: 600;
  color: #1f2d3d;
  text-align: right;
  white-space: nowrap;
}

.detail-label::after {
  content: '：';
}

.detail-value {
  min-width: 0;
  margin-left: 0;
  overflow-wrap: anywhere;
  color: #606266;
}

.detail-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: #909399;
}

@media (width <= 1280px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width <= 768px) {
  .summary-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .detail-section {
    padding: 0 16px 18px;
  }

  .detail-section-title {
    padding: 0 16px;
    margin-right: -16px;
    margin-left: -16px;
  }

  .detail-item {
    grid-template-columns: minmax(0, 1fr);
    row-gap: 2px;
  }

  .detail-label {
    text-align: left;
  }

  .detail-value {
    margin-left: 0;
  }
}
</style>
