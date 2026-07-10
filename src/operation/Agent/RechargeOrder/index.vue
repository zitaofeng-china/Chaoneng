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

      <RechargeOrderDetailDialog
        v-model="dialogVisible"
        mode="agent"
        :order-detail="orderDetail"
        received-bill-field="agent_bill"
        actual-rate-source="field"
      />
    </ContentWrap>
  </div>
</template>

<script setup lang="tsx">
import { ref, h, computed } from 'vue'
import { ElTag } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { SearchTable } from '@/components/SearchTable'
import type { SearchTableExpose } from '@/components/SearchTable'
import { BaseButton } from '@/components/Button'
import { Icon } from '@/components/Icon'
import type { TableColumn } from '@/components/Table'
import {
  v2GetDepositList,
  v2GetDepositDetail,
  type V2DepositDetail,
  type V2DepositItem,
  type V2DepositListParams
} from '@/api/opertion/OperationCenter/RechargeOrder'
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
import {
  formatRechargeFeeText,
  formatRechargeMetricNumber,
  getRechargeProfitText,
  getRechargeReceivedAmountText,
  isUsdtRechargeOrder
} from '@/utils/rechargeOrder'
import {
  RechargeOrderDetailDialog,
  renderRechargeCoinTag
} from '@/components/business/recharge-order'
import { getTrxUsdtTickerPrice } from '@/api/common/ticker'

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
type DepositOrderDetail = Partial<V2DepositDetail> & {
  pay_from?: string
  actual_rate?: string
}

const currentSearchParams = ref<DepositSearchParams>({})

const dialogVisible = ref(false)
const orderDetail = ref<DepositOrderDetail>({})

const toFiniteNumber = (value?: string | number | null) => {
  if (value === undefined || value === null || value === '') return undefined
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

const formatTickerActualRate = (trxUsdtPrice?: string | number | null) => {
  const marketPrice = toFiniteNumber(trxUsdtPrice)
  if (marketPrice === undefined || marketPrice <= 0) return '-'

  if (typeof trxUsdtPrice === 'string' && trxUsdtPrice.trim()) {
    return trxUsdtPrice
  }

  return formatRechargeMetricNumber(marketPrice, 8)
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
      field: 'fee',
      label: '手续费',
      minWidth: 120,
      formatter: (row: V2DepositItem) => formatRechargeFeeText(row)
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
    const shouldFetchActualRate = isUsdtRechargeOrder(row)
    const [detailResult, priceResult] = await Promise.allSettled([
      v2GetDepositDetail(row.id),
      shouldFetchActualRate ? getTrxUsdtTickerPrice() : Promise.resolve(undefined)
    ])

    if (detailResult.status !== 'fulfilled') {
      throw detailResult.reason
    }

    const detail = detailResult.value.data
    const actualRate =
      shouldFetchActualRate && priceResult.status === 'fulfilled'
        ? formatTickerActualRate(priceResult.value)
        : '-'

    orderDetail.value = detail.pay_transaction
      ? {
          ...detail,
          fee: detail.fee ?? row.fee,
          user_bill: detail.user_bill ?? row.user_bill,
          agent_bill: detail.agent_bill ?? row.agent_bill,
          actual_rate: actualRate,
          pay_from: detail.pay_transaction.from || '-'
        }
      : {
          ...detail,
          fee: detail.fee ?? row.fee,
          user_bill: detail.user_bill ?? row.user_bill,
          agent_bill: detail.agent_bill ?? row.agent_bill,
          actual_rate: actualRate,
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
          手续费: formatRechargeFeeText(item),
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
