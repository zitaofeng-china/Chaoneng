<template>
  <div class="app-container">
    <ContentWrap>
      <SearchTable
        :columns="columns"
        :search-schema="searchSchema"
        :action-column="actionColumn"
        :fetch-data-api="fetchEnergyOrderList"
        :default-params="initialSearchParams"
        :showAddButton="false"
        :pagination="{
          total: totalCount
        }"
        ref="searchTableRef"
        @search="onSearch"
      >
        <template #searchButtons>
          <BaseButton type="primary" @click="handleExport">
            <Icon icon="ep:download" class="mr-5px" />
            导出订单
          </BaseButton>
        </template>
      </SearchTable>

      <!-- 订单详情弹窗 (使用新组件) -->
      <OrderDetailDialog v-model="orderDialogVisible" :order-data="selectedOrderDetail" />
    </ContentWrap>
  </div>
</template>

<script setup lang="tsx">
import { ref, h, computed } from 'vue'
import { formatToDateTime } from '@/utils/dateUtil'
import { useRoute, useRouter } from 'vue-router'
import { ElTag, ElLink } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { SearchTable } from '@/components/SearchTable'
import { BaseButton } from '@/components/Button'
import type { TableColumn } from '@/components/Table'
import {
  v1GetEnergyOrderList,
  v1GetEnergyOrderDetail
} from '@/api/management/OrderManage/EnergyOrder'
import OrderDetailDialog from './components/OrderDetailDialog.vue'
import formatEnergyNum from '../helpers/formatEnergyNum'
import { Icon } from '@/components/Icon'
import { handleListMessage, handleErrorMessage, handleSuccessMessage } from '@/utils/messageHelper'
import {
  ENERGY_ORDER_KIND_OPTIONS,
  getEnergyOrderKindTagType,
  getEnergyOrderKindText,
  getPaymentMethodText
} from '@/utils/energyOrder'
import { dateRangeToSeconds, exportTableData } from '@/utils/tableHelpers'

// 辅助函数：检查值是否为空
const isEmpty = (value: any): boolean => {
  return value === null || value === undefined || value === ''
}

const router = useRouter()
const route = useRoute()
const searchTableRef = ref<InstanceType<typeof SearchTable> | null>(null)
const totalCount = ref(0)
const orderDialogVisible = ref(false)
const selectedOrderDetail = ref<any>(null)
const currentSearchParams = ref({})
const DEFAULT_CREATED_AT_ORDER = 'created_at DESC'
const initialSearchParams = route.query.order_id
  ? {
      order_id: String(route.query.order_id)
    }
  : {}

// 当前选择的来源
const selectedSource = ref<string>('')

// 根据订单类型（kind）格式化能量有效期
const formatExpirationTime = (orderType?: number): string => {
  // 根据订单类型返回对应的有效期
  switch (orderType) {
    case 4: // KindTimeEnergy - 时间能量（闪租能量，1小时有效）
      return '1小时'

    case 5: // KindStrokeEnergy - 笔数能量（长期有效，每天不用额外扣一笔，一次发放两笔，用完再扣）
      return '一天'

    case 6: // KindWealEnergy - 福利能量（打折的时间能量，有购买限制）
      return '1小时'

    case 7: // KindFlashEnergy - 快速能量（快速租用，1小时有效，用了会提前回收）
      return '1小时'

    case 8: // KindInstantEnergy - 即用能量（15分钟，用了会提前回收）
      return '15分钟'

    case 20: // KindHosting - 托管（一次发放两笔）
      return '一天'

    case 9: // KindBatchEnergy - 批量能量（带自动激活）
      return '1小时'

    default:
      // 其他订单类型不显示有效期
      return '-'
  }
}

// 表格列配置 - 使用 computed 实现动态显示/隐藏
const columns = computed<TableColumn[]>(() => {
  const allCols: any[] = [
    {
      field: 'id',
      label: '订单号',
      width: 180,
      formatter: (row) => row.id || '-'
    },
    {
      field: 'tg_user_name',
      label: 'TG用户名',
      width: 120,
      hideWhen: 2, // 来源为 H5(2) 时隐藏
      slots: {
        default: ({ row }) => {
          if (isEmpty(row.tg_user_name)) return h('span', '-')
          return h(
            ElLink,
            {
              type: 'primary',
              onClick: () => navigateToUserList(row.user_id)
            },
            () => row.tg_user_name
          )
        }
      }
    },
    {
      field: 'tg_first_name',
      label: 'TG用户昵称',
      width: 120,
      hideWhen: 2, // 来源为 H5(2) 时隐藏
      formatter: (row) => row.tg_first_name || '-'
    },
    {
      field: 'username',
      label: '用户账号',
      width: 120,
      hideWhen: 1, // 来源为机器人(1)时隐藏
      formatter: (row) => row.username || '-'
    },
    {
      field: 'email',
      label: '用户邮箱',
      minWidth: 150,
      hideWhen: 1, // 来源为机器人(1)时隐藏
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
      minWidth: 160,
      slots: {
        default: ({ row }) => {
          if (isEmpty(row.bot_name)) return h('span', '-')
          return h(
            ElLink,
            {
              type: 'primary',
              onClick: () => navigateToBotList(row.bot_id)
            },
            () => row.bot_name
          )
        }
      }
    },
    {
      field: 'kind',
      label: '订单类型',
      width: 120,
      slots: {
        default: ({ row }: any) => {
          const orderTypeNum = typeof row.kind === 'string' ? parseInt(row.kind, 10) : row.kind
          const text = getEnergyOrderKindText(orderTypeNum)

          if (isNaN(orderTypeNum) || text === '未知类型') {
            return h(ElTag, { type: 'info', size: 'small' }, () => '未知类型')
          }

          const tagType = getEnergyOrderKindTagType(orderTypeNum)

          return h(ElTag, { type: tagType, size: 'small' }, () => text)
        }
      }
    },
    {
      field: 'amount',
      label: '支付金额',
      width: 100,
      formatter: (row) => {
        return row.amount && row.amount != 0 ? `${row.amount} ${row.coin || ''}` : '-'
      }
    },
    {
      field: 'energy_amount',
      label: '能量数量',
      width: 100,
      formatter: (row) => {
        return row.energy_amount ? formatEnergyNum(row.energy_amount) : '-'
      }
    },
    {
      field: 'energy_rent_text',
      label: '能量有效期',
      width: 100,
      formatter: (row) => {
        return row.energy_rent_text || '-'
      }
    },
    {
      field: 'receive_address',
      label: '收款方式',
      minWidth: 180,
      formatter: (row) => {
        // 如果收款地址为空，显示"余额支付"
        if (!row.receive_address || row.receive_address.trim() === '') {
          return '余额支付'
        }

        // 其他情况显示收款地址
        return row.receive_address
      }
    },
    {
      field: 'payment_address',
      label: '能量接收地址',
      minWidth: 180,
      formatter: (row) => row.payment_address || row.energy_address || '-'
    },
    {
      field: 'energy_count',
      label: '笔数',
      width: 80,
      formatter: (row) => {
        return row.energy_count ? row.energy_count : '-'
      }
    },
    {
      field: 'status',
      label: '订单状态',
      width: 100,
      slots: {
        default: ({ row }) => {
          const statusColorMap: Record<number, 'success' | 'warning' | 'danger' | 'info'> = {
            1: 'info', // 新订单
            2: 'warning', // 已支付
            3: 'info', // 已发送
            4: 'warning', // 已回收
            5: 'success', // 已完成
            6: 'danger', // 已失败
            7: 'info', // 已退款
            8: 'info', // 已取消
            9: 'danger' // 已中止
          }
          const type = statusColorMap[row.status] || 'info'
          const text = getStatusTextForTable(row.status)
          return h(ElTag, { type }, () => text)
        }
      }
    },
    {
      field: 'created_at',
      label: '创建时间',
      sortable: 'custom',
      width: 180,
      formatter: (row) => (row.created_at ? formatToDateTime(row.created_at) : '-')
    },
    {
      field: 'updated_at',
      label: '完成时间',
      sortable: 'custom',
      width: 180,
      formatter: (row) => (row.updated_at ? formatToDateTime(row.updated_at) : '-')
    }
  ]

  // 根据来源过滤列
  const filteredCols = allCols.filter((col) => {
    if (!col.hideWhen) return true
    return selectedSource.value !== col.hideWhen
  })

  return filteredCols
})

// 操作列配置
const actionColumn: TableColumn = {
  field: 'action',
  label: '操作',
  width: 120,
  fixed: 'right',
  slots: {
    default: (data: any) => {
      const row = data.row
      return (
        <BaseButton type="primary" onClick={() => handleViewDetail(row)}>
          订单详情
        </BaseButton>
      )
    }
  }
}

// 搜索表单配置
const searchSchema = [
  {
    field: 'keyword',
    component: 'Input' as const,
    label: {
      text: '关键词',
      tips: 'TG用户名/机器人名称/用户账号/用户邮箱'
    },
    componentProps: {
      placeholder: '请输入关键词'
    }
  },
  {
    field: 'receive_address',
    component: 'Input' as const,
    label: '收款钱包地址',
    componentProps: {
      placeholder: '请输入收款钱包地址'
    }
  },
  {
    field: 'payment_address',
    component: 'Input' as const,
    label: '能量接收地址',
    componentProps: {
      placeholder: '请输入能量接收地址'
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
    field: 'origin',
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
    field: 'kind',
    component: 'Select' as const,
    label: '订单类型',
    componentProps: {
      options: ENERGY_ORDER_KIND_OPTIONS,
      placeholder: '请选择订单类型'
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

// 获取订单状态文本
const getStatusTextForTable = (status: number): string => {
  const statusMap: Record<number, string> = {
    1: '新订单',
    2: '已支付',
    3: '已发送',
    4: '已回收',
    5: '已完成',
    6: '已失败',
    7: '已退款',
    8: '已取消',
    9: '已中止 '
  }
  return statusMap[status] || '-'
}

// 跳转到用户列表
const navigateToUserList = (userId: string | number) => {
  if (!userId) return
  router.push({
    path: '/user_group/user_list',
    query: { tg_id: userId }
  })
}

// 跳转到机器人列表
const navigateToBotList = (botId: string | number) => {
  if (!botId) return
  router.push({
    path: '/bot_manage/bot_list',
    query: { tg_bot_id: botId }
  })
}

// API 封装
const fetchEnergyOrderList = async (params: any) => {
  try {
    // 更新选中的来源，用于控制列的显示/隐藏
    selectedSource.value = params.origin || ''

    // 直接使用API字段，减少映射
    const adaptedParams: any = {
      current_page: params.current_page || 1,
      page_size: params.page_size || 10
    }

    // 只映射必要的字段
    if (params.order_id) adaptedParams.order_id = params.order_id
    if (params.origin !== undefined && params.origin !== '') {
      adaptedParams.origin = Number(params.origin)
    }
    if (params.status) adaptedParams.status = params.status
    if (params.keyword) adaptedParams.keyword = params.keyword
    if (params.kind) adaptedParams.kind = params.kind
    if (params.receive_address) adaptedParams.receive_address = params.receive_address
    if (params.payment_address) adaptedParams.energy_address = params.payment_address

    // 处理排序参数
    adaptedParams.order = params.order || DEFAULT_CREATED_AT_ORDER

    // 处理时间范围（转换为秒级Unix时间戳字符串）
    if (params.dateRange && params.dateRange.length === 2) {
      adaptedParams.start_time = Math.floor(params.dateRange[0] / 1000).toString()
      adaptedParams.end_time = Math.floor(params.dateRange[1] / 1000).toString()
    }
    const response = await v1GetEnergyOrderList(adaptedParams)

    // 映射返回数据字段 - 直接使用API原始字段，只做必要转换
    const list = (response.data?.list || []).map((item: any) => ({
      ...item, // 保留所有原始字段
      created_at: item.created_at * 1000, // 秒 → 毫秒
      updated_at: item.updated_at * 1000, // 秒 → 毫秒
      paid_at: item.paid_at ? item.paid_at * 1000 : null, // 秒 → 毫秒
      energy_rent_text: formatExpirationTime(item.kind), // 计算有效期
      // 来源判断逻辑：如果TG用户名不存在且用户账号存在则来源是H5，反之就是机器人
      origin: (() => {
        if (!item.tg_user_name && item.username) {
          return 2 // H5
        } else if (item.tg_user_name) {
          return 1 // 机器人
        }
        // 兜底：使用API返回的 origin
        return item.origin || 0
      })()
    }))

    totalCount.value = response.data?.pager?.total || 0
    currentSearchParams.value = params

    // 提示消息
    const hasSearchCondition = !!(
      params.keyword ||
      params.order_id ||
      params.origin ||
      params.status ||
      params.kind ||
      params.dateRange
    )
    handleListMessage(list, hasSearchCondition, '能量订单')

    return {
      list,
      total: response.data?.pager?.total || 0
    }
  } catch (error) {
    handleErrorMessage(error, '获取能量订单列表失败')
    return { list: [], total: 0 }
  }
}

// 查看订单详情
const handleViewDetail = async (row: any) => {
  const orderId = row.id
  if (!orderId) {
    return
  }
  try {
    const response = await v1GetEnergyOrderDetail(orderId)

    if (response && response.data) {
      const detail = response.data

      // 从 resources 中获取能量相关信息
      let energyAmount = '0'
      let energyAddress = ''
      let energyRentText = '-'
      let recycleTime = 0

      if (detail.resources && detail.resources.length > 0) {
        const firstResource = detail.resources[0]
        energyAmount = String(firstResource.amount || 0)
        energyAddress = firstResource.target || ''

        // 计算有效时长
        if (firstResource.expirated_at && firstResource.delegated_at) {
          const expTime = firstResource.expirated_at * 1000
          const delTime = firstResource.delegated_at * 1000
          const diffMs = expTime - delTime
          const diffMinutes = Math.floor(diffMs / (1000 * 60))
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

          if (diffDays > 0) {
            energyRentText = `${diffDays}天`
          } else if (diffHours > 0) {
            energyRentText = `${diffHours}小时`
          } else if (diffMinutes > 0) {
            energyRentText = `${diffMinutes}分钟`
          }
        }

        // 回收时间
        if (firstResource.recycled_at) {
          recycleTime = firstResource.recycled_at * 1000
        }
      }

      // 笔数能量(5)和托管(20)显示为长期有效
      if (detail.kind === 5 || detail.kind === 20) {
        energyRentText = '长期有效'
      }

      // 直接使用API原始字段，只添加必要的计算字段
      selectedOrderDetail.value = {
        ...detail,
        created_at: detail.created_at * 1000, // 秒 → 毫秒
        updated_at: detail.updated_at * 1000, // 秒 → 毫秒
        paid_at: detail.paid_at ? detail.paid_at * 1000 : null, // 秒 → 毫秒
        // 从 resources 计算的字段
        energy_amount: energyAmount,
        energy_address: energyAddress,
        energy_rent_text: energyRentText,
        recycle_time: recycleTime
      }
      orderDialogVisible.value = true
    }
  } catch (error) {
    selectedOrderDetail.value = null
  }
}

// 导出订单
const handleExport = async () => {
  try {
    await exportTableData<any>({
      searchTableRef,
      fallbackParams: currentSearchParams.value,
      filename: '能量订单列表',
      fetchData: v1GetEnergyOrderList,
      buildParams: (params) => {
        const adaptedParams: any = {}

        if (params.order_id) adaptedParams.order_id = params.order_id
        if (params.origin !== undefined && params.origin !== '') {
          adaptedParams.origin = Number(params.origin)
        }
        if (params.status) adaptedParams.status = params.status
        if (params.keyword) adaptedParams.keyword = params.keyword
        if (params.kind) adaptedParams.kind = params.kind
        if (params.receive_address) adaptedParams.receive_address = params.receive_address
        if (params.payment_address) adaptedParams.energy_address = params.payment_address

        Object.assign(adaptedParams, dateRangeToSeconds(params.dateRange))

        return adaptedParams
      },
      mapItem: (item) => ({
        订单号: item.id,
        TG用户名: item.tg_user_name,
        TG用户昵称: item.tg_first_name,
        用户账号: item.username || '-',
        用户邮箱: item.email || '-',
        来源: (() => {
          if (!item.tg_user_name && item.username) {
            return 'H5'
          }
          if (item.tg_user_name) {
            return '机器人'
          }
          return item.origin === 1 ? '机器人' : item.origin === 2 ? 'H5' : '-'
        })(),
        机器人名称: item.bot_name,
        订单类型: getEnergyOrderKindText(item.kind),
        支付金额: item.amount && item.amount != 0 ? item.amount : '-',
        支付币种: item.coin || '-',
        能量数量: formatEnergyNum(item.energy_amount),
        能量有效期: formatExpirationTime(item.kind),
        收款方式: getPaymentMethodText(
          item.payment_address || item.energy_address,
          item.receive_address
        ),
        能量接收地址: item.payment_address || item.energy_address || '-',
        笔数: item.energy_count || '-',
        订单状态: getStatusTextForTable(item.status),
        创建时间: item.created_at ? formatToDateTime(item.created_at * 1000) : '-',
        完成时间: item.updated_at ? formatToDateTime(item.updated_at * 1000) : '-'
      }),
      successMessage: '订单导出成功'
    })
  } catch (error) {
    handleErrorMessage(error, '订单导出失败')
  }
}

const onSearch = (params: any) => {
  currentSearchParams.value = params
}
</script>

<style scoped></style>
