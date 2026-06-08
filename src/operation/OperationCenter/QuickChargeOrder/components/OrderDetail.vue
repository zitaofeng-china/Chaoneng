<template>
  <Dialog v-model="visible" title="订单详情">
    <ElTabs v-model="activeTab" class="order-detail-tabs">
      <!-- 基本信息标签页 - 始终显示 -->
      <ElTabPane label="基本信息" name="basic">
        <div v-if="currentOrder" class="order-detail">
          <Descriptions :schema="commonDetailSchema" :data="currentOrder" :column="2" border />
        </div>
        <div v-else-if="!currentOrder" class="p-4 text-center text-gray-500">
          无法加载订单详情。
        </div>
      </ElTabPane>

      <!-- 资源详情标签页 - 只有当 resources 数组存在且有数据时才显示 -->
      <ElTabPane
        label="资源详情"
        name="resources"
        v-if="currentOrder && currentOrder.resources && currentOrder.resources.length > 0"
      >
        <ResourceDetails :order-data="currentOrder" />
      </ElTabPane>

      <!-- 激活详情标签页 - 只有当 activations 数组存在且有数据时才显示 -->
      <ElTabPane
        label="激活详情"
        name="activations"
        v-if="currentOrder && currentOrder.activations && currentOrder.activations.length > 0"
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
import { formatTableDateTime, getStatusLabel, getStatusTagType } from '@/utils/tableHelpers'
import type { QuickChargeOrder, QuickChargeOrderDetail, QuickChargeResource } from '../types'
import {
  getQuickChargeOrderTypeTagType,
  getQuickChargeOrderTypeText,
  QUICK_CHARGE_STATUS_MAP
} from '../constants'

const ResourceDetails = defineAsyncComponent(() => import('./details/ResourceDetails.vue'))
const ActivationDetails = defineAsyncComponent(() => import('./details/ActivationDetails.vue'))

const visible = ref(false)
const currentOrder = ref<QuickChargeOrderDetail | null>(null)
const activeTab = ref('basic')

const renderText = (value: string | number | null | undefined, fallback = '-') => {
  return h('span', value === undefined || value === null || value === '' ? fallback : String(value))
}

const commonDetailSchema = computed<DescriptionsSchema[]>(() => [
  { label: '订单号', field: 'order_num' },
  {
    label: '用户名',
    field: 'tg_name',
    slots: { default: (data: QuickChargeOrderDetail) => renderText(data?.tg_name) }
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
        return renderText(
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
    field: 'energy_num',
    slots: {
      default: (data: QuickChargeOrderDetail) => {
        const value = data?.energy_num
        if (value === null || value === undefined || value === '') return renderText('0')
        return renderText(Number(value) >= 10000 ? formatToWan(value) : value)
      }
    }
  },
  {
    label: '收款地址',
    field: 'receive_address',
    slots: {
      default: (data: QuickChargeOrderDetail) => renderText(data?.receive_address, '余额支付')
    }
  },
  {
    label: '订单状态',
    field: 'status',
    slots: {
      default: (data: QuickChargeOrderDetail) => {
        const value = Number(data?.status)
        return h(ElTag, { type: getStatusTagType(QUICK_CHARGE_STATUS_MAP, value) }, () =>
          getStatusLabel(QUICK_CHARGE_STATUS_MAP, value)
        )
      }
    }
  },
  {
    label: '有效时长',
    field: 'energy_rent_text',
    slots: { default: (data: QuickChargeOrderDetail) => renderText(data?.energy_rent_text) }
  },
  {
    label: '回收时间',
    field: 'recycle_time',
    slots: {
      default: (data: QuickChargeOrderDetail) => renderText(formatTableDateTime(data?.recycle_time))
    }
  },
  {
    label: '创建时间',
    field: 'create_time',
    slots: {
      default: (data: QuickChargeOrderDetail) => renderText(formatTableDateTime(data?.create_time))
    }
  },
  {
    label: '完成时间',
    field: 'finish_time',
    slots: {
      default: (data: QuickChargeOrderDetail) => renderText(formatTableDateTime(data?.finish_time))
    }
  },
  {
    label: '支付时间',
    field: 'pay_time',
    slots: {
      default: (data: QuickChargeOrderDetail) => renderText(formatTableDateTime(data?.pay_time))
    }
  }
])

const toTimestamp = (value?: string | number | null) => {
  if (!value) return 0
  if (typeof value === 'number') return value
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

const buildSampleResource = (row: QuickChargeOrder): QuickChargeResource => ({
  id: 1,
  amount: row.amount || row.energy_num || '0',
  target: row.receive_address || '-',
  code: 1,
  source: row.send_address || '-',
  balance: 0,
  expirated_at: row.end_time || '',
  used_txid: row.used_txid || '',
  delegated_txid: row.delegated_txid || 'sample_delegated_txid',
  delegated_at: row.start_time || '',
  recycled_txid: row.recycled_txid || 'sample_recycled_txid',
  recycled_at: row.end_time || ''
})

const open = (row: QuickChargeOrder) => {
  if (!row || !row.id) {
    return
  }
  visible.value = true
  activeTab.value = 'basic'

  const resource = buildSampleResource(row)

  const detail: QuickChargeOrderDetail = {
    id: row.id,
    order_num: row.id,
    tg_name: row.tg_user_name || '-',
    bot_id: row.bot_id || '-',
    bot_name: row.bot_user_name || row.bot_name || '-',
    username: row.agent_name || '-',
    order_type: 7,
    order_amount: row.unit_price || row.amount || '-',
    pay_unit: row.unit_price ? 'sun/天' : '',
    energy_num: row.amount || '0',
    receive_address: row.receive_address || '',
    energy_address: row.receive_address || '',
    status: row.status,
    energy_rent_text: row.duration || '-',
    recycle_time: toTimestamp(row.end_time),
    create_time: toTimestamp(row.start_time),
    finish_time: toTimestamp(row.end_time),
    pay_time: toTimestamp(row.start_time),
    stop_time: null,
    stroke_num: 1,
    txid: resource.delegated_txid,
    from_address: resource.source,
    recycle_txid: resource.recycled_txid,
    used_txid: resource.used_txid,
    flash_price: row.unit_price || '-',
    summary: {
      order_id: row.id,
      gift_bandwidth: false,
      active_count: 0,
      energy_count: 1,
      used_count: 0
    },
    resources: [resource],
    activations: []
  }

  currentOrder.value = detail
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
</style>
