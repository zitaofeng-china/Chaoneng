<script setup lang="tsx">
import { ref, computed, watch, h, onMounted } from 'vue'
import { ElTag, ElLink, ElButton, ElTable, ElTableColumn } from 'element-plus'
import { Dialog } from '@/components/Dialog'
import { Descriptions } from '@/components/Descriptions'
import type { DescriptionsSchema } from '@/components/Descriptions'
import { Table } from '@/components/Table'
import type { TableColumn } from '@/components/Table'
import { formatToDateTime } from '@/utils/dateUtil'
import { getBatchActiveDetailApi } from '@/api/energy_order' // Keep API import
import isEmpty from 'lodash-es/isEmpty'
import formatEnergyNum from '../../../helpers/formatEnergyNum'
const props = defineProps({
  orderData: {
    type: Object,
    default: () => ({})
  },
  orderId: {
    type: [String, Number],
    required: true
  }
})

// --- 批量下单详情 (Type 3) 状态 ---
const batchOrderDetails = ref<any[]>([]) // 存储批量下单详情列表
const batchOrderLoading = ref(false) // 控制批量下单详情表格加载状态
const batchOrderCurrentPage = ref(1) // 批量下单详情 - 当前页码
const batchOrderPageSize = ref(10) // 批量下单详情 - 每页条数
const batchOrderTotal = ref(0) // 批量下单详情 - 总条数
const batchOrderTransactionDialogVisible = ref(false) // 批量下单交易详情弹窗
const selectedBatchOrderTransaction = ref<any>(null) // 选中的批量下单交易

const getOrderStatusText = (status: number): string => {
  const statusMap: Record<number, string> = {
    1: '已完成',
    2: '已支付',
    3: '支付失败'
  }
  return statusMap[status] || '-'
}
// --- Helper Functions --- Shared or move to utils
const getBatchStatusText = (status: number): string => {
  const statusMap: Record<number, string> = {
    1: '已激活', // Assuming 1 means activated
    2: '未激活' // Assuming 0 means not activated
    // Add other potential statuses based on API response
  }
  return statusMap[status] ?? '未知'
}

const getBatchStatusTagType = (status: number): 'success' | 'warning' | 'info' | 'danger' => {
  const typeMap: Record<number, 'success' | 'warning' | 'info' | 'danger'> = {
    1: 'success', // 已激活
    2: 'warning' // 未激活
  }
  return typeMap[status] ?? 'info'
}

// --- 获取批量下单详情 (Type 3) 的函数 ---
const fetchBatchOrderDetails = async () => {
  if (!props.orderId) {
    batchOrderDetails.value = []
    batchOrderTotal.value = 0
    return
  }

  batchOrderLoading.value = true
  batchOrderDetails.value = []
  try {
    const params = {
      current_page: batchOrderCurrentPage.value,
      page_size: batchOrderPageSize.value
    }
    // TODO: 确认 getBatchActiveDetailApi 是否适用于 Type 3 或是否有专用 API
    // Assuming getBatchActiveDetailApi can be used for type 3 for now. Adjust if needed.
    const response = await getBatchActiveDetailApi(props.orderId, params) // Pass params
    batchOrderDetails.value = response?.data?.list || []
    if (!Array.isArray(batchOrderDetails.value)) {
      console.warn('批量下单详情API (Type 3) 未返回预期的数组格式', response)
      batchOrderDetails.value = []
    }
    batchOrderTotal.value = response?.data?.totalCount || 0
  } catch (error) {
    console.error('获取批量下单详情 (Type 3) 失败:', error)
    batchOrderDetails.value = []
    batchOrderTotal.value = 0
  } finally {
    batchOrderLoading.value = false
  }
}

// --- 批量下单详情 (Type 3) 分页处理函数 ---
const handleBatchOrderPageChange = (newPage: number) => {
  batchOrderCurrentPage.value = newPage
  fetchBatchOrderDetails()
}

const handleBatchOrderSizeChange = (newSize: number) => {
  batchOrderPageSize.value = newSize
  batchOrderCurrentPage.value = 1
  fetchBatchOrderDetails()
}

// --- 批量下单详情 (Type 3) 查看交易详情 ---
const handleViewBatchOrderTransaction = (row: any) => {
  // Assuming the row data structure is suitable for the transaction dialog
  // Or you might need to fetch more details based on the row ID
  selectedBatchOrderTransaction.value = row
  batchOrderTransactionDialogVisible.value = true
}

// --- 批量下单详情 (Type 3) 表格列定义 ---
const batchOrderTableColumns = ref<TableColumn[]>([
  { type: 'index', label: '序号', width: 60, align: 'center', field: 'index' },
  {
    prop: 'to_address',
    field: 'to_address',
    label: '地址',
    minWidth: 400,
    slots: {
      default: ({ row }) => {
        return (
          <span class="flex items-center justify-between">
            <span>{row.to_address}</span>
            <ElTag type={getBatchStatusTagType(row.active_status)} size="small">
              {getBatchStatusText(row.active_status)}
            </ElTag>
          </span>
        )
      }
    }
  }, // Assuming field name is 'to_address'
  {
    prop: 'energy_price',
    field: 'energy_price',
    label: '能量单价',
    width: 150,
    align: 'center',
    formatter: (row: any) => h('span', {}, `${row.energy_price + ' TRX'}`)
  },
  {
    prop: 'addr_energy_num',
    field: 'addr_energy_num',
    label: '能量数',
    minWidth: 150,
    formatter: (row) => formatEnergyNum(row.addr_energy_num)
  }, // Adjusted width
  {
    prop: 'active_price',
    field: 'active_price',
    label: '激活单价',
    width: 150,
    align: 'center',
    formatter: (row: any) =>
      h('span', {}, row.active_price == 0 ? '-' : `${row.active_price + ' TRX'}`)
  },
  {
    prop: 'status',
    field: 'status',
    label: '交易状态',
    width: 100,
    align: 'center',
    slots: {
      default: ({ row }) => {
        const status = Number(row.status)
        if (isNaN(status)) return h(ElTag, { type: 'info', size: 'small' }, () => '未知')
        return h(ElTag, { type: getBatchStatusTagType(status), size: 'small' }, () =>
          getOrderStatusText(status)
        )
      }
    }
  },
  {
    prop: 'create_time', // Assuming field name for activation time is 'active_time' or 'create_time'
    field: 'create_time',
    label: '激活时间',
    width: 180,
    formatter: (row: any) =>
      row.create_time && row.active_status == 2 ? formatToDateTime(row.create_time) : '-' // Use correct field if different
  },
  {
    prop: 'order_amount', // Assuming field name is 'order_amount' or similar for TRX amount
    field: 'order_amount', // Or maybe 'trx_amount'? Need to confirm from API response
    label: '扣款',
    width: 120,
    align: 'center',
    formatter: (row: any) => (row.order_amount ? `${row.order_amount} TRX` : '-') // Adjust field name and formatting as needed
  },
  {
    prop: 'action',
    field: 'action',
    label: '操作',
    width: 120,
    align: 'center',
    fixed: 'right',
    slots: {
      default: ({ row }) => {
        return h(
          ElButton,
          {
            link: true,
            type: 'primary',
            size: 'small',
            onClick: () => handleViewBatchOrderTransaction(row) // Use the new handler
          },
          () => '交易详情'
        )
      }
    }
  }
])

// --- 批量下单详情 (Type 3) 交易详情 Schema ---
// Assuming the transaction details are similar to activation, adjust if needed
const batchOrderTransactionSchema = computed((): DescriptionsSchema[] => [
  {
    field: 'txid', // Assuming row has txid
    label: '激活交易hash',
    span: 24,
    slots: {
      default: (data: any) => {
        if (isEmpty(data?.txid)) return h('span', '-')
        return h(
          ElLink,
          {
            href: `${import.meta.env.VITE_TRONSCAN_URL}/#/transaction/${data.txid}`,
            type: 'primary',
            target: '_blank'
          },
          () => data.txid
        )
      }
    }
  },
  {
    field: 'energy_txid',
    label: '能量交易hash',
    span: 24,
    slots: {
      default: (data: any) => {
        if (isEmpty(data?.energy_txid)) return h('span', '-')
        return h(
          ElLink,
          {
            href: `${import.meta.env.VITE_TRONSCAN_URL}/#/transaction/${data.energy_txid}`,
            type: 'primary',
            target: '_blank'
          },
          () => data.energy_txid
        )
      }
    }
  },
  { field: 'from_address', label: '发起地址', span: 24 }, // Assuming row has from_address
  { field: 'to_address', label: '接收地址', span: 24 }, // Assuming row has to_address
  {
    field: 'status', // Field from the main row
    label: '交易状态',
    slots: {
      default: (data: any) => {
        const status = Number(data.status)
        const text = getOrderStatusText(status)
        const type = getBatchStatusTagType(status)
        return h(ElTag, { type: type, size: 'small' }, () => text)
      }
    }
  },
  {
    field: 'addr_energy_num', // Use the same field as in the table for consistency
    label: '能量数',
    slots: {
      default: (data: any) => {
        // Consistent formatting with the table
        if (data.addr_energy_num === undefined || data.addr_energy_num === null)
          return h('span', '-')
        return h('span', `${formatEnergyNum(data.addr_energy_num)}`)
      }
    }
  },
  {
    field: 'order_amount', // Assuming this represents the TRX amount for this specific transaction
    label: 'TRX数量',
    slots: {
      default: (data: any) => {
        if (data.order_amount === undefined || data.order_amount === null) return h('span', '-')
        return h('span', {}, `${data.order_amount} TRX`)
      }
    }
  },
  {
    field: 'create_time', // Use activation time from the table row if that's the completion time
    label: '创建时间',
    span: 24,
    slots: {
      default: (data: any) =>
        h('span', {}, data.create_time ? formatToDateTime(data.create_time) : '-')
    }
  }
])

// Fetch data when component is mounted or orderId changes
onMounted(() => {
  fetchBatchOrderDetails()
})

watch(
  () => props.orderId,
  (newId, oldId) => {
    if (newId !== oldId) {
      batchOrderCurrentPage.value = 1 // Reset pagination on ID change
      fetchBatchOrderDetails()
    }
  }
)
</script>

<template>
  <div>
    <!-- Optionally, add Descriptions for overall batch info if needed from orderData -->
    <!-- <Descriptions :schema="batchOrderDetailSchema" :data="orderData" :column="2" border /> -->
    <Table
      :columns="batchOrderTableColumns"
      :data="batchOrderDetails"
      :loading="batchOrderLoading"
      :scrollbar-always-on="true"
      border
      stripe
      style="margin-top: 15px"
      :pagination="{
        total: batchOrderTotal,
        currentPage: batchOrderCurrentPage,
        pageSize: batchOrderPageSize
      }"
      @update:current-page="handleBatchOrderPageChange"
      @update:page-size="handleBatchOrderSizeChange"
    />

    <!-- 批量下单详情交易弹窗 -->
    <Dialog v-model="batchOrderTransactionDialogVisible" title="交易详情">
      <Descriptions
        :schema="batchOrderTransactionSchema"
        :data="selectedBatchOrderTransaction"
        :column="1"
        border
      />
      <template #footer>
        <div class="flex justify-end">
          <ElButton @click="batchOrderTransactionDialogVisible = false">关闭</ElButton>
        </div>
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
/* Add component-specific styles if needed */
</style>
