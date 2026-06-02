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
            v-if="orderDetail.in_txid || orderDetail.pay_from_address"
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
            v-if="orderDetail.out_txid || orderDetail.deliver_from_address"
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
import { v2GetExchangeDetail } from '@/api/exchange_transaction'
import type { V2ExchangeDetail } from '@/api/exchange_transaction/types'
import { formatToDateTime } from '@/utils/dateUtil'
import Icon from '@/components/Icon/src/Icon.vue'

const visible = ref(false)
const loading = ref(false)
const activeTab = ref('detail')
const orderDetail = ref<any>(null)

// 标签页标题
const userOutTabLabel = computed(() => {
  const type = orderDetail.value?.order_type
  return type === 1 ? '用户转出 USDT' : '用户转出 TRX'
})

const userInTabLabel = computed(() => {
  const type = orderDetail.value?.order_type
  return type === 1 ? '用户接收 TRX' : '用户接收 USDT'
})

const getStatusText = (status: number | undefined) => {
  switch (status) {
    case 5:
      return '已完成'
    case 6:
      return '失败订单'
    case 8:
      return '已取消'
    case 1:
      return '新订单'
    case 2:
      return '已支付'
    case 3:
      return '已发送'
    case 4:
      return '已回收'
    case 7:
      return '已退款'
    case 9:
      return '中止订单'
    default:
      return '未知'
  }
}

const getStatusType = (status: number | undefined): 'success' | 'warning' | 'info' | 'danger' => {
  switch (status) {
    case 5:
      return 'success'
    case 6:
      return 'danger'
    case 8:
      return 'warning'
    case 1:
    case 3:
    case 4:
      return 'info'
    case 2:
    case 7:
    case 9:
      return 'warning'
    default:
      return 'info'
  }
}

const formatAmount = (amount: string | number | undefined) => {
  return amount ?? '-'
}

const formatNullableDateTime = (timestamp: number | undefined) => {
  return timestamp && !isNaN(timestamp) ? formatToDateTime(timestamp * 1000) : '-'
}

// 兑换详情 Schema
const detailSchema = computed<DescriptionsSchema[]>(() => [
  { label: '订单ID', field: 'order_id', span: 8 },
  {
    label: '代理名称',
    field: 'username',
    span: 8,
    slots: { default: (data) => data.username ?? '-' }
  },
  {
    label: '交易类型',
    field: 'order_type',
    span: 8,
    slots: { default: () => h('span', { class: 'text-blue-500' }, '闪兑') }
  },
  {
    label: '兑换类型',
    field: 'order_type',
    span: 8,
    slots: {
      default: (data) => {
        const text = data.order_type === 1 ? '兑换TRX' : '兑换USDT'
        return h('span', text)
      }
    }
  },
  {
    label: '支付金额',
    field: 'order_amount',
    span: 8,
    slots: {
      default: (data) => {
        const amount = formatAmount(data.order_amount)
        if (amount === '-') return amount
        return h('span', null, [
          `${amount} `,
          h('span', { class: 'text-blue-500' }, data.pay_unit || '')
        ])
      }
    }
  },
  { label: '兑换汇率', field: 'trx_price', span: 8 },
  {
    label: '支出数量',
    field: 'exchange_amount',
    span: 8,
    slots: {
      default: (data) => {
        const amount = formatAmount(data.exchange_amount)
        if (amount === '-') return amount
        return h('span', null, [
          `${amount} `,
          h('span', { class: 'text-blue-500' }, data.exchange_unit || '')
        ])
      }
    }
  },
  {
    label: '平台利润',
    field: 'plate_profit',
    span: 8,
    slots: { default: (data) => `${formatAmount(data.plate_profit)}` }
  },
  { label: '实时汇率', field: 'real_price', span: 8 },
  {
    label: '订单状态',
    field: 'status',
    span: 8,
    slots: {
      default: (data) =>
        h(ElTag, { type: getStatusType(data.status) }, () => getStatusText(data.status))
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
    field: 'finish_time',
    span: 8,
    slots: { default: (data) => formatNullableDateTime(data.finish_time) }
  },
  {
    label: '补发' + (orderDetail.value?.exchange_unit || 'TRX'),
    field: 'resend_trx',
    span: 8,
    slots: {
      default: (data) => {
        if (!data.resend_trx) return '-'
        return h('span', null, [
          `${data.resend_trx} `,
          h('span', { class: 'text-blue-500' }, data.exchange_unit || 'TRX')
        ])
      }
    }
  },
  {
    label: '补发时间',
    field: 'resend_time',
    span: 8,
    slots: { default: (data) => formatNullableDateTime(data.resend_time) }
  },
  { label: '备注', field: 'describe', span: 8, slots: { default: (data) => data.describe ?? '-' } }
])

// 用户转出 Schema（pay_transaction）
const transactionInSchema = computed<DescriptionsSchema[]>(() => [
  {
    field: 'in_txid',
    label: '交易Hash',
    span: 24,
    slots: {
      default: (row: any) => {
        if (!row || !row.in_txid) return h('span', '-')
        return h(
          ElLink,
          {
            href: `${import.meta.env.VITE_TRONSCAN_URL}/#/transaction/${row.in_txid}`,
            type: 'primary',
            target: '_blank'
          },
          () => row.in_txid
        )
      }
    }
  },
  { field: 'pay_from_address', label: '发送人', span: 24 },
  { field: 'pay_to_address', label: '接收人', span: 24 },
  {
    field: 'order_amount',
    label: '金额',
    slots: {
      default: (row: any) => {
        if (!row || !row.order_amount) return h('span', '-')
        const unit = row.order_type === 1 ? 'USDT' : 'TRX'
        return h('span', `${row.order_amount}（${unit}）`)
      }
    }
  },
  {
    field: 'in_time',
    label: '转出时间',
    slots: {
      default: (row: any) => {
        if (!row || !row.in_time) return h('span', '-')
        return h('span', formatToDateTime(row.in_time))
      }
    }
  }
])

// 用户接收 Schema（deliver_transaction）
const transactionOutSchema = computed<DescriptionsSchema[]>(() => [
  {
    field: 'out_txid',
    label: '交易Hash',
    span: 24,
    slots: {
      default: (row: any) => {
        if (!row || !row.out_txid) return h('span', '-')
        return h(
          ElLink,
          {
            href: `${import.meta.env.VITE_TRONSCAN_URL}/#/transaction/${row.out_txid}`,
            type: 'primary',
            target: '_blank'
          },
          () => row.out_txid
        )
      }
    }
  },
  {
    field: 'deliver_from_address',
    label: '发送人',
    span: 24,
    slots: {
      default: (row: any) => h('span', row?.deliver_from_address || '-')
    }
  },
  {
    field: 'deliver_to_address',
    label: '接收人',
    span: 24,
    slots: {
      default: (row: any) => h('span', row?.deliver_to_address || '-')
    }
  },
  {
    field: 'user_get_amount',
    label: '金额',
    slots: {
      default: (row: any) => {
        if (!row || !row.user_get_amount) return h('span', '-')
        const unit = row.order_type === 1 ? 'TRX' : 'USDT'
        return h('span', `${row.user_get_amount}（${unit}）`)
      }
    }
  },
  {
    field: 'out_time',
    label: '接收时间',
    slots: {
      default: (row: any) => {
        if (!row || !row.out_time) return h('span', '-')
        return h('span', formatToDateTime(row.out_time))
      }
    }
  }
])

const open = async (orderIdValue: number | string, rowData?: any) => {
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
    const responseData = (res as any)?.data as V2ExchangeDetail
    const responseCode = (res as any)?.code
    const responseMessage = (res as any)?.msg || (res as any)?.message

    if (responseCode === '000000' && responseData) {
      const exchange = responseData.exchange
      const payTx = responseData.pay_transaction
      const deliverTx = responseData.deliver_transaction

      // 判断订单类型
      let orderType = 1 // 默认 USDT → TRX
      if (exchange.in_coin === 'TRX' && exchange.out_coin === 'USDT') {
        orderType = 2 // TRX → USDT
      }

      orderDetail.value = {
        order_id: responseData.id,
        username: responseData.agent_name,
        user_id: responseData.user_id,
        order_type: orderType,
        order_amount: responseData.amount,
        pay_unit: exchange.in_coin || rowData?.coin || '',
        exchange_amount: exchange.out_amount,
        exchange_unit: exchange.out_coin,
        trx_price: exchange.actual_rate,
        real_price: exchange.real_rate,
        plate_profit: exchange.plate_profit,
        agent_cost: rowData?.agent_cost || responseData.agent_cost || 0,
        status: responseData.status,
        finish_time: responseData.paid_at || exchange.out_at || 0,
        describe: responseData.describe,
        // 补发信息：基于 exchange.retry_at 判断是否补发
        // retry_at 不存在/为空/为0 → 未补发，显示横杠；否则表示已补发
        resend_trx: exchange.retry_at ? exchange.out_amount || '' : '',
        resend_time: exchange.retry_at || 0,
        // 用户转出（pay_transaction）
        pay_from_address: payTx?.from || '',
        pay_to_address: payTx?.to || '',
        in_txid: payTx?.id || '',
        in_time: payTx?.time ? payTx.time * 1000 : 0,
        // 用户接收（deliver_transaction）
        deliver_from_address: deliverTx?.from || '',
        deliver_to_address: deliverTx?.to || '',
        out_txid: exchange.out_txid || deliverTx?.id || '',
        out_time: deliverTx?.time ? deliverTx.time * 1000 : 0,
        user_get_amount: deliverTx?.amount || '0'
      }
    } else {
      ElMessage.error(responseMessage || '获取订单详情失败')
    }
  } catch (error) {
    console.error('获取订单详情出错:', error)
    ElMessage.error('获取订单详情失败')
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
