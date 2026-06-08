<template>
  <div class="exchange-rate-container">
    <div class="chart-container">
      <TrxChart />
    </div>
    <div class="table-container">
      <TrxTable />
    </div>
  </div>
</template>

<script setup lang="tsx">
import TrxChart from '../components/TrxChart.vue'
import TrxTable from '../components/TrxTable.vue'

// 页面组件逻辑由相应的子组件自行处理
</script>

<style scoped>
.exchange-rate-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
}

.chart-container {
  flex: 1;
  min-height: 400px;
  margin-bottom: 20px;
}

.table-container {
  flex: 1;
  min-height: 400px;
}
</style>
