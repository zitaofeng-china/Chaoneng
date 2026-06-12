<script setup lang="ts">
import { computed, h } from 'vue'
import { Descriptions } from '@/components/Descriptions'
import type { DescriptionsSchema } from '@/components/Descriptions'
// TODO: 确认 formatEnergyNum 辅助函数路径或复制过来
import formatEnergyNum from '@/views/OrderManage/helpers/formatEnergyNum'
import isEmpty from 'lodash-es/isEmpty'
import { ElLink } from 'element-plus'
// 导入主订单类型
import type { EnergyTransactionOrder } from '@/api/energy_transaction'

const props = defineProps({
  orderData: {
    // 修改：明确 orderData 的类型
    type: Object as () => EnergyTransactionOrder | null,
    default: () => null
  }
})

// 按时间详情 schema
const byTimeDetailSchema = computed((): DescriptionsSchema[] => [
  {
    field: 'energy_num',
    label: '能量数量',
    slots: {
      default: (data: any) => h('span', {}, formatEnergyNum(data.energy_num) ?? '-')
    }
  },
  { field: 'energy_rent_text', label: '能量有效期' },
  {
    field: 'energy_price',
    label: '单价',
    slots: { default: (data: any) => h('span', {}, data.energy_price + data.pay_unit) }
  },
  {
    field: 'stroke_num',
    label: '笔数',
    slots: { default: (data: any) => h('span', {}, data.stroke_num + '笔') }
  },
  { field: 'receive_address', label: '接收地址', span: 24 },
  {
    field: 'txid',
    label: '能量转账hash',
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
    field: 'recycle_txid',
    label: '回收hash',
    span: 24,
    slots: {
      default: (data: any) => {
        if (isEmpty(data?.recycle_txid)) return h('span', '-')
        return h(
          ElLink,
          {
            href: `${import.meta.env.VITE_TRONSCAN_URL}/#/transaction/${data.recycle_txid}`,
            type: 'primary',
            target: '_blank'
          },
          () => data.recycle_txid
        )
      }
    }
  }
])
</script>

<template>
  <!-- 确保传递的是 orderData -->
  <Descriptions
    v-if="orderData"
    :schema="byTimeDetailSchema"
    :data="orderData"
    :column="2"
    border
  />
  <div v-else>加载中...</div>
</template>

<style scoped>
/* Add component-specific styles if needed */
</style>
