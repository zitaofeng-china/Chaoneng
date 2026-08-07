<template>
  <div class="app-container">
    <ContentWrap>
      <SearchTable
        :columns="columns"
        :search-schema="searchSchema"
        :fetch-data-api="fetchRechargeOrderList"
        :initial-params="initialSearchParams"
        :showAddButton="false"
        ref="searchTableRef"
        :table-props="tableProps"
        @search="onSearch"
      >
        <!-- 添加导出按钮 -->
        <template #searchButtons>
          <BaseButton type="primary" @click="handleExport">
            <Icon icon="ep:download" class="mr-5px" />
            导出订单
          </BaseButton>
        </template>
      </SearchTable>

      <RechargeOrderDetailDialog
        v-model="dialogVisible"
        mode="user"
        :order-detail="orderDetail"
        :recharge-detail="rechargeDetail"
      />
    </ContentWrap>
  </div>
</template>

<script setup lang="tsx">
import { ref, h, computed } from 'vue'
import { formatToDateTime } from '@/utils/dateUtil'
import { ElTag } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { SearchTable } from '@/components/SearchTable'
import { BaseButton } from '@/components/Button'
import { Icon } from '@/components/Icon'
import type { TableColumn } from '@/components/Table'
import { v1GetDepositList, v1GetDepositDetail } from '@/api/management/OrderManage/RechargeOrder'
import { useRouter, useRoute } from 'vue-router'
import { handleListMessage, handleErrorMessage } from '@/utils/messageHelper'
import { dateRangeToSeconds, exportTableData } from '@/utils/tableHelpers'
import { formatRechargeFeeText } from '@/utils/rechargeOrder'
import {
  RechargeOrderDetailDialog,
  renderRechargeCoinTag
} from '@/components/business/recharge-order'

const router = useRouter()
const route = useRoute()
const searchTableRef = ref<InstanceType<typeof SearchTable> | null>(null)
const DEFAULT_CREATED_AT_ORDER = 'created_at DESC'
const tableProps = {
  headerCellStyle: { whiteSpace: 'nowrap' }
}
const initialSearchParams = route.query.order_num
  ? {
      order_id: String(route.query.order_num)
    }
  : {}

// 当前选择的来源
const selectedSource = ref<number | string>('')

// 订单详情相关
const dialogVisible = ref(false)
const orderDetail = ref<any>({})
const rechargeDetail = ref<any>({})

const getRechargeOrderTypeText = (coin?: string | null) => {
  if (!coin) return '-'
  return `充值${coin}`
}

const getRechargeOriginText = (origin?: number | null) => {
  if (origin === 1) return '机器人'
  if (origin === 2) return 'H5'
  return '-'
}

// 表格列配置 - 使用 computed 实现动态显示/隐藏
const columns = computed<TableColumn[]>(() => {
  const allCols: any[] = [
    {
      field: 'id',
      label: '订单号',
      minWidth: 180,
      showOverflowTooltip: false,
      formatter: (row) => row.id || '-'
    },
    {
      field: 'tg_user_name',
      label: 'TG用户名',
      minWidth: 100,
      hideWhen: 2, // 来源为 H5 时隐藏
      slots: {
        default: ({ row }) => {
          if (!row.tg_user_name) return <span>-</span>
          return (
            <span
              style={{ color: '#409EFF', cursor: 'pointer' }}
              onClick={() => {
                router.push({
                  path: `/user_group/user_list`,
                  query: { keyword: row.tg_user_name }
                })
              }}
            >
              {row.tg_user_name}
            </span>
          )
        }
      }
    },
    {
      field: 'tg_first_name',
      label: 'TG用户昵称',
      minWidth: 110,
      hideWhen: 2, // 来源为 H5 时隐藏
      formatter: (row) => row.tg_first_name || '-'
    },
    {
      field: 'username',
      label: '用户账号',
      minWidth: 100,
      hideWhen: 1, // 来源为机器人时隐藏
      formatter: (row) => row.username || '-'
    },
    {
      field: 'email',
      label: '用户邮箱',
      minWidth: 150,
      hideWhen: 1, // 来源为机器人时隐藏
      formatter: (row) => row.email || '-'
    },
    {
      field: 'origin',
      label: '来源',
      width: 100,
      formatter: (row) => {
        // 根据 origin 数字值判断来源
        return row.origin === 1 ? '机器人' : row.origin === 2 ? 'H5' : '-'
      }
    },
    {
      field: 'bot_name',
      label: '机器人名称',
      minWidth: 110,
      slots: {
        default: ({ row }) => {
          return (
            <span
              style={{ color: '#409EFF', cursor: 'pointer' }}
              onClick={() => {
                router.push({
                  path: `/bot_manage/bot_list`,
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
      field: 'order_type',
      label: '订单类型',
      width: 120,
      slots: {
        default: ({ row }) => renderRechargeCoinTag(row.coin)
      }
    },
    {
      field: 'amount',
      label: '金额',
      sortable: 'custom',
      minWidth: 120,
      formatter: (row) => (row.amount ? `${row.amount} ${row.coin || 'TRX'}` : '-')
    },
    {
      field: 'fee',
      label: '手续费',
      minWidth: 120,
      formatter: (row) => formatRechargeFeeText(row)
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
      field: 'receive_address',
      label: '收款地址',
      minWidth: 150,
      formatter: (row) => row.receive_address || '-'
    },
    {
      field: 'pay_address',
      label: '支付地址',
      minWidth: 150,
      formatter: (row) => row.pay_address || '-'
    },
    {
      field: 'describe',
      label: '备注',
      formatter: (row) => row.describe || '-'
    },
    {
      field: 'created_at',
      label: '创建时间',
      sortable: 'custom',
      minWidth: 160,
      showOverflowTooltip: false,
      formatter: (row) => (row.created_at ? formatToDateTime(row.created_at * 1000) : '-')
    },
    {
      field: 'paid_at',
      label: '完成时间',
      sortable: 'custom',
      minWidth: 160,
      showOverflowTooltip: false,
      formatter: (row) => (row.paid_at ? formatToDateTime(row.paid_at * 1000) : '-')
    },
    {
      field: 'action',
      label: '操作',
      minWidth: 120,
      fixed: 'right',
      slots: {
        default: ({ row }) => {
          return (
            <BaseButton type="primary" onClick={() => handleViewDetail(row)}>
              充值详情
            </BaseButton>
          )
        }
      }
    }
  ]

  // 根据来源过滤列
  const filteredCols = allCols.filter((col) => {
    if (!col.hideWhen) return true
    return selectedSource.value !== col.hideWhen
  })

  return filteredCols
})

// 搜索表单配置
const searchSchema = [
  {
    field: 'query',
    component: 'Input' as const,
    label: {
      text: '关键词',
      tips: '支持TG用户名/TG用户昵称/机器人名称/用户账号/用户邮箱查询'
    },
    componentProps: {
      placeholder: '请输入关键字搜索'
    }
  },
  {
    field: 'order_id',
    component: 'Input' as const,
    label: '订单号',
    componentProps: {
      placeholder: '请输入订单号'
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
  },
  {
    field: 'source',
    component: 'Select' as const,
    label: '来源',
    componentProps: {
      options: [
        { label: '全部', value: '' },
        { label: 'H5', value: 2 },
        { label: '机器人', value: 1 }
      ],
      placeholder: '请选择来源'
    }
  },
  {
    field: 'status',
    component: 'Select' as const,
    label: '订单状态',
    componentProps: {
      options: [
        { label: '全部', value: '' },
        { label: '新订单', value: 1 },
        { label: '已支付', value: 2 },
        { label: '已发送', value: 3 },
        { label: '已回收', value: 4 },
        { label: '已完成', value: 5 },
        { label: '已失败', value: 6 },
        { label: '已退款', value: 7 },
        { label: '已取消', value: 8 },
        { label: '已中止', value: 9 }
      ],
      placeholder: '请选择订单状态'
    }
  },
  {
    field: 'order_type',
    component: 'Select' as const,
    label: '订单类型',
    componentProps: {
      options: [
        { label: '全部', value: '' },
        { label: '充值TRX', value: 1 },
        { label: '充值USDT', value: 2 }
      ],
      placeholder: '请选择订单类型'
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
    1: 'info', // 新订单
    2: 'primary', // 已支付
    3: 'warning', // 已发送
    4: 'warning', // 已回收
    5: 'success', // 已完成
    6: 'danger', // 已失败
    7: 'warning', // 已退款
    8: 'info', // 已取消
    9: 'danger' // 已中止
  }
  return statusMap[status] || 'info'
}

// 获取订单状态文本
const getStatusText = (status: number): string => {
  const statusMap = {
    1: '新订单',
    2: '已支付',
    3: '已发送',
    4: '已回收',
    5: '已完成',
    6: '已失败',
    7: '已退款',
    8: '已取消',
    9: '已中止'
  }
  return statusMap[status] || '-'
}

// API 封装
const fetchRechargeOrderList = async (params: any) => {
  try {
    // 更新选中的来源，用于控制列的显示/隐藏
    selectedSource.value = params.source || ''

    // 处理排序参数
    const adaptedParams: any = {}

    // 映射参数字段
    if (params.order_id) adaptedParams.order_id = params.order_id
    if (params.source !== undefined && params.source !== '') {
      adaptedParams.origin = Number(params.source) // source → origin (数字类型)
    }
    if (params.status) adaptedParams.status = params.status
    if (params.query) adaptedParams.keyword = params.query // query → keyword
    if (params.order_type) {
      // order_type → coin (1=TRX, 2=USDT)
      adaptedParams.coin = params.order_type == 1 ? 'TRX' : 'USDT'
    }
    if (params.receive_address) adaptedParams.receive_address = params.receive_address
    if (params.pay_address) adaptedParams.pay_address = params.pay_address

    // 分页参数 - 使用后端格式
    if (params.current_page) adaptedParams.current_page = params.current_page
    if (params.page_size) adaptedParams.page_size = params.page_size

    // 处理排序参数 - 字段名映射
    if (params.order) {
      // 字段名映射：前端 → 后端（已使用API原始字段，无需映射）
      const fieldMap: Record<string, string> = {}

      // 解析排序参数，格式：'field_name ASC' 或 'field_name DESC'
      const [field, direction] = params.order.split(' ')
      const mappedField = fieldMap[field] || field
      adaptedParams.order = `${mappedField} ${direction}`
    } else {
      adaptedParams.order = DEFAULT_CREATED_AT_ORDER
    }

    // 处理时间范围（转换为秒数）
    if (params.dateRange && params.dateRange.length === 2) {
      adaptedParams.start_time = Math.floor(params.dateRange[0] / 1000).toString()
      adaptedParams.end_time = Math.floor(params.dateRange[1] / 1000).toString()
    }

    const response = await v1GetDepositList(adaptedParams)

    // 直接使用API原始字段，只做必要的补充
    const list = (response.data?.list || []).map((item: any) => ({
      ...item, // 保留所有原始字段
      // 补充计算字段
      order_type: item.coin === 'TRX' ? 1 : 2 // 根据币种计算订单类型
    }))

    // 添加数据为空提示
    const hasSearchCondition = !!(
      params.order_id ||
      params.source ||
      params.status ||
      params.query ||
      params.order_type ||
      params.receive_address ||
      params.pay_address ||
      params.dateRange
    )
    handleListMessage(list, hasSearchCondition, '充值订单')

    return {
      list,
      total: response.data?.pager?.total || 0
    }
  } catch (error) {
    handleErrorMessage(error, '获取充值订单列表失败')
    return { list: [], total: 0 }
  }
}

const handleViewDetail = async (row: any) => {
  try {
    const response = await v1GetDepositDetail(row.id)

    const detail = response.data || {}

    // 使用API原始字段，只补充必要的计算字段
    orderDetail.value = {
      ...detail, // 保留所有原始字段
      origin: detail.origin ?? row.origin,
      order_type: detail.coin === 'TRX' ? 1 : 2, // 计算订单类型
      statusText: getStatusText(detail.status),
      fee: detail.fee ?? row.fee,
      user_bill: detail.user_bill ?? row.user_bill,
      // 补充列表中的字段（如果详情接口没有返回）
      tg_user_name: detail.tg_user_name || row.tg_user_name || '',
      tg_first_name: detail.tg_first_name || row.tg_first_name || '-',
      username: detail.username || row.username || '',
      email: detail.email || row.email || '-',
      bot_name: detail.bot_name || row.bot_name || ''
    }

    rechargeDetail.value = detail.pay_transaction || {
      id: detail.pay_id || '',
      from: '-',
      to: detail.receive_address || '-'
    }

    dialogVisible.value = true
  } catch (error) {
    handleErrorMessage(error, '获取充值详情失败')
  }
}

// 导出订单
const handleExport = async () => {
  try {
    await exportTableData<any>({
      searchTableRef,
      filename: '充值订单列表',
      fetchData: v1GetDepositList,
      buildParams: (params) => {
        const adaptedParams: any = {}
        if (params.order_id) adaptedParams.order_id = params.order_id
        if (params.source !== undefined && params.source !== '') {
          adaptedParams.origin = Number(params.source)
        }
        if (params.status) adaptedParams.status = params.status
        if (params.query) adaptedParams.keyword = params.query
        if (params.order_type) {
          adaptedParams.coin = params.order_type == 1 ? 'TRX' : 'USDT'
        }
        if (params.receive_address) adaptedParams.receive_address = params.receive_address
        if (params.pay_address) adaptedParams.pay_address = params.pay_address

        Object.assign(adaptedParams, dateRangeToSeconds(params.dateRange))

        return adaptedParams
      },
      mapItem: (item) => ({
        订单号: item.id || '-',
        TG用户名: item.tg_user_name || '-',
        TG用户昵称: item.tg_first_name || '-',
        用户账号: item.username || '-',
        用户邮箱: item.email || '-',
        来源: item.origin === 1 ? '机器人' : item.origin === 2 ? 'H5' : '-',
        机器人名称: item.bot_name || '-',
        订单类型: getRechargeOrderTypeText(item.coin),
        金额: item.amount || '-',
        币种: item.coin || '-',
        手续费: formatRechargeFeeText(item),
        订单状态: getStatusText(item.status),
        收款地址: item.receive_address || '-',
        支付地址: item.pay_address || '-',
        备注: item.describe || '-',
        创建时间: item.created_at ? formatToDateTime(item.created_at * 1000) : '-',
        完成时间: item.paid_at ? formatToDateTime(item.paid_at * 1000) : '-'
      }),
      successMessage: '订单导出成功'
    })
  } catch (error) {
    handleErrorMessage(error, '订单导出失败')
  }
}

const onSearch = (params: any) => {
  // 更新选中的来源，用于控制列的显示/隐藏
  selectedSource.value = params.source || ''
}
</script>

<style scoped></style>
