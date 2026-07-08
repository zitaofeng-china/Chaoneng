<template>
  <QuickChargeOrderDetail ref="detailRef" :fetch-detail="v1GetQuickChargeOrderDetail" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { QuickChargeOrderDetail } from '@/components/QuickChargeOrderDetail'
import { v1GetQuickChargeOrderDetail } from '@/api/management/OrderManage/QuickChargeOrder'
import type { QuickChargeOrder } from '../types'

const detailRef = ref<InstanceType<typeof QuickChargeOrderDetail> | null>(null)

const open = (row: QuickChargeOrder) => {
  detailRef.value?.open(row)
}

defineExpose({
  open
})
</script>
