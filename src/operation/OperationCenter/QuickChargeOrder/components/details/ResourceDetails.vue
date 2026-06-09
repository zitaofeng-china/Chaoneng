<script setup lang="ts">
import { computed, h } from 'vue'
import { ElTag } from 'element-plus'
import { Descriptions } from '@/components/Descriptions'
import type { DescriptionsSchema } from '@/components/Descriptions'
import { Table } from '@/components/Table'
import type { TableColumn } from '@/components/Table'
import {
  formatEnergyAmount,
  getResourceTypeTagType,
  getResourceTypeText
} from '@/utils/energyOrder'
import { formatTableDateTime, type TableSlot } from '@/utils/tableHelpers'
import { renderSummaryCountText } from '@/operation/OperationCenter/utils/summaryText'
import { renderTronscanTransactionLink } from '@/operation/OperationCenter/utils/transactionLink'
import { useLocalPagination } from '@/operation/OperationCenter/utils/useLocalPagination'
import type { QuickChargeOrderDetail, QuickChargeResource } from '../../types'

const props = withDefaults(defineProps<{ orderData: QuickChargeOrderDetail | null }>(), {
  orderData: null
})

type ResourceTableSlot = TableSlot<QuickChargeResource>

const summarySchema = computed((): DescriptionsSchema[] => {
  const baseSchema: DescriptionsSchema[] = [
    {
      field: 'summary.energy_count',
      label: '能量笔数',
      slots: {
        default: (data: QuickChargeOrderDetail) =>
          renderSummaryCountText(data?.summary?.energy_count, '笔')
      }
    }
  ]

  if (props.orderData?.kind === 5) {
    baseSchema.push({
      field: 'summary.used_count',
      label: '已使用笔数',
      slots: {
        default: (data: QuickChargeOrderDetail) =>
          renderSummaryCountText(data?.summary?.used_count, '笔')
      }
    })
  }

  return baseSchema
})

const resourceTableSchema = computed((): TableColumn[] => [
  {
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
  },
  {
    field: 'amount',
    label: '数量',
    align: 'center',
    width: 120,
    formatter: (row: QuickChargeResource) => formatEnergyAmount(row.amount, '0')
  },
  {
    field: 'target',
    label: '接收地址',
    minWidth: 180,
    showOverflowTooltip: false
  },
  {
    field: 'delegated_txid',
    label: '发送hash',
    width: 120,
    align: 'center',
    slots: {
      default: ({ row }: ResourceTableSlot) => {
        return renderTronscanTransactionLink(row.delegated_txid)
      }
    }
  },
  {
    field: 'recycled_txid',
    label: '回收hash',
    width: 120,
    align: 'center',
    slots: {
      default: ({ row }: ResourceTableSlot) => {
        return renderTronscanTransactionLink(row.recycled_txid)
      }
    }
  },
  {
    field: 'delegated_at',
    label: '发放时间',
    width: 160,
    formatter: (row: QuickChargeResource) => formatTableDateTime(row.delegated_at)
  },
  {
    field: 'recycled_at',
    label: '回收时间',
    width: 160,
    formatter: (row: QuickChargeResource) => formatTableDateTime(row.recycled_at)
  }
])

const fullResourceList = computed<QuickChargeResource[]>(() => {
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
