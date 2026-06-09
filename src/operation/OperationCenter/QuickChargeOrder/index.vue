<template>
  <div class="app-container">
    <ContentWrap>
      <SearchTable
        ref="searchTableRef"
        :columns="columns"
        :search-schema="searchSchema"
        :fetch-data-api="fetchSampleList"
        :show-add-button="false"
        :search-props="{
          layout: 'inline',
          buttonPosition: 'right'
        }"
      >
        <template #searchButtons>
          <BaseButton type="primary" @click="handleExport">
            <Icon icon="ep:download" class="mr-5px" />
            导出
          </BaseButton>
        </template>
      </SearchTable>

      <OrderDetail ref="orderDetailRef" />
    </ContentWrap>
  </div>
</template>

<script setup lang="tsx">
import { ref } from 'vue'
import { ElLink, ElTag } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { SearchTable } from '@/components/SearchTable'
import { BaseButton } from '@/components/Button'
import { Icon } from '@/components/Icon'
import OrderDetail from './components/OrderDetail.vue'
import type { TableColumn } from '@/components/Table'
import type { FormSchema } from '@/components/Form'
import type { SearchTableExpose } from '@/components/SearchTable'
import { handleListMessage } from '@/utils/messageHelper'
import {
  createPageParams,
  exportTableData,
  getStatusLabel,
  getStatusTagType,
  hasSearchValue,
  type TableSlot
} from '@/utils/tableHelpers'
import type { QuickChargeOrder, QuickChargeSearchParams } from './types'
import {
  QUICK_CHARGE_BOT_OPTIONS,
  QUICK_CHARGE_RESOURCE_TYPE_OPTIONS,
  QUICK_CHARGE_STATUS_MAP,
  QUICK_CHARGE_STATUS_OPTIONS
} from './constants'

type QuickChargeTableSlot = TableSlot<QuickChargeOrder>

const searchTableRef = ref<SearchTableExpose | null>(null)
const orderDetailRef = ref<InstanceType<typeof OrderDetail> | null>(null)

const sampleList: QuickChargeOrder[] = [
  {
    id: 'ORD20260429001',
    bot_user_name: 'iosvBot',
    agent_name: 'asdty555',
    send_address: 'TWKDxEdEaJY***6dgnvj62Bz',
    receive_address: 'TWKDxEdEaJY***6dgnvj62Bz',
    type: '能量出售',
    order_type_label: '速充订单',
    amount: '1600 W 能量',
    unit_price: '0.012',
    start_time: '2025-06-03 08:50:08',
    end_time: '2025-06-03 08:50:08',
    duration: '60小时',
    status: 1,
    remark: '-'
  },
  {
    id: 'ORD20260429002',
    bot_user_name: 'quickBot',
    agent_name: 'quick_agent',
    send_address: 'TQpChargeAddr***A3x9',
    receive_address: 'TRxChargeAddr***K2p8',
    type: '带宽出售',
    order_type_label: '速充订单',
    amount: '800 W 带宽',
    unit_price: '0.015',
    start_time: '2025-06-03 10:20:00',
    end_time: '2025-06-03 22:20:00',
    duration: '12小时',
    status: 2,
    remark: '-'
  }
]

const columns: TableColumn[] = [
  { field: 'id', label: '订单号', minWidth: 160 },
  {
    field: 'bot_user_name',
    label: '机器人用户名',
    minWidth: 130,
    slots: {
      default: ({ row }: QuickChargeTableSlot) => (
        <ElLink type="primary" onClick={() => window.open(`https://t.me/${row.bot_user_name}`)}>
          {row.bot_user_name}
        </ElLink>
      )
    }
  },
  { field: 'agent_name', label: '代理', minWidth: 120 },
  { field: 'send_address', label: '用户发送地址', minWidth: 210 },
  { field: 'receive_address', label: '接收地址', minWidth: 210 },
  {
    field: 'order_type_label',
    label: '类型',
    width: 110,
    slots: {
      default: ({ row }: QuickChargeTableSlot) => (
        <ElTag type="warning" size="small">
          {row.order_type_label}
        </ElTag>
      )
    }
  },
  { field: 'amount', label: '数量', width: 130 },
  { field: 'unit_price', label: '单价（sun/天）', width: 130 },
  { field: 'start_time', label: '开始时间', width: 170 },
  { field: 'end_time', label: '结束时间', width: 170 },
  { field: 'duration', label: '总时长', width: 100 },
  {
    field: 'status',
    label: '订单状态',
    width: 110,
    slots: {
      default: ({ row }: QuickChargeTableSlot) => (
        <ElTag type={getStatusTagType(QUICK_CHARGE_STATUS_MAP, row.status)} size="small">
          {getStatusLabel(QUICK_CHARGE_STATUS_MAP, row.status)}
        </ElTag>
      )
    }
  },
  { field: 'remark', label: '备注', minWidth: 120 },
  {
    field: 'action',
    label: '操作',
    width: 120,
    fixed: 'right',
    slots: {
      default: ({ row }: QuickChargeTableSlot) => (
        <BaseButton type="primary" onClick={() => handleDetail(row)}>
          查看详情
        </BaseButton>
      )
    }
  }
]

const searchSchema = ref<FormSchema[]>([
  {
    field: 'keyword',
    component: 'Input',
    label: {
      text: '关键词',
      tips: '订单号/机器人用户名/代理/发送地址/接收地址'
    },
    componentProps: {
      placeholder: '请输入关键词',
      clearable: true,
      style: { width: '330px' }
    }
  },
  {
    field: 'type',
    component: 'Select',
    label: '类型',
    componentProps: {
      placeholder: '全部',
      clearable: true,
      options: QUICK_CHARGE_RESOURCE_TYPE_OPTIONS
    }
  },
  {
    field: 'status',
    component: 'Select',
    label: '状态',
    componentProps: {
      placeholder: '全部',
      clearable: true,
      options: QUICK_CHARGE_STATUS_OPTIONS
    }
  },
  {
    field: 'bot_user_name',
    component: 'Select',
    label: '机器人',
    componentProps: {
      placeholder: '全部',
      clearable: true,
      filterable: true,
      options: QUICK_CHARGE_BOT_OPTIONS
    }
  }
])

const filterSampleList = (params: QuickChargeSearchParams = {}) => {
  return sampleList.filter((item) => {
    const keyword = String(params.keyword || '').trim()
    const matchKeyword =
      !keyword ||
      [item.id, item.bot_user_name, item.agent_name, item.send_address, item.receive_address].some(
        (value) => value.includes(keyword)
      )
    const matchType = !params.type || item.type === params.type
    const matchStatus = !hasSearchValue(params.status) || item.status === Number(params.status)
    const matchBot = !params.bot_user_name || item.bot_user_name === params.bot_user_name

    return matchKeyword && matchType && matchStatus && matchBot
  })
}

const fetchSampleList = async (params: QuickChargeSearchParams = {}) => {
  const { current_page: currentPage, page_size: pageSize } = createPageParams(params)
  const filteredList = filterSampleList(params)
  const start = (currentPage - 1) * pageSize
  const list = filteredList.slice(start, start + pageSize)

  handleListMessage(
    list,
    [params.keyword, params.type, params.status, params.bot_user_name].some(hasSearchValue),
    '速充订单'
  )
  return {
    list,
    total: filteredList.length
  }
}

const handleDetail = (row: QuickChargeOrder) => {
  orderDetailRef.value?.open(row)
}

const handleExport = async () => {
  await exportTableData<QuickChargeOrder, QuickChargeSearchParams>({
    searchTableRef,
    filename: '速充订单列表',
    fetchData: async (params) => ({
      data: { list: filterSampleList(params) }
    }),
    getList: (res) => res.data.list,
    mapItem: (item) => ({
      订单号: item.id,
      机器人用户名: item.bot_user_name,
      代理: item.agent_name,
      用户发送地址: item.send_address,
      接收地址: item.receive_address,
      类型: item.order_type_label,
      数量: item.amount,
      '单价（sun/天）': item.unit_price,
      开始时间: item.start_time,
      结束时间: item.end_time,
      总时长: item.duration,
      订单状态: getStatusLabel(QUICK_CHARGE_STATUS_MAP, item.status),
      备注: item.remark
    })
  })
}
</script>

<style scoped>
.app-container {
  padding: 0;
}
</style>
