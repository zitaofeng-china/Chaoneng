<template>
  <div class="app-container">
    <ContentWrap>
      <SearchTable
        :columns="columns"
        :search-schema="searchSchema"
        :fetch-data-api="fetchAgentLedgerList"
        :initial-params="initialSearchParams"
        :show-add-button="false"
        :table-props="{ rowKey: getLedgerRowKey }"
        ref="searchTableRef"
      >
        <template #searchButtons>
          <BaseButton type="primary" @click="handleExport">
            <Icon icon="ep:download" class="mr-5px" />
            导出
          </BaseButton>
        </template>
        <template #beforeTable>
          <div class="ledger-stats-row">
            <div class="stat-box">
              <div class="stat-label">累计金额变化</div>
              <div class="stat-value-row">
                <span class="stat-in">{{ formatFundAmount(ledgerStats.inAmount, false) }}</span>
                <span class="stat-out">{{ formatFundAmount(ledgerStats.outAmount, true) }}</span>
              </div>
            </div>
          </div>
        </template>
      </SearchTable>
    </ContentWrap>
  </div>
</template>

<script setup lang="tsx">
import { onActivated, ref, watch } from 'vue'
import { ElLink } from 'element-plus'
import { BaseButton } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { SearchTable } from '@/components/SearchTable'
import type { SearchTableExpose } from '@/components/SearchTable'
import type { FormSchema } from '@/components/Form'
import type { TableColumn } from '@/components/Table'
import { v1GetAgentBillList } from '@/api/opertion/Agent/Ledger'
import type {
  AgentBillItem,
  AgentBillListParams,
  AgentBillListResponse
} from '@/api/opertion/Agent/Ledger'
import { ContentWrap } from '@/components/ContentWrap'
import { useRoute, useRouter } from 'vue-router'
import { handleErrorMessage, handleListMessage } from '@/utils/messageHelper'
import {
  createDefaultDateTimeRange,
  createNullablePageParams,
  dateRangeToSeconds,
  exportTableData,
  formatTableDateTime,
  hasSearchValue,
  type DateRangeValue,
  type TableSlot
} from '@/utils/tableHelpers'
import {
  AGENT_BILL_FLOW_IN,
  AGENT_BILL_FLOW_MAP,
  AGENT_BILL_FLOW_OPTIONS,
  AGENT_BILL_FLOW_OUT,
  AGENT_BILL_ORDER_TYPE_MAP,
  AGENT_BILL_ORDER_TYPE_OPTIONS
} from '../constants'

type AgentLedgerSearchParams = Omit<AgentBillListParams, 'kinds'> & {
  kind?: number | string
  dateRange?: DateRangeValue
}
type AgentLedgerTableSlot = TableSlot<AgentBillItem>
type AgentLedgerFundDirection = 'in' | 'out'

interface AgentLedgerStats {
  inAmount: number
  outAmount: number
}

const searchTableRef = ref<SearchTableExpose | null>(null)
const route = useRoute()
const router = useRouter()
const currentSearchParams = ref<AgentLedgerSearchParams>({})
const AGENT_LEDGER_EXPORT_ORDER = 'created_at DESC'
const hasActivatedOnce = ref(false)
const emptyLedgerStats = (): AgentLedgerStats => ({ inAmount: 0, outAmount: 0 })
const ledgerStats = ref<AgentLedgerStats>(emptyLedgerStats())

const FUND_IN_STAT_KEYS = [
  'sum_flow_in_trx',
  'sum_in_trx',
  'total_in_trx',
  'sum_in',
  'total_in',
  'in_trx',
  'in'
]
const FUND_OUT_STAT_KEYS = [
  'sum_flow_out_trx',
  'sum_out_trx',
  'total_out_trx',
  'sum_out',
  'total_out',
  'out_trx',
  'out'
]

const getRouteKeyword = () => {
  const keyword = route.query.keyword
  if (Array.isArray(keyword)) return keyword[0] || ''
  return keyword ? String(keyword) : ''
}

const getRouteSearchParams = (): AgentLedgerSearchParams => {
  const keyword = getRouteKeyword()
  if (!keyword) return {}
  return { keyword }
}

const initialSearchParams = getRouteSearchParams()

const isSameSearchParamValue = (left: unknown, right: unknown) => {
  if (!hasSearchValue(left) && !hasSearchValue(right)) return true
  return String(left ?? '') === String(right ?? '')
}

const syncRouteSearchParams = async () => {
  if (!searchTableRef.value) return

  const params = getRouteSearchParams()
  if (!Object.keys(params).length) return

  const currentParams = searchTableRef.value.searchParams.value || {}
  const changed = Object.entries(params).some(([key, value]) => {
    return !isSameSearchParamValue(currentParams[key], value)
  })

  if (!changed) return

  searchTableRef.value.setSearchParams(params)
  await searchTableRef.value.reload()
}

const isQuickChargeBill = (row: AgentBillItem) =>
  [15, 21].includes(Number(row.kind)) || row.describe?.includes('速充')

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const parseAmountValue = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const matched = String(value ?? '')
    .replace(/,/g, '')
    .match(/-?\d+(?:\.\d+)?/)
  const amount = matched ? Number(matched[0]) : 0
  return Number.isFinite(amount) ? amount : 0
}

const getFundDirection = (row: AgentBillItem): AgentLedgerFundDirection => {
  const flow = Number(row.flow)
  if (flow === AGENT_BILL_FLOW_IN) return 'in'
  if (flow === AGENT_BILL_FLOW_OUT) return 'out'
  return parseAmountValue(row.amount) < 0 ? 'out' : 'in'
}

const getFundDirectionLabel = (row: AgentBillItem) =>
  AGENT_BILL_FLOW_MAP[getFundDirection(row) === 'out' ? AGENT_BILL_FLOW_OUT : AGENT_BILL_FLOW_IN]

const formatFundAmount = (value: number, isOut: boolean) => {
  const abs = Math.abs(Number(value) || 0)
  const text = abs.toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8
  })
  return `${isOut ? '-' : '+'}${text}`
}

const normalizeStatRecords = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) return value.filter(isRecord)
  return isRecord(value) ? [value] : []
}

const pickStatAmount = (sources: unknown[], keys: string[]) => {
  for (const source of sources) {
    for (const record of normalizeStatRecords(source)) {
      for (const key of keys) {
        if (!hasSearchValue(record[key])) continue
        return Math.abs(parseAmountValue(record[key]))
      }
    }
  }
  return undefined
}

const pickStatAmountByFlow = (stats: unknown, flow: number) => {
  for (const record of normalizeStatRecords(stats)) {
    if (Number(record.flow) !== flow) continue
    const coin = String(record.coin || 'TRX').toUpperCase()
    if (coin && coin !== 'TRX') continue
    const amount = record.sum ?? record.amount ?? record.total ?? record.sum_amount
    if (!hasSearchValue(amount)) continue
    return Math.abs(parseAmountValue(amount))
  }
  return undefined
}

const aggregateListFundAmount = (list: AgentBillItem[]): AgentLedgerStats =>
  list.reduce((summary, item) => {
    const amount = Math.abs(parseAmountValue(item.amount))
    if (getFundDirection(item) === 'out') summary.outAmount += amount
    else summary.inAmount += amount
    return summary
  }, emptyLedgerStats())

const applyLedgerStats = (data: AgentBillListResponse | undefined, list: AgentBillItem[]) => {
  if (!data) {
    ledgerStats.value = emptyLedgerStats()
    return
  }

  const dataRecord = data as unknown as Record<string, unknown>
  const sources = [data.stats, data.summary, dataRecord]
  const aggregate = aggregateListFundAmount(list)

  ledgerStats.value = {
    inAmount:
      pickStatAmount(sources, FUND_IN_STAT_KEYS) ??
      pickStatAmountByFlow(data.stats, AGENT_BILL_FLOW_IN) ??
      aggregate.inAmount,
    outAmount:
      pickStatAmount(sources, FUND_OUT_STAT_KEYS) ??
      pickStatAmountByFlow(data.stats, AGENT_BILL_FLOW_OUT) ??
      aggregate.outAmount
  }
}

const buildAgentBillParams = (
  params: AgentLedgerSearchParams = {},
  pageSize?: number
): AgentBillListParams => {
  const apiParams: AgentBillListParams = {
    ...createNullablePageParams(params, 10, pageSize)
  }

  if (params.keyword) apiParams.keyword = params.keyword
  if (hasSearchValue(params.kind)) apiParams.kinds = [Number(params.kind)]
  if (hasSearchValue(params.flow)) apiParams.flow = Number(params.flow)
  apiParams.order = params.order || AGENT_LEDGER_EXPORT_ORDER

  Object.assign(apiParams, dateRangeToSeconds(params.dateRange))

  return apiParams
}

const formatAmountChange = (item: AgentBillItem) => {
  const value = Number(item.amount)
  if (Number.isNaN(value)) return `0 ${item.coin || ''}`.trim()
  return `${value < 0 ? '-' : '+'}${Math.abs(value)} ${item.coin || ''}`.trim()
}

const getLedgerRowKey = (row: AgentBillItem) => {
  return row.order_id || `${row.created_at}_${row.agent_id}_${row.bot_id}_${row.kind}`
}

const fetchAgentLedgerList = async (params: AgentLedgerSearchParams = {}) => {
  try {
    const response = await v1GetAgentBillList(buildAgentBillParams(params))

    const list = response.data?.list || []

    currentSearchParams.value = params
    applyLedgerStats(response.data, list)

    const hasSearchCondition = [params.keyword, params.kind, params.flow, params.dateRange].some(
      hasSearchValue
    )
    handleListMessage(list, hasSearchCondition, '代理账单')

    return {
      list,
      total: response.data?.pager?.total || 0
    }
  } catch (error) {
    ledgerStats.value = emptyLedgerStats()
    handleErrorMessage(error, '获取代理账单列表失败')
    return { list: [], total: 0 }
  }
}

// 搜索表单配置
const searchSchema = ref<FormSchema[]>([
  {
    field: 'keyword',
    component: 'Input',
    label: {
      text: '关键字',
      tips: '关联订单ID/代理名称/机器人名称'
    },
    componentProps: {
      placeholder: '请输入关键字'
    }
  },
  {
    field: 'kind',
    component: 'Select',
    label: '交易类型',
    componentProps: {
      placeholder: '请选择交易类型',
      clearable: true,
      options: AGENT_BILL_ORDER_TYPE_OPTIONS
    }
  },
  {
    field: 'flow',
    component: 'Select',
    label: '资金方向',
    componentProps: {
      placeholder: '请选择资金方向',
      clearable: true,
      options: AGENT_BILL_FLOW_OPTIONS
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
const columns = ref<TableColumn[]>([
  {
    field: 'order_id',
    label: '关联订单ID',
    minWidth: 170,
    formatter: (row: AgentBillItem) => row.order_id || '-',
    slots: {
      default: ({ row }: AgentLedgerTableSlot) => {
        if (!row.order_id) return <span>-</span>

        let routePath = ''
        switch (row.kind) {
          case 1: // 代理充值
            routePath = '/operation/recharge_order'
            break
          case 3: // 兑换
            routePath = '/operation/flash_exchange'
            break
          case 4: // 按时间
          case 5: // 按笔数
          case 6: // 福利能量
          case 7: // 闪租
          case 8: // 即用能量
          case 9: // 批量能量
          case 10: // 激活
          case 20: // 托管
            routePath = '/operation/energy_transaction'
            break
          case 15: // 速充能量
          case 21: // 托管速充
            routePath = '/operation/quick_charge_order'
            break
          case 11: // 机器人付费
          case 12: // 奖励
            return <span>{row.order_id}</span>
          default:
            if (isQuickChargeBill(row)) {
              routePath = '/operation/quick_charge_order'
              break
            }
            return <span>{row.order_id}</span>
        }

        return (
          <ElLink
            type="primary"
            onClick={() => router.push({ path: routePath, query: { query: row.order_id } })}
          >
            {row.order_id}
          </ElLink>
        )
      }
    }
  },
  {
    field: 'agent_email',
    label: '代理邮箱',
    minWidth: 180,
    formatter: (row: AgentBillItem) => row.agent_email || '-'
  },
  {
    field: 'agent_name',
    label: '代理名称',
    minWidth: 120,
    formatter: (row: AgentBillItem) => row.agent_name || '-'
  },
  {
    field: 'bot_name',
    label: '机器人名称',
    minWidth: 130,
    formatter: (row: AgentBillItem) => row.bot_name || '-'
  },
  {
    field: 'kind',
    label: '交易类型',
    minWidth: 120,
    formatter: (row: AgentBillItem) => {
      return AGENT_BILL_ORDER_TYPE_MAP[row.kind] || row.describe || '-'
    }
  },
  {
    field: 'flow',
    label: '资金方向',
    width: 100,
    formatter: (row: AgentBillItem) => {
      const isOut = getFundDirection(row) === 'out'
      return <span style={{ color: isOut ? 'red' : 'green' }}>{getFundDirectionLabel(row)}</span>
    }
  },
  {
    field: 'amount',
    label: '金额变动',
    width: 100,
    formatter: (row: AgentBillItem) => {
      const isOut = Number(row.amount) < 0
      return <span style={{ color: isOut ? 'red' : 'green' }}>{formatAmountChange(row)}</span>
    }
  },
  {
    field: 'balance',
    label: '交易后TRX余额',
    minWidth: 140,
    formatter: (row: AgentBillItem) => row.balance || '-'
  },
  {
    field: 'describe',
    label: '备注',
    minWidth: 150,
    formatter: (row: AgentBillItem) => row.describe || '-'
  },
  {
    field: 'created_at',
    label: '扣款时间',
    minWidth: 170,
    sortable: 'custom',
    formatter: (row: AgentBillItem) => formatTableDateTime(row.created_at)
  }
])

const handleExport = async () => {
  try {
    await exportTableData<AgentBillItem, AgentLedgerSearchParams, AgentBillListParams>({
      searchTableRef,
      fallbackParams: currentSearchParams.value,
      filename: '代理账单',
      fetchData: v1GetAgentBillList,
      buildParams: (params) =>
        buildAgentBillParams({
          ...params,
          order: AGENT_LEDGER_EXPORT_ORDER
        }),
      mapItem: (item) => ({
        关联订单ID: item.order_id || '-',
        代理邮箱: item.agent_email || item.agent_name || '-',
        代理名称: item.agent_name || '-',
        机器人名称: item.bot_name || '-',
        交易类型: AGENT_BILL_ORDER_TYPE_MAP[item.kind] || item.describe || '-',
        资金方向: getFundDirectionLabel(item),
        金额变动: formatAmountChange(item),
        交易后TRX余额: item.balance || '-',
        扣款状态: '已完成',
        备注: item.describe || '-',
        扣款时间: formatTableDateTime(item.created_at)
      })
    })
  } catch (error) {
    handleErrorMessage(error, '导出失败')
  }
}

watch(
  () => getRouteKeyword(),
  async (keyword, previousKeyword) => {
    if (keyword === previousKeyword) return
    await syncRouteSearchParams()
  }
)

onActivated(async () => {
  if (!hasActivatedOnce.value) {
    hasActivatedOnce.value = true
    return
  }
  await syncRouteSearchParams()
})
</script>

<style scoped>
.ledger-stats-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.stat-box {
  min-width: 220px;
  padding: 12px 16px;
  text-align: left;
  background: #fff;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
}

.stat-label {
  margin-bottom: 6px;
  font-size: 13px;
  color: #909399;
}

.stat-value-row {
  display: flex;
  gap: 16px;
  font-size: 18px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.stat-in {
  color: #67c23a;
}

.stat-out {
  color: #f56c6c;
}
</style>
