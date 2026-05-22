<template>
  <div class="app-container">
    <ContentWrap>
      <SearchTable
        ref="searchTableRef"
        :columns="columns"
        :search-schema="searchSchema"
        :fetch-data-api="fetchChargeLogListApi"
        :showAddButton="false"
        :search-props="{
          layout: 'inline',
          buttonPosition: 'center'
        }"
      />
    </ContentWrap>
  </div>
</template>

<script setup lang="tsx">
import { ref, h } from 'vue'
import { ElTag, ElLink } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { SearchTable } from '@/components/SearchTable'
import type { TableColumn } from '@/components/Table'
import { formatToDateTime } from '@/utils/dateUtil'
import { getChargeLogList } from '@/api/charge'
import { handleErrorMessage, handleListMessage } from '@/utils/messageHelper'

const searchTableRef = ref()
const tronscanUrl = import.meta.env.VITE_TRONSCAN_URL || 'https://tronscan.org'

// 表格列
const columns: TableColumn[] = [
  { field: 'origin', label: '供给源', minWidth: 180, formatter: (row) => row.origin || '-' },
  { field: 'target', label: '供给对象', minWidth: 200, formatter: (row) => row.target || '-' },
  { field: 'vault', label: '财务地址', minWidth: 200, formatter: (row) => row.vault || '-' },
  { field: 'amount', label: '补充数量', width: 120, formatter: (row) => row.amount ?? '-' },
  {
    field: 'balance',
    label: '余额',
    width: 140,
    formatter: (row) => (row.balance ? row.balance.toLocaleString() : '-')
  },
  { field: 'fee', label: '手续费', width: 100, formatter: (row) => row.fee || '0' },
  {
    field: 'status',
    label: '状态',
    width: 100,
    slots: {
      default: (data: any) => {
        const row = data.row || data
        const statusMap: Record<number, { text: string; type: string }> = {
          1: { text: '成功', type: 'success' },
          2: { text: '失败', type: 'danger' }
        }
        const info = statusMap[row.status] || { text: '未知', type: 'info' }
        return h(ElTag, { type: info.type as any, size: 'small' }, () => info.text)
      }
    }
  },
  {
    field: 'delegated_txid',
    label: '交易哈希',
    width: 100,
    slots: {
      default: (data: any) => {
        const row = data.row || data
        if (!row.delegated_txid) return h('span', '-')
        return h(
          ElLink,
          {
            type: 'primary',
            href: `${tronscanUrl}/#/transaction/${row.delegated_txid}`,
            target: '_blank'
          },
          () => '查看'
        )
      }
    }
  },
  { field: 'describe', label: '描述', minWidth: 150, formatter: (row) => row.describe || '-' },
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
  }
]

// 搜索条件
const searchSchema = ref([
  {
    field: 'keyword',
    component: 'Input' as const,
    label: '关键字',
    componentProps: {
      placeholder: '请输入关键字',
      clearable: true
    }
  },
  {
    field: 'kind',
    component: 'Select' as const,
    label: '资源类型',
    componentProps: {
      placeholder: '全部',
      clearable: true,
      options: [
        { label: '全部', value: '' },
        { label: '能量', value: '能量' },
        { label: '带宽', value: '带宽' }
      ]
    }
  },
  {
    field: 'origin',
    component: 'Select' as const,
    label: '供给源',
    componentProps: {
      placeholder: '全部',
      clearable: true,
      options: [
        { label: '全部', value: '' },
        { label: '能量收购池 能量', value: '能量收购池 能量' },
        { label: '带宽收购池 带宽', value: '带宽收购池 带宽' },
        { label: 'https://justlend.org 能量', value: 'https://justlend.org 能量' },
        { label: 'https://feee.io 带宽', value: 'https://feee.io 带宽' },
        { label: 'https://trxfee.io 带宽', value: 'https://trxfee.io 带宽' }
      ]
    }
  },
  {
    field: 'dateRange',
    component: 'DatePicker' as const,
    label: '创建时间',
    componentProps: {
      type: 'datetimerange',
      valueFormat: 'x',
      startPlaceholder: '开始时间',
      endPlaceholder: '结束时间',
      defaultTime: [new Date(2000, 1, 1, 0, 0, 0), new Date(2000, 1, 1, 23, 59, 59)]
    }
  }
])

// 获取列表
const fetchChargeLogListApi = async (params: any) => {
  try {
    const apiParams: any = {
      current_page: params.current_page || 1,
      page_size: params.page_size || 10
    }

    if (params?.keyword) apiParams.keyword = params.keyword
    if (params?.kind) apiParams.kind = params.kind
    if (params?.origin) apiParams.origin = params.origin
    if (params?.order) apiParams.order = params.order

    // 时间范围（毫秒转秒）
    if (params?.dateRange && params.dateRange.length === 2) {
      apiParams.start_time = String(Math.floor(params.dateRange[0] / 1000))
      apiParams.end_time = String(Math.floor(params.dateRange[1] / 1000))
    }

    const res = await getChargeLogList(apiParams)

    if (res?.code === '000000' && res.data) {
      const list = res.data.list || []
      const total = res.data.pager?.total || 0
      handleListMessage(list, !!(params?.keyword || params?.kind), '资源补充订单')
      return { list, total }
    }
    return { list: [], total: 0 }
  } catch (error) {
    handleErrorMessage(error, '获取资源补充订单列表失败')
    return { list: [], total: 0 }
  }
}
</script>

<style scoped>
.app-container {
  padding: 20px;
}
</style>
