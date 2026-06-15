<script setup lang="ts">
import { computed, h } from 'vue'
import { ElLink } from 'element-plus'
import { Descriptions } from '@/components/Descriptions'
import type { DescriptionsSchema } from '@/components/Descriptions'
import formatEnergyNum from '@/views/OrderManage/helpers/formatEnergyNum' // Assuming helper is moved or copied
import isEmpty from 'lodash-es/isEmpty'

const props = defineProps({
  orderData: {
    type: Object,
    default: () => ({})
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
  }
  // Commented out fields already present in the main orderDetailSchema in parent
])
</script>

<template>
  <Descriptions :schema="byTimeDetailSchema" :data="orderData" :column="2" border />
</template>

<style scoped>
/* Add component-specific styles if needed */
</style>
