<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { ElTag, ElTooltip } from 'element-plus'
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
import { getTronscanTransactionUrl } from '@/utils/tronscan'
import type { QuickChargeOrderDetail, QuickChargeResource } from '../../types'

const props = withDefaults(defineProps<{ orderData: QuickChargeOrderDetail | null }>(), {
  orderData: null
})

type ResourceTableSlot = TableSlot<QuickChargeResource>

const currentPage = ref(1)
const pageSize = ref(10)

const summarySchema = computed((): DescriptionsSchema[] => {
  const baseSchema: DescriptionsSchema[] = [
    {
      field: 'summary.energy_count',
      label: '能量笔数',
      slots: {
        default: (data: QuickChargeOrderDetail) =>
          h('span', `${data?.summary?.energy_count ?? 0} 笔`)
      }
    }
  ]

  if (props.orderData?.kind === 5) {
    baseSchema.push({
      field: 'summary.used_count',
      label: '已使用笔数',
      slots: {
        default: (data: QuickChargeOrderDetail) => h('span', `${data?.summary?.used_count ?? 0} 笔`)
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
        if (!row.delegated_txid) return h('span', '-')
        return h(
          ElTooltip,
          {
            content: row.delegated_txid,
            placement: 'top'
          },
          {
            default: () =>
              h(
                'a',
                {
                  href: getTronscanTransactionUrl(row.delegated_txid),
                  target: '_blank',
                  style: 'color: #409eff; cursor: pointer; text-decoration: none;'
                },
                '点击跳转'
              )
          }
        )
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
        if (!row.recycled_txid) return h('span', '-')
        return h(
          ElTooltip,
          {
            content: row.recycled_txid,
            placement: 'top'
          },
          {
            default: () =>
              h(
                'a',
                {
                  href: getTronscanTransactionUrl(row.recycled_txid),
                  target: '_blank',
                  style: 'color: #409eff; cursor: pointer; text-decoration: none;'
                },
                '点击跳转'
              )
          }
        )
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

const paginatedResourceList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return fullResourceList.value.slice(start, end)
})

const totalCount = computed(() => {
  return fullResourceList.value.length
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
