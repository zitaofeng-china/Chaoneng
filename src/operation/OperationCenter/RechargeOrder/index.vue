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

      <!-- 详情弹窗 -->
      <Dialog v-model="dialogVisible" :title="'订单详情'">
        <ElTabs v-model="activeTab">
          <ElTabPane label="订单详情" name="order">
            <Descriptions :schema="orderDetailSchema" :data="orderDetail" :column="2" border />
          </ElTabPane>
          <ElTabPane label="充值详情" name="recharge">
            <Descriptions
              :schema="rechargeDetailSchema"
              :data="rechargeDetail"
              :column="2"
              border
            />
          </ElTabPane>
        </ElTabs>
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
import { ElButton, ElTag, ElTabs, ElTabPane } from 'element-plus'
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
import { getSourceText, SOURCE_TYPE_OPTIONS } from '@/utils/sourceFilter'
import {
  createPageParams,
  exportTableData,
  formatTableDateTime,
  hasSearchValue,
  type TableSlot
} from '@/utils/tableHelpers'
import { getTelegramUserUrl } from '@/utils/telegram'
import { getTronscanTransactionUrl } from '@/utils/tronscan'
import { RECHARGE_COIN_OPTIONS } from './constants'
import {
  formatRechargeFeeText,
  formatRechargeMetricNumber,
  getRechargeProfitText,
  getRechargeReceivedAmountText,
  isUsdtRechargeOrder
} from '@/utils/rechargeOrder'

const router = useRouter()
const route = useRoute()
const searchTableRef = ref<SearchTableExpose | null>(null)
const initialSearchParams = route.query.order_num
  ? {
      order_id: String(route.query.order_num)
    }
  : {}
const DEFAULT_CREATED_AT_ORDER = 'created_at DESC'
const USER_RECHARGE_KIND = 2
const RECHARGE_ORDER_STATUS_TEXT: Record<number, string> = {
  1: '新订单',
  5: '已完成',
  8: '已取消'
}
const RECHARGE_ORDER_STATUS_TYPE: Record<number, 'success' | 'warning' | 'info'> = {
  1: 'info',
  5: 'success',
  8: 'warning'
}
const RECHARGE_ORDER_STATUS_OPTIONS = [
  { label: '全部', value: undefined },
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
  actual_rate?: string
}

interface BinanceTickerPriceResponse {
  symbol: string
  price: string
}

const currentSearchParams = ref<DepositSearchParams>({})

const dialogVisible = ref(false)
const activeTab = ref('order')
const orderDetail = ref<DepositOrderDetail>({})
const rechargeDetail = ref<Partial<V2PayTransaction>>({})
const BINANCE_TRX_USDT_URL = 'https://api.binance.com/api/v3/ticker/price?symbol=TRXUSDT'

const toFiniteNumber = (value?: string | number | null) => {
  if (value === undefined || value === null || value === '') return undefined
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

const fetchBinanceTrxUsdtPrice = async () => {
  const response = await fetch(BINANCE_TRX_USDT_URL)
  if (!response.ok) {
    throw new Error(`获取币安 TRXUSDT 汇率失败: ${response.status}`)
  }

  const data = (await response.json()) as BinanceTickerPriceResponse
  return data.price
}

const formatBinanceActualRate = (trxUsdtPrice?: string | number | null) => {
  const marketPrice = toFiniteNumber(trxUsdtPrice)
  if (marketPrice === undefined || marketPrice <= 0) return '-'

  if (typeof trxUsdtPrice === 'string' && trxUsdtPrice.trim()) {
    return trxUsdtPrice
  }

  return formatRechargeMetricNumber(marketPrice, 8)
}

const getRechargeOrderStatusText = (status: number | undefined) => {
  if (status === undefined || status === null) return '-'
  return RECHARGE_ORDER_STATUS_TEXT[status] || '未知状态'
}

const getRechargeOrderStatusType = (status: number | undefined): 'success' | 'warning' | 'info' => {
  if (status === undefined || status === null) return 'info'
  return RECHARGE_ORDER_STATUS_TYPE[status] || 'info'
}

const buildDepositListParams = (
  params: DepositSearchParams = {},
  pageSize?: number
): V2DepositListParams => {
  const adaptedParams: V2DepositListParams = {
    ...createPageParams(params, 10, pageSize),
    kind: USER_RECHARGE_KIND
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
    { field: 'id', label: '订单号' },
    {
      field: 'status',
      label: '订单状态',
      slots: {
        default: (row: V2DepositDetail) => {
          if (!row) return h('span', '-')
          const tagType = getRechargeOrderStatusType(row.status)
          return h(ElTag, { type: tagType, size: 'small' }, () =>
            getRechargeOrderStatusText(row.status)
          )
        }
      }
    },
    {
      field: 'coin',
      label: '订单类型',
      slots: {
        default: (row: V2DepositDetail) => {
          return (
            <>
              <span style={{ color: '#409EFF', cursor: 'pointer' }}>充值{row.coin || '-'}</span>
            </>
          )
        }
      }
    },
    { field: 'user_id', label: 'TG用户ID' },
    {
      field: 'tg_user_name',
      label: '用户账号',
      slots: {
        default: (row: V2DepositDetail) => h('span', row.tg_user_name || row.username || '-')
      }
    },
    {
      field: 'tg_first_name',
      label: '用户邮箱',
      slots: {
        default: (row: V2DepositDetail) => h('span', row.tg_first_name || row.email || '-')
      }
    },
    { field: 'bot_id', label: '机器人ID' },
    {
      field: 'bot_user_name',
      label: '机器人名称',
      slots: {
        default: (row: V2DepositDetail) => {
          return h('span', row.bot_user_name || row.bot_first_name || '-')
        }
      }
    },
    {
      field: 'amount',
      label: '金额',
      slots: {
        default: (row: V2DepositDetail) => {
          if (!row || !row.amount) return h('span', '-')
          return h('span', `${row.amount} ${row.coin || ''}`)
        }
      }
    },
    { field: 'describe', label: '备注' },
    {
      field: 'created_at',
      label: '创建时间',
      slots: {
        default: (row: V2DepositDetail) => {
          if (!row || !row.created_at) return h('span', '-')
          return h('span', formatTableDateTime(row.created_at))
        }
      }
    },
    {
      field: 'paid_at',
      label: '支付时间',
      slots: {
        default: (row: V2DepositDetail) => {
          if (!row || !row.paid_at) return h('span', '-')
          return h('span', formatTableDateTime(row.paid_at))
        }
      }
    }
  ]

  if (isUsdtRechargeOrder(orderDetail.value)) {
    schema.splice(
      9,
      0,
      {
        field: 'profit',
        label: '利润',
        slots: {
          default: (row: DepositOrderDetail) => h('span', getRechargeProfitText(row))
        }
      },
      {
        field: 'actual_rate',
        label: '实际汇率',
        slots: {
          default: (row: DepositOrderDetail) => h('span', row.actual_rate || '-')
        }
      },
      {
        field: 'received_amount',
        label: '到账金额',
        slots: {
          default: (row: DepositOrderDetail) => h('span', getRechargeReceivedAmountText(row))
        }
      }
    )
  }

  return schema
})

const rechargeDetailSchema = computed(() => {
  const schema: DescriptionsSchema[] = [
    { field: 'to', label: '收款地址', span: 24 },
    { field: 'from', label: '支付地址', span: 24 },
    {
      field: 'id',
      label: '交易哈希',
      span: 24,
      slots: {
        default: (row: V2PayTransaction) => {
          if (!row || !row.id) return h('span', '-')
          return (
            <ElLink href={getTronscanTransactionUrl(row.id)} type="primary" target="_blank">
              {row.id}
            </ElLink>
          )
        }
      }
    }
  ]
  return schema
})

// 当前选择的来源
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
      field: 'tg_user_name',
      label: 'TG用户名',
      minWidth: 120,
      hideWhen: 2, // H5时隐藏
      slots: {
        default: ({ row }: DepositTableSlot) => {
          if (!row.tg_user_name) return <span>-</span>
          return (
            <ElLink href={getTelegramUserUrl(row.tg_user_name)} type="primary" target="_blank">
              {row.tg_user_name}
            </ElLink>
          )
        }
      }
    },
    {
      field: 'tg_first_name',
      label: 'TG用户昵称',
      minWidth: 120,
      hideWhen: 2, // H5时隐藏
      formatter: (row: V2DepositItem) => row.tg_first_name || '-'
    },
    {
      field: 'username',
      label: '用户账号',
      minWidth: 120,
      hideWhen: 1, // 机器人时隐藏
      formatter: (row: V2DepositItem) => row.username || '-'
    },
    {
      field: 'email',
      label: '用户邮箱',
      minWidth: 150,
      hideWhen: 1, // 机器人时隐藏
      formatter: (row: V2DepositItem) => row.email || '-'
    },
    {
      field: 'bot_name',
      label: '机器人名称',
      minWidth: 150,
      slots: {
        default: ({ row }: DepositTableSlot) => {
          return (
            <span
              style={{ color: '#409EFF', cursor: 'pointer' }}
              onClick={() => {
                router.push({
                  path: `/agent/bot_list`,
                  query: { tg_bot_id: row.bot_id }
                })
              }}
            >
              {row.bot_name || '-'}
            </span>
          )
        }
      }
    },
    {
      field: 'origin',
      label: '来源',
      width: 100,
      formatter: (row: V2DepositItem) => getSourceText(row.origin, row.tg_user_name, row.username)
    },
    {
      field: 'coin',
      label: '订单类型',
      width: 120,
      formatter: (row: V2DepositItem) => (row.coin ? `充值${row.coin}` : '-')
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
          const type = getRechargeOrderStatusType(row.status)
          const text = getRechargeOrderStatusText(row.status)
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

  const filteredCols = allCols.filter((col) => {
    if (!col.hideWhen) return true
    return selectedSource.value !== col.hideWhen
  })

  return filteredCols
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
      options: RECHARGE_ORDER_STATUS_OPTIONS,
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
    field: 'origin',
    component: 'Select' as const,
    label: '来源',
    componentProps: {
      options: SOURCE_TYPE_OPTIONS,
      placeholder: '请选择来源'
    }
  },
  {
    field: 'coin',
    component: 'Select' as const,
    label: '订单类型',
    componentProps: {
      options: RECHARGE_COIN_OPTIONS,
      placeholder: '请选择订单类型'
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
      params.origin,
      params.coin,
      params.receive_address,
      params.pay_address
    ].some(hasSearchValue)
    handleListMessage(list, hasSearchCondition, '充值订单')

    return {
      list: list,
      total: data.pager?.total || 0
    }
  } catch (error) {
    handleErrorMessage(error, '获取充值订单列表失败')
    return { list: [], total: 0 }
  }
}

const handleViewDetail = async (row: V2DepositItem) => {
  try {
    const shouldFetchActualRate = isUsdtRechargeOrder(row)
    const [detailResult, priceResult] = await Promise.allSettled([
      v2GetDepositDetail(row.id),
      shouldFetchActualRate ? fetchBinanceTrxUsdtPrice() : Promise.resolve(undefined)
    ])

    if (detailResult.status !== 'fulfilled') {
      throw detailResult.reason
    }

    const detail = detailResult.value.data
    const actualRate =
      shouldFetchActualRate && priceResult.status === 'fulfilled'
        ? formatBinanceActualRate(priceResult.value)
        : '-'

    orderDetail.value = {
      ...detail,
      fee: detail.fee ?? row.fee,
      user_bill: detail.user_bill ?? row.user_bill,
      actual_rate: actualRate
    }

    if (detail.pay_transaction) {
      rechargeDetail.value = detail.pay_transaction
    } else {
      rechargeDetail.value = {
        to: detail.receive_address || '-',
        from: '-',
        id: detail.pay_id || '-'
      }
    }

    dialogVisible.value = true
    activeTab.value = 'order'
  } catch (error) {
    handleErrorMessage(error, '获取充值详情失败')
  }
}

const handleExport = async () => {
  try {
    await exportTableData<V2DepositItem, DepositSearchParams, V2DepositListParams>({
      searchTableRef,
      fallbackParams: currentSearchParams.value,
      filename: '充值订单列表',
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
          机器人名称: item.bot_name || '-',
          来源: getSourceText(item.origin, item.tg_user_name, item.username),
          订单类型: item.coin ? `充值${item.coin}` : '-',
          金额: item.amount ? `${item.amount} ${item.coin || ''}` : '-',
          手续费: formatRechargeFeeText(item),
          订单状态: getRechargeOrderStatusText(item.status),
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
