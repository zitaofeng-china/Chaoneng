<template>
  <Dialog v-model="visible" title="订单详情" width="min(1400px, 92vw)">
    <ElTabs v-model="activeTab" class="order-detail-tabs">
      <!-- 基本信息标签页 - 始终显示 -->
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
        <div v-else class="p-4 text-center text-gray-500"> 无法加载订单详情。 </div>
      </ElTabPane>

      <!-- 资源详情标签页 - 只有当 resources 数组存在且有数据时才显示 -->
      <ElTabPane
        label="资源详情"
        name="resources"
        v-if="currentOrder && currentOrder.resources && currentOrder.resources.length > 0"
      >
        <ResourceDetails :order-data="currentOrder" />
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
import {
  EnergyOrderKind,
  getEnergyOrderKindTagType,
  getEnergyOrderKindText
} from '@/utils/energyOrder'
import { getStatusText, getStatusType } from '@/utils/orderStatus'
import {
  v2GetOrderDetail,
  type V2OrderDetailResponse
} from '@/api/opertion/OperationCenter/EnergyTransaction'
import Descriptions from '@/components/Descriptions/src/Descriptions.vue'
import type { DescriptionsSchema } from '@/components/Descriptions'
import { formatTableDateTime } from '@/utils/tableHelpers'
import { handleErrorMessage } from '@/utils/messageHelper'
import { renderNullableText } from '@/operation/OperationCenter/utils/displayText'
import {
  formatTransactionHash,
  renderTronscanTransactionLink
} from '@/operation/OperationCenter/utils/transactionLink'

const ResourceDetails = defineAsyncComponent(() => import('./details/ResourceDetails.vue'))

const visible = ref(false)
const currentOrder = ref<V2OrderDetailResponse | null>(null)
const activeTab = ref('basic')
const detailLoading = ref(false)

const shouldShowCountPayId = (data?: V2OrderDetailResponse | null) => {
  return Number(data?.kind) === EnergyOrderKind.COUNT_ENERGY
}

const hasPaymentAddress = (data?: V2OrderDetailResponse | null) => {
  return String(data?.payment_address ?? '').trim() !== ''
}

const renderTransactionHashText = (data?: V2OrderDetailResponse | null) => {
  const value = hasPaymentAddress(data) ? String(data?.pay_id ?? '').trim() : ''
  if (!value) return h('span', '-')

  return renderTronscanTransactionLink(value, formatTransactionHash(value))
}

const commonDetailSchema = computed<DescriptionsSchema[]>(() => {
  const schema: DescriptionsSchema[] = [
    { label: '订单号', field: 'id' },
    {
      label: '用户名',
      field: 'tg_first_name',
      slots: {
        default: (data: V2OrderDetailResponse) =>
          renderNullableText(data?.tg_first_name || data?.tg_user_name)
      }
    },
    { label: '机器人ID', field: 'bot_id' },
    {
      label: '机器人用户名',
      field: 'bot_user_name',
      slots: {
        default: (data: V2OrderDetailResponse) =>
          renderNullableText(data?.bot_user_name || data?.bot_first_name)
      }
    },
    { label: '代理名称', field: 'agent_name' },
    {
      label: '订单类型',
      field: 'kind',
      slots: {
        default: (data: V2OrderDetailResponse) => {
          const value = Number(data?.kind)
          return h(ElTag, { type: getEnergyOrderKindTagType(value) }, () =>
            getEnergyOrderKindText(value)
          )
        }
      }
    },
    {
      label: '支付金额',
      field: 'amount',
      slots: {
        default: (data: V2OrderDetailResponse) => {
          return renderNullableText(
            data?.amount !== undefined ? `${data.amount} ${data.coin || ''}` : '',
            '暂无'
          )
        }
      }
    },
    {
      label: (() => {
        const kind = Number(currentOrder.value?.kind)
        return kind === 7 || kind === 9 ? '带宽数' : '能量数'
      })(),
      field: 'resources',
      slots: {
        default: (data: V2OrderDetailResponse) => {
          const value = data?.resources?.[0]?.amount ?? data?.summary?.energy_count
          if (value === null || value === undefined) return renderNullableText('0')
          return renderNullableText(Number(value) >= 10000 ? formatToWan(value) : value)
        }
      }
    },
    {
      label: '收款地址',
      field: 'receive_address',
      slots: {
        default: (data: V2OrderDetailResponse) =>
          renderNullableText(data?.receive_address, '余额支付')
      }
    },
    {
      label: '订单状态',
      field: 'status',
      slots: {
        default: (data: V2OrderDetailResponse) => {
          const value = Number(data?.status)
          return h(ElTag, { type: getStatusType(value) }, () => getStatusText(value))
        }
      }
    },
    {
      label: '有效时长',
      field: 'resources',
      slots: {
        default: (data: V2OrderDetailResponse) => renderNullableText(getEnergyRentText(data))
      }
    },
    {
      label: '创建时间',
      field: 'created_at',
      slots: {
        default: (data: V2OrderDetailResponse) =>
          renderNullableText(formatTableDateTime(data?.created_at))
      }
    },
    {
      label: '支付时间',
      field: 'paid_at',
      slots: {
        default: (data: V2OrderDetailResponse) =>
          renderNullableText(formatTableDateTime(data?.paid_at))
      }
    },
    {
      label: '回收时间',
      field: 'resources',
      slots: {
        default: (data: V2OrderDetailResponse) =>
          renderNullableText(formatTableDateTime(data?.resources?.[0]?.recycled_at))
      }
    },
    {
      label: '完成时间',
      field: 'updated_at',
      slots: {
        default: (data: V2OrderDetailResponse) =>
          renderNullableText(formatTableDateTime(data?.updated_at))
      }
    }
  ]

  if (shouldShowCountPayId(currentOrder.value)) {
    schema.push({
      label: '交易hash',
      field: 'pay_id',
      slots: {
        default: (data: V2OrderDetailResponse) => renderTransactionHashText(data)
      }
    })
  }

  return schema
})

const getEnergyRentText = (data?: V2OrderDetailResponse | null) => {
  if (!data) return '-'
  if (data.kind === EnergyOrderKind.COUNT_ENERGY || data.kind === EnergyOrderKind.AUTO_HOSTING)
    return '长期有效'

  const firstResource = data.resources?.[0]
  if (!firstResource?.expirated_at || !firstResource?.delegated_at) return '-'

  const normalizeToMs = (value: string | number | null | undefined) => {
    if (value === undefined || value === null || value === '') return Number.NaN

    if (typeof value === 'number') {
      return String(Math.abs(Math.trunc(value))).length <= 10 ? value * 1000 : value
    }

    const trimmedValue = value.trim()
    if (!trimmedValue) return Number.NaN
    if (/^\d+$/.test(trimmedValue)) {
      const numericValue = Number(trimmedValue)
      return trimmedValue.length <= 10 ? numericValue * 1000 : numericValue
    }

    return new Date(trimmedValue).getTime()
  }

  const expTime = normalizeToMs(firstResource.expirated_at)
  const delTime = normalizeToMs(firstResource.delegated_at)
  if (Number.isNaN(expTime) || Number.isNaN(delTime) || expTime <= delTime) return '-'

  const diffMs = expTime - delTime
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays > 0) return `${diffDays}天`
  if (diffHours > 0) return `${diffHours}小时`
  if (diffMinutes > 0) return `${diffMinutes}分钟`
  return '-'
}

const open = async (row: { id: string | number }) => {
  if (!row || !row.id) {
    return
  }
  visible.value = true
  activeTab.value = 'basic'
  currentOrder.value = null
  detailLoading.value = true

  try {
    const response = await v2GetOrderDetail(String(row.id))

    if (response && response.data) {
      currentOrder.value = response.data
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
