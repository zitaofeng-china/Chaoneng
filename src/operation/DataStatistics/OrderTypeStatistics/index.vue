<template>
  <div class="app-container">
    <ContentWrap>
      <div class="order-type-statistics" v-loading="loading">
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
            <table class="report-table">
              <thead>
                <tr class="summary-row">
                  <td>汇总</td>
                  <td>{{ formatCount(summaryTotals.flashOrderCount) }}</td>
                  <td>{{ formatCount(summaryTotals.strokeOrderCount) }}</td>
                  <td>{{ formatCount(summaryTotals.hostedOrderCount) }}</td>
                  <td>{{ formatCount(summaryTotals.welfareOrderCount) }}</td>
                  <td>{{ formatCount(summaryTotals.batchOrderCount) }}</td>
                  <td>{{ formatCount(summaryTotals.activationOrderCount) }}</td>
                  <td>{{ formatCount(summaryTotals.totalOrderCount) }}</td>
                  <td>{{ formatPercent(summaryTotals.welfareRatio) }}</td>
                </tr>
                <tr class="header-row">
                  <th>日期</th>
                  <th>
                    <button
                      type="button"
                      class="sort-header"
                      @click="handleSort('flashOrderCount')"
                    >
                      闪租
                      <span class="sort-icon" aria-hidden="true">
                        <i
                          class="sort-caret sort-caret-up"
                          :class="{
                            active:
                              sortState.prop === 'flashOrderCount' &&
                              sortState.order === 'ascending'
                          }"
                        ></i>
                        <i
                          class="sort-caret sort-caret-down"
                          :class="{
                            active:
                              sortState.prop === 'flashOrderCount' &&
                              sortState.order === 'descending'
                          }"
                        ></i>
                      </span>
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      class="sort-header"
                      @click="handleSort('strokeOrderCount')"
                    >
                      按笔数
                      <span class="sort-icon" aria-hidden="true">
                        <i
                          class="sort-caret sort-caret-up"
                          :class="{
                            active:
                              sortState.prop === 'strokeOrderCount' &&
                              sortState.order === 'ascending'
                          }"
                        ></i>
                        <i
                          class="sort-caret sort-caret-down"
                          :class="{
                            active:
                              sortState.prop === 'strokeOrderCount' &&
                              sortState.order === 'descending'
                          }"
                        ></i>
                      </span>
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      class="sort-header"
                      @click="handleSort('hostedOrderCount')"
                    >
                      托管
                      <span class="sort-icon" aria-hidden="true">
                        <i
                          class="sort-caret sort-caret-up"
                          :class="{
                            active:
                              sortState.prop === 'hostedOrderCount' &&
                              sortState.order === 'ascending'
                          }"
                        ></i>
                        <i
                          class="sort-caret sort-caret-down"
                          :class="{
                            active:
                              sortState.prop === 'hostedOrderCount' &&
                              sortState.order === 'descending'
                          }"
                        ></i>
                      </span>
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      class="sort-header"
                      @click="handleSort('welfareOrderCount')"
                    >
                      福利
                      <span class="sort-icon" aria-hidden="true">
                        <i
                          class="sort-caret sort-caret-up"
                          :class="{
                            active:
                              sortState.prop === 'welfareOrderCount' &&
                              sortState.order === 'ascending'
                          }"
                        ></i>
                        <i
                          class="sort-caret sort-caret-down"
                          :class="{
                            active:
                              sortState.prop === 'welfareOrderCount' &&
                              sortState.order === 'descending'
                          }"
                        ></i>
                      </span>
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      class="sort-header"
                      @click="handleSort('batchOrderCount')"
                    >
                      批量下单
                      <span class="sort-icon" aria-hidden="true">
                        <i
                          class="sort-caret sort-caret-up"
                          :class="{
                            active:
                              sortState.prop === 'batchOrderCount' &&
                              sortState.order === 'ascending'
                          }"
                        ></i>
                        <i
                          class="sort-caret sort-caret-down"
                          :class="{
                            active:
                              sortState.prop === 'batchOrderCount' &&
                              sortState.order === 'descending'
                          }"
                        ></i>
                      </span>
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      class="sort-header"
                      @click="handleSort('activationOrderCount')"
                    >
                      激活
                      <span class="sort-icon" aria-hidden="true">
                        <i
                          class="sort-caret sort-caret-up"
                          :class="{
                            active:
                              sortState.prop === 'activationOrderCount' &&
                              sortState.order === 'ascending'
                          }"
                        ></i>
                        <i
                          class="sort-caret sort-caret-down"
                          :class="{
                            active:
                              sortState.prop === 'activationOrderCount' &&
                              sortState.order === 'descending'
                          }"
                        ></i>
                      </span>
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      class="sort-header"
                      @click="handleSort('totalOrderCount')"
                    >
                      总计
                      <span class="sort-icon" aria-hidden="true">
                        <i
                          class="sort-caret sort-caret-up"
                          :class="{
                            active:
                              sortState.prop === 'totalOrderCount' &&
                              sortState.order === 'ascending'
                          }"
                        ></i>
                        <i
                          class="sort-caret sort-caret-down"
                          :class="{
                            active:
                              sortState.prop === 'totalOrderCount' &&
                              sortState.order === 'descending'
                          }"
                        ></i>
                      </span>
                    </button>
                  </th>
                  <th>福利占比</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="reportRows.length === 0">
                  <td colspan="9" class="empty-cell">暂无数据</td>
                </tr>
                <tr v-for="row in reportRows" :key="row.date">
                  <td>{{ row.dateLabel }}</td>
                  <td>{{ formatCount(row.flashOrderCount) }}</td>
                  <td>{{ formatCount(row.strokeOrderCount) }}</td>
                  <td>{{ formatCount(row.hostedOrderCount) }}</td>
                  <td>{{ formatCount(row.welfareOrderCount) }}</td>
                  <td>{{ formatCount(row.batchOrderCount) }}</td>
                  <td>{{ formatCount(row.activationOrderCount) }}</td>
                  <td>{{ formatCount(row.totalOrderCount) }}</td>
                  <td>{{ row.welfareRatioText }}</td>
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
import { formatStatsDateLabel } from '@/utils/statsDate'
import { exportStyledAoaToExcel } from '@/utils/excel'
import { handleErrorMessage, handleSuccessMessage } from '@/utils/messageHelper'
import {
  buildStatsExportFilename,
  createRecentDateRange,
  isValidStatsDateRange,
  toStatsSecondRange,
  type StatsDateRangeValue
} from '@/utils/statsReport'
import {
  getOrderTypeStatisticsReport,
  type OrderTypeStatisticsDetailItem,
  type OrderTypeStatisticsParams,
  type OrderTypeStatisticsSummary
} from '@/api/opertion/DataStatistics/OrderTypeStatistics'

type SortOrder = 'ascending' | 'descending' | null
type SortableField =
  | 'flashOrderCount'
  | 'strokeOrderCount'
  | 'hostedOrderCount'
  | 'welfareOrderCount'
  | 'batchOrderCount'
  | 'activationOrderCount'
  | 'totalOrderCount'

interface SearchFormState {
  dateRange: StatsDateRangeValue
}

interface ReportRow {
  date: string
  dateLabel: string
  flashOrderCount: number
  strokeOrderCount: number
  hostedOrderCount: number
  welfareOrderCount: number
  batchOrderCount: number
  activationOrderCount: number
  totalOrderCount: number
  welfareRatio: number
  welfareRatioText: string
}

interface SummaryTotals {
  flashOrderCount: number
  strokeOrderCount: number
  hostedOrderCount: number
  welfareOrderCount: number
  batchOrderCount: number
  activationOrderCount: number
  totalOrderCount: number
  welfareRatio: number
}

const SORT_FIELD_MAP: Record<SortableField, string> = {
  flashOrderCount: 'flash_energy',
  strokeOrderCount: 'stroke_energy',
  hostedOrderCount: 'hosting',
  welfareOrderCount: 'weal_energy',
  batchOrderCount: 'batch_energy',
  activationOrderCount: 'batch_active',
  totalOrderCount: 'total'
}
const DEFAULT_ORDER = 'date DESC'

const toNumber = (value: number | string | undefined) => {
  const numberValue = Number(value ?? 0)
  return Number.isFinite(numberValue) ? numberValue : 0
}

const createEmptySummary = (): SummaryTotals => ({
  flashOrderCount: 0,
  strokeOrderCount: 0,
  hostedOrderCount: 0,
  welfareOrderCount: 0,
  batchOrderCount: 0,
  activationOrderCount: 0,
  totalOrderCount: 0,
  welfareRatio: 0
})

const normalizeSummary = (summary?: OrderTypeStatisticsSummary): SummaryTotals => {
  const flashOrderCount = toNumber(summary?.flash_energy)
  const strokeOrderCount = toNumber(summary?.stroke_energy)
  const hostedOrderCount = toNumber(summary?.hosting)
  const welfareOrderCount = toNumber(summary?.weal_energy)
  const batchOrderCount = toNumber(summary?.batch_energy)
  const activationOrderCount = toNumber(summary?.batch_active)
  const totalOrderCount =
    summary?.total === undefined
      ? flashOrderCount +
        strokeOrderCount +
        hostedOrderCount +
        welfareOrderCount +
        batchOrderCount +
        activationOrderCount
      : toNumber(summary.total)

  return {
    flashOrderCount,
    strokeOrderCount,
    hostedOrderCount,
    welfareOrderCount,
    batchOrderCount,
    activationOrderCount,
    totalOrderCount,
    welfareRatio: totalOrderCount > 0 ? welfareOrderCount / totalOrderCount : 0
  }
}

const normalizeRow = (row: OrderTypeStatisticsDetailItem): ReportRow => {
  const flashOrderCount = toNumber(row.flash_energy)
  const strokeOrderCount = toNumber(row.stroke_energy)
  const hostedOrderCount = toNumber(row.hosting)
  const welfareOrderCount = toNumber(row.weal_energy)
  const batchOrderCount = toNumber(row.batch_energy)
  const activationOrderCount = toNumber(row.batch_active)
  const totalOrderCount =
    row.total === undefined
      ? flashOrderCount +
        strokeOrderCount +
        hostedOrderCount +
        welfareOrderCount +
        batchOrderCount +
        activationOrderCount
      : toNumber(row.total)
  const welfareRatio = totalOrderCount > 0 ? welfareOrderCount / totalOrderCount : 0

  return {
    date: row.date,
    dateLabel: formatStatsDateLabel(row.date),
    flashOrderCount,
    strokeOrderCount,
    hostedOrderCount,
    welfareOrderCount,
    batchOrderCount,
    activationOrderCount,
    totalOrderCount,
    welfareRatio,
    welfareRatioText: formatPercent(welfareRatio)
  }
}

const loading = ref(false)
const defaultRange = createRecentDateRange(7)
const searchForm = reactive<SearchFormState>({
  dateRange: [...defaultRange] as StatsDateRangeValue
})
const activeRange = ref<StatsDateRangeValue>([...defaultRange] as StatsDateRangeValue)
const reportRows = ref<ReportRow[]>([])
const summaryTotals = ref<SummaryTotals>(createEmptySummary())
const sortState = reactive<{
  prop: SortableField | ''
  order: SortOrder
}>({
  prop: '',
  order: null
})

const formatCount = (value: number | string | undefined) => {
  return toNumber(value).toLocaleString('zh-CN')
}

const formatPercent = (value: number) => {
  return `${(value * 100).toFixed(2)}%`
}

const buildParams = (range: StatsDateRangeValue): OrderTypeStatisticsParams => {
  const params: OrderTypeStatisticsParams = toStatsSecondRange(range)

  params.order =
    sortState.prop && sortState.order
      ? `${SORT_FIELD_MAP[sortState.prop]} ${sortState.order === 'ascending' ? 'ASC' : 'DESC'}`
      : DEFAULT_ORDER

  return params
}

const loadData = async (range: StatsDateRangeValue) => {
  loading.value = true

  try {
    const res = await getOrderTypeStatisticsReport(buildParams(range))
    if (res.code !== '000000' || !res.data) {
      summaryTotals.value = createEmptySummary()
      reportRows.value = []
      handleErrorMessage(new Error(res.msg || '接口返回异常'), '获取订单类型统计失败')
      return
    }

    summaryTotals.value = normalizeSummary(res.data.summary)
    reportRows.value = Array.isArray(res.data.detail) ? res.data.detail.map(normalizeRow) : []
    activeRange.value = [...range] as StatsDateRangeValue
  } catch (error) {
    summaryTotals.value = createEmptySummary()
    reportRows.value = []
    handleErrorMessage(error, '获取订单类型统计失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = async () => {
  if (!isValidStatsDateRange(searchForm.dateRange)) {
    handleErrorMessage('请选择日期范围', '搜索失败')
    return
  }

  await loadData(searchForm.dateRange)
}

const handleReset = async () => {
  sortState.prop = ''
  sortState.order = null
  searchForm.dateRange = [...defaultRange] as StatsDateRangeValue
  await loadData(defaultRange)
}

const handleExport = () => {
  if (reportRows.value.length === 0) {
    handleErrorMessage('暂无可导出的数据', '导出失败')
    return
  }

  const exportRows = [
    ['日期', '闪租', '按笔数', '托管', '福利', '批量下单', '激活', '总计', '福利占比'],
    [
      '汇总',
      summaryTotals.value.flashOrderCount,
      summaryTotals.value.strokeOrderCount,
      summaryTotals.value.hostedOrderCount,
      summaryTotals.value.welfareOrderCount,
      summaryTotals.value.batchOrderCount,
      summaryTotals.value.activationOrderCount,
      summaryTotals.value.totalOrderCount,
      formatPercent(summaryTotals.value.welfareRatio)
    ],
    ...reportRows.value.map((row) => [
      row.dateLabel,
      row.flashOrderCount,
      row.strokeOrderCount,
      row.hostedOrderCount,
      row.welfareOrderCount,
      row.batchOrderCount,
      row.activationOrderCount,
      row.totalOrderCount,
      row.welfareRatioText
    ])
  ]

  exportStyledAoaToExcel({
    data: exportRows,
    filename: buildStatsExportFilename('订单类型统计', activeRange.value),
    sheetName: '订单类型统计',
    columnWidths: [
      { wpx: 110 },
      { wpx: 90 },
      { wpx: 90 },
      { wpx: 90 },
      { wpx: 90 },
      { wpx: 100 },
      { wpx: 90 },
      { wpx: 90 },
      { wpx: 100 }
    ],
    rowHeights: [{ hpx: 36 }, ...exportRows.slice(1).map(() => ({ hpx: 32 }))],
    highlightRows: [1]
  })
  handleSuccessMessage('导出成功')
}

const handleSort = async (field: SortableField) => {
  if (sortState.prop === field) {
    sortState.order =
      sortState.order === 'ascending'
        ? 'descending'
        : sortState.order === 'descending'
          ? null
          : 'ascending'
  } else {
    sortState.prop = field
    sortState.order = 'descending'
  }

  if (!sortState.order) {
    sortState.prop = ''
  }

  await loadData(activeRange.value)
}

onMounted(async () => {
  await loadData(defaultRange)
})
</script>

<style scoped>
.order-type-statistics {
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

.report-table {
  width: max-content;
  min-width: 100%;
  border-collapse: collapse;
  table-layout: auto;
}

.report-table th,
.report-table td {
  height: 48px;
  padding: 0 8px;
  font-size: 14px;
  color: #1f2d3d;
  text-align: center;
  white-space: nowrap;
  vertical-align: middle;
  border: 1px solid #dcdfe6;
}

.report-table .summary-row td {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  background: #ffe4bd;
  border-color: #f5d6aa;
}

.report-table .header-row th {
  font-weight: 600;
  color: #303133;
  background: #f7f7f7;
}

.sort-header {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 30px;
  padding: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
  background: transparent;
  border: none;
}

.sort-icon {
  position: relative;
  width: 14px;
  height: 14px;
}

.sort-caret {
  position: absolute;
  left: 3px;
  width: 0;
  height: 0;
  border-right: 4px solid transparent;
  border-left: 4px solid transparent;
}

.sort-caret-up {
  top: 1px;
  border-bottom: 5px solid #c0c4cc;
}

.sort-caret-down {
  bottom: 1px;
  border-top: 5px solid #c0c4cc;
}

.sort-caret-up.active {
  border-bottom-color: #409eff;
}

.sort-caret-down.active {
  border-top-color: #409eff;
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
