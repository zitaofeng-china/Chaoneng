<template>
  <Dialog v-model="visible" title="订单详情">
    <ElTabs v-model="activeTab" class="order-detail-tabs">
      <ElTabPane label="基本信息" name="basic">
        <div
          v-if="detailLoading"
          class="order-detail-loading"
          v-loading="true"
          element-loading-text="正在加载订单详情..."
        ></div>
        <div v-else-if="currentOrder" class="order-detail">
          <Descriptions :schema="commonDetailSchema" :data="currentOrder" :column="2" border />
        </div>
        <div v-else class="p-4 text-center text-gray-500">无法加载订单详情。</div>
      </ElTabPane>

      <ElTabPane
        v-if="currentOrder && currentOrder.resources && currentOrder.resources.length > 0"
        label="资源详情"
        name="resources"
      >
        <ResourceDetails :order-data="currentOrder" />
      </ElTabPane>

      <ElTabPane
        v-if="currentOrder && currentOrder.activations && currentOrder.activations.length > 0"
        label="激活详情"
        name="activations"
      >
        <ActivationDetails :order-data="currentOrder" />
      </ElTabPane>
    </ElTabs>
    <template #footer>
      <div class="flex justify-end">
        <ElButton @click="visible = false">关闭</ElButton>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="tsx">
import { computed, h, ref } from 'vue'
import { ElButton, ElTag, ElTabs, ElTabPane } from 'element-plus'
import { Dialog } from '@/components/Dialog'
import { formatToWan } from '@/utils'
import Descriptions from '@/components/Descriptions/src/Descriptions.vue'
import type { DescriptionsSchema } from '@/components/Descriptions'
import { formatTableDateTime } from '@/utils/tableHelpers'
import { getStatusText, getStatusType } from '@/utils/orderStatus'
import {
  getQuickChargeOrderTypeTagType,
  getQuickChargeOrderTypeText
} from '@/constants/quickChargeOrder'
import { handleErrorMessage } from '@/utils/messageHelper'
import ActivationDetails from './ActivationDetails.vue'
import ResourceDetails from './ResourceDetails.vue'
import { buildQuickChargeOrderDetail, renderNullableText } from './helpers'
import type {
  FetchQuickChargeOrderDetail,
  QuickChargeOrderDetail,
  QuickChargeOrderDetailSource
} from './types'

const props = defineProps<{
  fetchDetail: FetchQuickChargeOrderDetail
}>()

const visible = ref(false)
const currentOrder = ref<QuickChargeOrderDetail | null>(null)
const activeTab = ref('basic')
const detailLoading = ref(false)

const commonDetailSchema = computed<DescriptionsSchema[]>(() => [
  { label: '订单号', field: 'order_num' },
  {
    label: '用户名',
    field: 'tg_name',
    slots: { default: (data: QuickChargeOrderDetail) => renderNullableText(data?.tg_name) }
  },
  { label: '机器人ID', field: 'bot_id' },
  { label: '机器人用户名', field: 'bot_name' },
  { label: '代理名称', field: 'username' },
  {
    label: '订单类型',
    field: 'order_type',
    slots: {
      default: (data: QuickChargeOrderDetail) => {
        const value = Number(data?.order_type)
        return h(ElTag, { type: getQuickChargeOrderTypeTagType(value) }, () =>
          getQuickChargeOrderTypeText(value)
        )
      }
    }
  },
  {
    label: '支付金额',
    field: 'order_amount',
    slots: {
      default: (data: QuickChargeOrderDetail) => {
        return renderNullableText(
          data?.order_amount !== undefined ? `${data.order_amount} ${data.pay_unit || ''}` : '',
          '暂无'
        )
      }
    }
  },
  {
    label: (() => {
      const orderType = Number(currentOrder.value?.order_type)
      return orderType === 7 || orderType === 9 ? '带宽数' : '能量数'
    })(),
    field: 'summary.energy_count',
    slots: {
      default: (data: QuickChargeOrderDetail) => {
        const value = data?.summary?.energy_count
        if (value === null || value === undefined) return renderNullableText('0')
        return renderNullableText(Number(value) >= 10000 ? formatToWan(value) : value)
      }
    }
  },
  {
    label: '收款地址',
    field: 'receive_address',
    slots: {
      default: (data: QuickChargeOrderDetail) =>
        renderNullableText(data?.receive_address, '余额支付')
    }
  },
  {
    label: '订单状态',
    field: 'status',
    slots: {
      default: (data: QuickChargeOrderDetail) => {
        const value = Number(data?.status)
        return h(ElTag, { type: getStatusType(value) }, () => getStatusText(value))
      }
    }
  },
  {
    label: '使用前数量',
    field: 'before_used',
    slots: {
      default: (data: QuickChargeOrderDetail) => renderNullableText(data?.before_used)
    }
  },
  {
    label: '回收时间',
    field: 'recycle_time',
    slots: {
      default: (data: QuickChargeOrderDetail) =>
        renderNullableText(formatTableDateTime(data?.recycle_time))
    }
  },
  {
    label: '创建时间',
    field: 'create_time',
    slots: {
      default: (data: QuickChargeOrderDetail) =>
        renderNullableText(formatTableDateTime(data?.create_time))
    }
  },
  {
    label: '完成时间',
    field: 'finish_time',
    slots: {
      default: (data: QuickChargeOrderDetail) =>
        renderNullableText(formatTableDateTime(data?.finish_time))
    }
  },
  {
    label: '支付时间',
    field: 'pay_time',
    slots: {
      default: (data: QuickChargeOrderDetail) =>
        renderNullableText(formatTableDateTime(data?.pay_time))
    }
  }
])

const open = async (row: { id?: string | number } | null) => {
  if (!row || !row.id) {
    return
  }
  visible.value = true
  activeTab.value = 'basic'
  currentOrder.value = null
  detailLoading.value = true

  try {
    const response = await props.fetchDetail(String(row.id))
    const detailData = response?.data as QuickChargeOrderDetailSource | undefined
    currentOrder.value = detailData ? buildQuickChargeOrderDetail(detailData) : null
  } catch (error) {
    handleErrorMessage(error, '获取订单详情失败')
    currentOrder.value = null
  } finally {
    detailLoading.value = false
  }
}

defineExpose({
  open
})
</script>

<style scoped>
.order-detail {
  width: 100%;
}

.order-detail-tabs .el-tabs__content {
  min-height: 150px;
}

.order-detail-loading {
  display: flex;
  min-height: 240px;
  color: var(--el-text-color-secondary);
  align-items: center;
  justify-content: center;
}
</style>
