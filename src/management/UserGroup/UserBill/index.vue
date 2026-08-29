<template>
  <div class="app-container">
    <ContentWrap>
      <SearchTable
        v-if="isBotListLoaded"
        ref="searchTableRef"
        :columns="columns"
        :search-schema="searchSchema"
        :fetch-data-api="fetchUserBillList"
        :show-add-button="false"
        :table-props="{ rowKey: getLedgerRowKey }"
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
              <div class="stat-label">累计收入</div>
              <div class="stat-in">{{ formatFundAmount(ledgerStats.inAmount, false) }}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">累计支出</div>
              <div class="stat-out">{{ formatFundAmount(ledgerStats.outAmount, true) }}</div>
            </div>
          </div>
        </template>
      </SearchTable>
    </ContentWrap>
  </div>
</template>

<script setup lang="tsx">
import { onMounted, ref } from 'vue'
import { ElLink } from 'element-plus'
import { useRouter } from 'vue-router'
import { BaseButton } from '@/components/Button'
import { ContentWrap } from '@/components/ContentWrap'
import { Icon } from '@/components/Icon'
import { SearchTable } from '@/components/SearchTable'
import type { FormSchema } from '@/components/Form'
import type { TableColumn } from '@/components/Table'
import {
  v1GetUserBillList,
  type UserBillItemV1,
  type UserBillListParamsV1,
  type UserBillStats
} from '@/api/management/common/tgUser'
import { v1GetMessageBotList, type MessageBotItem } from '@/api/management/common/message'
import { handleErrorMessage, handleListMessage } from '@/utils/messageHelper'
import {
  createDefaultDateTimeRange,
  createNullablePageParams,
  dateRangeToSeconds,
  exportTableData,
  formatTableDateTime,
  hasSearchValue,
  withAllOption,
  type DateRangeValue,
  type SelectOption,
  type TableSlot
} from '@/utils/tableHelpers'
const USER_BILL_ORDER_TYPE_MAP: Record<number, string> = {
  1: '代理充值',
  2: '用户充值',
  3: '兑换',
  4: '按时间',
  5: '按笔数',
  6: '福利能量',
  7: '闪租',
  8: '即用能量',
  9: '批量能量',
  10: '激活',
  11: '机器人付费',
  20: '托管'
}

const USER_BILL_ORDER_TYPE_OPTIONS = Object.entries(USER_BILL_ORDER_TYPE_MAP).map(
  ([value, label]) => ({ label, value: Number(value) })
)

const searchTableRef = ref<InstanceType<typeof SearchTable> | null>(null)
const isBotListLoaded = ref(false)
const router = useRouter()
const currentSearchParams = ref<UserLedgerSearchParams>({})
const USER_LEDGER_EXPORT_ORDER = 'created_at DESC'

interface UserLedgerStats {
  inAmount: number
  outAmount: number
}

const emptyLedgerStats = (): UserLedgerStats => ({ inAmount: 0, outAmount: 0 })
const ledgerStats = ref<UserLedgerStats>(emptyLedgerStats())

const parseAmountValue = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const matched = String(value ?? '')
    .replace(/,/g, '')
    .match(/-?\d+(?:\.\d+)?/)
  const amount = matched ? Number(matched[0]) : 0
  return Number.isFinite(amount) ? amount : 0
}

const formatFundAmount = (value: number, isOut: boolean) => {
  const abs = Math.abs(Number(value) || 0)
  const text = abs.toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8
  })
  return `${isOut ? '-' : '+'}${text}`
}

const applyUserBillStats = (stats?: UserBillStats) => {
  if (!stats) {
    ledgerStats.value = emptyLedgerStats()
    return
  }
  ledgerStats.value = {
    inAmount: Math.abs(parseAmountValue(stats.sum_income ?? stats.sum_inome)),
    outAmount: Math.abs(parseAmountValue(stats.sum_expense))
  }
}

type UserLedgerSearchParams = Omit<UserBillListParamsV1, 'kinds'> & {
  kind?: number | string
  dateRange?: DateRangeValue
}
type UserLedgerTableSlot = TableSlot<UserBillItemV1>
type BotOption = SelectOption<number | string>

const getLedgerRowKey = (row: UserBillItemV1) => {
  return row.order_id || `${row.created_at}_${row.user_id}_${row.bot_id}_${row.kind}`
}

const formatTgUserId = (row: UserBillItemV1) => {
  const value = row.tg_user_id ?? row.user_id
  return value === 0 || value === '0' || value === undefined || value === null ? '-' : value
}

const buildUserBillParams = (
  params: UserLedgerSearchParams = {},
  pageSize?: number
): UserBillListParamsV1 => {
  const apiParams: UserBillListParamsV1 = {
    ...createNullablePageParams(params, 10, pageSize)
  }

  if (hasSearchValue(params.keyword)) apiParams.keyword = String(params.keyword).trim()
  if (hasSearchValue(params.bot_id)) apiParams.bot_id = Number(params.bot_id)
  if (hasSearchValue(params.kind)) apiParams.kinds = [Number(params.kind)]
  apiParams.order = params.order || USER_LEDGER_EXPORT_ORDER

  Object.assign(apiParams, dateRangeToSeconds(params.dateRange))
  return apiParams
}

const formatAmountChange = (item: UserBillItemV1) => {
  const value = Number(item.amount)
  if (Number.isNaN(value)) return `0 ${item.coin || ''}`.trim()
  return `${value < 0 ? '-' : '+'}${Math.abs(value)} ${item.coin || ''}`.trim()
}

const isQuickChargeBill = (row: UserBillItemV1) =>
  [15, 21].includes(Number(row.kind)) || row.describe?.includes('速充')

const getOrderDestination = (row: UserBillItemV1) => {
  switch (Number(row.kind)) {
    case 1:
    case 2:
      return { path: '/order_manage/recharge_order', query: { order_num: row.order_id } }
    case 3:
      return { path: '/order_manage/exchange_order', query: { order_num: row.order_id } }
    case 4:
    case 5:
    case 6:
    case 7:
    case 8:
    case 9:
    case 10:
    case 20:
      return { path: '/order_manage/energy_order', query: { order_id: row.order_id } }
    case 15:
    case 21:
      return { path: '/order_manage/quick_charge_order', query: { keyword: row.order_id } }
    default:
      return isQuickChargeBill(row)
        ? { path: '/order_manage/quick_charge_order', query: { keyword: row.order_id } }
        : undefined
  }
}

const fetchUserBillList = async (params: UserLedgerSearchParams = {}) => {
  try {
    const response = await v1GetUserBillList(buildUserBillParams(params))
    const list = response.data?.list || []
    currentSearchParams.value = params
    applyUserBillStats(response.data?.stats)

    const hasSearchCondition = [params.keyword, params.bot_id, params.kind, params.dateRange].some(
      hasSearchValue
    )
    handleListMessage(list, hasSearchCondition, '用户账单')
    return { list, total: response.data?.pager?.total || 0 }
  } catch (error) {
    ledgerStats.value = emptyLedgerStats()
    handleErrorMessage(error, '获取用户账单列表失败')
    return { list: [], total: 0 }
  }
}

const searchSchema = ref<FormSchema[]>([
  {
    field: 'keyword',
    component: 'Input',
    label: {
      text: '关键字',
      tips: '关联订单ID/TG用户ID/TG用户名/代理名称'
    },
    componentProps: {
      placeholder: '请输入关键字'
    }
  },
  {
    field: 'bot_id',
    component: 'Select',
    label: '机器人',
    componentProps: {
      placeholder: '全部',
      clearable: true,
      filterable: true,
      options: [] as BotOption[]
    }
  },
  {
    field: 'kind',
    component: 'Select',
    label: '交易类型',
    componentProps: {
      placeholder: '请选择交易类型',
      clearable: true,
      options: USER_BILL_ORDER_TYPE_OPTIONS
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

const columns = ref<TableColumn[]>([
  {
    field: 'order_id',
    label: '关联订单ID',
    minWidth: 170,
    formatter: (row: UserBillItemV1) => row.order_id || '-',
    slots: {
      default: ({ row }: UserLedgerTableSlot) => {
        if (!row.order_id) return <span>-</span>
        const destination = getOrderDestination(row)
        if (!destination) return <span>{row.order_id}</span>
        return (
          <ElLink type="primary" onClick={() => router.push(destination)}>
            {row.order_id}
          </ElLink>
        )
      }
    }
  },
  {
    field: 'amount',
    label: '变动金额',
    width: 120,
    formatter: (row: UserBillItemV1) => {
      const isOut = Number(row.amount) < 0
      return <span style={{ color: isOut ? 'red' : 'green' }}>{formatAmountChange(row)}</span>
    }
  },
  {
    field: 'balance',
    label: '剩余金额',
    width: 120,
    formatter: (row: UserBillItemV1) => row.balance || '-'
  },
  {
    field: 'tg_user_id',
    label: 'TG用户ID',
    width: 120,
    formatter: (row: UserBillItemV1) => formatTgUserId(row)
  },
  {
    field: 'tg_user_name',
    label: 'TG用户名',
    minWidth: 130,
    formatter: (row: UserBillItemV1) => row.tg_user_name || '-'
  },
  {
    field: 'bot_id',
    label: '机器人ID',
    width: 120,
    formatter: (row: UserBillItemV1) => row.bot_id ?? '-'
  },
  {
    field: 'bot_name',
    label: '机器人名称',
    minWidth: 130,
    formatter: (row: UserBillItemV1) => row.bot_name || '-'
  },
  {
    field: 'agent_name',
    label: '代理名称',
    minWidth: 120,
    formatter: (row: UserBillItemV1) => row.agent_name || '-'
  },
  {
    field: 'kind',
    label: '订单类型',
    minWidth: 120,
    formatter: (row: UserBillItemV1) => USER_BILL_ORDER_TYPE_MAP[row.kind] || row.describe || '-'
  },
  {
    field: 'describe',
    label: '备注',
    minWidth: 150,
    formatter: (row: UserBillItemV1) => row.describe || '-'
  },
  {
    field: 'created_at',
    label: '创建时间',
    minWidth: 170,
    sortable: 'custom',
    formatter: (row: UserBillItemV1) => formatTableDateTime(row.created_at)
  }
])

const loadBotList = async () => {
  try {
    const res = await v1GetMessageBotList()
    if (res.code === '000000' && res.data) {
      const botField = searchSchema.value.find((item) => item.field === 'bot_id')
      if (botField?.componentProps) {
        botField.componentProps.options = withAllOption(
          res.data.map((bot: MessageBotItem) => ({
            label: bot.user_name || `机器人${bot.id}`,
            value: bot.id
          }))
        )
      }
    }
  } catch (error) {
    handleErrorMessage(error, '加载机器人列表失败')
  } finally {
    isBotListLoaded.value = true
  }
}

const handleExport = async () => {
  try {
    await exportTableData<UserBillItemV1, UserLedgerSearchParams, UserBillListParamsV1>({
      searchTableRef,
      fallbackParams: currentSearchParams.value,
      filename: '用户账单',
      fetchData: v1GetUserBillList,
      buildParams: (params) => buildUserBillParams({ ...params, order: USER_LEDGER_EXPORT_ORDER }),
      mapItem: (item) => ({
        关联订单ID: item.order_id || '-',
        变动金额: formatAmountChange(item),
        剩余金额: item.balance || '-',
        TG用户ID: formatTgUserId(item),
        TG用户名: item.tg_user_name || '-',
        机器人ID: item.bot_id ?? '-',
        机器人名称: item.bot_name || '-',
        代理名称: item.agent_name || '-',
        订单类型: USER_BILL_ORDER_TYPE_MAP[item.kind] || item.describe || '-',
        备注: item.describe || '-',
        创建时间: formatTableDateTime(item.created_at)
      })
    })
  } catch (error) {
    handleErrorMessage(error, '导出失败')
  }
}

onMounted(loadBotList)
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

.stat-in,
.stat-out {
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
