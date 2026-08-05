<template>
  <div class="app-container">
    <ContentWrap>
      <SearchTable
        :columns="columns"
        :search-schema="searchSchema"
        :fetch-data-api="getResourceDetailData"
        :show-add-button="false"
        :table-props="{ rowKey: 'id' }"
      />
    </ContentWrap>
  </div>
</template>

<script setup lang="tsx">
import { h, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { BaseButton } from '@/components/Button'
import { ContentWrap } from '@/components/ContentWrap'
import type { FormSchema } from '@/components/Form'
import { SearchTable } from '@/components/SearchTable'
import type { TableColumn } from '@/components/Table'
import {
  v2GetResourceDetailList,
  type V2ResourceDetailItem,
  type V2ResourceDetailListParams
} from '@/api/opertion/Marketing/ResourceDetail'
import { handleErrorMessage, handleListMessage } from '@/utils/messageHelper'
import {
  buildBackendOrder,
  createPageParams,
  formatTableDateTime,
  hasSearchValue
} from '@/utils/tableHelpers'

const DEFAULT_CREATED_AT_ORDER = 'created_at DESC'

type ResourceDetailSearchParams = Omit<V2ResourceDetailListParams, 'status'> & {
  status?: number | string
}

const RESOURCE_TYPE_MAP: Record<number, string> = {
  0: '带宽',
  1: '能量'
}

const RESOURCE_STATUS_OPTIONS = [
  { label: '待回收', value: 1 },
  { label: '已回收', value: 2 }
]

const formatResourceType = (code: number) => RESOURCE_TYPE_MAP[code] || `类型 ${code}`

const router = useRouter()

const handleGoEnergyOrder = (orderId: string) => {
  if (!orderId) return

  router.push({
    name: 'EnergyTransactionList',
    query: { keyword: orderId }
  })
}

const columns = ref<TableColumn[]>([
  {
    field: 'order_id',
    label: '订单号',
    minWidth: '180px',
    slots: {
      default: ({ row }: { row: V2ResourceDetailItem }) =>
        row.order_id
          ? h(
              BaseButton,
              {
                type: 'primary',
                link: true,
                onClick: () => handleGoEnergyOrder(row.order_id)
              },
              () => row.order_id
            )
          : '-'
    }
  },
  {
    field: 'agent_name',
    label: '代理名称',
    width: '140px',
    formatter: (row: V2ResourceDetailItem) => row.agent_name || '-'
  },
  {
    field: 'bot_name',
    label: '机器人名称',
    width: '140px',
    formatter: (row: V2ResourceDetailItem) => row.bot_name || '-'
  },
  {
    field: 'code',
    label: '资源类型',
    width: '120px',
    formatter: (row: V2ResourceDetailItem) => formatResourceType(row.code)
  },
  {
    field: 'amount',
    label: '资源数量',
    width: '120px',
    formatter: (row: V2ResourceDetailItem) => row.amount ?? '-'
  },
  {
    field: 'source',
    label: '发放账户',
    minWidth: '180px',
    formatter: (row: V2ResourceDetailItem) => row.source || '-'
  },
  {
    field: 'target',
    label: '接收地址',
    minWidth: '180px',
    formatter: (row: V2ResourceDetailItem) => row.target || '-'
  },
  {
    field: 'status',
    label: '回收状态',
    width: '100px',
    formatter: (row: V2ResourceDetailItem) => (row.recycled_at ? '已回收' : '待回收')
  },
  {
    field: 'created_at',
    label: '创建时间',
    width: '180px',
    sortable: 'custom',
    formatter: (row: V2ResourceDetailItem) => formatTableDateTime(row.created_at)
  },
  {
    field: 'delegated_at',
    label: '发放时间',
    width: '180px',
    formatter: (row: V2ResourceDetailItem) => formatTableDateTime(row.delegated_at)
  },
  {
    field: 'expirated_at',
    label: '到期时间',
    width: '180px',
    sortable: 'custom',
    formatter: (row: V2ResourceDetailItem) => formatTableDateTime(row.expirated_at)
  },
  {
    field: 'recycled_at',
    label: '回收时间',
    width: '180px',
    formatter: (row: V2ResourceDetailItem) => formatTableDateTime(row.recycled_at)
  }
])

const searchSchema = reactive<FormSchema[]>([
  {
    field: 'order_id',
    component: 'Input',
    label: '订单号：',
    componentProps: {
      placeholder: '请输入订单号',
      clearable: true
    }
  },
  {
    field: 'source',
    component: 'Input',
    label: '发放账户：',
    componentProps: {
      placeholder: '请输入发放账户',
      clearable: true
    }
  },
  {
    field: 'target',
    component: 'Input',
    label: '接收地址：',
    componentProps: {
      placeholder: '请输入接收地址',
      clearable: true
    }
  },
  {
    field: 'status',
    component: 'Select',
    label: '回收状态：',
    componentProps: {
      placeholder: '请选择回收状态',
      clearable: true,
      options: RESOURCE_STATUS_OPTIONS
    }
  }
])

const getResourceDetailData = async (params: ResourceDetailSearchParams = {}) => {
  try {
    const apiParams: V2ResourceDetailListParams = {
      ...createPageParams(params),
      order: buildBackendOrder(params.order) || DEFAULT_CREATED_AT_ORDER
    }

    if (params.order_id) apiParams.order_id = params.order_id
    if (params.source) apiParams.source = params.source
    if (params.target) apiParams.target = params.target
    if (hasSearchValue(params.status)) apiParams.status = Number(params.status) as 1 | 2

    const response = await v2GetResourceDetailList(apiParams)
    const list = response?.data?.list || []
    const total = response?.data?.pager?.total || 0
    const hasSearchCondition =
      hasSearchValue(params.order_id) ||
      hasSearchValue(params.source) ||
      hasSearchValue(params.target) ||
      hasSearchValue(params.status)

    handleListMessage(list, hasSearchCondition, '资源详情')
    return { list, total }
  } catch (error) {
    handleErrorMessage(error, '获取资源详情列表失败')
    return { list: [], total: 0 }
  }
}
</script>
