<script setup lang="ts">
import { computed, h } from 'vue'
import { ElTag } from 'element-plus'
import { Descriptions } from '@/components/Descriptions'
import type { DescriptionsSchema } from '@/components/Descriptions'
import { Table } from '@/components/Table'
import type { TableColumn } from '@/components/Table'
import { EnergyOrderKind } from '@/utils/energyOrder'
import {
  formatEnergyAmount,
  getResourceTypeTagType,
  getResourceTypeText
} from '@/utils/energyOrder'
import { formatTableDateTime, type TableSlot } from '@/utils/tableHelpers'
import { renderSummaryCountText } from '@/operation/OperationCenter/utils/summaryText'
import { renderTronscanTransactionLink } from '@/operation/OperationCenter/utils/transactionLink'
import { useLocalPagination } from '@/operation/OperationCenter/utils/useLocalPagination'
import type {
  V2OrderDetailResponse,
  V2OrderResource
} from '@/api/opertion/OperationCenter/EnergyTransaction'

const props = withDefaults(defineProps<{ orderData: V2OrderDetailResponse | null }>(), {
  orderData: null
})

type ResourceTableSlot = TableSlot<V2OrderResource>
const isActivationOrder = computed(
  () => Number(props.orderData?.kind) === EnergyOrderKind.BATCH_ACTIVE
)
const isBatchOrder = computed(() => Number(props.orderData?.kind) === EnergyOrderKind.BATCH_ENERGY)

const summarySchema = computed((): DescriptionsSchema[] => {
  const baseSchema: DescriptionsSchema[] = [
    {
      field: 'summary.energy_count',
      label: '能量笔数',
      slots: {
        default: (data: V2OrderDetailResponse) =>
          renderSummaryCountText(data?.summary?.energy_count, '笔')
      }
    }
  ]

  if (props.orderData?.kind === 5) {
    baseSchema.push({
      field: 'summary.used_count',
      label: '已使用笔数',
      slots: {
        default: (data: V2OrderDetailResponse) =>
          renderSummaryCountText(data?.summary?.used_count, '笔')
      }
    })
  }

  return baseSchema
})

const typeColumn: TableColumn = {
  field: 'code',
  label: '类型',
  align: 'center',
  width: 100,
  slots: {
    default: ({ row }: ResourceTableSlot) => {
      const text = getResourceTypeText(row.code)
      const tagType = getResourceTypeTagType(row.code)
      return h(ElTag, { type: tagType, size: 'small' }, () => text)
    }
  }
}

const amountColumn: TableColumn = {
  field: 'amount',
  label: '数量',
  align: 'center',
  width: 120,
  formatter: (row: V2OrderResource) => formatEnergyAmount(row.amount, '0')
}

const targetColumn: TableColumn = {
  field: 'target',
  label: '接收地址',
  minWidth: 180,
  showOverflowTooltip: false
}

const baseColumns: TableColumn[] = [typeColumn, amountColumn, targetColumn]
const activationBaseColumns: TableColumn[] = [targetColumn, amountColumn]

const lifecycleColumns: TableColumn[] = [
  {
    field: 'delegated_txid',
    label: '发送hash',
    width: 120,
    align: 'center',
    slots: {
      default: ({ row }: ResourceTableSlot) => renderTronscanTransactionLink(row.delegated_txid)
    }
  },
  {
    field: 'recycled_txid',
    label: '回收hash',
    width: 120,
    align: 'center',
    slots: {
      default: ({ row }: ResourceTableSlot) => renderTronscanTransactionLink(row.recycled_txid)
    }
  },
  {
    field: 'delegated_at',
    label: '发放时间',
    width: 160,
    formatter: (row: V2OrderResource) => formatTableDateTime(row.delegated_at)
  },
  {
    field: 'recycled_at',
    label: '回收时间',
    width: 160,
    formatter: (row: V2OrderResource) => formatTableDateTime(row.recycled_at)
  }
]

const activationColumns: TableColumn[] = [
  {
    field: 'actived_txid',
    label: '激活hash',
    width: 120,
    align: 'center',
    slots: {
      default: ({ row }: ResourceTableSlot) => renderTronscanTransactionLink(row.actived_txid)
    }
  },
  {
    field: 'actived_at',
    label: '激活时间',
    width: 160,
    formatter: (row: V2OrderResource) => formatTableDateTime(row.actived_at)
  }
]

const resourceTableSchema = computed((): TableColumn[] => {
  if (isActivationOrder.value) {
    return [...activationBaseColumns, ...activationColumns]
  }

  if (isBatchOrder.value) {
    return [
      ...baseColumns,
      lifecycleColumns[0],
      lifecycleColumns[1],
      ...activationColumns,
      lifecycleColumns[2],
      lifecycleColumns[3]
    ]
  }

  return [...baseColumns, ...lifecycleColumns]
})

const fullResourceList = computed<V2OrderResource[]>(() => {
  return props.orderData?.resources || []
})

const {
  currentPage,
  pageSize,
  paginatedList: paginatedResourceList,
  totalCount,
  handlePageChange,
  handleSizeChange
} = useLocalPagination(fullResourceList)
</script>

<template>
  <div v-if="orderData">
    <Descriptions :schema="summarySchema" :data="orderData" :column="2" border />

    <div class="mt-20px">
      <Table
        :columns="resourceTableSchema"
        :data="paginatedResourceList"
        :border="true"
        :showOverflowTooltip="true"
        :pagination="{
          total: totalCount,
          currentPage: currentPage,
          pageSize: pageSize
        }"
        @update:current-page="handlePageChange"
        @update:page-size="handleSizeChange"
      />
    </div>
  </div>
  <div v-else>加载中...</div>
</template>
