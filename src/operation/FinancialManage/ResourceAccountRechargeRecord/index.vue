<template>
  <div class="app-container">
    <ContentWrap>
      <SearchTable
        ref="searchTableRef"
        :columns="columns"
        :search-schema="searchSchema"
        :fetch-data-api="fetchBillRecordList"
        :showAddButton="false"
        :default-params="defaultParams"
        :search-props="{
          layout: 'inline',
          buttonPosition: 'center'
        }"
        :table-props="tableProps"
      >
        <template #beforeTable>
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">交易笔数</div>
              <div class="summary-value">{{ billSummary.count }}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">交易金额</div>
              <div class="summary-value amount">{{ formatAmount(billSummary.amount) }}</div>
            </div>
          </div>
        </template>
      </SearchTable>

      <Dialog v-model="detailVisible" title="结算明细详情" width="860px">
        <div class="detail-section">
          <div class="detail-section-title">订单记录</div>
          <Descriptions :schema="orderDetailSchema" :data="currentRecord" :column="2" border />
        </div>
        <div class="detail-section">
          <div class="detail-section-title">地址信息</div>
          <Descriptions :schema="addressDetailSchema" :data="currentRecord" :column="1" border />
        </div>
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
import type { SearchTableExpose } from '@/components/SearchTable'
import { BaseButton } from '@/components/Button'
import { Descriptions } from '@/components/Descriptions'
import type { DescriptionsSchema } from '@/components/Descriptions'
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
  createDefaultDateTimeRange,
  createPageParams,
  dateRangeToSeconds,
  formatTableDateTime,
  hasSearchValue,
  renderStatusTag,
  withAllOption,
  type DateRangeValue,
  type TableSlot
} from '@/utils/tableHelpers'
import { getTronscanTransactionUrl } from '@/utils/tronscan'
import { RESOURCE_SUPPLEMENT_STATUS_MAP, RESOURCE_SUPPLEMENT_STATUS_OPTIONS } from '../constants'

type BillRecordSearchParams = ChargeBillParams & {
  dateRange?: DateRangeValue
}

type BillDisplayAction = '租赁' | '退租' | ''
type BillDisplayItem = ChargeBillItem & {
  display_id: string
  display_action: BillDisplayAction
  display_amount: number
  source_record: ChargeBillItem
}
type BillRecordTableSlot = TableSlot<BillDisplayItem>

interface BillSummary {
  count: number
  amount: number | string
}

const BILL_KIND_OPTIONS = [
  { label: 'feee', value: 'feee' },
  { label: 'sohu', value: 'sohu' },
  { label: 'trxfee', value: 'trxfee' },
  { label: 'justlend', value: 'justlend' }
]

const searchTableRef = ref<SearchTableExpose | null>(null)
const detailVisible = ref(false)
const currentRecord = ref<BillDisplayItem | null>(null)
const DEFAULT_ORDER = 'created_at DESC'
const defaultParams = {
  order: DEFAULT_ORDER
}
const tableProps = {
  defaultSort: {
    prop: 'created_at',
    order: 'descending'
  }
}
const billSummary = ref<BillSummary>({
  count: 0,
  amount: 0
})

const normalizeText = (value?: string | number | null) => {
  const text = String(value ?? '').trim()
  return text || '-'
}

const parseAmount = (amount?: string | number | null) => {
  if (typeof amount === 'number') return amount
  const normalizedAmount = String(amount ?? '').replace(/[^\d.-]/g, '')
  const parsedAmount = Number(normalizedAmount)
  return Number.isFinite(parsedAmount) ? parsedAmount : 0
}

const formatAmount = (amount?: string | number | null) => {
  const value = parseAmount(amount)
  const prefix = value < 0 ? '-' : ''
  return `${prefix}${Math.abs(value).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8
  })} TRX`
}

const getOrderId = (row: BillDisplayItem) => normalizeText(row.id)

const getAccount = (row: BillDisplayItem) => normalizeText(row.kind)

const getPayAddress = (row: BillDisplayItem) => normalizeText(row.vault)

const getTargetAddress = (row: BillDisplayItem) => normalizeText(row.target)

const getTransactionHash = (row: BillDisplayItem) => normalizeText(row.txid)

const getRemark = (row: BillDisplayItem) =>
  normalizeText([row.display_action, row.describe].filter(Boolean).join(' / '))

const getBillAmount = (row: BillDisplayItem) => row.display_amount

const createDisplayBill = (
  item: ChargeBillItem,
  action: BillDisplayAction = '',
  amount = parseAmount(item.amount)
): BillDisplayItem => ({
  ...item,
  display_id: action ? `${item.id}-${action}` : String(item.id),
  display_action: action,
  display_amount: amount,
  source_record: item
})

const normalizeBillList = (list: ChargeBillItem[]) => {
  return list.flatMap((item) => {
    if (String(item.kind || '').toLowerCase() !== 'justlend') {
      return [createDisplayBill(item)]
    }

    const amount = Math.abs(parseAmount(item.amount))
    return [createDisplayBill(item, '租赁', amount), createDisplayBill(item, '退租', -amount)]
  })
}

const truncateMiddle = (value?: string | number | null, start = 10, end = 8) => {
  const text = String(value ?? '').trim()
  if (!text) return '-'
  if (text.length <= start + end + 3) return text
  return `${text.slice(0, start)}...${text.slice(-end)}`
}

const renderCopyableText = (value?: string | number | null, width = 170) => {
  const text = String(value ?? '').trim()
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
          class: 'inline-block align-middle',
          style: {
            maxWidth: `${width}px`,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }
        },
        truncateMiddle(text)
      )
  )
}

const renderTransactionLink = (value?: string | number | null) => {
  const text = String(value ?? '').trim()
  if (!text || text === '-') return h('span', '-')

  return h(
    ElTooltip,
    {
      content: text,
      placement: 'top'
    },
    () =>
      h(
        ElLink,
        {
          type: 'primary',
          href: getTronscanTransactionUrl(text),
          target: '_blank'
        },
        () => truncateMiddle(text)
      )
  )
}

const renderAmount = (amount?: string | number | null) => {
  const value = parseAmount(amount)
  return h(
    'span',
    {
      class: value < 0 ? 'amount-negative' : 'amount-positive'
    },
    formatAmount(value)
  )
}

const renderDetailText = (value?: string | number | null) =>
  h('span', normalizeText(value)) as unknown as JSX.Element

const renderDetailNode = (node: ReturnType<typeof h>) => node as unknown as JSX.Element

const buildBillRecordParams = (params: BillRecordSearchParams = {}): ChargeBillParams => {
  const apiParams: ChargeBillParams = {
    ...createPageParams(params)
  }

  if (hasSearchValue(params.keyword)) apiParams.keyword = String(params.keyword).trim()
  if (hasSearchValue(params.kind)) apiParams.kind = String(params.kind)
  if (hasSearchValue(params.status)) apiParams.status = Number(params.status)
  apiParams.order = hasSearchValue(params.order) ? String(params.order) : DEFAULT_ORDER

  Object.assign(apiParams, dateRangeToSeconds(params.dateRange))

  return apiParams
}

const getDisplayTotal = (data: ChargeBillResponse, displayList: BillDisplayItem[]) => {
  const sourceTotal = data.pager?.total || data.list?.length || 0
  const justlendExtraCount = displayList.filter((item) => item.display_action === '退租').length
  return sourceTotal + justlendExtraCount
}

const resolveSummaryAmount = (data: ChargeBillResponse, displayList: BillDisplayItem[]) => {
  const summary = data.summary || {}
  return (
    summary.transaction_amount ??
    summary.total_amount ??
    summary.amount ??
    data.transaction_amount ??
    data.total_amount ??
    data.amount_sum ??
    data.amount ??
    displayList.reduce((sum, item) => sum + getBillAmount(item), 0)
  )
}

const updateSummary = (data: ChargeBillResponse, displayList: BillDisplayItem[]) => {
  const summary = data.summary || {}
  billSummary.value = {
    count:
      Number(
        summary.transaction_count ??
          summary.count ??
          summary.total ??
          data.transaction_count ??
          data.count ??
          getDisplayTotal(data, displayList)
      ) || 0,
    amount: resolveSummaryAmount(data, displayList)
  }
}

const fetchBillRecordList = async (params: BillRecordSearchParams = {}) => {
  try {
    const res = await getChargeBillList(buildBillRecordParams(params))

    if (res?.code === '000000' && res.data) {
      const displayList = normalizeBillList(res.data.list || [])
      const total = getDisplayTotal(res.data, displayList)

      updateSummary(res.data, displayList)
      handleListMessage(
        displayList,
        [params.keyword, params.kind, params.status, params.dateRange].some(hasSearchValue),
        '资源账户充值记录'
      )

      return { list: displayList, total }
    }

    billSummary.value = { count: 0, amount: 0 }
    return { list: [], total: 0 }
  } catch (error) {
    billSummary.value = { count: 0, amount: 0 }
    handleErrorMessage(error, '获取资源账户充值记录失败')
    return { list: [], total: 0 }
  }
}

const columns: TableColumn[] = [
  {
    field: 'id',
    label: '订单ID',
    minWidth: 110,
    formatter: (row: BillDisplayItem) => getOrderId(row)
  },
  {
    field: 'kind',
    label: '补充账户',
    minWidth: 120,
    formatter: (row: BillDisplayItem) => getAccount(row)
  },
  {
    field: 'amount',
    label: '交易金额',
    width: 130,
    slots: {
      default: ({ row }: BillRecordTableSlot) => renderAmount(getBillAmount(row))
    }
  },
  {
    field: 'vault',
    label: '付款地址',
    minWidth: 190,
    slots: {
      default: ({ row }: BillRecordTableSlot) => renderCopyableText(getPayAddress(row))
    }
  },
  {
    field: 'target',
    label: '目标地址',
    minWidth: 190,
    slots: {
      default: ({ row }: BillRecordTableSlot) => renderCopyableText(getTargetAddress(row))
    }
  },
  {
    field: 'txid',
    label: '交易哈希',
    minWidth: 230,
    slots: {
      default: ({ row }: BillRecordTableSlot) => renderTransactionLink(getTransactionHash(row))
    }
  },
  {
    field: 'status',
    label: '链上状态',
    width: 100,
    slots: {
      default: ({ row }: BillRecordTableSlot) =>
        renderStatusTag(RESOURCE_SUPPLEMENT_STATUS_MAP, row.status, '未知')
    }
  },
  {
    field: 'created_at',
    label: '交易时间',
    sortable: 'custom',
    width: 180,
    formatter: (row: BillDisplayItem) => formatTableDateTime(row.created_at)
  },
  {
    field: 'describe',
    label: '备注',
    minWidth: 150,
    formatter: (row: BillDisplayItem) => getRemark(row)
  },
  {
    field: 'action',
    label: '操作',
    width: 90,
    fixed: 'right',
    slots: {
      default: ({ row }: BillRecordTableSlot) =>
        h(
          BaseButton,
          {
            type: 'primary',
            onClick: () => handleView(row)
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
    label: {
      tips: '付款地址/目标地址/交易哈希',
      text: '关键词'
    },
    componentProps: {
      placeholder: '付款地址/目标地址/交易哈希',
      clearable: true,
      style: {
        width: '260px'
      }
    }
  },
  {
    field: 'kind',
    component: 'Select' as const,
    label: '账户类型',
    componentProps: {
      placeholder: '全部',
      clearable: true,
      options: withAllOption(BILL_KIND_OPTIONS)
    }
  },
  {
    field: 'status',
    component: 'Select' as const,
    label: '状态',
    componentProps: {
      placeholder: '全部',
      clearable: true,
      options: RESOURCE_SUPPLEMENT_STATUS_OPTIONS
    }
  },
  {
    field: 'dateRange',
    component: 'DatePicker' as const,
    label: '日期',
    componentProps: {
      type: 'daterange',
      valueFormat: 'x',
      startPlaceholder: '开始日期',
      endPlaceholder: '结束日期',
      defaultTime: createDefaultDateTimeRange()
    }
  }
])

const orderDetailSchema = computed<DescriptionsSchema[]>(() => [
  {
    field: 'id',
    label: '订单ID',
    slots: { default: (row) => renderDetailText(getOrderId(row)) }
  },
  {
    field: 'kind',
    label: '补充账户',
    slots: { default: (row) => renderDetailText(getAccount(row)) }
  },
  {
    field: 'amount',
    label: '交易金额',
    slots: { default: (row) => renderDetailNode(renderAmount(getBillAmount(row))) }
  },
  {
    field: 'created_at',
    label: '交易时间',
    slots: { default: (row) => renderDetailText(formatTableDateTime(row.created_at)) }
  },
  {
    field: 'status',
    label: '状态',
    slots: {
      default: (row) =>
        renderDetailNode(renderStatusTag(RESOURCE_SUPPLEMENT_STATUS_MAP, row.status, '未知'))
    }
  },
  {
    field: 'describe',
    label: '备注',
    slots: { default: (row) => renderDetailText(getRemark(row)) }
  }
])

const addressDetailSchema = computed<DescriptionsSchema[]>(() => [
  {
    field: 'vault',
    label: '用户发送地址',
    slots: { default: (row) => renderDetailText(getPayAddress(row)) }
  },
  {
    field: 'target',
    label: '用户接收地址',
    slots: { default: (row) => renderDetailText(getTargetAddress(row)) }
  },
  {
    field: 'txid',
    label: '交易哈希',
    slots: { default: (row) => renderDetailNode(renderTransactionLink(getTransactionHash(row))) }
  }
])

const handleView = (row: BillDisplayItem) => {
  currentRecord.value = row
  detailVisible.value = true
}
</script>

<style scoped>
.app-container {
  padding: 0;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(180px, 1fr));
  gap: 16px;
  max-width: 520px;
  margin: 14px 0 28px;
}

.summary-item {
  min-height: 58px;
  padding: 12px 16px;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-lighter);
}

.summary-label,
.detail-section-title {
  font-size: 13px;
  font-weight: 700;
  line-height: 18px;
  color: var(--el-text-color-primary);
}

.summary-value {
  margin-top: 8px;
  font-size: 14px;
  font-weight: 700;
  line-height: 20px;
  color: var(--el-text-color-primary);
}

.summary-value.amount,
:deep(.amount-positive) {
  color: #67c23a;
}

:deep(.amount-negative) {
  color: #f56c6c;
}

.detail-section {
  margin-bottom: 28px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.detail-section-title {
  padding-left: 12px;
  margin-bottom: 12px;
  border-left: 3px solid var(--el-color-primary);
}

@media (width <= 640px) {
  .summary-grid {
    grid-template-columns: 1fr;
    max-width: none;
  }
}
</style>
