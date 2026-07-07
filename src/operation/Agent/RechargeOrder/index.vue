<template>
  <div class="app-container">
    <ContentWrap>
      <SearchTable
        :columns="columns"
        :search-schema="searchSchema"
        :fetch-data-api="fetchRechargeOrderList"
        :default-params="initialSearchParams"
        :showAddButton="false"
        ref="searchTableRef"
      >
        <template #searchButtons>
          <BaseButton type="primary" @click="handleExport">
            <Icon icon="ep:download" class="mr-5px" />
            导出订单
          </BaseButton>
        </template>
      </SearchTable>

      <Dialog v-model="dialogVisible" :title="'订单详情'">
        <Descriptions :schema="orderDetailSchema" :data="orderDetail" :column="2" border />
        <template #footer>
          <div class="flex justify-end">
            <ElButton @click="dialogVisible = false">关闭</ElButton>
          </div>
        </template>
      </Dialog>
    </ContentWrap>
  </div>
</template>

<script setup lang="tsx">
import { ref, h, computed } from 'vue'
import { ElButton, ElTag } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { Dialog } from '@/components/Dialog'
import { SearchTable } from '@/components/SearchTable'
import type { SearchTableExpose } from '@/components/SearchTable'
import { BaseButton } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { Descriptions } from '@/components/Descriptions'
import type { TableColumn } from '@/components/Table'
import type { DescriptionsSchema } from '@/components/Descriptions'
import {
  v2GetDepositList,
  v2GetDepositDetail,
  type V2DepositDetail,
  type V2DepositItem,
  type V2DepositListParams,
  type V2PayTransaction
} from '@/api/opertion/OperationCenter/RechargeOrder'
import { ElLink } from 'element-plus'
import { useRouter, useRoute } from 'vue-router'
import { handleListMessage, handleErrorMessage } from '@/utils/messageHelper'
import { getStatusText, getStatusType } from '@/utils/orderStatus'
import {
  createPageParams,
  exportTableData,
  formatTableDateTime,
  hasSearchValue,
  type TableSlot
} from '@/utils/tableHelpers'
import {
  formatTransactionHash,
  renderTronscanTransactionLink
} from '@/operation/OperationCenter/utils/transactionLink'
import { getTronscanTransactionUrl } from '@/utils/tronscan'

const router = useRouter()
const route = useRoute()
const searchTableRef = ref<SearchTableExpose | null>(null)
const initialSearchParams = route.query.order_num
  ? {
      order_id: String(route.query.order_num)
    }
  : {}
const DEFAULT_CREATED_AT_ORDER = 'created_at DESC'
const AGENT_RECHARGE_KIND = 1
const AGENT_RECHARGE_STATUS_OPTIONS = [
  { label: '全部', value: '' },
  { label: '新订单', value: 1 },
  { label: '已完成', value: 5 },
  { label: '已取消', value: 8 }
]

type DepositSearchParams = Omit<V2DepositListParams, 'origin' | 'status'> & {
  origin?: number | string
  status?: number | string
}

type DepositExportRow = Record<string, string>
type DepositTableSlot = TableSlot<V2DepositItem>
type DepositOrderExchangeInfo = {
  real_rate?: string | number | null
  actual_rate?: string | number | null
  agent_profit?: string | number | null
  plate_profit?: string | number | null
  out_amount?: string | number | null
  out_coin?: string | null
}
type DepositOrderDetail = Partial<V2DepositDetail> & {
  pay_from?: string
  real_rate?: string | number | null
  actual_rate?: string | number | null
  agent_profit?: string | number | null
  plate_profit?: string | number | null
  out_amount?: string | number | null
  out_coin?: string | null
  exchange?: DepositOrderExchangeInfo | null
}

const currentSearchParams = ref<DepositSearchParams>({})

const dialogVisible = ref(false)
const orderDetail = ref<DepositOrderDetail>({})

const RECHARGE_COIN_TAG_MAP: Record<
  string,
  { color: string; backgroundColor: string; borderColor: string }
> = {
  USDT: {
    color: '#409EFF',
    backgroundColor: '#ECF5FF',
    borderColor: '#B3D8FF'
  },
  TRX: {
    color: '#E6A23C',
    backgroundColor: '#FDF6EC',
    borderColor: '#F3D19E'
  }
}

const renderRechargeCoinTag = (coin?: string | null) => {
  const normalizedCoin = coin?.toUpperCase()
  if (!normalizedCoin) return h('span', '-')

  const tagStyle = RECHARGE_COIN_TAG_MAP[normalizedCoin]
  if (!tagStyle) return h('span', normalizedCoin)

  return h(
    ElTag,
    {
      size: 'small',
      effect: 'light',
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '76px',
        height: '28px',
        color: tagStyle.color,
        backgroundColor: tagStyle.backgroundColor,
        borderColor: tagStyle.borderColor,
        padding: '0 16px'
      }
    },
    () => normalizedCoin
  )
}

const formatDetailText = (value?: string | number | null) => {
  if (value === undefined || value === null || value === '') return '-'
  return String(value)
}

const getExchangeDetailField = <K extends keyof DepositOrderExchangeInfo>(
  row: DepositOrderDetail,
  field: K
) => {
  return row.exchange?.[field] ?? row[field]
}

const formatDetailPercent = (value?: string | number | null) => {
  const text = formatDetailText(value)
  if (text === '-') return text
  if (text.endsWith('%')) return text

  const numericValue = Number(text)
  if (Number.isNaN(numericValue)) return text

  const percentValue = Math.abs(numericValue) <= 1 ? numericValue * 100 : numericValue
  return `${Number(percentValue.toFixed(4)).toString()}%`
}

const getRechargeProfitText = (row: DepositOrderDetail) => {
  const plateProfit = formatDetailPercent(getExchangeDetailField(row, 'plate_profit'))
  const agentProfit = formatDetailPercent(getExchangeDetailField(row, 'agent_profit'))

  if (plateProfit === '-' && agentProfit === '-') return '-'
  return `${plateProfit}/${agentProfit}`
}

const getReceivedAmountText = (row: DepositOrderDetail) => {
  const amount = getExchangeDetailField(row, 'out_amount') ?? row.cost
  const formattedAmount = formatDetailText(amount)
  if (formattedAmount === '-') return formattedAmount

  const receivedCoin =
    getExchangeDetailField(row, 'out_coin') || (row.coin === 'USDT' ? 'TRX' : row.coin) || 'TRX'

  return `${formattedAmount} ${receivedCoin}`
}

const buildDepositListParams = (
  params: DepositSearchParams = {},
  pageSize?: number
): V2DepositListParams => {
  const adaptedParams: V2DepositListParams = {
    ...createPageParams(params, 10, pageSize),
    kind: AGENT_RECHARGE_KIND
  }

  if (params.keyword) adaptedParams.keyword = params.keyword
  if (params.order_id) adaptedParams.order_id = params.order_id
  if (params.status !== undefined && params.status !== '')
    adaptedParams.status = Number(params.status)
  if (params.origin !== undefined && params.origin !== '')
    adaptedParams.origin = Number(params.origin)
  if (params.coin) adaptedParams.coin = params.coin
  if (params.receive_address) adaptedParams.receive_address = params.receive_address
  if (params.pay_address) adaptedParams.pay_address = params.pay_address
  adaptedParams.order = params.order || DEFAULT_CREATED_AT_ORDER
  if (params.start_time) adaptedParams.start_time = params.start_time.toString()
  if (params.end_time) adaptedParams.end_time = params.end_time.toString()

  return adaptedParams
}

const orderDetailSchema = computed(() => {
  const schema: DescriptionsSchema[] = [
    { field: 'id', label: '订单号', span: 12 },
    {
      field: 'status',
      label: '订单状态',
      span: 12,
      slots: {
        default: (row: DepositOrderDetail) => {
          if (!row) return h('span', '-')
          const tagType = getStatusType(row.status)
          return h(ElTag, { type: tagType, size: 'small' }, () => getStatusText(row.status))
        }
      }
    },
    {
      field: 'coin',
      label: '订单类型',
      span: 12,
      slots: {
        default: (row: DepositOrderDetail) => {
          return renderRechargeCoinTag(row.coin)
        }
      }
    },
    {
      field: 'amount',
      label: '金额',
      span: 12,
      slots: {
        default: (row: DepositOrderDetail) => {
          if (!row || !row.amount) return h('span', '-')
          return h('span', `${row.amount} ${row.coin || ''}`)
        }
      }
    },
    {
      field: 'real_rate',
      label: '实时汇率',
      span: 12,
      slots: {
        default: (row: DepositOrderDetail) =>
          h('span', formatDetailText(getExchangeDetailField(row, 'real_rate')))
      }
    },
    {
      field: 'plate_profit',
      label: '运营/代理利润',
      span: 12,
      slots: {
        default: (row: DepositOrderDetail) => h('span', getRechargeProfitText(row))
      }
    },
    {
      field: 'actual_rate',
      label: '实际汇率',
      span: 12,
      slots: {
        default: (row: DepositOrderDetail) =>
          h('span', formatDetailText(getExchangeDetailField(row, 'actual_rate')))
      }
    },
    {
      field: 'out_amount',
      label: '到账金额',
      span: 12,
      slots: {
        default: (row: DepositOrderDetail) => h('span', getReceivedAmountText(row))
      }
    },
    { field: 'describe', label: '备注', span: 12 },
    {
      field: 'created_at',
      label: '创建时间',
      span: 12,
      slots: {
        default: (row: DepositOrderDetail) => {
          if (!row || !row.created_at) return h('span', '-')
          return h('span', formatTableDateTime(row.created_at))
        }
      }
    },
    {
      field: 'paid_at',
      label: '支付时间',
      span: 12,
      slots: {
        default: (row: DepositOrderDetail) => {
          if (!row || !row.paid_at) return h('span', '-')
          return h('span', formatTableDateTime(row.paid_at))
        }
      }
    },
    { field: 'receive_address', label: '收款地址', span: 24 },
    {
      field: 'pay_from',
      label: '支付地址',
      span: 24,
      slots: {
        default: (row: DepositOrderDetail) => h('span', row.pay_from || '-')
      }
    },
    {
      field: 'pay_id',
      label: '交易哈希',
      span: 24,
      slots: {
        default: (row: DepositOrderDetail) => {
          if (!row || !row.pay_id) return h('span', '-')
          return (
            <ElLink href={getTronscanTransactionUrl(row.pay_id)} type="primary" target="_blank">
              {row.pay_id}
            </ElLink>
          )
        }
      }
    }
  ]
  return schema
})

const selectedSource = ref<number | string>('')

const columns = computed(() => {
  const allCols: TableColumn[] = [
    {
      field: 'id',
      label: '订单号',
      minWidth: 180,
      formatter: (row: V2DepositItem) => row.id || '-'
    },
    {
      field: 'agent_name',
      label: '代理名称',
      minWidth: 120,
      formatter: (row: V2DepositItem) => row.agent_name || '-'
    },
    {
      field: 'coin',
      label: '订单类型',
      width: 120,
      slots: {
        default: ({ row }: DepositTableSlot) => renderRechargeCoinTag(row.coin)
      }
    },
    {
      field: 'amount',
      label: '金额',
      sortable: 'custom',
      minWidth: 120,
      formatter: (row: V2DepositItem) => (row.amount ? `${row.amount} ${row.coin || 'TRX'}` : '-')
    },
    {
      field: 'status',
      label: '订单状态',
      width: 100,
      slots: {
        default: ({ row }: DepositTableSlot) => {
          const type = getStatusType(row.status)
          const text = getStatusText(row.status)
          return h(ElTag, { type }, () => text)
        }
      }
    },
    {
      field: 'receive_address',
      label: '收款地址',
      minWidth: 200,
      showOverflowTooltip: true,
      formatter: (row: V2DepositItem) => row.receive_address || '-'
    },
    {
      field: 'pay_address',
      label: '支付地址',
      minWidth: 200,
      showOverflowTooltip: true,
      formatter: (row: V2DepositItem) => row.pay_address || '-'
    },
    {
      field: 'pay_id',
      label: '交易哈希',
      minWidth: 220,
      showOverflowTooltip: true,
      slots: {
        default: ({ row }: DepositTableSlot) =>
          renderTronscanTransactionLink(row.pay_id, formatTransactionHash(row.pay_id, 10, 8))
      }
    },
    {
      field: 'describe',
      label: '备注',
      minWidth: 150,
      showOverflowTooltip: true,
      formatter: (row: V2DepositItem) => row.describe || '-'
    },
    {
      field: 'created_at',
      label: '创建时间',
      sortable: 'custom',
      minWidth: 160,
      formatter: (row: V2DepositItem) => formatTableDateTime(row.created_at)
    },
    {
      field: 'paid_at',
      label: '完成时间',
      sortable: 'custom',
      minWidth: 160,
      formatter: (row: V2DepositItem) => formatTableDateTime(row.paid_at)
    },
    {
      field: 'action',
      label: '操作',
      width: 120,
      fixed: 'right',
      slots: {
        default: ({ row }: DepositTableSlot) => {
          return (
            <BaseButton type="primary" onClick={() => handleViewDetail(row)}>
              充值详情
            </BaseButton>
          )
        }
      }
    }
  ]

  return allCols.filter((col) => {
    if (!col.hideWhen) return true
    return selectedSource.value !== col.hideWhen
  })
})

const searchSchema = [
  {
    field: 'order_id',
    component: 'Input' as const,
    label: '订单号',
    componentProps: {
      placeholder: '请输入订单号'
    }
  },
  {
    field: 'status',
    component: 'Select' as const,
    label: '订单状态',
    componentProps: {
      options: AGENT_RECHARGE_STATUS_OPTIONS,
      placeholder: '请选择订单状态'
    }
  },
  {
    field: 'keyword',
    component: 'Input' as const,
    label: {
      tips: 'TG用户名/TG用户昵称/机器人名称/代理名称/用户账号/用户邮箱',
      text: '关键词'
    },
    componentProps: {
      placeholder: '请输入关键词'
    }
  },
  {
    field: 'receive_address',
    component: 'Input' as const,
    label: '收款地址',
    componentProps: {
      placeholder: '请输入收款地址'
    }
  },
  {
    field: 'pay_address',
    component: 'Input' as const,
    label: '支付地址',
    componentProps: {
      placeholder: '请输入支付地址'
    }
  }
]

const fetchRechargeOrderList = async (
  params: DepositSearchParams = {}
): Promise<{ list: V2DepositItem[]; total: number }> => {
  try {
    selectedSource.value = params.origin ?? ''
    currentSearchParams.value = params

    const response = await v2GetDepositList(buildDepositListParams(params))
    const data = response.data || { list: [], pager: { total: 0 } }
    const list = data.list || []

    const hasSearchCondition = [
      params.order_id,
      params.status,
      params.keyword,
      params.receive_address,
      params.pay_address
    ].some(hasSearchValue)
    handleListMessage(list, hasSearchCondition, '代理充值订单')

    return {
      list,
      total: data.pager?.total || 0
    }
  } catch (error) {
    handleErrorMessage(error, '获取代理充值订单列表失败')
    return { list: [], total: 0 }
  }
}

const handleViewDetail = async (row: V2DepositItem) => {
  try {
    const response = await v2GetDepositDetail(row.id)
    const detail = response.data

    orderDetail.value = detail.pay_transaction
      ? {
          ...detail,
          pay_from: detail.pay_transaction.from || '-'
        }
      : {
          ...detail,
          pay_from: '-'
        }

    dialogVisible.value = true
  } catch (error) {
    handleErrorMessage(error, '获取充值详情失败')
  }
}

const handleExport = async () => {
  try {
    await exportTableData<V2DepositItem, DepositSearchParams, V2DepositListParams>({
      searchTableRef,
      fallbackParams: currentSearchParams.value,
      filename: '代理充值订单列表',
      fetchData: v2GetDepositList,
      buildParams: buildDepositListParams,
      mapItem: (item) => {
        const baseData: DepositExportRow = {
          订单号: item.id || '-',
          代理名称: item.agent_name || '-'
        }

        if (!selectedSource.value || selectedSource.value === 1 || selectedSource.value === '1') {
          baseData['TG用户名'] = item.tg_user_name || '-'
          baseData['TG用户昵称'] = item.tg_first_name || '-'
        }

        if (!selectedSource.value || selectedSource.value === 2 || selectedSource.value === '2') {
          baseData['用户账号'] = item.username || '-'
          baseData['用户邮箱'] = item.email || '-'
        }

        return {
          ...baseData,
          订单类型: item.coin ? `充值${item.coin}` : '-',
          金额: item.amount ? `${item.amount} ${item.coin || ''}` : '-',
          订单状态: getStatusText(item.status),
          收款地址: item.receive_address || '-',
          支付地址: item.pay_address || '-',
          备注: item.describe || '-',
          创建时间: formatTableDateTime(item.created_at),
          完成时间: formatTableDateTime(item.paid_at)
        }
      },
      successMessage: '订单导出成功'
    })
  } catch (error) {
    handleErrorMessage(error, '订单导出失败')
  }
}
</script>

<style scoped></style>
