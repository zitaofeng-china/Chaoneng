<template>
  <div class="app-container">
    <ContentWrap>
      <div class="sale-by-time-report" v-loading="loading">
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
            <table class="report-summary-table">
              <colgroup>
                <col style="width: 80px" />
                <col style="width: 84px" />
                <col style="width: 160px" />
                <col style="width: 164px" />
                <col style="width: 164px" />
                <col style="width: 164px" />
                <col style="width: 164px" />
                <col style="width: 118px" />
                <col style="width: 118px" />
                <col style="width: 136px" />
              </colgroup>
              <tbody>
                <tr>
                  <td class="summary-cell summary-cell-label" colspan="2"> 数据统计 </td>
                  <td class="summary-cell">{{ formatCount(summaryOrderMetrics.flashAmount) }}</td>
                  <td class="summary-cell">{{ formatCount(summaryOrderMetrics.strokeAmount) }}</td>
                  <td class="summary-cell">{{ formatCount(summaryOrderMetrics.hostedAmount) }}</td>
                  <td class="summary-cell">{{ formatCount(summaryOrderMetrics.welfareAmount) }}</td>
                  <td class="summary-cell">{{ formatCount(summaryOrderMetrics.batchAmount) }}</td>
                  <td class="summary-cell">{{
                    formatCount(summaryOrderMetrics.activationAmount)
                  }}</td>
                  <td class="summary-cell summary-cell-tail" colspan="2">
                    订单：{{ formatCount(summaryOrderTotal) }} 能量：{{
                      formatEnergySummary(summaryEnergyTotal)
                    }}
                  </td>
                </tr>
              </tbody>
            </table>

            <table class="report-detail-table">
              <colgroup>
                <col style="width: 80px" />
                <col style="width: 84px" />
                <col style="width: 160px" />
                <col style="width: 164px" />
                <col style="width: 164px" />
                <col style="width: 164px" />
                <col style="width: 164px" />
                <col style="width: 118px" />
                <col style="width: 118px" />
                <col style="width: 136px" />
              </colgroup>
              <thead>
                <tr>
                  <th>类型</th>
                  <th>类别</th>
                  <th>闪租</th>
                  <th>按笔数</th>
                  <th>托管</th>
                  <th>福利</th>
                  <th>批量下单</th>
                  <th>激活</th>
                  <th>总计</th>
                  <th>福利占比</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, index) in reportRowsWithRatio"
                  :key="`${row.typeKey}-${row.categoryKey}`"
                >
                  <td v-if="index === 0 || index === 2" :rowspan="2">{{ row.typeLabel }}</td>
                  <td>{{ row.categoryLabel }}</td>
                  <td>{{ formatCount(row.flashAmount) }}</td>
                  <td>{{ formatCount(row.strokeAmount) }}</td>
                  <td>{{ formatCount(row.hostedAmount) }}</td>
                  <td>{{ formatCount(row.welfareAmount) }}</td>
                  <td>{{ formatCount(row.batchAmount) }}</td>
                  <td>{{ formatCount(row.activationAmount) }}</td>
                  <td>{{ formatCount(row.totalAmount) }}</td>
                  <td>{{ row.ratioText }}</td>
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
import { computed, onMounted, reactive, ref, type CSSProperties } from 'vue'
import dayjs from 'dayjs'
import { ElButton, ElDatePicker } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { simpleExportToExcel } from '@/utils/excel'
import { handleErrorMessage, handleSuccessMessage } from '@/utils/messageHelper'

type DateRangeValue = [string, string]
type ReportTypeKey = 'order' | 'energy'
type ReportCategoryKey = 'agent' | 'self'

interface SearchFormState {
  dateRange: DateRangeValue
}

interface ReportMetrics {
  flashAmount: number
  strokeAmount: number
  hostedAmount: number
  welfareAmount: number
  batchAmount: number
  activationAmount: number
}

interface ReportRow extends ReportMetrics {
  typeKey: ReportTypeKey
  typeLabel: string
  categoryKey: ReportCategoryKey
  categoryLabel: string
  totalAmount: number
  ratioText: string
}

const createDefaultRange = (): DateRangeValue => {
  const endDate = dayjs().format('YYYY-MM-DD')
  const startDate = dayjs().subtract(2, 'day').format('YYYY-MM-DD')
  return [startDate, endDate]
}

const loading = ref(false)
const defaultRange = createDefaultRange()
const searchForm = reactive<SearchFormState>({
  dateRange: [...defaultRange] as DateRangeValue
})
const activeRange = ref<DateRangeValue>([...defaultRange] as DateRangeValue)
const reportRows = ref<ReportRow[]>([])

const formatCount = (value: number) => {
  return value.toLocaleString('zh-CN')
}

const formatEnergySummary = (value: number) => {
  return `${(value / 10000).toFixed(2)}w`
}

const formatPercent = (value: number) => {
  return `${(value * 100).toFixed(1)}%`
}

const createOrderMetrics = (seed: number, categorySeed: number): ReportMetrics => {
  return {
    flashAmount: 520 + ((seed * 13 + categorySeed * 17) % 140),
    strokeAmount: 4 + ((seed + categorySeed) % 4),
    hostedAmount: 4 + ((seed * 2 + categorySeed) % 3),
    welfareAmount: 26 + ((seed * 3 + categorySeed) % 9),
    batchAmount: 52 + ((seed * 5 + categorySeed * 2) % 18),
    activationAmount: 48 + ((seed * 7 + categorySeed * 3) % 18)
  }
}

const createEnergyMetrics = (seed: number, categorySeed: number): ReportMetrics => {
  return {
    flashAmount: 32000000 + ((seed * 237841 + categorySeed * 910003) % 9000000),
    strokeAmount: 450000 + ((seed * 6101 + categorySeed * 713) % 650000),
    hostedAmount: 5200000 + ((seed * 81031 + categorySeed * 29011) % 4600000),
    welfareAmount: 1900000 + ((seed * 50123 + categorySeed * 10391) % 2300000),
    batchAmount: 12800000 + ((seed * 171113 + categorySeed * 61103) % 12000000),
    activationAmount: (seed + categorySeed) % 2 === 0 ? 0 : 120000 + ((seed * 3107) % 520000)
  }
}

const buildReportRow = (
  typeKey: ReportTypeKey,
  categoryKey: ReportCategoryKey,
  metrics: ReportMetrics
): ReportRow => {
  const totalAmount =
    metrics.flashAmount +
    metrics.strokeAmount +
    metrics.hostedAmount +
    metrics.welfareAmount +
    metrics.batchAmount +
    metrics.activationAmount
  return {
    typeKey,
    typeLabel: typeKey === 'order' ? '订单数' : '能量数',
    categoryKey,
    categoryLabel: categoryKey === 'agent' ? '代理' : '自营',
    ...metrics,
    totalAmount,
    ratioText: '0.0%'
  }
}

const createMockRows = (range: DateRangeValue): ReportRow[] => {
  const [startDate, endDate] = range
  const start = dayjs(startDate)
  const end = dayjs(endDate)

  if (!start.isValid() || !end.isValid() || start.isAfter(end)) {
    return []
  }

  const duration = end.diff(start, 'day') + 1
  const seed = start.date() + end.date() + duration * 11 + start.month() * 5

  return [
    buildReportRow('order', 'agent', createOrderMetrics(seed, 1)),
    buildReportRow('order', 'self', createOrderMetrics(seed, 2)),
    buildReportRow('energy', 'agent', createEnergyMetrics(seed, 3)),
    buildReportRow('energy', 'self', createEnergyMetrics(seed, 4))
  ]
}

const summaryOrderRows = computed(() => {
  return reportRows.value.filter((row) => row.typeKey === 'order')
})

const summaryEnergyRows = computed(() => {
  return reportRows.value.filter((row) => row.typeKey === 'energy')
})

const sumMetrics = (rows: ReportRow[]): ReportMetrics => {
  return rows.reduce<ReportMetrics>(
    (totals, row) => {
      totals.flashAmount += row.flashAmount
      totals.strokeAmount += row.strokeAmount
      totals.hostedAmount += row.hostedAmount
      totals.welfareAmount += row.welfareAmount
      totals.batchAmount += row.batchAmount
      totals.activationAmount += row.activationAmount
      return totals
    },
    {
      flashAmount: 0,
      strokeAmount: 0,
      hostedAmount: 0,
      welfareAmount: 0,
      batchAmount: 0,
      activationAmount: 0
    }
  )
}

const summaryOrderMetrics = computed(() => {
  return sumMetrics(summaryOrderRows.value)
})

const summaryOrderTotal = computed(() => {
  return summaryOrderRows.value.reduce((total, row) => total + row.totalAmount, 0)
})

const summaryEnergyTotal = computed(() => {
  return summaryEnergyRows.value.reduce((total, row) => total + row.totalAmount, 0)
})

const reportRowsWithRatio = computed<ReportRow[]>(() => {
  const orderBase = summaryOrderTotal.value
  const energyBase = summaryEnergyTotal.value

  return reportRows.value.map((row) => {
    const base = row.typeKey === 'order' ? orderBase : energyBase
    const welfareRatio = base > 0 ? row.welfareAmount / base : 0

    return {
      ...row,
      ratioText: formatPercent(welfareRatio)
    }
  })
})

const loadData = async (range: DateRangeValue) => {
  loading.value = true

  try {
    reportRows.value = createMockRows(range)
    activeRange.value = [...range] as DateRangeValue
  } catch (error) {
    reportRows.value = []
    handleErrorMessage(error, '获取按时间销售报表失败')
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

  const exportRows = [
    {
      类型: '数据统计',
      类别: '-',
      闪租: summaryOrderMetrics.value.flashAmount,
      按笔数: summaryOrderMetrics.value.strokeAmount,
      托管: summaryOrderMetrics.value.hostedAmount,
      福利: summaryOrderMetrics.value.welfareAmount,
      批量下单: summaryOrderMetrics.value.batchAmount,
      激活: summaryOrderMetrics.value.activationAmount,
      总计: `订单 ${summaryOrderTotal.value} / 能量 ${formatEnergySummary(summaryEnergyTotal.value)}`,
      福利占比: '-'
    },
    ...reportRowsWithRatio.value.map((row) => ({
      类型: row.typeLabel,
      类别: row.categoryLabel,
      闪租: row.flashAmount,
      按笔数: row.strokeAmount,
      托管: row.hostedAmount,
      福利: row.welfareAmount,
      批量下单: row.batchAmount,
      激活: row.activationAmount,
      总计: row.totalAmount,
      福利占比: row.ratioText
    }))
  ]

  simpleExportToExcel(
    exportRows,
    `按时间销售报表_${dayjs(activeRange.value[0]).format('YYYYMMDD')}_${dayjs(activeRange.value[1]).format('YYYYMMDD')}`
  )
  handleSuccessMessage('导出成功')
}

onMounted(async () => {
  await loadData(defaultRange)
})
</script>

<style scoped>
.sale-by-time-report {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.report-toolbar {
  display: flex;
  gap: 16px;
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

.report-summary-table {
  width: 1352px;
  background: #ffe4bd;
  border-collapse: collapse;
  table-layout: fixed;
}

.report-table {
  width: 1352px;
}

.report-detail-table {
  width: 1352px;
  border-collapse: collapse;
  table-layout: fixed;
}

.report-detail-table th,
.report-detail-table td {
  height: 48px;
  padding: 0 12px;
  text-align: center;
  vertical-align: middle;
  border: 1px solid #ebeef5;
}

.report-detail-table thead th {
  font-weight: 600;
  color: #303133;
  background: #f7f7f7;
}

.summary-cell {
  height: 50px;
  padding: 0 12px;
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  text-align: center;
  vertical-align: middle;
  border-right: 1px solid #f5d6aa;
}

.summary-cell-label {
  padding-left: 20px;
  text-align: left;
}

.summary-cell-tail {
  padding-right: 20px;
  text-align: right;
  white-space: nowrap;
}

.report-summary-table .summary-cell:last-child {
  border-right: none;
}

.report-table :deep(.el-table__cell) {
  height: 48px;
}

.report-table :deep(.el-table__inner-wrapper::before) {
  display: none;
}

.report-table :deep(.el-table__header-wrapper th),
.report-table :deep(.el-table__body-wrapper td) {
  padding: 0;
}

@media (width <= 900px) {
  .report-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
