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
      >
        <template #searchButtons>
          <BaseButton type="primary" @click="handleExport">
            <Icon icon="ep:download" class="mr-5px" />
            导出
          </BaseButton>
        </template>
      </SearchTable>
    </ContentWrap>
  </div>
</template>

<script setup lang="tsx">
import { ref, h } from 'vue'
import { ElTag, ElLink } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { SearchTable } from '@/components/SearchTable'
import { BaseButton } from '@/components/Button'
import { Icon } from '@/components/Icon'
import type { TableColumn } from '@/components/Table'
import { formatToDateTime } from '@/utils/dateUtil'
import { getChargeLogList } from '@/api/charge'
import { handleErrorMessage, handleListMessage } from '@/utils/messageHelper'
import {
  createStatusOptions,
  exportTableData,
  getStatusLabel,
  getStatusTagType
} from '@/utils/tableHelpers'

const searchTableRef = ref()
const tronscanUrl = import.meta.env.VITE_TRONSCAN_URL || 'https://tronscan.org'

const CHARGE_LOG_STATUS_MAP = {
  1: { label: '成功', type: 'success' },
  2: { label: '失败', type: 'danger' }
} as const

const renderTxidLink = (txid?: string) => {
  if (!txid) return h('span', '-')
  return h(
    ElLink,
    {
      type: 'primary',
      href: `${tronscanUrl}/#/transaction/${txid}`,
      target: '_blank'
    },
    () => '查看'
  )
}

const getStatusText = (status?: number) => {
  return getStatusLabel(CHARGE_LOG_STATUS_MAP, status, '未知')
}

const buildChargeLogParams = (params: any = {}) => {
  const apiParams: any = {
    current_page: params.current_page || 1,
    page_size: params.page_size || 10
  }

  if (params?.keyword) apiParams.keyword = params.keyword
  if (params?.kind) apiParams.kind = params.kind
  if (params?.origin) apiParams.origin = params.origin
  if (params?.status) apiParams.status = Number(params.status)
  if (params?.order) apiParams.order = params.order

  // 时间范围（毫秒转秒）
  if (params?.dateRange && params.dateRange.length === 2) {
    apiParams.start_time = String(Math.floor(params.dateRange[0] / 1000))
    apiParams.end_time = String(Math.floor(params.dateRange[1] / 1000))
  }

  return apiParams
}

// 表格列
const columns: TableColumn[] = [
  { field: 'origin', label: '供给源', minWidth: 180, formatter: (row) => row.origin || '-' },
  {
    field: 'target_pool',
    label: '供给对象',
    minWidth: 200,
    formatter: (row) => row.target_pool || '-'
  },
  {
    field: 'finance_address',
    label: '财务地址',
    minWidth: 200,
    formatter: (row) => row.finance_address || '-'
  },
  {
    field: 'minimum',
    label: '阈值',
    width: 120,
    formatter: (row) => row.minimum ?? '-'
  },
  { field: 'amount', label: '补充数量', width: 120, formatter: (row) => row.amount ?? '-' },
  { field: 'fee', label: '手续费', width: 100, formatter: (row) => row.fee || '0' },
  {
    field: 'status',
    label: '状态',
    width: 100,
    slots: {
      default: (data: any) => {
        const row = data.row || data
        return h(
          ElTag,
          { type: getStatusTagType(CHARGE_LOG_STATUS_MAP, row.status), size: 'small' },
          () => getStatusText(row.status)
        )
      }
    }
  },
  {
    field: 'delegated_txid',
    label: '代理哈希',
    width: 100,
    slots: {
      default: (data: any) => {
        const row = data.row || data
        return renderTxidLink(row.delegated_txid)
      }
    }
  },
  {
    field: 'recycled_txid',
    label: '回收哈希',
    width: 100,
    slots: {
      default: (data: any) => {
        const row = data.row || data
        return renderTxidLink(row.recycled_txid)
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
    field: 'status',
    component: 'Select' as const,
    label: '状态',
    componentProps: {
      placeholder: '全部',
      clearable: true,
      options: createStatusOptions(CHARGE_LOG_STATUS_MAP)
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
    const res = await getChargeLogList(buildChargeLogParams(params))

    if (res?.code === '000000' && res.data) {
      const list = res.data.list || []
      const total = res.data.pager?.total || 0
      handleListMessage(
        list,
        !!(params?.keyword || params?.kind || params?.origin || params?.status),
        '资源补充订单'
      )
      return { list, total }
    }
    return { list: [], total: 0 }
  } catch (error) {
    handleErrorMessage(error, '获取资源补充订单列表失败')
    return { list: [], total: 0 }
  }
}

const handleExport = async () => {
  try {
    await exportTableData<any>({
      searchTableRef,
      filename: '资源补充记录',
      fetchData: (params) => getChargeLogList(params),
      buildParams: buildChargeLogParams,
      getList: (res) => res?.data?.list || [],
      mapItem: (item) => ({
        供给源: item.origin || '-',
        供给对象: item.target_pool || '-',
        财务地址: item.finance_address || '-',
        阈值: item.minimum ?? '-',
        补充数量: item.amount ?? '-',
        手续费: item.fee || '0',
        状态: getStatusText(item.status),
        代理哈希: item.delegated_txid || '-',
        回收哈希: item.recycled_txid || '-',
        描述: item.describe || '-',
        创建时间: item.created_at ? formatToDateTime(item.created_at * 1000) : '-'
      })
    })
  } catch (error) {
    handleErrorMessage(error, '导出失败')
  }
}
</script>

<style scoped>
.app-container {
  padding: 0;
}
</style>
