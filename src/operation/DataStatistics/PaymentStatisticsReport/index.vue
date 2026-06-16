<template>
  <div class="app-container">
    <ContentWrap>
      <div class="payment-statistics-report" v-loading="loading">
        <div class="report-toolbar">
          <div class="toolbar-filters">
            <div class="filter-item">
              <span class="filter-label">日期：</span>
              <ElDatePicker
                v-model="searchForm.dateRange"
                type="daterange"
                unlink-panels
                range-separator="-"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="YYYY-MM-DD"
                :clearable="false"
              />
            </div>
          </div>

          <div class="toolbar-actions">
            <ElButton @click="handleSearch">搜索</ElButton>
            <ElButton @click="handleReset">重置</ElButton>
            <ElButton type="warning" @click="handleExport">导出表格</ElButton>
          </div>
        </div>

        <div class="report-table-card">
          <div class="report-table-scroll">
            <table class="payment-report-table">
              <colgroup>
                <col style="width: 160px" />
                <col style="width: 120px" />
                <col style="width: 120px" />
                <col style="width: 120px" />
                <col style="width: 120px" />
                <col style="width: 120px" />
                <col style="width: 120px" />
                <col style="width: 120px" />
                <col style="width: 120px" />
              </colgroup>
              <thead>
                <tr class="group-header-row">
                  <th rowspan="2">日期</th>
                  <th colspan="2">订单数</th>
                  <th colspan="2">订单数占比</th>
                  <th colspan="2">能量数</th>
                  <th colspan="2">能量数占比</th>
                </tr>
                <tr class="sub-header-row">
                  <th class="order-count-header">转账</th>
                  <th class="order-count-header">非转账</th>
                  <th class="ratio-header">转账</th>
                  <th class="ratio-header">非转账</th>
                  <th>转账</th>
                  <th>非转账</th>
                  <th class="ratio-header">转账</th>
                  <th class="ratio-header">非转账</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="reportRows.length === 0">
                  <td class="empty-cell" colspan="9">暂无数据</td>
                </tr>
                <tr v-for="row in reportRows" :key="row.date">
                  <td>{{ row.dateLabel }}</td>
                  <td>{{ formatCount(row.orderByWallet) }}</td>
                  <td>{{ formatCount(row.orderByBalance) }}</td>
                  <td>{{ formatPercent(row.orderWalletRatio) }}</td>
                  <td>{{ formatPercent(row.orderBalanceRatio) }}</td>
                  <td>{{ formatCount(row.energyByWallet) }}</td>
                  <td>{{ formatCount(row.energyByBalance) }}</td>
                  <td>{{ formatPercent(row.energyWalletRatio) }}</td>
                  <td>{{ formatPercent(row.energyBalanceRatio) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ContentWrap>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import dayjs from 'dayjs'
import { ElButton, ElDatePicker } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { simpleExportToExcel } from '@/utils/excel'
import { handleErrorMessage, handleSuccessMessage } from '@/utils/messageHelper'
import {
  getPaymentStatisticsReport,
  type PaymentStatisticsItem,
  type PaymentStatisticsReportParams
} from '@/api/opertion/DataStatistics/PaymentStatisticsReport'

type DateRangeValue = [string, string]

interface SearchFormState {
  dateRange: DateRangeValue
}

interface ReportRow {
  date: string
  dateLabel: string
  energyBalanceRatio: number
  energyByBalance: number
  energyByWallet: number
  energyWalletRatio: number
  orderBalanceRatio: number
  orderByBalance: number
  orderByWallet: number
  orderWalletRatio: number
}

const createDefaultRange = (): DateRangeValue => {
  const endDate = dayjs().format('YYYY-MM-DD')
  const startDate = dayjs().subtract(6, 'day').format('YYYY-MM-DD')
  return [startDate, endDate]
}

const toNumber = (value: number | string | undefined) => {
  const numberValue = Number(value ?? 0)
  return Number.isFinite(numberValue) ? numberValue : 0
}

const toSecondRange = ([startDate, endDate]: DateRangeValue) => {
  return {
    end_time: String(dayjs(endDate).endOf('day').unix()),
    start_time: String(dayjs(startDate).startOf('day').unix())
  }
}

const formatDateLabel = (date: string) => {
  const parsed = dayjs(date)
  return parsed.isValid() ? parsed.format('M月D日') : date || '-'
}

const createRatio = (value: number, total: number) => {
  return total > 0 ? value / total : 0
}

const normalizeRow = (item: PaymentStatisticsItem): ReportRow => {
  const orderByWallet = toNumber(item.order_by_wallet)
  const orderByBalance = toNumber(item.order_by_balance)
  const energyByWallet = toNumber(item.energy_by_wallet)
  const energyByBalance = toNumber(item.energy_by_balance)
  const orderTotal = orderByWallet + orderByBalance
  const energyTotal = energyByWallet + energyByBalance
  const date = item.date || ''

  return {
    date,
    dateLabel: formatDateLabel(date),
    energyBalanceRatio: createRatio(energyByBalance, energyTotal),
    energyByBalance,
    energyByWallet,
    energyWalletRatio: createRatio(energyByWallet, energyTotal),
    orderBalanceRatio: createRatio(orderByBalance, orderTotal),
    orderByBalance,
    orderByWallet,
    orderWalletRatio: createRatio(orderByWallet, orderTotal)
  }
}

const loading = ref(false)
const defaultRange = createDefaultRange()
const activeRange = ref<DateRangeValue>([...defaultRange] as DateRangeValue)
const reportRows = ref<ReportRow[]>([])
const searchForm = reactive<SearchFormState>({
  dateRange: [...defaultRange] as DateRangeValue
})

const formatCount = (value: number | string | undefined) => {
  return toNumber(value).toLocaleString('zh-CN')
}

const formatPercent = (value: number) => {
  return `${(value * 100).toFixed(2)}%`
}

const buildParams = (range: DateRangeValue): PaymentStatisticsReportParams => {
  return toSecondRange(range)
}

const loadData = async (range: DateRangeValue) => {
  loading.value = true

  try {
    const res = await getPaymentStatisticsReport(buildParams(range))
    if (res.code !== '000000' || !res.data) {
      reportRows.value = []
      handleErrorMessage(new Error(res.msg || '接口返回异常'), '获取支付统计报表失败')
      return
    }

    reportRows.value = Array.isArray(res.data) ? res.data.map(normalizeRow) : []
    activeRange.value = [...range] as DateRangeValue
  } catch (error) {
    reportRows.value = []
    handleErrorMessage(error, '获取支付统计报表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = async () => {
  if (!Array.isArray(searchForm.dateRange) || searchForm.dateRange.length !== 2) {
    handleErrorMessage('请选择日期范围', '搜索失败')
    return
  }

  await loadData(searchForm.dateRange)
}

const handleReset = async () => {
  searchForm.dateRange = [...defaultRange] as DateRangeValue
  await loadData(defaultRange)
}

const handleExport = () => {
  if (reportRows.value.length === 0) {
    handleErrorMessage('暂无可导出的数据', '导出失败')
    return
  }

  const exportRows = reportRows.value.map((row) => ({
    日期: row.dateLabel,
    订单数_转账: row.orderByWallet,
    订单数_非转账: row.orderByBalance,
    订单数占比_转账: formatPercent(row.orderWalletRatio),
    订单数占比_非转账: formatPercent(row.orderBalanceRatio),
    能量数_转账: row.energyByWallet,
    能量数_非转账: row.energyByBalance,
    能量数占比_转账: formatPercent(row.energyWalletRatio),
    能量数占比_非转账: formatPercent(row.energyBalanceRatio)
  }))

  simpleExportToExcel(
    exportRows,
    `支付统计报表_${dayjs(activeRange.value[0]).format('YYYYMMDD')}_${dayjs(activeRange.value[1]).format('YYYYMMDD')}`
  )
  handleSuccessMessage('导出成功')
}

onMounted(async () => {
  await loadData(defaultRange)
})
</script>

<style scoped>
.payment-statistics-report {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.report-toolbar {
  display: flex;
  gap: 20px;
  align-items: center;
  flex-wrap: wrap;
}

.toolbar-filters,
.filter-item {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.toolbar-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-left: 4px;
}

.filter-label {
  flex-shrink: 0;
  font-size: 14px;
  color: #303133;
}

.report-table-card {
  overflow: hidden;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 6px;
}

.report-table-scroll {
  overflow-x: auto;
}

.payment-report-table {
  width: 1120px;
  min-width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.payment-report-table th,
.payment-report-table td {
  height: 42px;
  padding: 0 12px;
  font-size: 14px;
  color: #1f2d3d;
  text-align: center;
  vertical-align: middle;
  border: 1px solid #dcdfe6;
}

.payment-report-table th {
  font-weight: 600;
  color: #303133;
  background: #f7f7f7;
}

.payment-report-table .sub-header-row .order-count-header {
  background: #9bd47f;
}

.payment-report-table .sub-header-row .ratio-header {
  background: #ffe4bd;
}

.empty-cell {
  color: #909399;
}

@media (width <= 900px) {
  .report-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
