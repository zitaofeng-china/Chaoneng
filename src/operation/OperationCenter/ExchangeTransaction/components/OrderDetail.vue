<template>
  <Dialog v-model="visible" title="兑换详情">
    <div v-if="loading" class="flex justify-center items-center min-h-[200px]">
      <Icon icon="ep:loading" class="is-loading" :size="26" />
    </div>

    <template v-if="orderDetail && !loading">
      <ElTabs v-model="activeTab">
        <!-- 标签页1：兑换详情 -->
        <ElTabPane label="兑换详情" name="detail">
          <Descriptions :schema="detailSchema" :data="orderDetail" :column="3" border />
        </ElTabPane>

        <!-- 标签页2：用户转出 -->
        <ElTabPane :label="userOutTabLabel" name="userOut">
          <Descriptions
            v-if="orderDetail.pay_transaction?.id || orderDetail.pay_transaction?.from"
            :schema="transactionInSchema"
            :data="orderDetail"
            :column="1"
            border
          />
          <ElEmpty v-else description="暂无交易数据" />
        </ElTabPane>

        <!-- 标签页3：用户接收 -->
        <ElTabPane :label="userInTabLabel" name="userIn">
          <Descriptions
            v-if="orderDetail.exchange?.out_txid || orderDetail.deliver_transaction?.from"
            :schema="transactionOutSchema"
            :data="orderDetail"
            :column="1"
            border
          />
          <ElEmpty v-else description="暂无交易数据" />
        </ElTabPane>
      </ElTabs>
    </template>

    <div v-else-if="!loading" class="text-center p-5">无法加载订单详情数据。</div>

    <template #footer>
      <div class="flex justify-end">
        <ElButton type="primary" @click="visible = false">确定</ElButton>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { ElButton, ElMessage, ElTag, ElLink, ElTabs, ElTabPane, ElEmpty } from 'element-plus'
import { Dialog } from '@/components/Dialog'
import { Descriptions } from '@/components/Descriptions'
import type { DescriptionsSchema } from '@/components/Descriptions'
import {
  v2GetExchangeDetail,
  type V2ExchangeDetail
} from '@/api/opertion/OperationCenter/ExchangeTransaction'
import Icon from '@/components/Icon/src/Icon.vue'
import { handleErrorMessage } from '@/utils/messageHelper'
import { formatTableDateTime, getStatusLabel, getStatusTagType } from '@/utils/tableHelpers'
import { ExchangeOrderType, getExchangeOrderType } from '@/utils/exchangeOrder'
import { EXCHANGE_STATUS_MAP } from '../constants'

const visible = ref(false)
const loading = ref(false)
const activeTab = ref('detail')
const orderDetail = ref<V2ExchangeDetail | null>(null)

const userOutTabLabel = computed(() => {
  return isUsdtToTrx(orderDetail.value) ? '用户转出 USDT' : '用户转出 TRX'
})

const userInTabLabel = computed(() => {
  return isUsdtToTrx(orderDetail.value) ? '用户接收 TRX' : '用户接收 USDT'
})

const formatAmount = (amount: string | number | undefined) => {
  return amount ?? '-'
}

const formatNullableDateTime = (value?: string | number | null) => {
  return formatTableDateTime(value)
}

const renderText = (value: string | number | null | undefined, fallback = '-') => {
  return h('span', value === undefined || value === null || value === '' ? fallback : String(value))
}

const isUsdtToTrx = (data?: V2ExchangeDetail | null) => {
  return (
    getExchangeOrderType(data?.exchange?.in_coin, data?.exchange?.out_coin) ===
    ExchangeOrderType.USDT_TO_TRX
  )
}

const getExchangeTypeText = (data?: V2ExchangeDetail | null) => {
  if (!data?.exchange) return '-'
  return isUsdtToTrx(data) ? '兑换TRX' : '兑换USDT'
}

const detailSchema = computed<DescriptionsSchema[]>(() => [
  { label: '订单ID', field: 'id', span: 8 },
  {
    label: '代理名称',
    field: 'agent_name',
    span: 8,
    slots: { default: (data) => data.agent_name ?? '-' }
  },
  {
    label: '交易类型',
    field: 'kind',
    span: 8,
    slots: { default: () => h('span', { class: 'text-blue-500' }, '闪兑') }
  },
  {
    label: '兑换类型',
    field: 'exchange',
    span: 8,
    slots: { default: (data) => h('span', getExchangeTypeText(data)) }
  },
  {
    label: '支付金额',
    field: 'amount',
    span: 8,
    slots: {
      default: (data) => {
        const amount = formatAmount(data.amount)
        if (amount === '-') return amount
        return h('span', null, [
          `${amount} `,
          h('span', { class: 'text-blue-500' }, data.exchange?.in_coin || data.coin || '')
        ])
      }
    }
  },
  {
    label: '兑换汇率',
    field: 'exchange',
    span: 8,
    slots: { default: (data) => data.exchange?.actual_rate ?? '-' }
  },
  {
    label: '支出数量',
    field: 'exchange',
    span: 8,
    slots: {
      default: (data) => {
        const amount = formatAmount(data.exchange?.out_amount)
        if (amount === '-') return amount
        return h('span', null, [
          `${amount} `,
          h('span', { class: 'text-blue-500' }, data.exchange?.out_coin || '')
        ])
      }
    }
  },
  {
    label: '平台利润',
    field: 'exchange',
    span: 8,
    slots: { default: (data) => `${formatAmount(data.exchange?.plate_profit)}` }
  },
  {
    label: '实时汇率',
    field: 'exchange',
    span: 8,
    slots: { default: (data) => data.exchange?.real_rate ?? '-' }
  },
  {
    label: '订单状态',
    field: 'status',
    span: 8,
    slots: {
      default: (data) =>
        h(ElTag, { type: getStatusTagType(EXCHANGE_STATUS_MAP, data.status) }, () =>
          getStatusLabel(EXCHANGE_STATUS_MAP, data.status, '未知')
        )
    }
  },
  {
    label: '代理扣款',
    field: 'agent_cost',
    span: 8,
    slots: { default: (data) => `${formatAmount(data.agent_cost)} TRX` }
  },
  {
    label: '完成时间',
    field: 'paid_at',
    span: 8,
    slots: { default: (data) => formatNullableDateTime(data.paid_at || data.exchange?.out_at) }
  },
  {
    label: '补发' + (orderDetail.value?.exchange?.out_coin || 'TRX'),
    field: 'exchange',
    span: 8,
    slots: {
      default: (data) => {
        if (!data.exchange?.retry_at) return '-'
        return h('span', null, [
          `${data.exchange?.out_amount || ''} `,
          h('span', { class: 'text-blue-500' }, data.exchange?.out_coin || 'TRX')
        ])
      }
    }
  },
  {
    label: '补发时间',
    field: 'exchange',
    span: 8,
    slots: { default: (data) => formatNullableDateTime(data.exchange?.retry_at) }
  },
  { label: '备注', field: 'describe', span: 8, slots: { default: (data) => data.describe ?? '-' } }
])

const transactionInSchema = computed<DescriptionsSchema[]>(() => [
  {
    field: 'pay_transaction',
    label: '交易Hash',
    span: 24,
    slots: {
      default: (row: V2ExchangeDetail) => {
        const txid = row?.pay_transaction?.id
        if (!txid) return h('span', '-')
        return h(
          ElLink,
          {
            href: `${import.meta.env.VITE_TRONSCAN_URL}/#/transaction/${txid}`,
            type: 'primary',
            target: '_blank'
          },
          () => txid
        )
      }
    }
  },
  {
    field: 'pay_transaction',
    label: '发送人',
    span: 24,
    slots: { default: (row: V2ExchangeDetail) => renderText(row?.pay_transaction?.from) }
  },
  {
    field: 'pay_transaction',
    label: '接收人',
    span: 24,
    slots: { default: (row: V2ExchangeDetail) => renderText(row?.pay_transaction?.to) }
  },
  {
    field: 'amount',
    label: '金额',
    slots: {
      default: (row: V2ExchangeDetail) => {
        if (!row?.amount) return h('span', '-')
        return h('span', `${row.amount}（${row.exchange?.in_coin || row.coin || '-'}）`)
      }
    }
  },
  {
    field: 'pay_transaction',
    label: '转出时间',
    slots: {
      default: (row: V2ExchangeDetail) =>
        renderText(formatNullableDateTime(row?.pay_transaction?.time))
    }
  }
])

const transactionOutSchema = computed<DescriptionsSchema[]>(() => [
  {
    field: 'exchange',
    label: '交易Hash',
    span: 24,
    slots: {
      default: (row: V2ExchangeDetail) => {
        const txid = row?.exchange?.out_txid || row?.deliver_transaction?.id
        if (!txid) return h('span', '-')
        return h(
          ElLink,
          {
            href: `${import.meta.env.VITE_TRONSCAN_URL}/#/transaction/${txid}`,
            type: 'primary',
            target: '_blank'
          },
          () => txid
        )
      }
    }
  },
  {
    field: 'deliver_transaction',
    label: '发送人',
    span: 24,
    slots: {
      default: (row: V2ExchangeDetail) => renderText(row?.deliver_transaction?.from)
    }
  },
  {
    field: 'deliver_transaction',
    label: '接收人',
    span: 24,
    slots: {
      default: (row: V2ExchangeDetail) => renderText(row?.deliver_transaction?.to)
    }
  },
  {
    field: 'deliver_transaction',
    label: '金额',
    slots: {
      default: (row: V2ExchangeDetail) => {
        const amount = row?.deliver_transaction?.amount || row?.exchange?.out_amount
        if (!amount) return h('span', '-')
        return h('span', `${amount}（${row.exchange?.out_coin || '-'}）`)
      }
    }
  },
  {
    field: 'deliver_transaction',
    label: '接收时间',
    slots: {
      default: (row: V2ExchangeDetail) =>
        renderText(formatNullableDateTime(row?.deliver_transaction?.time))
    }
  }
])

const open = async (orderIdValue: number | string) => {
  const id = String(orderIdValue)
  if (!id) {
    ElMessage.error('无效的订单ID')
    return
  }

  visible.value = true
  loading.value = true
  orderDetail.value = null
  activeTab.value = 'detail'

  try {
    const res = await v2GetExchangeDetail(id)
    if (res.code === '000000' && res.data) {
      orderDetail.value = res.data
    } else {
      ElMessage.error(res.msg || '获取订单详情失败')
    }
  } catch (error) {
    handleErrorMessage(error, '获取订单详情失败')
  } finally {
    loading.value = false
  }
}

defineExpose({ open })
</script>

<style scoped>
.text-blue-500 {
  color: #3b82f6;
}

.is-loading {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

:deep(.el-descriptions__content) {
  word-break: break-all;
}
</style>
