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

const createDefaultRange = (): DateRangeValue => {
  const endDate = dayjs().format('YYYY-MM-DD')
  const startDate = dayjs().subtract(6, 'day').format('YYYY-MM-DD')
  return [startDate, endDate]
}

const loading = ref(false)
const defaultRange = createDefaultRange()
const searchForm = reactive<SearchFormState>({
  dateRange: [...defaultRange] as DateRangeValue
})
const activeRange = ref<DateRangeValue>([...defaultRange] as DateRangeValue)
const reportRows = ref<ReportRow[]>([])
const sortState = reactive<{
  prop: SortableField | ''
  order: SortOrder
}>({
  prop: '',
  order: null
})

const formatCount = (value: number) => {
  return value.toLocaleString('zh-CN')
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

const createMockRows = (range: DateRangeValue): ReportRow[] => {
  const [startDate, endDate] = range
  const start = dayjs(startDate)
  const end = dayjs(endDate)

  if (!start.isValid() || !end.isValid() || start.isAfter(end)) {
    return []
  }

  const dayCount = Math.min(end.diff(start, 'day') + 1, 31)

  return Array.from({ length: dayCount }, (_, index) => {
    const current = end.subtract(index, 'day')
    const seed = current.date() + current.month() * 3 + current.day()
    const flashOrderCount = 560 + ((seed * 7) % 95)
    const strokeOrderCount = 4 + (seed % 4)
    const hostedOrderCount = 3 + (seed % 3)
    const welfareOrderCount = 24 + (seed % 9)
    const batchOrderCount = 48 + ((seed * 5) % 18)
    const activationOrderCount = 46 + ((seed * 3) % 17)
    const totalOrderCount =
      flashOrderCount +
      strokeOrderCount +
      hostedOrderCount +
      welfareOrderCount +
      batchOrderCount +
      activationOrderCount
    const welfareRatio = totalOrderCount > 0 ? welfareOrderCount / totalOrderCount : 0

    return {
      date: current.format('YYYY-MM-DD'),
      dateLabel: current.format('M月D日'),
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
  })
}

const summaryTotals = computed<SummaryTotals>(() => {
  const totals = reportRows.value.reduce<SummaryTotals>(
    (accumulator, row) => {
      accumulator.flashOrderCount += row.flashOrderCount
      accumulator.strokeOrderCount += row.strokeOrderCount
      accumulator.hostedOrderCount += row.hostedOrderCount
      accumulator.welfareOrderCount += row.welfareOrderCount
      accumulator.batchOrderCount += row.batchOrderCount
      accumulator.activationOrderCount += row.activationOrderCount
      accumulator.totalOrderCount += row.totalOrderCount
      return accumulator
    },
    {
      flashOrderCount: 0,
      strokeOrderCount: 0,
      hostedOrderCount: 0,
      welfareOrderCount: 0,
      batchOrderCount: 0,
      activationOrderCount: 0,
      totalOrderCount: 0,
      welfareRatio: 0
    }
  )

  totals.welfareRatio =
    totals.totalOrderCount > 0 ? totals.welfareOrderCount / totals.totalOrderCount : 0

  return totals
})

const sortedReportRows = computed(() => {
  const rows = [...reportRows.value]

  if (!sortState.prop || !sortState.order) {
    return rows
  }

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

const loadData = async (range: DateRangeValue) => {
  loading.value = true

  try {
    reportRows.value = createMockRows(range)
    activeRange.value = [...range] as DateRangeValue
  } catch (error) {
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
    ...reportRows.value.map((row) => ({
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

const handleSortChange = ({
  prop,
  order
}: {
  column: TableColumnCtx<ReportRow>
  prop: keyof ReportRow
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
  background: #9cd17a;
  border-collapse: collapse;
  table-layout: fixed;
}

.summary-cell {
  height: 48px;
  padding: 0 12px;
  font-size: 15px;
  font-weight: 600;
  color: #1f2d1b;
  text-align: center;
  vertical-align: middle;
  border-right: 1px solid rgb(255 255 255 / 24%);
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
