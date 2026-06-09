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
import type { FormSchema } from '@/components/Form'
import type { SearchTableExpose } from '@/components/SearchTable'
import { getChargeLogList } from '@/api/opertion/FinancialManage/common/charge'
import type {
  ChargeLogItem,
  ChargeLogParams,
  ChargeLogResponse
} from '@/api/opertion/FinancialManage/common/charge'
import { handleErrorMessage, handleListMessage } from '@/utils/messageHelper'
import {
  createStatusOptions,
  createDefaultDateTimeRange,
  dateRangeToSeconds,
  exportTableData,
  formatTableDateTime,
  getStatusLabel,
  getStatusTagType,
  hasSearchValue
} from '@/utils/tableHelpers'
import {
  RESOURCE_SUPPLEMENT_KIND_OPTIONS,
  RESOURCE_SUPPLEMENT_SOURCE_OPTIONS,
  RESOURCE_SUPPLEMENT_STATUS_MAP,
  withAllOption
} from '../constants'

type ChargeLogSearchParams = Omit<ChargeLogParams, 'status'> & {
  status?: number | string
  dateRange?: [number, number]
}

const searchTableRef = ref<SearchTableExpose>()
const tronscanUrl = import.meta.env.VITE_TRONSCAN_URL || 'https://tronscan.org'

const resourceSupplementKindSearchOptions = withAllOption(RESOURCE_SUPPLEMENT_KIND_OPTIONS)
const resourceSupplementSourceSearchOptions = withAllOption(RESOURCE_SUPPLEMENT_SOURCE_OPTIONS)

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

const buildChargeLogParams = (params: ChargeLogSearchParams = {}): ChargeLogParams => {
  const apiParams: ChargeLogParams = {
    current_page: params.current_page || 1,
    page_size: params.page_size || 10
  }

  if (params?.keyword) apiParams.keyword = params.keyword
  if (hasSearchValue(params?.kind)) apiParams.kind = params.kind
  if (hasSearchValue(params?.origin)) apiParams.origin = params.origin
  if (hasSearchValue(params?.status)) apiParams.status = Number(params.status)
  if (params?.order) apiParams.order = params.order

  Object.assign(apiParams, dateRangeToSeconds(params.dateRange))

  return apiParams
}

// 表格列
const columns: TableColumn[] = [
  {
    field: 'origin',
    label: '供给源',
    minWidth: 180,
    formatter: (row: ChargeLogItem) => row.origin || '-'
  },
  {
    field: 'target_pool',
    label: '供给对象',
    minWidth: 200,
    formatter: (row: ChargeLogItem) => row.target_pool || '-'
  },
  {
    field: 'finance_address',
    label: '财务地址',
    minWidth: 200,
    formatter: (row: ChargeLogItem) => row.finance_address || '-'
  },
  {
    field: 'minimum',
    label: '阈值',
    width: 120,
    formatter: (row: ChargeLogItem) => row.minimum ?? '-'
  },
  {
    field: 'amount',
    label: '补充数量',
    width: 120,
    formatter: (row: ChargeLogItem) => row.amount ?? '-'
  },
  { field: 'fee', label: '手续费', width: 100, formatter: (row: ChargeLogItem) => row.fee || '0' },
  {
    field: 'status',
    label: '状态',
    width: 100,
    slots: {
      default: ({ row }: { row: ChargeLogItem }) => {
        return h(
          ElTag,
          { type: getStatusTagType(RESOURCE_SUPPLEMENT_STATUS_MAP, row.status), size: 'small' },
          () => getStatusLabel(RESOURCE_SUPPLEMENT_STATUS_MAP, row.status, '未知')
        )
      }
    }
  },
  {
    field: 'delegated_txid',
    label: '代理哈希',
    width: 100,
    slots: {
      default: ({ row }: { row: ChargeLogItem }) => {
        return renderTxidLink(row.delegated_txid)
      }
    }
  },
  {
    field: 'recycled_txid',
    label: '回收哈希',
    width: 100,
    slots: {
      default: ({ row }: { row: ChargeLogItem }) => {
        return renderTxidLink(row.recycled_txid)
      }
    }
  },
  {
    field: 'describe',
    label: '描述',
    minWidth: 150,
    formatter: (row: ChargeLogItem) => row.describe || '-'
  },
  {
    field: 'created_at',
    label: '创建时间',
    sortable: 'custom',
    width: 180,
    slots: {
      default: ({ row }: { row: ChargeLogItem }) => {
        return h('span', formatTableDateTime(row.created_at))
      }
    }
  }
]

// 搜索条件
const searchSchema = ref<FormSchema[]>([
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
      options: resourceSupplementKindSearchOptions
    }
  },
  {
    field: 'origin',
    component: 'Select' as const,
    label: '供给源',
    componentProps: {
      placeholder: '全部',
      clearable: true,
      options: resourceSupplementSourceSearchOptions
    }
  },
  {
    field: 'status',
    component: 'Select' as const,
    label: '状态',
    componentProps: {
      placeholder: '全部',
      clearable: true,
      options: createStatusOptions(RESOURCE_SUPPLEMENT_STATUS_MAP)
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
      defaultTime: createDefaultDateTimeRange()
    }
  }
])

// 获取列表
const fetchChargeLogListApi = async (params: ChargeLogSearchParams = {}) => {
  try {
    const res = await getChargeLogList(buildChargeLogParams(params))

    if (res?.code === '000000' && res.data) {
      const list = res.data.list || []
      const total = res.data.pager?.total || 0
      handleListMessage(
        list,
        [params?.keyword, params?.kind, params?.origin, params?.status, params?.dateRange].some(
          hasSearchValue
        ),
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
    await exportTableData<ChargeLogItem, ChargeLogSearchParams, ChargeLogParams>({
      searchTableRef,
      filename: '资源补充记录',
      fetchData: getChargeLogList,
      buildParams: buildChargeLogParams,
      getList: (res: IResponse<ChargeLogResponse>) => res?.data?.list || [],
      mapItem: (item) => ({
        供给源: item.origin || '-',
        供给对象: item.target_pool || '-',
        财务地址: item.finance_address || '-',
        阈值: item.minimum ?? '-',
        补充数量: item.amount ?? '-',
        手续费: item.fee || '0',
        状态: getStatusLabel(RESOURCE_SUPPLEMENT_STATUS_MAP, item.status, '未知'),
        代理哈希: item.delegated_txid || '-',
        回收哈希: item.recycled_txid || '-',
        描述: item.describe || '-',
        创建时间: formatTableDateTime(item.created_at)
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
