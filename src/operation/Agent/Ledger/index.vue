<template>
  <div class="app-container">
    <ContentWrap>
      <SearchTable
        :columns="columns"
        :search-schema="searchSchema"
        :fetch-data-api="fetchAgentLedgerList"
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
      </SearchTable>
    </ContentWrap>
  </div>
</template>

<script setup lang="tsx">
import { ref } from 'vue'
import { ElLink } from 'element-plus'
import { BaseButton } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { SearchTable } from '@/components/SearchTable'
import type { FormSchema } from '@/components/Form'
import type { TableColumn } from '@/components/Table'
import { v1GetAgentBillList } from '@/api/opertion/Agent/Ledger'
import type { AgentBillItem, AgentBillListParams } from '@/api/opertion/Agent/Ledger'
import { ContentWrap } from '@/components/ContentWrap'
import { useRouter } from 'vue-router'
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
import { AGENT_BILL_ORDER_TYPE_MAP, AGENT_BILL_ORDER_TYPE_OPTIONS } from '../constants'

const searchTableRef = ref<InstanceType<typeof SearchTable> | null>(null)
const router = useRouter()
const currentSearchParams = ref<AgentLedgerSearchParams>({})
const AGENT_LEDGER_EXPORT_ORDER = 'created_at DESC'

type AgentLedgerSearchParams = Omit<AgentBillListParams, 'kinds'> & {
  kind?: number | string
  dateRange?: DateRangeValue
}
type AgentLedgerTableSlot = TableSlot<AgentBillItem>

const isQuickChargeBill = (row: AgentBillItem) =>
  [15, 21].includes(Number(row.kind)) || row.describe?.includes('速充')

const buildAgentBillParams = (
  params: AgentLedgerSearchParams = {},
  pageSize?: number
): AgentBillListParams => {
  const apiParams: AgentBillListParams = {
    ...createNullablePageParams(params, 10, pageSize)
  }

  if (params.keyword) apiParams.keyword = params.keyword
  if (hasSearchValue(params.kind)) apiParams.kinds = [Number(params.kind)]
  if (params.order) apiParams.order = params.order

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

    const hasSearchCondition = [params.keyword, params.kind, params.dateRange].some(hasSearchValue)
    handleListMessage(list, hasSearchCondition, '代理账单')

    return {
      list,
      total: response.data?.pager?.total || 0
    }
  } catch (error) {
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
</script>

<style scoped></style>
