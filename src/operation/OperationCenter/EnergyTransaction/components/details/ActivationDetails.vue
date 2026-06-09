<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { ElTag } from 'element-plus'
import { Descriptions } from '@/components/Descriptions'
import type { DescriptionsSchema } from '@/components/Descriptions'
import { Table } from '@/components/Table'
import type { TableColumn } from '@/components/Table'
import { formatTableDateTime, type TableSlot } from '@/utils/tableHelpers'
import { renderTronscanTransactionLink } from '@/operation/OperationCenter/utils/transactionLink'
import type {
  V2OrderActivation,
  V2OrderDetailResponse
} from '@/api/opertion/OperationCenter/EnergyTransaction'

const props = withDefaults(defineProps<{ orderData: V2OrderDetailResponse | null }>(), {
  orderData: null
})

type ActivationTableSlot = TableSlot<V2OrderActivation>

const currentPage = ref(1)
const pageSize = ref(10)

const summarySchema = computed((): DescriptionsSchema[] => [
  {
    field: 'summary.active_count',
    label: '激活数量',
    slots: {
      default: (data: V2OrderDetailResponse) => h('span', `${data?.summary?.active_count ?? 0} 个`)
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
      default: ({ row }: ActivationTableSlot) => {
        const hasActivated = row.actived_txid && row.actived_txid.trim() !== ''
        const text = hasActivated ? '已激活' : '待激活'
        const type = hasActivated ? 'success' : 'warning'
        return h(ElTag, { type, size: 'small' }, () => text)
      }
    }
  },
  {
    field: 'actived_txid',
    label: '交易hash',
    width: 200,
    align: 'center',
    slots: {
      default: ({ row }: ActivationTableSlot) => {
        return renderTronscanTransactionLink(row.actived_txid)
      }
    }
  },
  {
    field: 'actived_at',
    label: '激活时间',
    width: 220,
    formatter: (row: V2OrderActivation) => formatTableDateTime(row.actived_at)
  }
])

const fullActivationList = computed<V2OrderActivation[]>(() => {
  return props.orderData?.activations || []
})

const paginatedActivationList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return fullActivationList.value.slice(start, end)
})

const totalCount = computed(() => {
  return fullActivationList.value.length
})

const handlePageChange = (page: number) => {
  currentPage.value = page
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
}
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
