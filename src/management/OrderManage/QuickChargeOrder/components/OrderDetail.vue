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
import { ref, computed, defineAsyncComponent, h } from 'vue'
import { ElButton, ElTag, ElTabs, ElTabPane } from 'element-plus'
import { Dialog } from '@/components/Dialog'
import { formatToWan } from '@/utils'
import Descriptions from '@/components/Descriptions/src/Descriptions.vue'
import type { DescriptionsSchema } from '@/components/Descriptions'
import { formatTableDateTime } from '@/utils/tableHelpers'
import { getStatusText, getStatusType } from '@/utils/orderStatus'
import {
  v1GetQuickChargeOrderDetail,
  type QuickChargeOrderDetailResponse as QuickChargeApiDetailResponse
} from '@/api/management/OrderManage/QuickChargeOrder'
import { handleErrorMessage } from '@/utils/messageHelper'
import type { QuickChargeOrder, QuickChargeOrderDetail, QuickChargeResource } from '../types'
import { getQuickChargeOrderTypeTagType, getQuickChargeOrderTypeText } from '../constants'
import { renderNullableText } from '../helpers'

const ResourceDetails = defineAsyncComponent(() => import('./details/ResourceDetails.vue'))
const ActivationDetails = defineAsyncComponent(() => import('./details/ActivationDetails.vue'))

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

const toTimestamp = (value?: string | number | null) => {
  if (!value) return 0
  if (typeof value === 'number') return value
  if (/^\d+$/.test(value)) return Number(value)
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

const mapResources = (
  resources?: QuickChargeApiDetailResponse['resources']
): QuickChargeResource[] => {
  return (resources || []).map((resource) => ({
    id: resource.id,
    amount: resource.amount,
    target: resource.target,
    code: resource.code,
    source: resource.source,
    balance: resource.balance,
    expirated_at: resource.expirated_at,
    used_txid: resource.used_txid,
    delegated_txid: resource.delegated_txid,
    delegated_at: resource.delegated_at,
    recycled_txid: resource.recycled_txid,
    recycled_at: resource.recycled_at
  }))
}

const createFallbackSummary = (orderId: string, energyCount = 0) => ({
  order_id: orderId,
  gift_bandwidth: false,
  active_count: 0,
  energy_count: energyCount,
  used_count: 0
})

const buildDetail = (detailData: QuickChargeApiDetailResponse): QuickChargeOrderDetail => {
  const summary = detailData.summary || createFallbackSummary(detailData.id)
  const firstResource = detailData.resources?.[0]

  return {
    id: detailData.id,
    order_num: detailData.id,
    tg_name: detailData.tg_first_name || detailData.tg_user_name || '-',
    bot_id: detailData.bot_id || '-',
    bot_name: detailData.bot_user_name || detailData.bot_first_name || '-',
    username: detailData.agent_name || '-',
    order_type: detailData.kind,
    order_amount: String(detailData.amount ?? '-'),
    pay_unit: detailData.coin || '',
    energy_num: String(summary.energy_count ?? 0),
    receive_address: detailData.receive_address || '',
    energy_address: firstResource?.target || '',
    status: detailData.status,
    recycle_time: toTimestamp(firstResource?.recycled_at),
    create_time: toTimestamp(detailData.created_at),
    finish_time: toTimestamp(detailData.updated_at),
    pay_time: toTimestamp(detailData.paid_at),
    stop_time: null,
    stroke_num: summary.energy_count || 0,
    txid: firstResource?.delegated_txid || '',
    from_address: firstResource?.source || '',
    recycle_txid: firstResource?.recycled_txid || '',
    used_txid: firstResource?.used_txid || '',
    flash_price: String(detailData.amount ?? '-'),
    kind: detailData.kind,
    summary,
    resources: mapResources(detailData.resources),
    activations: detailData.activations || []
  }
}

const open = async (row: QuickChargeOrder) => {
  if (!row || !row.id) {
    return
  }
  visible.value = true
  activeTab.value = 'basic'
  currentOrder.value = null
  detailLoading.value = true

  try {
    const response = await v1GetQuickChargeOrderDetail(String(row.id))
    if (response?.data) {
      currentOrder.value = buildDetail(response.data)
      return
    }

    currentOrder.value = null
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
