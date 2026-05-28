<template>
  <div class="app-container">
    <ContentWrap>
      <SearchTable
        :columns="columns"
        :search-schema="searchSchema"
        :fetch-data-api="fetchResourceOrderList"
        :showAddButton="false"
        ref="searchTableRef"
        :search-props="{
          layout: 'inline',
          buttonPosition: 'center'
        }"
      >
        <template #searchButtons>
          <BaseButton type="primary" @click="handleExport">
            <Icon icon="ep:download" class="mr-5px" />
            导出订单
          </BaseButton>
        </template>
      </SearchTable>

      <!-- 结算记录弹窗 -->
      <SettlementRecordDialog ref="settlementRecordDialogRef" />
    </ContentWrap>
  </div>
</template>

<script setup lang="tsx">
import { ref, h, onMounted } from 'vue'
import { formatToDateTime } from '@/utils/dateUtil'
import { ElTag } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { SearchTable } from '@/components/SearchTable'
import { BaseButton } from '@/components/Button'
import { Icon } from '@/components/Icon'
import type { TableColumn } from '@/components/Table'
import { v2GetResourceOrderList } from '@/api/resource_order'
import type { V2ResourceOrderItem } from '@/api/resource_order/types'
import { getAgentBotListApi } from '@/api/agent/bot'
import { simpleExportToExcel } from '@/utils/excel'
import { handleErrorMessage, handleSuccessMessage, handleListMessage } from '@/utils/messageHelper'
import { getEnergyOrderKindText } from '@/utils/energyOrder'
import SettlementRecordDialog from './components/SettlementRecordDialog.vue'

const searchTableRef = ref<InstanceType<typeof SearchTable> | null>(null)
const settlementRecordDialogRef = ref<InstanceType<typeof SettlementRecordDialog> | null>(null)

// 订单状态映射
const ORDER_STATUS_MAP: Record<number, string> = {
  1: '新订单',
  2: '已支付',
  5: '已完成',
  8: '已取消'
}

// 状态标签类型
const getStatusType = (status: number): string => {
  const typeMap: Record<number, string> = {
    1: 'info',
    2: 'warning',
    5: 'success',
    8: 'danger'
  }
  return typeMap[status] || 'info'
}

// 表格列定义
const columns: TableColumn[] = [
  {
    field: 'id',
    label: '订单ID',
    width: 100
  },
  {
    field: 'agent_name',
    label: '代理名称',
    width: 120,
    formatter: (row: V2ResourceOrderItem) => row.agent_name || '-'
  },
  {
    field: 'bot_name',
    label: '机器人名称',
    width: 140,
    formatter: (row: V2ResourceOrderItem) => row.bot_name || '-'
  },
  {
    field: 'kind',
    label: '订单类型',
    minWidth: 120,
    formatter: (row: V2ResourceOrderItem) => {
      const kindMap: Record<number, string> = {
        6: '能量接收池子',
        7: '带宽接收池子'
      }
      return kindMap[row.kind] || row.kind
    }
  },
  {
    field: 'source',
    label: '用户发送地址',
    minWidth: 200,
    formatter: (row: V2ResourceOrderItem) => row.source || '-'
  },
  {
    field: 'target',
    label: '接收地址',
    minWidth: 200,
    formatter: (row: V2ResourceOrderItem) => row.target || '-'
  },
  {
    field: 'amount',
    label: '数量',
    width: 100,
    formatter: (row: V2ResourceOrderItem) => row.amount ?? '-'
  },
  {
    field: 'balance',
    label: '余额',
    width: 140,
    formatter: (row: V2ResourceOrderItem) => {
      if (!row.balance) return '-'
      return row.balance.toLocaleString()
    }
  },
  {
    field: 'profit_sum',
    label: '累计利润',
    width: 120,
    formatter: (row: V2ResourceOrderItem) => row.profit_sum || '-'
  },
  {
    field: 'status',
    label: '订单状态',
    width: 100,
    slots: {
      default: (data: any) => {
        const row = data.row || data
        return h(
          ElTag,
          { type: getStatusType(row.status) as any, size: 'small' },
          () => ORDER_STATUS_MAP[row.status] || '-'
        )
      }
    }
  },
  {
    field: 'describe',
    label: '备注',
    width: 120,
    formatter: (row: V2ResourceOrderItem) => row.describe || '-'
  },
  {
    field: 'created_at',
    label: '创建时间',
    sortable: 'custom',
    width: 180,
    slots: {
      default: (data: any) => {
        const row = data.row || data
        return h('span', row.created_at ? formatToDateTime(row.created_at * 1000) : '-')
      }
    }
  },
  {
    field: 'settled_at',
    label: '结束时间',
    sortable: 'custom',
    width: 180,
    slots: {
      default: (data: any) => {
        const row = data.row || data
        return h('span', row.settled_at ? formatToDateTime(row.settled_at * 1000) : '-')
      }
    }
  },
  {
    field: 'action',
    label: '操作',
    width: 150,
    fixed: 'right',
    slots: {
      default: (data: any) => {
        const row = data.row || data
        return h(
          BaseButton,
          {
            type: 'primary',
            onClick: () => handleViewSettlement(row)
          },
          () => '查看结算记录'
        )
      }
    }
  }
]

// 搜索表单配置
const searchSchema = ref([
  {
    field: 'keyword',
    component: 'Input' as const,
    label: {
      tips: '订单ID/代理名称/机器人名称/地址',
      text: '关键词'
    },
    componentProps: {
      placeholder: '请输入关键词',
      clearable: true
    }
  },
  {
    field: 'kind',
    component: 'Select' as const,
    label: '订单类型',
    componentProps: {
      placeholder: '全部',
      clearable: true,
      options: [
        { label: '全部', value: '' },
        { label: '能量接收池子', value: 6 },
        { label: '带宽接收池子', value: 7 }
      ]
    }
  },
  {
    field: 'status',
    component: 'Select' as const,
    label: '状态',
    componentProps: {
      placeholder: '全部',
      clearable: true,
      options: [
        { label: '全部', value: '' },
        { label: '新订单', value: 1 },
        { label: '已支付', value: 2 },
        { label: '已完成', value: 5 },
        { label: '已取消', value: 8 }
      ]
    }
  },
  {
    field: 'bot_id',
    component: 'Select' as const,
    label: '机器人',
    componentProps: {
      placeholder: '全部',
      clearable: true,
      filterable: true,
      options: [] as any[]
    }
  }
])

// 获取资源订单列表
const fetchResourceOrderList = async (params: any) => {
  try {
    const apiParams: any = {
      current_page: params.current_page || 1,
      page_size: params.page_size || 10
    }

    // 直接遍历所有搜索字段，有值就传
    if (params?.keyword) apiParams.keyword = params.keyword
    if (params?.kind !== undefined && params?.kind !== '' && params?.kind !== null)
      apiParams.kind = params.kind
    if (params?.status !== undefined && params?.status !== '' && params?.status !== null)
      apiParams.status = params.status
    if (params?.bot_id !== undefined && params?.bot_id !== '' && params?.bot_id !== null)
      apiParams.bot_id = params.bot_id
    if (params?.order) apiParams.order = params.order

    console.log('[fetchResourceOrderList] 原始params:', params, '实际apiParams:', apiParams)

    const res = await v2GetResourceOrderList(apiParams)

    if (res?.code === '000000' && res.data) {
      const list = res.data.list || []
      const total = res.data.pager?.total || 0

      handleListMessage(list, !!(params?.keyword || params?.kind || params?.status), '资源订单')

      return { list, total }
    }

    return { list: [], total: 0 }
  } catch (error) {
    handleErrorMessage(error, '获取资源订单列表失败')
    return { list: [], total: 0 }
  }
}

// 加载机器人列表
const loadBotList = async () => {
  try {
    const res = await getAgentBotListApi({ current_page: 1, page_size: 1000 })
    if (res.code === '000000' && res.data?.list) {
      const botOptions = [
        { label: '全部', value: '' },
        ...res.data.list.map((bot: any) => ({
          label: bot.user_name || bot.first_name || `机器人${bot.id}`,
          value: bot.id
        }))
      ]
      const botField = searchSchema.value.find((item) => item.field === 'bot_id')
      if (botField?.componentProps) {
        botField.componentProps.options = botOptions
      }
    }
  } catch (error) {
    console.error('加载机器人列表失败:', error)
  }
}

onMounted(() => {
  loadBotList()
})

// 查看结算记录
const handleViewSettlement = (row: any) => {
  settlementRecordDialogRef.value?.open(row)
}

// 导出订单
const handleExport = async () => {
  try {
    let params
    try {
      params = await searchTableRef.value?.searchMethods?.getFormData()
    } catch (e) {
      params = {}
    }

    const apiParams: any = { page_size: -1 }
    if (params?.keyword) apiParams.keyword = params.keyword
    if (params?.kind) apiParams.kind = params.kind
    if (params?.status) apiParams.status = params.status

    const res = await v2GetResourceOrderList(apiParams)

    if (res?.code === '000000' && res.data?.list) {
      const list = res.data.list.map((item: V2ResourceOrderItem) => ({
        订单ID: item.id,
        代理名称: item.agent_name || '-',
        机器人名称: item.bot_name || '-',
        订单类型: getEnergyOrderKindText(item.kind),
        来源地址: item.source || '-',
        目标地址: item.target || '-',
        接收地址: item.receiver || '-',
        数量: item.amount ?? '-',
        余额: item.balance ? item.balance.toLocaleString() : '-',
        累计利润: item.profit_sum || '-',
        订单状态: ORDER_STATUS_MAP[item.status] || '-',
        备注: item.describe || '-',
        支付时间: item.paid_at ? formatToDateTime(item.paid_at * 1000) : '-',
        结算时间: item.settled_at ? formatToDateTime(item.settled_at * 1000) : '-',
        创建时间: item.created_at ? formatToDateTime(item.created_at * 1000) : '-'
      }))

      simpleExportToExcel(list, '资源订单列表')
      handleSuccessMessage('订单导出成功')
    } else {
      handleErrorMessage('导出失败：数据格式错误')
    }
  } catch (error) {
    handleErrorMessage(error, '订单导出失败')
  }
}
</script>

<style scoped>
.app-container {
  padding: 0;
}
</style>
