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
import { computed, onMounted, reactive, ref } from 'vue'
import dayjs from 'dayjs'
import { ElButton, ElDatePicker } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { simpleExportToExcel } from '@/utils/excel'
import { handleErrorMessage, handleSuccessMessage } from '@/utils/messageHelper'
import {
  getSaleByTimeReport,
  type SaleByTimeReportParams,
  type SaleByTimeReportSummaryItem
} from '@/api/opertion/DataStatistics/SaleByTimeReport'

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

const toNumber = (value: number | string | undefined) => {
  const numberValue = Number(value ?? 0)
  return Number.isFinite(numberValue) ? numberValue : 0
}

const toSecondRange = ([startDate, endDate]: DateRangeValue) => {
  return {
    start_time: String(dayjs(startDate).startOf('day').unix()),
    end_time: String(dayjs(endDate).endOf('day').unix())
  }
}

const loading = ref(false)
const defaultRange = createDefaultRange()
const searchForm = reactive<SearchFormState>({
  dateRange: [...defaultRange] as DateRangeValue
})
const activeRange = ref<DateRangeValue>([...defaultRange] as DateRangeValue)
const reportRows = ref<ReportRow[]>([])

const formatCount = (value: number | string | undefined) => {
  return toNumber(value).toLocaleString('zh-CN')
}

const formatEnergySummary = (value: number) => {
  return `${(value / 10000).toFixed(2)}w`
}

const formatPercent = (value: number) => {
  return `${(value * 100).toFixed(1)}%`
}

const buildReportRow = (
  typeKey: ReportTypeKey,
  categoryKey: ReportCategoryKey,
  metrics: ReportMetrics,
  totalAmount?: number
): ReportRow => {
  const metricsTotal =
    metrics.flashAmount +
    metrics.strokeAmount +
    metrics.hostedAmount +
    metrics.welfareAmount +
    metrics.batchAmount
  return {
    typeKey,
    typeLabel: typeKey === 'order' ? '订单数' : '能量数',
    categoryKey,
    categoryLabel: categoryKey === 'agent' ? '代理' : '自营',
    ...metrics,
    totalAmount: totalAmount ?? metricsTotal,
    ratioText: '0.0%'
  }
}

const normalizeReportRow = (
  typeKey: ReportTypeKey,
  categoryKey: ReportCategoryKey,
  item: SaleByTimeReportSummaryItem = {}
): ReportRow => {
  const metrics: ReportMetrics = {
    flashAmount: toNumber(item.flash_energy),
    strokeAmount: toNumber(item.stroke_energy),
    hostedAmount: toNumber(item.hosting),
    welfareAmount: toNumber(item.weal_energy),
    batchAmount: toNumber(item.batch_energy)
  }
  const fallbackTotal =
    metrics.flashAmount +
    metrics.strokeAmount +
    metrics.hostedAmount +
    metrics.welfareAmount +
    metrics.batchAmount +
    toNumber(item.batch_active)

  return buildReportRow(
    typeKey,
    categoryKey,
    metrics,
    item.total === undefined ? fallbackTotal : toNumber(item.total)
  )
}

const mergeSummaryItems = (items: SaleByTimeReportSummaryItem[]): SaleByTimeReportSummaryItem => {
  return items.reduce<SaleByTimeReportSummaryItem>((totals, item) => {
    const merged: SaleByTimeReportSummaryItem = {
      batch_active: toNumber(totals.batch_active) + toNumber(item.batch_active),
      batch_energy: toNumber(totals.batch_energy) + toNumber(item.batch_energy),
      flash_energy: toNumber(totals.flash_energy) + toNumber(item.flash_energy),
      hosting: toNumber(totals.hosting) + toNumber(item.hosting),
      stroke_energy: toNumber(totals.stroke_energy) + toNumber(item.stroke_energy),
      time_energy: toNumber(totals.time_energy) + toNumber(item.time_energy),
      weal_energy: toNumber(totals.weal_energy) + toNumber(item.weal_energy)
    }

    if (totals.total !== undefined || item.total !== undefined) {
      merged.total = toNumber(totals.total) + toNumber(item.total)
    }

    return merged
  }, {})
}

const groupSummaryItems = (items: SaleByTimeReportSummaryItem[] = []) => {
  return {
    agent: mergeSummaryItems(
      items.filter((item) => {
        const level = toNumber(item.level)
        return level === 1 || level === 2 || level === 3
      })
    ),
    self: mergeSummaryItems(items.filter((item) => toNumber(item.level) === 8))
  }
}

const normalizeReportRows = (
  orderRows: SaleByTimeReportSummaryItem[] = [],
  energyRows: SaleByTimeReportSummaryItem[] = []
): ReportRow[] => {
  const groupedOrderRows = groupSummaryItems(orderRows)
  const groupedEnergyRows = groupSummaryItems(energyRows)

  return [
    normalizeReportRow('order', 'agent', groupedOrderRows.agent),
    normalizeReportRow('order', 'self', groupedOrderRows.self),
    normalizeReportRow('energy', 'agent', groupedEnergyRows.agent),
    normalizeReportRow('energy', 'self', groupedEnergyRows.self)
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
      return totals
    },
    {
      flashAmount: 0,
      strokeAmount: 0,
      hostedAmount: 0,
      welfareAmount: 0,
      batchAmount: 0
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

const buildParams = (range: DateRangeValue): SaleByTimeReportParams => {
  return toSecondRange(range)
}

const loadData = async (range: DateRangeValue) => {
  loading.value = true

  try {
    const res = await getSaleByTimeReport(buildParams(range))
    if (res.code !== '000000' || !res.data) {
      reportRows.value = []
      handleErrorMessage(new Error(res.msg || '接口返回异常'), '获取按时间销售报表失败')
      return
    }

    reportRows.value = normalizeReportRows(res.data.order, res.data.energy)
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
  width: 1234px;
  background: #ffe4bd;
  border-collapse: collapse;
  table-layout: fixed;
}

.report-table {
  width: 1234px;
}

.report-detail-table {
  width: 1234px;
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
