<template>
  <div class="app-container">
    <ContentWrap>
      <SearchTable
        :columns="columns"
        :search-schema="searchSchema"
        :action-column="actionColumn"
        :fetch-data-api="fetchExchangeOrderList"
        :initial-params="initialSearchParams"
        :showAddButton="false"
        ref="searchTableRef"
        @search="onSearch"
      >
        <template #searchButtons>
          <BaseButton @click="handleExport" type="primary">
            <Icon icon="ep:download" class="mr-5px" />
            导出订单
          </BaseButton>
        </template>
      </SearchTable>

      <!-- 兑换详情弹窗（合并版） -->
      <Dialog v-model="dialogVisible" :title="'兑换详情'">
        <ElTabs v-model="activeTab">
          <!-- 标签页1：兑换详情 -->
          <ElTabPane label="兑换详情" name="detail">
            <Descriptions :schema="exchangeDetailSchema" :data="orderDetail" :column="2" border />
          </ElTabPane>

          <!-- 标签页2：用户转出 -->
          <ElTabPane :label="userOutTabLabel" name="userOut">
            <Descriptions
              v-if="orderDetail.in_txid || orderDetail.in_from_address"
              :schema="transactionInSchema"
              :data="orderDetail"
              :column="1"
              border
            />
            <ElEmpty v-else description="暂无交易数据" />
          </ElTabPane>

          <!-- 标签页3：用户接收 -->
          <ElTabPane :label="userInTabLabel" name="userIn">
            <Descriptions
              v-if="orderDetail.out_txid || orderDetail.out_from_address"
              :schema="transactionOutSchema"
              :data="orderDetail"
              :column="1"
              border
            />
            <ElEmpty v-else description="暂无交易数据" />
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
import { formatToDateTime } from '@/utils/dateUtil'
import { useRouter } from 'vue-router'
import { ElButton, ElTag, ElMessage, ElTabs, ElTabPane, ElLink, ElEmpty } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { Dialog } from '@/components/Dialog'
import { SearchTable } from '@/components/SearchTable'
import { BaseButton } from '@/components/Button'
import { Descriptions } from '@/components/Descriptions'
import type { TableColumn } from '@/components/Table'
import type { FormSchema } from '@/components/Form'
import type { DescriptionsSchema } from '@/components/Descriptions'
import {
  v1GetExchangeOrderList,
  v1GetExchangeOrderDetail
} from '@/api/management/OrderManage/ExchangeOrder'
import { Icon } from '@/components/Icon'
import { handleListMessage, handleErrorMessage } from '@/utils/messageHelper'
import {
  dateRangeToSeconds,
  exportTableData,
  hasSearchValue,
  type DateRangeValue
} from '@/utils/tableHelpers'
import type {
  ExchangeOrderItemV1,
  ExchangeOrderListParamsV1
} from '@/api/management/OrderManage/ExchangeOrder'

// const { t } = useI18n()
const router = useRouter()
const route = useRouter().currentRoute.value
const searchTableRef = ref<InstanceType<typeof SearchTable> | null>(null)
const DEFAULT_CREATED_AT_ORDER = 'created_at DESC'
const initialSearchParams = route.query.order_num
  ? {
      order_id: String(route.query.order_num)
    }
  : {}

// 订单详情相关
const dialogVisible = ref(false)
const orderDetail = ref<any>({})
const activeTab = ref('detail')

// 保存当前搜索参数
type ExchangeOrderSearchParams = ExchangeOrderListParamsV1 & {
  dateRange?: DateRangeValue
  in_coin?: string
  order?: string
}

const currentSearchParams = ref<ExchangeOrderSearchParams>({})

// 标签页标题（动态根据订单类型）
const userOutTabLabel = computed(() => {
  const type = orderDetail.value?.order_type
  return type === 1 ? '用户转出 USDT' : '用户转出 TRX'
})

const userInTabLabel = computed(() => {
  const type = orderDetail.value?.order_type
  return type === 1 ? '用户接收 TRX' : '用户接收 USDT'
})
// 兑换详情Schema
const exchangeDetailSchema = computed(() => {
  const schema: DescriptionsSchema[] = [
    { field: 'id', label: '订单号' },
    { field: 'bot_id', label: '机器人ID' },
    {
      field: 'amount',
      label: '支付金额',
      slots: {
        default: (row: any) => {
          if (!row || !row.amount) return h('span', '-')
          return h('span', row.amount + row.coin)
        }
      }
    },
    {
      field: 'exchange',
      label: '兑换汇率',
      slots: {
        default: (row: any) => {
          return h('span', row.exchange?.actual_rate || '-')
        }
      }
    },
    {
      field: 'created_at',
      label: '创建时间',
      slots: {
        default: (row: any) => {
          if (!row || !row.created_at) return h('span', '-')
          return h('span', formatToDateTime(row.created_at))
        }
      }
    },
    {
      field: 'order_type',
      label: '订单类型',
      slots: {
        default: (row: any) => {
          if (!row) return h('span', '-')
          return h('span', row.order_type === 1 ? '兑换TRX' : '兑换USDT')
        }
      }
    },
    { field: 'bot_user_name', label: '机器人名称' },
    {
      field: 'exchange',
      label: '兑换金额',
      slots: {
        default: (row: any) => {
          if (!row || !row.exchange) return h('span', '-')
          return h('span', `${row.exchange.out_amount} ${row.exchange.out_coin}`)
        }
      }
    },
    {
      field: 'status',
      label: '订单状态',
      slots: {
        default: (row: any) => {
          if (!row) return h('span', '-')
          return h(ElTag, { type: getStatusType(row.status), size: 'small' }, () =>
            getStatusText(row.status)
          )
        }
      }
    },
    {
      field: 'paid_at',
      label: '支付时间',
      slots: {
        default: (row: any) => {
          if (!row || !row.paid_at) return h('span', '-')
          return h('span', formatToDateTime(row.paid_at))
        }
      }
    }
  ]
  return schema
})

// 用户转出Schema（用户支付交易）
const transactionInSchema = computed<DescriptionsSchema[]>(() => [
  {
    field: 'in_txid',
    label: '交易Hash',
    span: 24,
    slots: {
      default: (row: any) => {
        if (!row || !row.in_txid) return h('span', '-')
        return h(
          ElLink,
          {
            href: `${import.meta.env.VITE_TRONSCAN_URL}/#/transaction/${row.in_txid}`,
            type: 'primary',
            target: '_blank'
          },
          () => row.in_txid
        )
      }
    }
  },
  { field: 'in_from_address', label: '发送人', span: 24 },
  { field: 'in_to_address', label: '接收人', span: 24 },
  {
    field: 'order_amount',
    label: '金额',
    slots: {
      default: (row: any) => {
        if (!row || !row.order_amount) return h('span', '-')
        const unit = row.order_type === 1 ? 'USDT' : 'TRX'
        return h('span', `${row.order_amount}（${unit}）`)
      }
    }
  },
  {
    field: 'in_time',
    label: '转出时间',
    slots: {
      default: (row: any) => {
        if (!row || !row.in_time) return h('span', '-')
        return h('span', formatToDateTime(row.in_time))
      }
    }
  }
])

// 用户接收Schema（系统发放交易）
const transactionOutSchema = computed<DescriptionsSchema[]>(() => [
  {
    field: 'out_txid',
    label: '交易Hash',
    span: 24,
    slots: {
      default: (row: any) => {
        if (!row || !row.out_txid) return h('span', '-')
        return h(
          ElLink,
          {
            href: `${import.meta.env.VITE_TRONSCAN_URL}/#/transaction/${row.out_txid}`,
            type: 'primary',
            target: '_blank'
          },
          () => row.out_txid
        )
      }
    }
  },
  {
    field: 'out_from_address',
    label: '发送人',
    span: 24,
    slots: {
      default: (row: any) => {
        if (!row || !row.out_txid) return h('span', '-')
        return h('span', row.out_from_address || '-')
      }
    }
  },
  {
    field: 'out_to_address',
    label: '接收人',
    span: 24,
    slots: {
      default: (row: any) => {
        if (!row || !row.out_txid) return h('span', '-')
        return h('span', row.out_to_address || '-')
      }
    }
  },
  {
    field: 'user_get_amount',
    label: '金额',
    slots: {
      default: (row: any) => {
        if (!row || !row.user_get_amount) return h('span', '-')
        const unit = row.order_type === 1 ? 'TRX' : 'USDT'
        return h('span', `${row.user_get_amount}（${unit}）`)
      }
    }
  },
  {
    field: 'out_time',
    label: '接收时间',
    slots: {
      default: (row: any) => {
        if (!row || !row.out_txid || !row.out_time) return h('span', '-')
        return h('span', formatToDateTime(row.out_time))
      }
    }
  }
])

// 表格列配置
const columns: TableColumn[] = [
  {
    field: 'id',
    label: '订单号',
    minWidth: 180,
    showOverflowTooltip: false,
    formatter: (row) => row.id || '-'
  },
  {
    field: 'bot_name',
    label: '机器人名称',
    width: 150,
    showOverflowTooltip: false,
    slots: {
      default: ({ row }) => {
        return h(
          ElLink,
          {
            type: 'primary',
            onClick: () => navigateToBotList(row.bot_id)
          },
          () => row.bot_name || '-'
        )
      }
    }
  },
  {
    field: 'amount',
    label: '支付金额',
    width: 120,
    showOverflowTooltip: false,
    formatter: (row) => {
      if (!row.amount) return '-'
      const unit = row.coin || 'TRX' // 使用coin字段
      return `${row.amount} ${unit}`
    }
  },
  {
    field: 'out_amount',
    label: '兑换金额',
    width: 120,
    showOverflowTooltip: false,
    formatter: (row) => (row.out_amount ? `${row.out_amount} ${row.out_coin || ''}` : '-')
  },
  {
    field: 'actual_rate',
    label: '兑换汇率',
    width: 100,
    showOverflowTooltip: false,
    formatter: (row) => row.actual_rate || '-'
  },
  {
    field: 'agent_cost',
    label: '代理扣费',
    width: 120,
    showOverflowTooltip: false,
    formatter: (row) =>
      row.agent_cost !== undefined && row.agent_cost !== null && row.agent_cost !== ''
        ? `${row.agent_cost} TRX`
        : '-'
  },
  {
    field: 'order_type',
    label: '订单类型',
    width: 140,
    showOverflowTooltip: false,
    slots: {
      default: ({ row }: { row: ExchangeOrderItemV1 & { order_type: number } }) => {
        const orderTypeMap: Record<number, { label: string; color: string }> = {
          1: { label: 'USDT  → TRX', color: '#67C23A' }, // 绿色
          2: { label: 'TRX  → USDT', color: '#409EFF' } // 蓝色
        }
        const typeInfo = orderTypeMap[row.order_type] || { label: '未知', color: '#909399' }
        return <span style={{ color: typeInfo.color, fontWeight: '500' }}>{typeInfo.label}</span>
      }
    }
  },
  {
    field: 'status',
    label: '订单状态',
    width: 100,
    showOverflowTooltip: false,
    slots: {
      default: ({ row }) => {
        const type = getStatusType(row.status)
        const text = getStatusText(row.status)
        return h(ElTag, { type }, () => text)
      }
    }
  },
  {
    field: 'describe',
    label: '备注',
    minWidth: 120,
    showOverflowTooltip: false,
    formatter: (row) => row.describe || '-'
  },
  {
    field: 'created_at',
    label: '创建时间',
    sortable: 'custom',
    width: 180,
    showOverflowTooltip: false,
    formatter: (row) => (row.created_at ? formatToDateTime(row.created_at) : '-')
  },
  {
    field: 'paid_at',
    label: '支付时间',
    sortable: 'custom',
    width: 180,
    showOverflowTooltip: false,
    formatter: (row) => (row.paid_at ? formatToDateTime(row.paid_at) : '-')
  }
]

const actionColumn: TableColumn = {
  field: 'action',
  label: '操作',
  width: 120,
  fixed: 'right',
  slots: {
    default: ({ row }) => {
      return (
        <BaseButton type="primary" onClick={() => handleViewDetail(row)}>
          兑换详情
        </BaseButton>
      )
    }
  }
}

// 搜索表单配置
const searchSchema: FormSchema[] = [
  {
    field: 'keyword',
    component: 'Input' as const,
    label: {
      tips: '订单号/机器人用户名/客户地址/闪兑地址',
      text: '关键词'
    },
    componentProps: {
      placeholder: '请输入关键词',
      clearable: true
    }
  },
  {
    field: 'in_coin',
    component: 'Select' as const,
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
    component: 'Select' as const,
    label: '订单状态',
    componentProps: {
      options: [
        { label: '全部', value: '' },
        { label: '已支付', value: 2 },
        { label: '已完成', value: 5 },
        { label: '已失败', value: 6 },
        { label: '已取消', value: 8 },
        { label: '已中止', value: 9 }
      ],
      placeholder: '请选择订单状态'
    }
  },
  {
    field: 'dateRange',
    component: 'DatePicker' as const,
    label: '创建时间',
    componentProps: {
      type: 'datetimerange',
      valueFormat: 'x',
      startPlaceholder: '开始日期',
      endPlaceholder: '结束日期',
      defaultTime: [new Date(2000, 1, 1, 0, 0, 0), new Date(2000, 1, 1, 23, 59, 59)]
    }
  }
]

// 获取订单状态显示类型
const getStatusType = (status: number): 'success' | 'warning' | 'info' | 'danger' | 'primary' => {
  const statusMap: Record<number, 'success' | 'warning' | 'info' | 'danger' | 'primary'> = {
    2: 'warning', // 已支付
    5: 'success', // 已完成
    6: 'danger', // 已失败
    8: 'info', // 已取消
    9: 'danger' // 已中止
  }
  return statusMap[status] || 'info'
}

// 获取订单状态文本
const getStatusText = (status: number): string => {
  const statusMap = {
    2: '已支付',
    5: '已完成',
    6: '已失败',
    8: '已取消',
    9: '已中止'
  }
  return statusMap[status] || '-'
}

// 跳转到机器人列表
const navigateToBotList = (botId: string) => {
  router.push({
    path: '/bot_manage/bot_list',
    query: {
      tg_bot_id: botId
    }
  })
}

// API 封装
const buildExchangeOrderListParams = (
  params: ExchangeOrderSearchParams = {},
  pageSize?: number
): ExchangeOrderListParamsV1 => {
  // 映射参数字段
  const adaptedParams: ExchangeOrderListParamsV1 = {}

  if (params.order_id) adaptedParams.order_id = params.order_id
  if (params.keyword) adaptedParams.keyword = params.keyword
  if (params.in_coin) adaptedParams.coin = params.in_coin // in_coin → coin
  if (hasSearchValue(params.status)) adaptedParams.status = Number(params.status)

  // 分页参数
  adaptedParams.current_page = Number(params.current_page) || 1
  adaptedParams.page_size = pageSize ?? (Number(params.page_size) || 10)

  // 处理排序参数 - 字段名映射
  if (params.order) {
    const fieldMapping: Record<string, string> = {
      create_time: 'created_at',
      pay_time: 'paid_at'
    }

    // 解析排序参数，格式：column ASC 或 column DESC
    const orderParts = params.order.split(' ')
    if (orderParts.length === 2) {
      const [field, direction] = orderParts
      const mappedField = fieldMapping[field] || field
      adaptedParams.order = `${mappedField} ${direction}`
    }
  } else {
    adaptedParams.order = DEFAULT_CREATED_AT_ORDER
  }

  Object.assign(adaptedParams, dateRangeToSeconds(params.dateRange))

  return adaptedParams
}

const fetchExchangeOrderList = async (params: ExchangeOrderSearchParams) => {
  try {
    // 保存当前搜索参数（用于导出）
    currentSearchParams.value = params

    // 使用新接口 v1GetExchangeOrderList
    const response = await v1GetExchangeOrderList(buildExchangeOrderListParams(params))

    // 简化映射：直接使用API字段，只做必要转换
    const list = (response.data?.list || []).map((item: any) => ({
      ...item, // 保留所有原始字段
      order_type: item.coin === 'USDT' ? 1 : 2, // 计算订单类型：根据coin判断，USDT→TRX=1, TRX→USDT=2
      created_at: item.created_at * 1000, // 秒转毫秒
      paid_at: item.paid_at ? item.paid_at * 1000 : null // 秒转毫秒
    }))

    const total = response.data?.pager?.total || 0

    // 添加数据为空提示
    const hasSearchCondition = !!(
      params.order_id ||
      params.keyword ||
      params.in_coin ||
      params.status ||
      params.dateRange
    )
    handleListMessage(list, hasSearchCondition, '兑换订单')

    return {
      list,
      total
    }
  } catch (error) {
    handleErrorMessage(error, '获取兑换订单列表失败')
    return { list: [], total: 0 }
  }
}

// 查看兑换详情（包含交易信息）
const handleViewDetail = async (row: any) => {
  try {
    const response = await v1GetExchangeOrderDetail(row.id)

    if (response && response.data) {
      const detail = response.data
      const orderType = detail.coin === 'USDT' ? 1 : 2

      // 合并兑换详情 + 交易详情到一个对象
      orderDetail.value = {
        ...detail,
        order_type: orderType,
        created_at: detail.created_at * 1000,
        paid_at: detail.paid_at ? detail.paid_at * 1000 : null,
        // 用户转出（pay_transaction）
        in_txid: detail.pay_transaction?.id || '',
        in_to_address: detail.pay_transaction?.to || '',
        in_from_address: detail.pay_transaction?.from || '',
        in_time: detail.pay_transaction?.time ? detail.pay_transaction.time * 1000 : 0,
        order_amount: detail.amount,
        // 用户接收（deliver_transaction）
        out_txid: detail.deliver_transaction?.id || '',
        out_to_address: detail.deliver_transaction?.to || '',
        out_from_address: detail.deliver_transaction?.from || '',
        out_time: detail.deliver_transaction?.time ? detail.deliver_transaction.time * 1000 : 0,
        user_get_amount: detail.deliver_transaction?.amount || '0'
      }

      activeTab.value = 'detail'
      dialogVisible.value = true
    } else {
      ElMessage.warning('数据格式错误')
    }
  } catch (error) {
    handleErrorMessage(error, '获取闪兑详情失败')
  }
}

// 导出订单
const handleExport = async () => {
  try {
    await exportTableData<any>({
      searchTableRef,
      fallbackParams: currentSearchParams.value,
      filename: '兑换订单列表',
      fetchData: v1GetExchangeOrderList,
      buildParams: buildExchangeOrderListParams,
      getList: (response) =>
        [...(response.data?.list || [])].sort(
          (a: any, b: any) => (b.paid_at || b.created_at || 0) - (a.paid_at || a.created_at || 0)
        ),
      mapItem: (item) => ({
        订单号: item.id,
        机器人名称: item.bot_name,
        订单类型: item.coin === 'USDT' ? 'USDT → TRX' : 'TRX → USDT',
        支付金额: item.amount || '-',
        支付币种: item.coin || '-',
        兑换金额: item.out_amount || '-',
        兑换币种: item.out_coin || '-',
        兑换汇率: item.actual_rate || '-',
        代理扣费: item.agent_cost || '-',
        订单状态: getStatusText(item.status),
        备注: item.describe || '-',
        创建时间: item.created_at ? formatToDateTime(item.created_at * 1000) : '-',
        支付时间: item.paid_at ? formatToDateTime(item.paid_at * 1000) : '-'
      }),
      successMessage: '订单导出成功'
    })
  } catch (error) {
    handleErrorMessage(error, '订单导出失败')
  }
}

const onSearch = (params: any) => {
  // onSearch 事件会在用户点击搜索时触发，但参数已经在 fetchExchangeOrderList 中保存了
}
</script>

<style scoped>
/* 交易哈希长文本处理 */
:deep(.el-descriptions-item__content) {
  word-break: break-all;
}
</style>
