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
import { v1GetSystemBillList } from '@/api/opertion/FinancialManage/SystemBill'
import type {
  SystemBillItem,
  SystemBillListParams,
  SystemBillListResponse
} from '@/api/opertion/FinancialManage/SystemBill'
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
type ChainRecordItem = SystemBillItem & Record<string, unknown>
type ChainRecordTableSlot = TableSlot<ChainRecordItem>
type ChainRecordSearchParams = SystemBillListParams &
  Recordable & {
    direction?: ChainRecordDirection | ''
    coin?: string
    price_id?: number | string
    dateRange?: DateRangeValue
    sort?: string
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

const SYSTEM_BILL_KIND_LABEL_MAP: Record<number, string> = {
  1: '代理充值',
  2: '用户充值',
  3: '闪兑',
  4: '时间能量',
  5: '笔数能量',
  6: '福利能量',
  7: '快速能量',
  8: '即用能量',
  9: '批量能量',
  10: '批量激活',
  11: '机器人付费',
  15: '速充能量',
  20: '托管',
  21: '托管速充',
  81: '补充资源',
  82: '资源收购'
}

const SYSTEM_BILL_KIND_OPTIONS = Object.entries(SYSTEM_BILL_KIND_LABEL_MAP).map(
  ([value, label]) => ({
    label,
    value: Number(value)
  })
)

const AGENT_LEVEL_LABEL_MAP: Record<number, string> = {
  0: '系统平台',
  1: '一级代理',
  2: '二级代理',
  3: '三级代理',
  8: '自营代理'
}

const AGENT_LEVEL_OPTIONS = withAllOption(
  Object.entries(AGENT_LEVEL_LABEL_MAP).map(([value, label]) => ({
    label,
    value: Number(value)
  }))
)

const DIRECTION_OPTIONS = withAllOption([
  { label: '出款', value: 'out' },
  { label: '收款', value: 'in' }
])

const CURRENCY_OPTIONS = withAllOption([
  { label: 'USDT', value: 'USDT' },
  { label: 'TRX', value: 'TRX' }
])

const FLOW_DIRECTION_MAP: Record<number, ChainRecordDirection> = {
  1: 'in',
  2: 'out'
}

const DIRECTION_FLOW_MAP: Record<ChainRecordDirection, number> = {
  in: 1,
  out: 2
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

const hasFilterValue = (value: unknown) =>
  Array.isArray(value) ? value.length > 0 : hasSearchValue(value)

const toNumberList = (value: unknown) => {
  const values = Array.isArray(value) ? value : hasSearchValue(value) ? [value] : []
  return values.map(Number).filter(Number.isFinite)
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

const formatNumber = (value: number, minDigits = 0, maxDigits = 8) =>
  value.toLocaleString('zh-CN', {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits
  })

const formatSummaryAmount = (value: number) => formatNumber(value, 2, 8)

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

const getCurrency = (row: ChainRecordItem) =>
  normalizeCurrency(pickValue(row, ['currency', 'coin', 'token', 'symbol', 'asset'])) ||
  extractCurrencyFromAmount(row.amount) ||
  normalizeCurrency(row.coin)

const getDirection = (row: ChainRecordItem): ChainRecordDirection => {
  const flow = pickValue(row, ['flow'])
  if (hasSearchValue(flow)) {
    return FLOW_DIRECTION_MAP[Number(flow)] || 'in'
  }

  const raw = String(
    pickValue(row, ['direction', 'in_out', 'io_type', 'flow_type', 'trade_direction']) ?? ''
  ).toLowerCase()
  if (
    raw.includes('out') ||
    raw.includes('withdraw') ||
    raw.includes('send') ||
    raw.includes('出')
  ) {
    return 'out'
  }
  if (
    raw.includes('in') ||
    raw.includes('receive') ||
    raw.includes('income') ||
    raw.includes('收')
  ) {
    return 'in'
  }
  return parseAmount(row.amount) < 0 ? 'out' : 'in'
}

const getRelatedOrderNo = (row: ChainRecordItem) =>
  normalizeText(
    pickValue(row, [
      'related_order_no',
      'related_order_id',
      'relation_order_no',
      'relation_order_id',
      'business_order_id',
      'order_id'
    ])
  )

const getTransactionType = (row: ChainRecordItem) => {
  const kind = pickValue(row, ['kind'])
  if (hasSearchValue(kind)) {
    const kindLabel = SYSTEM_BILL_KIND_LABEL_MAP[Number(kind)]
    if (kindLabel) return kindLabel
  }

  return normalizeText(
    pickValue(row, ['transaction_type', 'business_type', 'scene', 'type_name', 'trade_type'])
  )
}

const getAgentLevelLabel = (row: ChainRecordItem) => {
  const value = pickValue(row, ['price_id', 'agent_level', 'level'])
  if (!hasSearchValue(value)) return '-'
  return AGENT_LEVEL_LABEL_MAP[Number(value)] || normalizeText(value)
}

const getFromAddress = (row: ChainRecordItem) =>
  normalizeText(
    pickValue(row, [
      'from',
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
      'to',
      'to_address',
      'receive_address',
      'receiver',
      'target_address',
      'target',
      'address'
    ])
  )

const isLikelyTxid = (value?: unknown) => {
  const text = normalizeText(value, '')
  return /^(0x)?[a-fA-F0-9]{32,}$/.test(text)
}

const getTxid = (row: ChainRecordItem) => {
  const txid = normalizeText(pickValue(row, ['tx_hash', 'transaction_hash', 'hash', 'txid']), '')
  if (txid) return txid

  return isLikelyTxid(row.id) ? normalizeText(row.id, '') : ''
}

const getRemark = (row: ChainRecordItem) =>
  normalizeText(pickValue(row, ['remark', 'describe', 'description', 'memo']))

const getAmountValue = (row: ChainRecordItem) =>
  pickValue(row, ['amount', 'quantity', 'value', 'transfer_amount'])

const getAmountClass = (row: ChainRecordItem) =>
  getDirection(row) === 'out' ? 'amount-negative' : 'amount-positive'

const formatAmountDisplay = (row: ChainRecordItem) => {
  const sign = getDirection(row) === 'out' ? '-' : '+'
  return `${sign}${formatNumber(Math.abs(parseAmount(getAmountValue(row))), 2, 8)}`
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
      class: 'status-tag'
    },
    () => (direction === 'out' ? '出款' : '收款')
  )
}

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

const renderStatus = (row: ChainRecordItem) => {
  const status = pickValue(row, ['chain_status', 'onchain_status', 'status'])
  const meta = CHAIN_STATUS_MAP[Number(status)] || { label: normalizeText(status), type: 'info' }
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
  const apiParams: SystemBillListParams & Recordable = {
    ...createPageParams(params)
  }

  if (hasSearchValue(params.keyword)) apiParams.keyword = String(params.keyword).trim()
  const selectedKinds = toNumberList(params.kinds)
  if (selectedKinds.length > 0) apiParams.kinds = selectedKinds
  if (hasSearchValue(params.direction)) {
    apiParams.flow = DIRECTION_FLOW_MAP[params.direction as ChainRecordDirection]
  }
  if (hasSearchValue(params.coin)) apiParams.coin = String(params.coin)
  if (hasSearchValue(params.price_id)) apiParams.price_id = Number(params.price_id)
  apiParams.order = buildOrderParam(params)

  Object.assign(apiParams, dateRangeToSeconds(params.dateRange))

  return apiParams
}

const aggregateListSummary = (list: ChainRecordItem[]) =>
  list.reduce((summary, item) => {
    const amount = Math.abs(parseAmount(getAmountValue(item)))
    const currency = getCurrency(item)
    const direction = getDirection(item)

    if (direction === 'out' && currency === 'U') summary.totalOutU += amount
    if (direction === 'out' && currency === 'T') summary.totalOutT += amount
    if (direction === 'in' && currency === 'U') summary.totalInU += amount
    if (direction === 'in' && currency === 'T') summary.totalInT += amount

    return summary
  }, createEmptySummary())

const pickSummaryNumber = (sources: Array<Record<string, unknown> | undefined>, keys: string[]) => {
  for (const source of sources) {
    if (!source) continue
    const value = pickValue(source, keys)
    if (hasSearchValue(value)) return parseAmount(value)
  }
  return undefined
}

const applySummaryStats = (
  data: SystemBillListResponse,
  list: ChainRecordItem[],
  total: number
) => {
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
      pickSummaryNumber(sources, ['total_out_u', 'out_u', 'total_out_usdt', 'usdt_out']) ??
      aggregate.totalOutU,
    totalOutT:
      pickSummaryNumber(sources, ['total_out_t', 'out_t', 'total_out_trx', 'trx_out']) ??
      aggregate.totalOutT,
    totalInU:
      pickSummaryNumber(sources, ['total_in_u', 'in_u', 'total_in_usdt', 'usdt_in']) ??
      aggregate.totalInU,
    totalInT:
      pickSummaryNumber(sources, ['total_in_t', 'in_t', 'total_in_trx', 'trx_in']) ??
      aggregate.totalInT
  }
}

const fetchChainRecordList = async (params: ChainRecordSearchParams = {}) => {
  try {
    const res = await v1GetSystemBillList(buildChainRecordParams(params))

    if (res?.code === '000000' && res.data) {
      const list = ((res.data.list || []) as ChainRecordItem[]).map((item) => ({ ...item }))
      const total = res.data.pager?.total || list.length || 0

      applySummaryStats(res.data, list, total)
      handleListMessage(
        list,
        [
          params.keyword,
          params.kinds,
          params.direction,
          params.coin,
          params.price_id,
          params.dateRange
        ].some(hasFilterValue),
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
    label: '交易笔数',
    value: formatNumber(summaryStats.value.todayCount, 0, 0),
    valueClass: ''
  },
  {
    key: 'out-u',
    label: '总出款金额（USDT）',
    value: formatSummaryAmount(summaryStats.value.totalOutU),
    valueClass: 'negative-value'
  },
  {
    key: 'out-t',
    label: '总出款金额（TRX）',
    value: formatSummaryAmount(summaryStats.value.totalOutT),
    valueClass: 'negative-value'
  },
  {
    key: 'in-total',
    label: '总收款金额',
    value: `${formatSummaryAmount(summaryStats.value.totalInT)} TRX / ${formatSummaryAmount(
      summaryStats.value.totalInU
    )} USDT`,
    valueClass: 'positive-value'
  }
])

const columns: TableColumn[] = [
  {
    field: 'related_order_no',
    label: '关联订单号',
    minWidth: 150,
    slots: {
      default: ({ row }: ChainRecordTableSlot) => renderRelatedOrder(row)
    }
  },
  {
    field: 'transaction_type',
    label: '交易类型',
    minWidth: 150,
    formatter: (row: ChainRecordItem) => getTransactionType(row)
  },
  {
    field: 'price_id',
    label: '代理等级',
    minWidth: 120,
    formatter: (row: ChainRecordItem) => getAgentLevelLabel(row)
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
    minWidth: 110,
    slots: {
      default: ({ row }: ChainRecordTableSlot) =>
        h('span', { class: getAmountClass(row) }, formatAmountDisplay(row))
    }
  },
  {
    field: 'coin',
    label: '币种',
    width: 90,
    formatter: (row: ChainRecordItem) => normalizeText(row.coin || getCurrency(row))
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
      tips: '交易哈希/收款地址/出款地址/关联订单ID',
      text: '关键词'
    },
    componentProps: {
      placeholder: '请输入关键词',
      clearable: true,
      style: { width: '260px' }
    }
  },
  {
    field: 'kinds',
    component: 'Select' as const,
    label: '交易类型',
    componentProps: {
      placeholder: '全部',
      clearable: true,
      multiple: true,
      collapseTags: true,
      collapseTagsTooltip: true,
      maxCollapseTags: 1,
      options: SYSTEM_BILL_KIND_OPTIONS,
      style: { width: '220px' }
    }
  },
  {
    field: 'price_id',
    component: 'Select' as const,
    label: '代理等级',
    componentProps: {
      placeholder: '全部',
      clearable: true,
      options: AGENT_LEVEL_OPTIONS,
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
    field: 'coin',
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
