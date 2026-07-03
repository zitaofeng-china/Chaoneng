<template>
  <div class="app-container chain-record-page">
    <ContentWrap>
      <SearchTable
        :columns="columns"
        :search-schema="searchSchema"
        :fetch-data-api="fetchChainRecordList"
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
    </ContentWrap>
  </div>
</template>

<script setup lang="tsx">
import { computed, h, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElLink, ElTag, ElTooltip } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { SearchTable } from '@/components/SearchTable'
import type { TableColumn } from '@/components/Table'
import type { FormSchema } from '@/components/Form'
import { getChargeBillList } from '@/api/opertion/FinancialManage/common/charge'
import type {
  ChargeBillItem,
  ChargeBillParams,
  ChargeBillResponse
} from '@/api/opertion/FinancialManage/common/charge'
import { handleErrorMessage, handleListMessage } from '@/utils/messageHelper'
import {
  createPageParams,
  dateRangeToSeconds,
  formatTableDateTime,
  hasSearchValue,
  withAllOption,
  type DateRangeValue,
  type TableSlot
} from '@/utils/tableHelpers'
import { getTronscanTransactionUrl } from '@/utils/tronscan'

type ChainRecordDirection = 'out' | 'in'
type ChainRecordItem = ChargeBillItem & Record<string, unknown>
type ChainRecordTableSlot = TableSlot<ChainRecordItem>
type ChainRecordSearchParams = ChargeBillParams &
  Recordable & {
    transaction_type?: string
    direction?: ChainRecordDirection | ''
    currency?: string
    dateRange?: DateRangeValue
  }

interface ChainRecordSummary {
  todayCount: number
  totalOutU: number
  totalOutT: number
  totalInU: number
  totalInT: number
}

interface StatusMeta {
  label: string
  type: 'success' | 'warning' | 'info' | 'primary' | 'danger'
}

const router = useRouter()
const DEFAULT_ORDER = 'created_at DESC'
const defaultParams = { order: DEFAULT_ORDER }
const searchProps = { layout: 'inline', buttonPosition: 'center' }
const tableProps = { defaultSort: { prop: 'created_at', order: 'descending' } }

const TRANSACTION_TYPE_OPTIONS = withAllOption([
  { label: '闪兑出款U', value: '闪兑出款U' },
  { label: '闪兑出款T', value: '闪兑出款T' },
  { label: '资源账户充值出款', value: '资源账户充值出款' },
  { label: '能量收购出款', value: '能量收购出款' },
  { label: '代理收款', value: '代理收款' },
  { label: '自营机器人收款', value: '自营机器人收款' },
  { label: '福利订单收款', value: '福利订单收款' }
])

const DIRECTION_OPTIONS = withAllOption([
  { label: '出款', value: 'out' },
  { label: '收款', value: 'in' }
])

const CURRENCY_OPTIONS = withAllOption([
  { label: 'U', value: 'U' },
  { label: 'T', value: 'T' }
])

const KIND_LABEL_MAP: Record<string, string> = {
  feee: 'FEEE账户',
  sohu: 'Sohu账户',
  trxfee: 'TRXFee账户',
  justlend: 'JustLend账户'
}

const CHAIN_STATUS_MAP: Record<number, StatusMeta> = {
  1: { label: '成功', type: 'success' },
  2: { label: '失败', type: 'danger' },
  3: { label: '确认中', type: 'warning' }
}

const createEmptySummary = (): ChainRecordSummary => ({
  todayCount: 0,
  totalOutU: 0,
  totalOutT: 0,
  totalInU: 0,
  totalInT: 0
})

const summaryStats = ref<ChainRecordSummary>(createEmptySummary())

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const pickValue = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key]
    if (hasSearchValue(value)) return value
  }
  return undefined
}

const normalizeText = (value?: unknown, fallback = '-') => {
  const text = String(value ?? '').trim()
  return text || fallback
}

const parseAmount = (value?: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const matched = String(value ?? '')
    .replace(/,/g, '')
    .match(/-?\d+(?:\.\d+)?/)
  const amount = matched ? Number(matched[0]) : 0
  return Number.isFinite(amount) ? amount : 0
}

const formatNumber = (value: number, minDigits = 0, maxDigits = 8) => {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits
  })
}

const formatSummaryAmount = (value: number) => formatNumber(value, 2, 2)

const truncateMiddle = (value?: unknown, start = 9, end = 6) => {
  const text = normalizeText(value, '')
  if (!text) return '-'
  if (text.length <= start + end + 3) return text
  return `${text.slice(0, start)}...${text.slice(-end)}`
}

const normalizeCurrency = (value?: unknown) => {
  const raw = String(value ?? '')
    .trim()
    .toUpperCase()
  if (!raw) return ''
  if (raw.includes('USDT') || raw === 'U') return 'U'
  if (raw.includes('TRX') || raw === 'T') return 'T'
  return raw
}

const extractCurrencyFromAmount = (value?: unknown) => {
  const matched = String(value ?? '')
    .toUpperCase()
    .match(/\b(USDT|TRX|U|T)\b/)
  return normalizeCurrency(matched?.[1])
}

const deriveCurrencyFromKind = (kind?: unknown) => {
  const raw = String(kind ?? '').trim()
  const lowerRaw = raw.toLowerCase()
  const upperRaw = raw.toUpperCase()
  if (upperRaw.includes('USDT') || upperRaw.endsWith('U')) return 'U'
  if (upperRaw.includes('TRX') || upperRaw.endsWith('T')) return 'T'
  if (lowerRaw.includes('trx') || lowerRaw.includes('fee') || lowerRaw.includes('lend')) return 'T'
  return ''
}

const getCurrency = (row: ChainRecordItem) =>
  normalizeCurrency(pickValue(row, ['currency', 'coin', 'token', 'symbol', 'asset'])) ||
  extractCurrencyFromAmount(row.amount) ||
  deriveCurrencyFromKind(
    pickValue(row, ['transaction_type', 'business_type', 'trade_type', 'kind'])
  )

const getDirection = (row: ChainRecordItem): ChainRecordDirection => {
  const raw = String(
    pickValue(row, ['direction', 'in_out', 'io_type', 'flow_type', 'trade_direction', 'type']) ?? ''
  ).toLowerCase()
  if (
    raw.includes('out') ||
    raw.includes('withdraw') ||
    raw.includes('send') ||
    raw.includes('出款')
  ) {
    return 'out'
  }
  if (
    raw.includes('in') ||
    raw.includes('receive') ||
    raw.includes('income') ||
    raw.includes('收款')
  ) {
    return 'in'
  }
  return parseAmount(row.amount) < 0 ? 'out' : 'in'
}

const getOrderNo = (row: ChainRecordItem) =>
  normalizeText(
    pickValue(row, ['order_no', 'order_num', 'order_sn', 'order_id', 'business_order_id', 'id'])
  )

const getRelatedOrderNo = (row: ChainRecordItem) =>
  normalizeText(
    pickValue(row, [
      'related_order_no',
      'related_order_id',
      'relation_order_no',
      'relation_order_id',
      'associated_order_id',
      'business_order_id',
      'order_id',
      'order_no'
    ])
  )

const getTransactionType = (row: ChainRecordItem) => {
  const value = pickValue(row, [
    'transaction_type',
    'business_type',
    'scene',
    'type_name',
    'trade_type',
    'title',
    'kind'
  ])
  const text = normalizeText(value)
  return KIND_LABEL_MAP[text.toLowerCase()] || text
}

const getFromAddress = (row: ChainRecordItem) =>
  normalizeText(
    pickValue(row, [
      'from_address',
      'out_address',
      'send_address',
      'payer_address',
      'pay_address',
      'vault',
      'finance_address',
      'source'
    ])
  )

const getToAddress = (row: ChainRecordItem) =>
  normalizeText(
    pickValue(row, [
      'to_address',
      'receive_address',
      'receiver',
      'target_address',
      'target',
      'address'
    ])
  )

const getTxid = (row: ChainRecordItem) =>
  normalizeText(pickValue(row, ['tx_hash', 'transaction_hash', 'hash', 'txid']), '')

const getRemark = (row: ChainRecordItem) =>
  normalizeText(pickValue(row, ['remark', 'describe', 'description', 'memo']))

const getAmountValue = (row: ChainRecordItem) =>
  pickValue(row, ['amount', 'quantity', 'value', 'transfer_amount'])

const getAmountClass = (row: ChainRecordItem) =>
  getDirection(row) === 'out' ? 'amount-negative' : 'amount-positive'

const formatAmountDisplay = (row: ChainRecordItem) => {
  const amount = parseAmount(getAmountValue(row))
  const direction = getDirection(row)
  const sign = direction === 'out' ? '-' : '+'
  const absAmount = Math.abs(amount)
  const currency = getCurrency(row)
  const decimalLength =
    String(getAmountValue(row) ?? '')
      .split('.')[1]
      ?.match(/\d+/)?.[0]?.length || 0
  const minDigits = absAmount % 1 === 0 ? 0 : Math.min(Math.max(decimalLength, 2), 8)
  return `${sign}${formatNumber(absAmount, minDigits, 8)}${currency ? ` ${currency}` : ''}`
}

const resolveStatusMeta = (status?: unknown): StatusMeta => {
  if (typeof status === 'number' || /^\d+$/.test(String(status ?? ''))) {
    return CHAIN_STATUS_MAP[Number(status)] || { label: '未知', type: 'info' }
  }

  const text = String(status ?? '').trim()
  const lowerText = text.toLowerCase()
  if (!text) return { label: '-', type: 'info' }
  if (['success', 'succeeded', 'confirmed', 'done'].some((key) => lowerText.includes(key))) {
    return { label: '成功', type: 'success' }
  }
  if (['fail', 'failed', 'error'].some((key) => lowerText.includes(key))) {
    return { label: '失败', type: 'danger' }
  }
  if (['pending', 'confirming', 'processing'].some((key) => lowerText.includes(key))) {
    return { label: '确认中', type: 'warning' }
  }
  return { label: text, type: 'info' }
}

const renderTooltipText = (value?: unknown, width = 150) => {
  const text = normalizeText(value, '')
  if (!text) return h('span', '-')

  return h(
    ElTooltip,
    {
      content: text,
      placement: 'top'
    },
    () =>
      h(
        'span',
        {
          class: 'table-ellipsis',
          style: { maxWidth: `${width}px` }
        },
        truncateMiddle(text)
      )
  )
}

const renderDirectionTag = (row: ChainRecordItem) => {
  const direction = getDirection(row)
  return h(
    ElTag,
    {
      type: direction === 'out' ? 'danger' : 'success',
      effect: 'plain',
      class: ['direction-tag', direction === 'out' ? 'direction-out' : 'direction-in']
    },
    () => (direction === 'out' ? '出款' : '收款')
  )
}

const renderAmount = (row: ChainRecordItem) =>
  h('span', { class: getAmountClass(row) }, formatAmountDisplay(row))

const renderTxidLink = (row: ChainRecordItem) => {
  const txid = getTxid(row)
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
          href: getTronscanTransactionUrl(txid),
          target: '_blank',
          underline: false
        },
        () => truncateMiddle(txid, 10, 8)
      )
  )
}

const handleGoRelatedOrder = (orderNo: string) => {
  if (!orderNo || orderNo === '-') return
  router.push({
    path: '/financial_manage/resource_order',
    query: { keyword: orderNo }
  })
}

const renderRelatedOrder = (row: ChainRecordItem) => {
  const orderNo = getRelatedOrderNo(row)
  if (!orderNo || orderNo === '-') return h('span', '-')

  return h(
    ElLink,
    {
      type: 'primary',
      underline: false,
      onClick: () => handleGoRelatedOrder(orderNo)
    },
    () => orderNo
  )
}

const renderStatus = (row: ChainRecordItem) => {
  const status = pickValue(row, ['chain_status', 'onchain_status', 'status'])
  const meta = resolveStatusMeta(status)
  return h(
    ElTag,
    {
      type: meta.type,
      effect: 'plain',
      class: 'status-tag'
    },
    () => meta.label
  )
}

const buildOrderParam = (params: ChainRecordSearchParams) => {
  if (params.sort && params.order) {
    const direction = params.order === 'ascending' ? 'ASC' : 'DESC'
    return `${params.sort} ${direction}`
  }

  if (typeof params.order === 'string' && params.order.includes(' ')) {
    return params.order
  }

  return DEFAULT_ORDER
}

const buildChainRecordParams = (params: ChainRecordSearchParams = {}) => {
  const apiParams: ChargeBillParams & Recordable = {
    ...createPageParams(params)
  }

  if (hasSearchValue(params.keyword)) apiParams.keyword = String(params.keyword).trim()
  if (hasSearchValue(params.transaction_type)) {
    apiParams.transaction_type = String(params.transaction_type)
  }
  if (hasSearchValue(params.direction)) apiParams.direction = String(params.direction)
  if (hasSearchValue(params.currency)) apiParams.currency = String(params.currency)
  apiParams.order = buildOrderParam(params)

  Object.assign(apiParams, dateRangeToSeconds(params.dateRange))

  return apiParams
}

const aggregateListSummary = (list: ChainRecordItem[]) => {
  return list.reduce((summary, item) => {
    const amount = Math.abs(parseAmount(getAmountValue(item)))
    const currency = getCurrency(item)
    const direction = getDirection(item)

    if (direction === 'out' && currency === 'U') summary.totalOutU += amount
    if (direction === 'out' && currency === 'T') summary.totalOutT += amount
    if (direction === 'in' && currency === 'U') summary.totalInU += amount
    if (direction === 'in' && currency === 'T') summary.totalInT += amount

    return summary
  }, createEmptySummary())
}

const pickSummaryNumber = (sources: Array<Record<string, unknown> | undefined>, keys: string[]) => {
  for (const source of sources) {
    if (!source) continue
    const value = pickValue(source, keys)
    if (hasSearchValue(value)) return parseAmount(value)
  }
  return undefined
}

const applySummaryStats = (data: ChargeBillResponse, list: ChainRecordItem[], total: number) => {
  const dataRecord = data as unknown as Record<string, unknown>
  const summaryRecord = isRecord(data.summary) ? data.summary : undefined
  const statsRecord = isRecord(dataRecord.stats) ? dataRecord.stats : undefined
  const sources = [summaryRecord, statsRecord, dataRecord]
  const aggregate = aggregateListSummary(list)

  summaryStats.value = {
    todayCount:
      pickSummaryNumber(sources, [
        'today_count',
        'today_transaction_count',
        'today_total',
        'transaction_count',
        'count',
        'total'
      ]) ??
      total ??
      list.length,
    totalOutU:
      pickSummaryNumber(sources, [
        'total_out_u',
        'out_u',
        'out_amount_u',
        'withdraw_u',
        'total_withdraw_u',
        'total_out_usdt',
        'usdt_out'
      ]) ?? aggregate.totalOutU,
    totalOutT:
      pickSummaryNumber(sources, [
        'total_out_t',
        'out_t',
        'out_amount_t',
        'withdraw_t',
        'total_withdraw_t',
        'total_out_trx',
        'trx_out'
      ]) ?? aggregate.totalOutT,
    totalInU:
      pickSummaryNumber(sources, [
        'total_in_u',
        'in_u',
        'in_amount_u',
        'receive_u',
        'total_receive_u',
        'total_in_usdt',
        'usdt_in'
      ]) ?? aggregate.totalInU,
    totalInT:
      pickSummaryNumber(sources, [
        'total_in_t',
        'in_t',
        'in_amount_t',
        'receive_t',
        'total_receive_t',
        'total_in_trx',
        'trx_in'
      ]) ?? aggregate.totalInT
  }
}

const fetchChainRecordList = async (params: ChainRecordSearchParams = {}) => {
  try {
    const res = await getChargeBillList(buildChainRecordParams(params))

    if (res?.code === '000000' && res.data) {
      const list = ((res.data.list || []) as ChainRecordItem[]).map((item) => ({ ...item }))
      const total = res.data.pager?.total || list.length || 0

      applySummaryStats(res.data, list, total)
      handleListMessage(
        list,
        [
          params.keyword,
          params.transaction_type,
          params.direction,
          params.currency,
          params.dateRange
        ].some(hasSearchValue),
        '链上出入记录'
      )

      return { list, total }
    }

    summaryStats.value = createEmptySummary()
    return { list: [], total: 0 }
  } catch (error) {
    summaryStats.value = createEmptySummary()
    handleErrorMessage(error, '获取链上出入记录失败')
    return { list: [], total: 0 }
  }
}

const summaryCards = computed(() => [
  {
    key: 'today-count',
    label: '今日交易笔数',
    value: formatNumber(summaryStats.value.todayCount, 0, 0),
    valueClass: ''
  },
  {
    key: 'out-u',
    label: '总出款金额（U）',
    value: formatSummaryAmount(summaryStats.value.totalOutU),
    valueClass: 'negative-value'
  },
  {
    key: 'out-t',
    label: '总出款金额（T）',
    value: formatSummaryAmount(summaryStats.value.totalOutT),
    valueClass: 'negative-value'
  },
  {
    key: 'in-total',
    label: '总收款金额',
    value: `${formatSummaryAmount(summaryStats.value.totalInT)} T / ${formatSummaryAmount(
      summaryStats.value.totalInU
    )} U`,
    valueClass: 'positive-value'
  }
])

const columns: TableColumn[] = [
  {
    field: 'order_no',
    label: '订单号',
    minWidth: 150,
    formatter: (row: ChainRecordItem) => getOrderNo(row)
  },
  {
    field: 'transaction_type',
    label: '交易类型',
    minWidth: 150,
    formatter: (row: ChainRecordItem) => getTransactionType(row)
  },
  {
    field: 'direction',
    label: '出入款',
    width: 90,
    slots: {
      default: ({ row }: ChainRecordTableSlot) => renderDirectionTag(row)
    }
  },
  {
    field: 'amount',
    label: '数量',
    minWidth: 120,
    slots: {
      default: ({ row }: ChainRecordTableSlot) => renderAmount(row)
    }
  },
  {
    field: 'from_address',
    label: '出款地址',
    minWidth: 170,
    slots: {
      default: ({ row }: ChainRecordTableSlot) => renderTooltipText(getFromAddress(row), 145)
    }
  },
  {
    field: 'to_address',
    label: '收款地址',
    minWidth: 170,
    slots: {
      default: ({ row }: ChainRecordTableSlot) => renderTooltipText(getToAddress(row), 145)
    }
  },
  {
    field: 'txid',
    label: '交易哈希',
    minWidth: 220,
    slots: {
      default: ({ row }: ChainRecordTableSlot) => renderTxidLink(row)
    }
  },
  {
    field: 'related_order_no',
    label: '关联订单号',
    minWidth: 150,
    slots: {
      default: ({ row }: ChainRecordTableSlot) => renderRelatedOrder(row)
    }
  },
  {
    field: 'status',
    label: '链上状态',
    width: 110,
    slots: {
      default: ({ row }: ChainRecordTableSlot) => renderStatus(row)
    }
  },
  {
    field: 'describe',
    label: '备注',
    minWidth: 150,
    formatter: (row: ChainRecordItem) => getRemark(row)
  },
  {
    field: 'created_at',
    label: '交易时间',
    sortable: 'custom',
    width: 180,
    formatter: (row: ChainRecordItem) => formatTableDateTime(row.created_at)
  }
]

const searchSchema = ref<FormSchema[]>([
  {
    field: 'keyword',
    component: 'Input' as const,
    label: {
      tips: '交易哈希 / 收款地址 / 出款地址 / 关联订单ID',
      text: '关键词'
    },
    componentProps: {
      placeholder: '交易哈希 / 收款地址 / 出款地址 / 关联订单ID',
      clearable: true,
      style: { width: '260px' }
    }
  },
  {
    field: 'transaction_type',
    component: 'Select' as const,
    label: '交易类型',
    componentProps: {
      placeholder: '全部',
      clearable: true,
      options: TRANSACTION_TYPE_OPTIONS,
      style: { width: '150px' }
    }
  },
  {
    field: 'direction',
    component: 'Select' as const,
    label: '出入款',
    componentProps: {
      placeholder: '全部',
      clearable: true,
      options: DIRECTION_OPTIONS,
      style: { width: '150px' }
    }
  },
  {
    field: 'currency',
    component: 'Select' as const,
    label: '币种',
    componentProps: {
      placeholder: '全部',
      clearable: true,
      options: CURRENCY_OPTIONS,
      style: { width: '140px' }
    }
  },
  {
    field: 'dateRange',
    component: 'DatePicker' as const,
    label: '交易日期',
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
</script>

<style scoped>
.chain-record-page {
  padding: 0;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(180px, 225px));
  gap: 38px;
  margin: 14px 0 20px;
}

.summary-card {
  min-height: 50px;
  padding: 12px 16px;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 3px;
}

.summary-label {
  margin-bottom: 7px;
  font-size: 13px;
  font-weight: 700;
  line-height: 18px;
  color: #303133;
}

.summary-value {
  font-size: 13px;
  font-weight: 700;
  line-height: 18px;
  color: #000;
  font-variant-numeric: tabular-nums;
}

.positive-value,
:deep(.amount-positive) {
  color: #67c23a;
}

.negative-value,
:deep(.amount-negative) {
  color: #f56c6c;
}

.table-ellipsis {
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}

:deep(.direction-tag),
:deep(.status-tag) {
  min-width: 48px;
  justify-content: center;
}

@media (width <= 1280px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(180px, 225px));
  }
}

@media (width <= 768px) {
  .summary-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }
}
</style>
