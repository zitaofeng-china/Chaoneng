<template>
  <div class="table-wrapper">
    <div class="table-header">
      <h3>TRX 价格数据（近一个月）</h3>
    </div>
    <Table
      v-loading="loading"
      :columns="columns"
      :data="dataList"
      stripe
      border
      :empty-text="'暂无数据'"
      :height="550"
      @register="tableRegister"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { useTable } from '@/hooks/web/useTable'
import { Table, TableColumn } from '@/components/Table'
import { getTrxVolume } from '@/api/opertion/DataStatistics/ExchangeRateIndex'
import { handleErrorMessage } from '@/utils/messageHelper'
import {
  formatPriceValue,
  normalizeTrxVolumeList,
  sortByTimeDesc,
  type TrxVolumeData
} from './trxData'

const getTrxPriceData = async (): Promise<{ list: TrxVolumeData[]; total: number }> => {
  try {
    // 获取近一个月的数据
    const now = new Date()
    const endTimestamp = now.getTime()
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(now.getMonth() - 1)
    const startTimestamp = oneMonthAgo.getTime()

    const data = await getTrxVolume({
      start_timestamp: startTimestamp,
      end_timestamp: endTimestamp,
      limit: 100,
      source: 'coinmarketcap'
    })

    if (Array.isArray(data.data)) {
      const processedData = normalizeTrxVolumeList(data.data)

      return {
        list: sortByTimeDesc(processedData),
        total: processedData.length
      }
    }

    return {
      list: [],
      total: 0
    }
  } catch (error) {
    handleErrorMessage(error, '获取TRX价格数据失败')
    return {
      list: [],
      total: 0
    }
  }
}

// 使用表格 hook
const { tableRegister, tableState } = useTable({
  fetchDataApi: getTrxPriceData
})

const { loading, dataList } = tableState
const formatPrice = (price: number | string | null | undefined): string =>
  formatPriceValue(price, 4)

// 表格列定义
const columns = reactive<TableColumn[]>([
  {
    field: 'time',
    label: '日期',
    formatter: (row: TrxVolumeData) => {
      const date = new Date(row.time)
      return date.toISOString().split('T')[0]
    }
  },
  {
    field: 'open',
    label: '开盘价',
    formatter: (row: TrxVolumeData) => formatPrice(row.open)
  },
  {
    field: 'high',
    label: '最高价',
    formatter: (row: TrxVolumeData) => formatPrice(row.high)
  },
  {
    field: 'low',
    label: '最低价',
    formatter: (row: TrxVolumeData) => formatPrice(row.low)
  },
  {
    field: 'close',
    label: '收盘价',
    formatter: (row: TrxVolumeData) => formatPrice(row.close)
  }
])
</script>

<style scoped>
.table-wrapper {
  width: 100%;
  height: 100%;
  padding: 16px;
  overflow: hidden;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgb(0 0 0 / 10%);
}

.table-header {
  display: flex;
  margin-bottom: 16px;
  justify-content: space-between;
  align-items: center;
}

.table-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}
</style>
