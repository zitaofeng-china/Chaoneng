<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { ElTag, ElTooltip } from 'element-plus'
import { Descriptions } from '@/components/Descriptions'
import type { DescriptionsSchema } from '@/components/Descriptions'
import { Table } from '@/components/Table'
import type { TableColumn } from '@/components/Table'
import { formatTableDateTime } from '@/utils/tableHelpers'
import {
  EnergyOrderKind,
  formatEnergyAmount,
  getResourceTypeTagType,
  getResourceTypeText
} from '@/utils/energyOrder'

const props = defineProps({
  orderData: {
    type: Object as () => any | null,
    default: () => null
  }
})

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)

const isActivationOrder = computed(
  () => Number(props.orderData?.kind) === EnergyOrderKind.BATCH_ACTIVE
)
const isBatchOrder = computed(() => Number(props.orderData?.kind) === EnergyOrderKind.BATCH_ENERGY)

// 汇总信息 schema
const summarySchema = computed((): DescriptionsSchema[] => {
  if (isActivationOrder.value) {
    return []
  }

  const baseSchema: DescriptionsSchema[] = [
    {
      field: 'summary.energy_count',
      label: '能量笔数',
      slots: {
        default: (data) => h('span', `${data?.summary?.energy_count ?? 0} 笔`)
      }
    }
  ]

  // 只有 kind 为 5（按笔数能量）时才显示"已使用笔数"
  if (props.orderData?.kind === 5) {
    baseSchema.push({
      field: 'summary.used_count',
      label: '已使用笔数',
      slots: {
        default: (data) => h('span', `${data?.summary?.used_count ?? 0} 笔`)
      }
    })
  }

  return baseSchema
})

const renderTronscanLink = (txid?: string | number | null) => {
  const normalizedTxid = String(txid ?? '').trim()
  if (!normalizedTxid) return h('span', '-')

  return h(
    ElTooltip,
    {
      content: normalizedTxid,
      placement: 'top'
    },
    {
      default: () =>
        h(
          'a',
          {
            href: `${import.meta.env.VITE_TRONSCAN_URL}/#/transaction/${normalizedTxid}`,
            target: '_blank',
            style: 'color: #409eff; cursor: pointer; text-decoration: none;'
          },
          '点击跳转'
        )
    }
  )
}

const typeColumn: TableColumn = {
  field: 'code',
  label: '类型',
  align: 'center',
  width: 100,
  slots: {
    default: ({ row }) => {
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
  formatter: (row) => formatEnergyAmount(row.amount, '0')
}

const targetColumn: TableColumn = {
  field: 'target',
  label: '接收地址',
  minWidth: 180,
  showOverflowTooltip: false
}

const lifecycleColumns: TableColumn[] = [
  {
    field: 'delegated_txid',
    label: '发送hash',
    width: 120,
    align: 'center',
    slots: {
      default: ({ row }) => renderTronscanLink(row.delegated_txid)
    }
  },
  {
    field: 'recycled_txid',
    label: '回收hash',
    width: 120,
    align: 'center',
    slots: {
      default: ({ row }) => renderTronscanLink(row.recycled_txid)
    }
  },
  {
    field: 'delegated_at',
    label: '发放时间',
    width: 160,
    formatter: (row) => formatTableDateTime(row.delegated_at)
  },
  {
    field: 'recycled_at',
    label: '回收时间',
    width: 160,
    formatter: (row) => formatTableDateTime(row.recycled_at)
  }
]

const activationColumns: TableColumn[] = [
  {
    field: 'actived_txid',
    label: '激活hash',
    width: 120,
    align: 'center',
    slots: {
      default: ({ row }) => renderTronscanLink(row.actived_txid)
    }
  },
  {
    field: 'actived_at',
    label: '激活时间',
    width: 160,
    formatter: (row) => formatTableDateTime(row.actived_at)
  }
]

const baseColumns: TableColumn[] = [typeColumn, amountColumn, targetColumn]
const activationBaseColumns: TableColumn[] = [targetColumn]

// 代理端批量下单和激活订单的资源详情列与运营端保持一致
const resourceTableSchema = computed((): TableColumn[] => {
  if (isActivationOrder.value) {
    return [...activationBaseColumns, ...activationColumns]
  }

  if (isBatchOrder.value) {
    return [
      ...baseColumns,
      lifecycleColumns[0],
      lifecycleColumns[1],
      activationColumns[0],
      lifecycleColumns[2],
      lifecycleColumns[3],
      activationColumns[1]
    ]
  }

  return [...baseColumns, ...lifecycleColumns]
})

// 获取资源列表数据（完整列表）
const fullResourceList = computed(() => {
  return props.orderData?.resources || []
})

// 获取当前页的资源列表数据
const paginatedResourceList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return fullResourceList.value.slice(start, end)
})

// 总数
const totalCount = computed(() => {
  return fullResourceList.value.length
})

// 分页处理
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
    <!-- 汇总信息 -->
    <Descriptions
      v-if="summarySchema.length > 0"
      :schema="summarySchema"
      :data="orderData"
      :column="2"
      border
    />

    <!-- 资源列表 -->
    <div :class="{ 'mt-20px': summarySchema.length > 0 }">
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

<style scoped>
/* Add component-specific styles if needed */
</style>
