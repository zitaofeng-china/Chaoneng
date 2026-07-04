<template>
  <div class="app-container resource-recharge-record-page">
    <ContentWrap>
      <SearchTable
        :columns="columns"
        :search-schema="searchSchema"
        :fetch-data-api="fetchResourceRechargeRecordList"
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

      <Dialog v-model="detailVisible" title="资源充值记录详情" width="820px">
        <div class="detail-section-title">订单记录</div>
        <Descriptions :schema="orderDetailSchema" :data="currentRecord" :column="2" />

        <div class="detail-section-title detail-section-space">地址信息</div>
        <Descriptions :schema="addressDetailSchema" :data="currentRecord" :column="1" />

        <template #footer>
          <div class="flex justify-end">
            <ElButton type="primary" @click="detailVisible = false">确定</ElButton>
          </div>
        </template>
      </Dialog>
    </ContentWrap>
  </div>
</template>

<script setup lang="tsx">
import { computed, h, ref } from 'vue'
import { ElButton, ElLink, ElTooltip } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { Dialog } from '@/components/Dialog'
import { SearchTable } from '@/components/SearchTable'
import { BaseButton } from '@/components/Button'
import { Descriptions } from '@/components/Descriptions'
import type { TableColumn } from '@/components/Table'
import type { FormSchema } from '@/components/Form'
import type { DescriptionsSchema } from '@/components/Descriptions'
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
  renderStatusTag,
  withAllOption,
  type DateRangeValue,
  type StatusMeta,
  type TableSlot
} from '@/utils/tableHelpers'
import { getTronscanTransactionUrl } from '@/utils/tronscan'

type ResourceRechargeRecord = ChargeBillItem & Record<string, unknown>
type ResourceRechargeTableSlot = TableSlot<ResourceRechargeRecord>
type ResourceRechargeSearchParams = Omit<ChargeBillParams, 'status'> & {
  status?: number | string
  dateRange?: DateRangeValue
  sort?: string
}
type DateTimeLike = string | number | Date | null | undefined

interface ResourceRechargeSummary {
  count: number
  amount: number
}

interface DetailField {
  label: string
  value: unknown
  link?: boolean
  status?: boolean
}

const DEFAULT_ORDER = 'created_at DESC'
const defaultParams = { order: DEFAULT_ORDER }
const searchProps = { layout: 'inline', buttonPosition: 'center' }
const tableProps = { defaultSort: { prop: 'created_at', order: 'descending' } }

const ACCOUNT_KIND_OPTIONS = withAllOption([
  { label: 'feee', value: 'feee' },
  { label: 'trxfee', value: 'trxfee' },
  { label: 'sohu', value: 'sohu' },
  { label: 'justlend', value: 'justlend' }
])

const RESOURCE_RECHARGE_STATUS_MAP: Record<number, StatusMeta> = {
  1: { label: '成功', type: 'success' },
  2: { label: '失败', type: 'danger' }
}

const RESOURCE_RECHARGE_STATUS_OPTIONS = withAllOption([
  { label: '成功', value: 1 },
  { label: '失败', value: 2 }
])

const summaryStats = ref<ResourceRechargeSummary>({
  count: 0,
  amount: 0
})
const detailVisible = ref(false)
const currentRecord = ref<ResourceRechargeRecord | null>(null)

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

const formatNumber = (value: number, minDigits = 0, maxDigits = 8) =>
  value.toLocaleString('zh-CN', {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits
  })

const getAmountValueClass = (amount: number) => {
  if (amount < 0) return 'negative-value'
  if (amount > 0) return 'positive-value'
  return ''
}

const getAmountTableClass = (row: ResourceRechargeRecord) => {
  const amount = parseAmount(row.amount)
  if (amount < 0) return 'amount-negative'
  if (amount > 0) return 'amount-positive'
  return ''
}

const truncateMiddle = (value?: unknown, start = 9, end = 6) => {
  const text = normalizeText(value, '')
  if (!text) return '-'
  if (text.length <= start + end + 3) return text
  return `${text.slice(0, start)}...${text.slice(-end)}`
}

const getRecordId = (row: ResourceRechargeRecord) =>
  normalizeText(pickValue(row, ['order_no', 'order_id', 'id']))

const getAccountKind = (row: ResourceRechargeRecord) =>
  normalizeText(pickValue(row, ['kind', 'account', 'account_type']))

const getRechargeAmount = (row: ResourceRechargeRecord) => {
  const raw = normalizeText(row.amount, '')
  if (!raw) return '-'
  if (/[a-zA-Z]/.test(raw)) return raw

  return formatNumber(parseAmount(raw), 2, 8)
}

const getVaultAddress = (row: ResourceRechargeRecord) =>
  normalizeText(pickValue(row, ['vault', 'finance_address', 'from_address']))

const getTargetAddress = (row: ResourceRechargeRecord) =>
  normalizeText(pickValue(row, ['target', 'to_address', 'receive_address']))

const getRechargeTxid = (row: ResourceRechargeRecord) =>
  normalizeText(pickValue(row, ['txid', 'tx_hash', 'transaction_hash']), '')

const getRemark = (row: ResourceRechargeRecord) =>
  normalizeText(pickValue(row, ['describe', 'remark', 'memo', 'description']))

const getCreatedAt = (row: ResourceRechargeRecord) => pickValue(row, ['created_at', 'updated_at'])

const getRechargeTime = (row: ResourceRechargeRecord) =>
  formatTableDateTime(getCreatedAt(row) as DateTimeLike)

const getStatus = (row: ResourceRechargeRecord) => pickValue(row, ['status', 'chain_status'])

const renderTooltipText = (value?: unknown, width = 150, start = 9, end = 6) => {
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
        truncateMiddle(text, start, end)
      )
  )
}

const renderTxidLink = (txid?: unknown, width = 185) => {
  const normalizedTxid = normalizeText(txid, '')
  if (!normalizedTxid) return h('span', '-')

  return h(
    ElTooltip,
    {
      content: normalizedTxid,
      placement: 'top'
    },
    () =>
      h(
        ElLink,
        {
          type: 'primary',
          href: getTronscanTransactionUrl(normalizedTxid),
          target: '_blank',
          underline: false,
          class: 'txid-link'
        },
        () =>
          h(
            'span',
            { class: 'table-ellipsis', style: { maxWidth: `${width}px` } },
            truncateMiddle(normalizedTxid, 12, 8)
          )
      )
  )
}

const buildOrderParam = (params: ResourceRechargeSearchParams) => {
  if (params.sort && params.order) {
    const direction = params.order === 'ascending' ? 'ASC' : 'DESC'
    return `${params.sort} ${direction}`
  }

  if (typeof params.order === 'string' && params.order.includes(' ')) {
    return params.order
  }

  return DEFAULT_ORDER
}

const buildResourceRechargeParams = (
  params: ResourceRechargeSearchParams = {}
): ChargeBillParams => {
  const apiParams: ChargeBillParams = {
    ...createPageParams(params)
  }

  if (hasSearchValue(params.keyword)) apiParams.keyword = String(params.keyword).trim()
  if (hasSearchValue(params.kind)) apiParams.kind = String(params.kind)
  if (hasSearchValue(params.status)) apiParams.status = Number(params.status)
  apiParams.order = buildOrderParam(params)

  Object.assign(apiParams, dateRangeToSeconds(params.dateRange))

  return apiParams
}

const getStatsRecord = (data: ChargeBillResponse) => {
  const dataRecord = data as unknown as Record<string, unknown>
  return isRecord(dataRecord.stats) ? dataRecord.stats : undefined
}

const getSummaryAmount = (data: ChargeBillResponse, list: ResourceRechargeRecord[]) => {
  const statsRecord = getStatsRecord(data)
  const dataRecord = data as unknown as Record<string, unknown>
  const summaryRecord = isRecord(dataRecord.summary) ? dataRecord.summary : undefined
  const amount =
    pickValue(statsRecord || {}, ['sum_amount', 'amount', 'total_amount']) ??
    pickValue(summaryRecord || {}, ['sum_amount', 'amount', 'total_amount']) ??
    pickValue(dataRecord, ['sum_amount', 'amount', 'total_amount'])

  return amount === undefined
    ? list.reduce((sum, item) => sum + parseAmount(item.amount), 0)
    : parseAmount(amount)
}

const applySummaryStats = (
  data: ChargeBillResponse,
  list: ResourceRechargeRecord[],
  total: number
) => {
  summaryStats.value = {
    count: total || list.length,
    amount: getSummaryAmount(data, list)
  }
}

const hasFilterValue = (value: unknown) =>
  Array.isArray(value) ? value.length > 0 : hasSearchValue(value)

const fetchResourceRechargeRecordList = async (params: ResourceRechargeSearchParams = {}) => {
  try {
    const response = await getChargeBillList(buildResourceRechargeParams(params))

    if (response?.code === '000000' && response.data) {
      const list = ((response.data.list || []) as ResourceRechargeRecord[]).map((item) => ({
        ...item
      }))
      const total = response.data.pager?.total || list.length || 0

      applySummaryStats(response.data, list, total)
      handleListMessage(
        list,
        [params.keyword, params.kind, params.status, params.dateRange].some(hasFilterValue),
        '资源充值记录'
      )

      return { list, total }
    }

    summaryStats.value = { count: 0, amount: 0 }
    return { list: [], total: 0 }
  } catch (error) {
    summaryStats.value = { count: 0, amount: 0 }
    handleErrorMessage(error, '获取资源充值记录失败')
    return { list: [], total: 0 }
  }
}

const handleViewDetail = (row: ResourceRechargeRecord) => {
  currentRecord.value = { ...row }
  detailVisible.value = true
}

const renderDetailText = (value?: unknown) => h('span', normalizeText(value))

const renderDetailLink = (value?: unknown) => {
  const text = normalizeText(value, '')
  if (!text) return h('span', '-')

  return h(
    ElLink,
    {
      type: 'primary',
      href: getTronscanTransactionUrl(text),
      target: '_blank',
      underline: false
    },
    () => text
  )
}

const createDetailSchema = (fields: DetailField[]): DescriptionsSchema[] =>
  fields.map((item) => ({
    field: item.label,
    label: item.label,
    span: 24,
    slots: {
      default: () => {
        if (item.status) {
          return renderStatusTag(RESOURCE_RECHARGE_STATUS_MAP, item.value as number, '未知')
        }
        if (item.link) return renderDetailLink(item.value)
        return renderDetailText(item.value)
      }
    }
  }))

const orderDetailSchema = computed<DescriptionsSchema[]>(() => {
  const row = currentRecord.value
  if (!row) return []

  return createDetailSchema([
    { label: '账单ID', value: getRecordId(row) },
    { label: '账单类型', value: getAccountKind(row) },
    { label: '交易金额', value: getRechargeAmount(row) },
    { label: '交易时间', value: getRechargeTime(row) },
    { label: '状态', value: getStatus(row), status: true },
    { label: '备注', value: getRemark(row) }
  ])
})

const addressDetailSchema = computed<DescriptionsSchema[]>(() => {
  const row = currentRecord.value
  if (!row) return []

  return createDetailSchema([
    { label: '财务地址', value: getVaultAddress(row) },
    { label: '目标地址', value: getTargetAddress(row) },
    { label: '交易哈希', value: getRechargeTxid(row), link: true }
  ])
})

const summaryCards = computed(() => [
  {
    key: 'count',
    label: '交易笔数',
    value: formatNumber(summaryStats.value.count, 0, 0),
    valueClass: ''
  },
  {
    key: 'amount',
    label: '交易金额',
    value: formatNumber(summaryStats.value.amount, 2, 8),
    valueClass: getAmountValueClass(summaryStats.value.amount)
  }
])

const columns: TableColumn[] = [
  {
    field: 'id',
    label: '账单ID',
    minWidth: 110,
    formatter: (row: ResourceRechargeRecord) => getRecordId(row)
  },
  {
    field: 'kind',
    label: '账单类型',
    minWidth: 110,
    formatter: (row: ResourceRechargeRecord) => getAccountKind(row)
  },
  {
    field: 'amount',
    label: '交易金额',
    minWidth: 120,
    slots: {
      default: ({ row }: ResourceRechargeTableSlot) =>
        h('span', { class: getAmountTableClass(row) }, getRechargeAmount(row))
    }
  },
  {
    field: 'vault',
    label: '财务地址',
    minWidth: 180,
    slots: {
      default: ({ row }: ResourceRechargeTableSlot) => renderTooltipText(getVaultAddress(row), 155)
    }
  },
  {
    field: 'target',
    label: '目标地址',
    minWidth: 180,
    slots: {
      default: ({ row }: ResourceRechargeTableSlot) => renderTooltipText(getTargetAddress(row), 155)
    }
  },
  {
    field: 'txid',
    label: '交易哈希',
    minWidth: 230,
    slots: {
      default: ({ row }: ResourceRechargeTableSlot) => renderTxidLink(getRechargeTxid(row))
    }
  },
  {
    field: 'status',
    label: '链上状态',
    width: 110,
    slots: {
      default: ({ row }: ResourceRechargeTableSlot) =>
        renderStatusTag(RESOURCE_RECHARGE_STATUS_MAP, getStatus(row) as number, '未知')
    }
  },
  {
    field: 'created_at',
    label: '交易时间',
    sortable: 'custom',
    width: 180,
    formatter: (row: ResourceRechargeRecord) => getRechargeTime(row)
  },
  {
    field: 'describe',
    label: '备注',
    minWidth: 140,
    formatter: (row: ResourceRechargeRecord) => getRemark(row)
  },
  {
    field: 'action',
    label: '操作',
    width: 100,
    fixed: 'right',
    slots: {
      default: ({ row }: ResourceRechargeTableSlot) =>
        h(
          BaseButton,
          {
            type: 'primary',
            size: 'small',
            onClick: () => handleViewDetail(row)
          },
          () => '查看'
        )
    }
  }
]

const searchSchema = ref<FormSchema[]>([
  {
    field: 'keyword',
    component: 'Input' as const,
    label: '关键词',
    componentProps: {
      placeholder: '账单ID / 财务地址 / 目标地址 / 交易哈希',
      clearable: true,
      style: { width: '260px' }
    }
  },
  {
    field: 'kind',
    component: 'Select' as const,
    label: '账单类型',
    componentProps: {
      placeholder: '全部',
      clearable: true,
      options: ACCOUNT_KIND_OPTIONS,
      style: { width: '150px' }
    }
  },
  {
    field: 'status',
    component: 'Select' as const,
    label: '状态',
    componentProps: {
      placeholder: '全部',
      clearable: true,
      options: RESOURCE_RECHARGE_STATUS_OPTIONS,
      style: { width: '140px' }
    }
  },
  {
    field: 'dateRange',
    component: 'DatePicker' as const,
    label: '日期',
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
.resource-recharge-record-page {
  padding: 0;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(180px, 225px));
  gap: 38px;
  margin: 14px 0 30px;
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

.txid-link {
  max-width: 100%;
}

.detail-section-title {
  padding: 0 0 14px 2px;
  font-size: 15px;
  font-weight: 700;
  color: #303133;
}

.detail-section-space {
  padding-top: 22px;
}

:deep(.el-tag) {
  min-width: 56px;
  justify-content: center;
}

@media (width <= 768px) {
  .summary-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }
}
</style>
