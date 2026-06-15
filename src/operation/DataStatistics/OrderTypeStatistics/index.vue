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
            <table class="report-summary-table">
              <colgroup>
                <col style="width: 120px" />
                <col style="width: 110px" />
                <col style="width: 110px" />
                <col style="width: 110px" />
                <col style="width: 110px" />
                <col style="width: 120px" />
                <col style="width: 110px" />
                <col style="width: 110px" />
                <col style="width: 120px" />
              </colgroup>
              <tbody>
                <tr>
                  <td class="summary-cell summary-cell-label">汇总</td>
                  <td class="summary-cell">{{ formatCount(summaryTotals.flashOrderCount) }}</td>
                  <td class="summary-cell">{{ formatCount(summaryTotals.strokeOrderCount) }}</td>
                  <td class="summary-cell">{{ formatCount(summaryTotals.hostedOrderCount) }}</td>
                  <td class="summary-cell">{{ formatCount(summaryTotals.welfareOrderCount) }}</td>
                  <td class="summary-cell">{{ formatCount(summaryTotals.batchOrderCount) }}</td>
                  <td class="summary-cell">
                    {{ formatCount(summaryTotals.activationOrderCount) }}
                  </td>
                  <td class="summary-cell">{{ formatCount(summaryTotals.totalOrderCount) }}</td>
                  <td class="summary-cell">{{ formatPercent(summaryTotals.welfareRatio) }}</td>
                </tr>
              </tbody>
            </table>

            <ElTable
              ref="reportTableRef"
              :data="sortedReportRows"
              border
              class="report-table"
              empty-text="暂无数据"
              :header-cell-style="headerCellStyle"
              :cell-style="bodyCellStyle"
              @sort-change="handleSortChange"
            >
              <ElTableColumn prop="dateLabel" label="日期" min-width="120" align="center" />
              <ElTableColumn
                prop="flashOrderCount"
                label="闪租"
                min-width="110"
                align="center"
                sortable="custom"
              />
              <ElTableColumn
                prop="strokeOrderCount"
                label="按笔数"
                min-width="110"
                align="center"
                sortable="custom"
              />
              <ElTableColumn
                prop="hostedOrderCount"
                label="托管"
                min-width="110"
                align="center"
                sortable="custom"
              />
              <ElTableColumn
                prop="welfareOrderCount"
                label="福利"
                min-width="110"
                align="center"
                sortable="custom"
              />
              <ElTableColumn
                prop="batchOrderCount"
                label="批量下单"
                min-width="120"
                align="center"
                sortable="custom"
              />
              <ElTableColumn
                prop="activationOrderCount"
                label="激活"
                min-width="110"
                align="center"
                sortable="custom"
              />
              <ElTableColumn
                prop="totalOrderCount"
                label="总计"
                min-width="110"
                align="center"
                sortable="custom"
              />
              <ElTableColumn
                prop="welfareRatio"
                label="福利占比"
                min-width="120"
                align="center"
                sortable="custom"
              >
                <template #default="{ row }">
                  {{ row.welfareRatioText }}
                </template>
              </ElTableColumn>
            </ElTable>
          </div>
        </div>
      </div>
    </ContentWrap>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, type CSSProperties } from 'vue'
import dayjs from 'dayjs'
import { ElButton, ElDatePicker, ElTable, ElTableColumn } from 'element-plus'
import type { TableColumnCtx } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { simpleExportToExcel } from '@/utils/excel'
import { handleErrorMessage, handleSuccessMessage } from '@/utils/messageHelper'
import {
  getOrderTypeStatisticsReport,
  type OrderTypeStatisticsDetailItem,
  type OrderTypeStatisticsParams,
  type OrderTypeStatisticsSummary
} from '@/api/opertion/DataStatistics/OrderTypeStatistics'

type DateRangeValue = [string, string]
type SortOrder = 'ascending' | 'descending' | null
type SortableField =
  | 'flashOrderCount'
  | 'strokeOrderCount'
  | 'hostedOrderCount'
  | 'welfareOrderCount'
  | 'batchOrderCount'
  | 'activationOrderCount'
  | 'totalOrderCount'
  | 'welfareRatio'

interface SearchFormState {
  dateRange: DateRangeValue
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

const SORT_FIELD_MAP: Record<Exclude<SortableField, 'welfareRatio'>, string> = {
  flashOrderCount: 'flash_energy',
  strokeOrderCount: 'stroke_energy',
  hostedOrderCount: 'hosting',
  welfareOrderCount: 'weal_energy',
  batchOrderCount: 'batch_energy',
  activationOrderCount: 'batch_active',
  totalOrderCount: 'total'
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
    start_time: String(dayjs(startDate).startOf('day').unix()),
    end_time: String(dayjs(endDate).endOf('day').unix())
  }
}

const formatDateLabel = (date: string) => {
  const parsed = dayjs(date)
  return parsed.isValid() ? parsed.format('M月D日') : date
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
    dateLabel: formatDateLabel(row.date),
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
const defaultRange = createDefaultRange()
const searchForm = reactive<SearchFormState>({
  dateRange: [...defaultRange] as DateRangeValue
})
const activeRange = ref<DateRangeValue>([...defaultRange] as DateRangeValue)
const reportRows = ref<ReportRow[]>([])
const reportTableRef = ref<ComponentRef<typeof ElTable>>()
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

const headerCellStyle = (): CSSProperties => {
  return {
    background: '#f7f7f7',
    color: '#303133',
    fontWeight: '600',
    textAlign: 'center'
  }
}

const bodyCellStyle = (): CSSProperties => {
  return {
    textAlign: 'center'
  }
}

const sortedReportRows = computed(() => {
  if (!sortState.prop || !sortState.order) {
    return reportRows.value
  }

  if (sortState.prop !== 'welfareRatio') {
    return reportRows.value
  }

  const rows = [...reportRows.value]
  const factor = sortState.order === 'ascending' ? 1 : -1

  rows.sort((left, right) => {
    const leftValue = left[sortState.prop]
    const rightValue = right[sortState.prop]

    if (leftValue === rightValue) {
      return right.date.localeCompare(left.date)
    }

    return (leftValue - rightValue) * factor
  })

  return rows
})

const buildParams = (range: DateRangeValue): OrderTypeStatisticsParams => {
  const params: OrderTypeStatisticsParams = toSecondRange(range)

  if (sortState.prop && sortState.order && sortState.prop !== 'welfareRatio') {
    params.order = `${SORT_FIELD_MAP[sortState.prop]} ${sortState.order === 'ascending' ? 'ASC' : 'DESC'}`
  }

  return params
}

const loadData = async (range: DateRangeValue) => {
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
    activeRange.value = [...range] as DateRangeValue
  } catch (error) {
    summaryTotals.value = createEmptySummary()
    reportRows.value = []
    handleErrorMessage(error, '获取订单类型统计失败')
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
  sortState.prop = ''
  sortState.order = null
  reportTableRef.value?.clearSort()
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
      日期: '汇总',
      闪租: summaryTotals.value.flashOrderCount,
      按笔数: summaryTotals.value.strokeOrderCount,
      托管: summaryTotals.value.hostedOrderCount,
      福利: summaryTotals.value.welfareOrderCount,
      批量下单: summaryTotals.value.batchOrderCount,
      激活: summaryTotals.value.activationOrderCount,
      总计: summaryTotals.value.totalOrderCount,
      福利占比: formatPercent(summaryTotals.value.welfareRatio)
    },
    ...sortedReportRows.value.map((row) => ({
      日期: row.dateLabel,
      闪租: row.flashOrderCount,
      按笔数: row.strokeOrderCount,
      托管: row.hostedOrderCount,
      福利: row.welfareOrderCount,
      批量下单: row.batchOrderCount,
      激活: row.activationOrderCount,
      总计: row.totalOrderCount,
      福利占比: row.welfareRatioText
    }))
  ]

  simpleExportToExcel(
    exportRows,
    `订单类型统计_${dayjs(activeRange.value[0]).format('YYYYMMDD')}_${dayjs(activeRange.value[1]).format('YYYYMMDD')}`
  )
  handleSuccessMessage('导出成功')
}

const handleSortChange = async ({
  prop,
  order
}: {
  column: TableColumnCtx<ReportRow>
  prop: keyof ReportRow | null
  order: SortOrder
}) => {
  if (
    prop !== 'flashOrderCount' &&
    prop !== 'strokeOrderCount' &&
    prop !== 'hostedOrderCount' &&
    prop !== 'welfareOrderCount' &&
    prop !== 'batchOrderCount' &&
    prop !== 'activationOrderCount' &&
    prop !== 'totalOrderCount' &&
    prop !== 'welfareRatio'
  ) {
    sortState.prop = ''
    sortState.order = null
    return
  }

  sortState.prop = prop
  sortState.order = order

  if (prop !== 'welfareRatio') {
    await loadData(activeRange.value)
  }
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

.report-summary-table {
  width: 100%;
  min-width: 1020px;
  background: #ffe4bd;
  border-collapse: collapse;
  table-layout: fixed;
}

.summary-cell {
  height: 48px;
  padding: 0 12px;
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  text-align: center;
  vertical-align: middle;
  border-right: 1px solid #f5d6aa;
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
