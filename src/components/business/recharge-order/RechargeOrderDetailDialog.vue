<template>
  <Dialog v-model="visible" :title="title">
    <ElTabs v-if="mode === 'user'" v-model="activeTab">
      <ElTabPane label="订单详情" name="order">
        <Descriptions :schema="orderDetailSchema" :data="orderDetail" :column="2" border />
      </ElTabPane>
      <ElTabPane label="充值详情" name="recharge">
        <Descriptions :schema="rechargeDetailSchema" :data="rechargeDetail" :column="2" border />
      </ElTabPane>
    </ElTabs>

    <Descriptions v-else :schema="agentOrderDetailSchema" :data="orderDetail" :column="2" border />

    <template #footer>
      <div class="flex justify-end">
        <ElButton @click="visible = false">关闭</ElButton>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="tsx">
import { computed, h, ref, watch } from 'vue'
import { ElButton, ElTabs, ElTabPane } from 'element-plus'
import { Dialog } from '@/components/Dialog'
import { Descriptions } from '@/components/Descriptions'
import type { DescriptionsSchema } from '@/components/Descriptions'
import { formatTableDateTime } from '@/utils/tableHelpers'
import {
  getRechargeActualRateText,
  getRechargeProfitText,
  getRechargeReceivedAmountText,
  isUsdtRechargeOrder
} from '@/utils/rechargeOrder'
import {
  getRechargeBotName,
  getRechargeSourceText,
  getTransactionFrom,
  getTransactionId,
  getTransactionTo,
  renderRechargeCoinTag,
  renderRechargeStatusTag,
  renderText,
  renderTransactionLink,
  type RechargeBillField,
  type RechargeOrderRecord,
  type RechargeTransactionRecord
} from './helpers'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    mode?: 'user' | 'agent'
    title?: string
    orderDetail?: RechargeOrderRecord | null
    rechargeDetail?: RechargeTransactionRecord | null
    receivedBillField?: RechargeBillField
    actualRateSource?: 'bill' | 'field'
  }>(),
  {
    mode: 'user',
    title: '订单详情',
    orderDetail: null,
    rechargeDetail: null,
    receivedBillField: 'user_bill',
    actualRateSource: 'bill'
  }
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
}>()

const activeTab = ref('order')

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

watch(
  () => props.modelValue,
  (value) => {
    if (value) activeTab.value = 'order'
  }
)

const renderAmountText = (row?: RechargeOrderRecord | null) => {
  if (!row?.amount) return renderText()
  return renderText(`${row.amount} ${row.coin || ''}`)
}

const renderActualRateText = (row?: RechargeOrderRecord | null) => {
  if (!isUsdtRechargeOrder(row)) return renderText()
  if (props.actualRateSource === 'field') return renderText(row?.actual_rate)
  return renderText(getRechargeActualRateText(row, props.receivedBillField))
}

const createRechargeMetricsSchemas = (
  span = 12,
  billField: RechargeBillField = props.receivedBillField
): DescriptionsSchema[] => [
  {
    field: 'profit',
    label: '利润',
    span,
    slots: {
      default: (row: RechargeOrderRecord) => renderText(getRechargeProfitText(row))
    }
  },
  {
    field: 'actual_rate',
    label: '实际汇率',
    span,
    slots: {
      default: (row: RechargeOrderRecord) => renderActualRateText(row)
    }
  },
  {
    field: 'received_amount',
    label: '到账金额',
    span,
    slots: {
      default: (row: RechargeOrderRecord) =>
        renderText(getRechargeReceivedAmountText(row, billField))
    }
  }
]

const createUserIdentitySchemas = (): DescriptionsSchema[] => {
  const origin = props.orderDetail?.origin
  const botSchemas: DescriptionsSchema[] = [
    { field: 'user_id', label: 'TG用户ID' },
    { field: 'tg_user_name', label: 'TG用户名' },
    { field: 'tg_first_name', label: 'TG用户昵称' }
  ]
  const h5Schemas: DescriptionsSchema[] = [
    { field: 'username', label: '用户账号' },
    { field: 'email', label: '用户邮箱' }
  ]

  if (origin === 1) return botSchemas
  if (origin === 2) return h5Schemas
  return [...botSchemas, ...h5Schemas]
}

const orderDetailSchema = computed<DescriptionsSchema[]>(() => {
  const schema: DescriptionsSchema[] = [
    { field: 'id', label: '订单号' },
    {
      field: 'status',
      label: '订单状态',
      slots: {
        default: (row: RechargeOrderRecord) => renderRechargeStatusTag(row?.status)
      }
    },
    {
      field: 'coin',
      label: '订单类型',
      slots: {
        default: (row: RechargeOrderRecord) => renderRechargeCoinTag(row?.coin)
      }
    },
    ...createUserIdentitySchemas(),
    {
      field: 'origin',
      label: '来源',
      slots: {
        default: (row: RechargeOrderRecord) => renderText(getRechargeSourceText(row?.origin))
      }
    },
    { field: 'bot_id', label: '机器人ID' },
    {
      field: 'bot_name',
      label: '机器人名称',
      slots: {
        default: (row: RechargeOrderRecord) => renderText(getRechargeBotName(row))
      }
    },
    {
      field: 'amount',
      label: '金额',
      slots: {
        default: (row: RechargeOrderRecord) => renderAmountText(row)
      }
    },
    { field: 'describe', label: '备注' },
    {
      field: 'created_at',
      label: '创建时间',
      span: 24,
      slots: {
        default: (row: RechargeOrderRecord) => renderText(formatTableDateTime(row?.created_at))
      }
    },
    {
      field: 'paid_at',
      label: '支付时间',
      span: 24,
      slots: {
        default: (row: RechargeOrderRecord) => renderText(formatTableDateTime(row?.paid_at))
      }
    }
  ]

  if (isUsdtRechargeOrder(props.orderDetail)) {
    const metricsInsertIndex = schema.findIndex((item) => item.field === 'describe')
    schema.splice(
      metricsInsertIndex >= 0 ? metricsInsertIndex : schema.length,
      0,
      ...createRechargeMetricsSchemas(12)
    )
  }

  return schema
})

const rechargeDetailSchema = computed<DescriptionsSchema[]>(() => [
  {
    field: 'to',
    label: '收款地址',
    span: 24,
    slots: {
      default: (row: RechargeTransactionRecord) => renderText(getTransactionTo(row))
    }
  },
  {
    field: 'from',
    label: '支付地址',
    span: 24,
    slots: {
      default: (row: RechargeTransactionRecord) => renderText(getTransactionFrom(row))
    }
  },
  {
    field: 'id',
    label: '交易哈希',
    span: 24,
    slots: {
      default: (row: RechargeTransactionRecord) => renderTransactionLink(getTransactionId(row))
    }
  }
])

const agentOrderDetailSchema = computed<DescriptionsSchema[]>(() => {
  const schema: DescriptionsSchema[] = [
    { field: 'id', label: '订单号', span: 12 },
    {
      field: 'status',
      label: '订单状态',
      span: 12,
      slots: {
        default: (row: RechargeOrderRecord) => renderRechargeStatusTag(row?.status)
      }
    },
    {
      field: 'coin',
      label: '订单类型',
      span: 12,
      slots: {
        default: (row: RechargeOrderRecord) => renderRechargeCoinTag(row?.coin)
      }
    },
    {
      field: 'amount',
      label: '金额',
      span: 12,
      slots: {
        default: (row: RechargeOrderRecord) => renderAmountText(row)
      }
    },
    { field: 'describe', label: '备注', span: 12 },
    {
      field: 'created_at',
      label: '创建时间',
      span: 12,
      slots: {
        default: (row: RechargeOrderRecord) => renderText(formatTableDateTime(row?.created_at))
      }
    },
    {
      field: 'paid_at',
      label: '支付时间',
      span: 12,
      slots: {
        default: (row: RechargeOrderRecord) => renderText(formatTableDateTime(row?.paid_at))
      }
    },
    { field: 'receive_address', label: '收款地址', span: 24 },
    {
      field: 'pay_from',
      label: '支付地址',
      span: 24,
      slots: {
        default: (row: RechargeOrderRecord) => renderText(row?.pay_from)
      }
    },
    {
      field: 'pay_id',
      label: '交易哈希',
      span: 24,
      slots: {
        default: (row: RechargeOrderRecord) => renderTransactionLink(row?.pay_id)
      }
    }
  ]

  if (isUsdtRechargeOrder(props.orderDetail)) {
    schema.splice(4, 0, ...createRechargeMetricsSchemas(12, 'agent_bill'))
  }

  return schema
})
</script>
