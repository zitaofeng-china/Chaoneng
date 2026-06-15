<script setup lang="ts">
import { computed } from 'vue'
import { Descriptions } from '@/components/Descriptions'
import type { DescriptionsSchema } from '@/components/Descriptions'
import { Table } from '@/components/Table'
import type { TableColumn } from '@/components/Table'
import { formatTableDateTime, type TableSlot } from '@/utils/tableHelpers'
import {
  renderActivationStatusTag,
  renderSummaryCountText,
  renderTronscanTransactionLink,
  useLocalPagination
} from '../../helpers'
import type { QuickChargeActivation, QuickChargeOrderDetail } from '../../types'

const props = withDefaults(defineProps<{ orderData: QuickChargeOrderDetail | null }>(), {
  orderData: null
})

type ActivationTableSlot = TableSlot<QuickChargeActivation>

const summarySchema = computed((): DescriptionsSchema[] => [
  {
    field: 'summary.active_count',
    label: '激活数量',
    slots: {
      default: (data: QuickChargeOrderDetail) =>
        renderSummaryCountText(data?.summary?.active_count, '个')
    }
  }
])

const activationTableSchema = computed((): TableColumn[] => [
  {
    field: 'target',
    label: '地址',
    minWidth: 180,
    showOverflowTooltip: false
  },
  {
    field: 'actived_txid',
    label: '状态',
    align: 'center',
    width: 100,
    slots: {
      default: ({ row }: ActivationTableSlot) => renderActivationStatusTag(row.actived_txid)
    }
  },
  {
    field: 'actived_txid',
    label: '交易hash',
    width: 200,
    align: 'center',
    slots: {
      default: ({ row }: ActivationTableSlot) => renderTronscanTransactionLink(row.actived_txid)
    }
  },
  {
    field: 'actived_at',
    label: '激活时间',
    width: 220,
    formatter: (row: QuickChargeActivation) => formatTableDateTime(row.actived_at)
  }
])

const fullActivationList = computed<QuickChargeActivation[]>(() => {
  return props.orderData?.activations || []
})

const {
  currentPage,
  pageSize,
  paginatedList: paginatedActivationList,
  totalCount,
  handlePageChange,
  handleSizeChange
} = useLocalPagination(fullActivationList)
</script>

<template>
  <div v-if="orderData">
    <Descriptions :schema="summarySchema" :data="orderData" :column="2" border />

    <div class="mt-20px">
      <Table
        :columns="activationTableSchema"
        :data="paginatedActivationList"
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
