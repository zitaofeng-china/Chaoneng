<template>
  <div class="exchange-transaction-container">
    <ContentWrap>
      <SearchTable
        ref="searchTableRef"
        :columns="columns"
        :search-schema="searchSchema"
        :fetch-data-api="fetchExchangeTransactionList"
        :action-column="actionColumn"
        :table-props="{
          rowKey: 'id',
          highlightCurrentRow: false,
          reserveSelection: false
        }"
        :show-add-button="false"
        :search-props="{
          layout: 'inline',
          buttonPosition: 'center'
        }"
      >
        <template #searchButtons>
          <BaseButton type="primary" @click="handleExport">
            <Icon icon="ep:download" class="mr-5px" />
            导出
          </BaseButton>
        </template>
      </SearchTable>

      <!-- 订单详情弹窗 -->
      <OrderDetail ref="orderDetailRef" />
    </ContentWrap>
  </div>
</template>

<script setup lang="tsx">
import { ref, reactive } from 'vue'
import { ElTag, ElMessage, ElMessageBox } from 'element-plus'
import { SearchTable } from '@/components/SearchTable'
import type { SearchTableExpose } from '@/components/SearchTable/src/types'
import type { TableColumn } from '@/components/Table/src/types'
import { FormSchema } from '@/components/Form'
import OrderDetail from './components/OrderDetail.vue'
import {
  v2GetExchangeList,
  v2RetryExchangeOrder
} from '@/api/opertion/OperationCenter/ExchangeTransaction'
import type {
  V2ExchangeItem,
  V2ExchangeListParams
} from '@/api/opertion/OperationCenter/ExchangeTransaction/types'
import { BaseButton } from '@/components/Button'
import { ContentWrap } from '@/components/ContentWrap'
import { handleListMessage, handleErrorMessage, handleSuccessMessage } from '@/utils/messageHelper'
import {
  dateRangeToSeconds,
  exportTableData,
  formatTableDateTime,
  getStatusLabel,
  getStatusTagType,
  hasSearchValue
} from '@/utils/tableHelpers'
import { ExchangeOrderType, getExchangeOrderType } from '@/utils/exchangeOrder'
import { EXCHANGE_STATUS_MAP } from './constants'

type ExchangeSearchParams = V2ExchangeListParams & {
  dateRange?: [number, number]
}

const getDefaultOutCoin = (inCoin?: string) => {
  const upperInCoin = inCoin?.toUpperCase()
  if (upperInCoin === 'USDT') return 'TRX'
  if (upperInCoin === 'TRX') return 'USDT'
  return undefined
}

const getExchangeTypeInfo = (inCoin?: string, outCoin?: string) => {
  const orderType = getExchangeOrderType(inCoin, outCoin || getDefaultOutCoin(inCoin))

  if (orderType === ExchangeOrderType.USDT_TO_TRX) {
    return { label: 'USDT → TRX', color: '#67C23A' }
  }
  if (orderType === ExchangeOrderType.TRX_TO_USDT) {
    return { label: 'TRX → USDT', color: '#409EFF' }
  }
  return { label: '未知', color: '#909399' }
}

const buildExchangeListParams = (
  params: ExchangeSearchParams = {},
  pageSize?: number
): V2ExchangeListParams => {
  const apiParams: V2ExchangeListParams = {
    current_page: params.current_page || 1,
    page_size: pageSize ?? params.page_size ?? 10
  }

  Object.assign(apiParams, dateRangeToSeconds(params.dateRange))
  if (params.keyword) apiParams.keyword = params.keyword
  if (params.coin) apiParams.coin = params.coin
  if (hasSearchValue(params.status)) apiParams.status = params.status
  if (params.order) apiParams.order = params.order

  return apiParams
}

const searchTableRef = ref<SearchTableExpose>()
const orderDetailRef = ref()

const currentSearchParams = ref<ExchangeSearchParams>({})

// 导出 - 直接使用后端字段名
const handleExport = async () => {
  try {
    await exportTableData<V2ExchangeItem>({
      searchTableRef,
      fallbackParams: currentSearchParams.value,
      filename: '闪兑订单列表',
      fetchData: (params) => v2GetExchangeList(params as V2ExchangeListParams),
      buildParams: (params) => buildExchangeListParams(params as ExchangeSearchParams),
      getList: (response) =>
        [...(response.data?.list || [])].sort((a, b) => (b.paid_at || 0) - (a.paid_at || 0)),
      mapItem: (item) => {
        const transactionType = getExchangeTypeInfo(item.in_coin || item.coin, item.out_coin).label
        return {
          订单ID: item.id || '-',
          代理名称: item.agent_name || '-',
          支付金额: item.amount || '-',
          支付币种: item.coin || '-',
          兑换汇率: item.actual_rate || '-',
          实时汇率: item.real_rate || '-',
          支出金额: item.out_amount || '-',
          支出币种: item.out_coin || '-',
          交易类型: transactionType,
          平台利润: item.plate_profit || '-',
          利润单位: 'TRX',
          代理扣款: item.agent_cost || '-',
          扣款单位: 'TRX',
          交易状态: getStatusLabel(EXCHANGE_STATUS_MAP, item.status, '未知'),
          完成时间: formatTableDateTime(item.paid_at),
          描述: item.describe || '-'
        }
      }
    })
  } catch (error) {
    handleErrorMessage(error, '导出失败')
  }
}

// 表格列配置 - 使用后端字段名
const columns = reactive<TableColumn[]>([
  {
    field: 'id',
    label: '订单ID',
    minWidth: 180,
    formatter: (row) => row.id || '-'
  },
  {
    field: 'agent_name',
    label: '代理名称',
    minWidth: 150,
    formatter: (row) => row.agent_name || '-'
  },
  {
    field: 'amount',
    label: '支付金额',
    minWidth: 120,
    formatter: (row) => {
      const amount = row.amount || ''
      const unit = row.coin || '' // 使用coin字段
      return amount || unit ? `${amount}${unit}`.trim() : '-'
    }
  },
  {
    field: 'actual_rate',
    label: '兑换汇率',
    minWidth: 120,
    formatter: (row) => row.actual_rate || '-'
  },
  {
    field: 'real_rate',
    label: '实时汇率',
    minWidth: 100,
    formatter: (row) => row.real_rate || '-'
  },
  {
    field: 'out_amount',
    label: '支出数量',
    minWidth: 150,
    formatter: (row) => {
      const amount = row.out_amount || ''
      const unit = row.out_coin || ''
      return amount || unit ? `${amount}${unit}`.trim() : '-'
    }
  },
  {
    field: 'coin',
    label: '交易类型',
    minWidth: 140,
    slots: {
      default: ({ row }: { row: V2ExchangeItem }) => {
        const typeInfo = getExchangeTypeInfo(row.in_coin || row.coin, row.out_coin)
        return <span style={{ color: typeInfo.color, fontWeight: '500' }}>{typeInfo.label}</span>
      }
    }
  },
  {
    field: 'plate_profit',
    label: '平台利润',
    minWidth: 120,
    formatter: (row) => (row.plate_profit ? `${row.plate_profit}TRX`.trim() : '-')
  },
  {
    field: 'agent_cost',
    label: '代理扣款',
    minWidth: 150,
    formatter: (row) => {
      if (!row.agent_cost) return '-'
      // 去掉负号，因为"代理扣款"本身就表示支出
      const amount = Math.abs(Number(row.agent_cost))
      return `${amount}TRX`
    }
  },
  {
    field: 'status',
    label: '交易状态',
    minWidth: 100,
    slots: {
      default: ({ row }: { row: V2ExchangeItem }) => {
        return (
          <ElTag type={getStatusTagType(EXCHANGE_STATUS_MAP, row.status)}>
            {getStatusLabel(EXCHANGE_STATUS_MAP, row.status, '未知')}
          </ElTag>
        )
      }
    }
  },
  {
    field: 'paid_at',
    label: '完成时间',
    sortable: 'custom',
    minWidth: 160,
    formatter: (row) => formatTableDateTime(row.paid_at)
  },
  {
    field: 'describe',
    label: '描述',
    width: 160,
    formatter: (row) => row.describe || '-'
  }
])

// 搜索表单配置 - 使用后端字段名
const searchSchema = reactive<FormSchema[]>([
  {
    field: 'keyword',
    component: 'Input',
    label: {
      tips: '订单号/代理名称/机器人用户名/客户地址/闪兑地址',
      text: '关键词'
    },
    componentProps: {
      placeholder: '请输入关键词',
      clearable: true
    }
  },
  {
    field: 'coin',
    component: 'Select',
    label: '交易类型:',
    componentProps: {
      placeholder: '全部',
      options: [
        { label: '全部', value: '' },
        { label: 'USDT → TRX', value: 'USDT' },
        { label: 'TRX → USDT', value: 'TRX' }
      ],
      clearable: true
    }
  },
  {
    field: 'status',
    component: 'Select',
    label: '订单状态:',
    componentProps: {
      placeholder: '全部',
      options: [
        { label: '全部', value: '' },
        { label: '已支付', value: 2 },
        { label: '已完成', value: 5 },
        { label: '已失败', value: 6 },
        { label: '已取消', value: 8 },
        { label: '已中止', value: 9 }
      ],
      clearable: true
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
      defaultTime: [new Date(2000, 1, 1, 0, 0, 0), new Date(2000, 1, 1, 23, 59, 59)]
    }
  }
])

// 操作列配置 - 使用后端字段名
const actionColumn = {
  field: 'action',
  label: '操作',
  minWidth: 200,
  fixed: 'right' as const,
  slots: {
    default: ({ row }: { row: V2ExchangeItem }) => {
      const isFailed = row.status === 6 // 状态6为失败订单
      return (
        <>
          <BaseButton type="primary" onClick={() => handleDetail(row)}>
            兑换详情
          </BaseButton>
          <BaseButton type="warning" disabled={!isFailed} onClick={() => handleRetry(row)}>
            补发
          </BaseButton>
        </>
      )
    }
  }
}

// 处理详情查看 - 使用后端字段名
const handleDetail = (row: V2ExchangeItem) => {
  orderDetailRef.value?.open(row.id)
}

// 处理补发
const handleRetry = async (row: V2ExchangeItem) => {
  try {
    await ElMessageBox.confirm(`确认要对订单「${row.id}」进行补发吗？`, '补发确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const res = await v2RetryExchangeOrder(row.id)
    if (res.code === '000000') {
      handleSuccessMessage('补发成功')
      searchTableRef.value?.reload()
    } else {
      ElMessage.error(res.msg || '补发失败')
    }
  } catch (error: unknown) {
    if (error !== 'cancel') {
      handleErrorMessage(error, '补发失败')
    }
  }
}

// 请求闪兑明细列表数据 - 直接使用后端字段名
const fetchExchangeTransactionList = async (params: ExchangeSearchParams) => {
  try {
    currentSearchParams.value = params

    const res = await v2GetExchangeList(buildExchangeListParams(params))

    if (res?.data) {
      const data = res.data
      const list = data.list || []
      const total = data.pager?.total || 0

      const hasSearchCondition = [
        params.keyword,
        params.coin,
        params.status,
        params.dateRange
      ].some(hasSearchValue)
      handleListMessage(list, hasSearchCondition, '闪兑订单')

      return {
        list,
        total
      }
    } else {
      return { list: [], total: 0 }
    }
  } catch (error) {
    handleErrorMessage(error, '获取闪兑订单列表失败')
    return { list: [], total: 0 }
  }
}
</script>

<style scoped>
.exchange-transaction-container {
  height: 100%;
}
</style>
