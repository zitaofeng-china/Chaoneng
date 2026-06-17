<template>
  <div class="app-container">
    <ContentWrap>
      <div class="energy-statistics-report" v-loading="loading">
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
            <table class="energy-report-table">
              <colgroup>
                <col style="width: 150px" />
                <col style="width: 150px" />
                <col style="width: 130px" />
                <col style="width: 150px" />
                <col style="width: 150px" />
                <col style="width: 126px" />
                <col style="width: 202px" />
                <col style="width: 118px" />
              </colgroup>
              <thead>
                <tr class="summary-row">
                  <td>数据汇总</td>
                  <td>{{ formatCount(summaryTotals.flash_energy) }}</td>
                  <td>{{ formatCount(summaryTotals.stroke_energy) }}</td>
                  <td>{{ formatCount(summaryTotals.hosting) }}</td>
                  <td>{{ formatCount(summaryTotals.weal_energy) }}</td>
                  <td>{{ formatCount(summaryTotals.batch_energy) }}</td>
                  <td>{{ formatCount(summaryTotals.total) }}</td>
                  <td>{{ formatPercent(summaryWelfareRatio) }}</td>
                </tr>
                <tr class="header-row">
                  <th>日期</th>
                  <th>
                    <button type="button" class="sort-header" @click="handleSort('flash_energy')">
                      闪租
                      <span class="sort-icon" aria-hidden="true">
                        <i
                          class="sort-caret sort-caret-up"
                          :class="{
                            active: sortState.prop === 'flash_energy' && sortState.order === 'ASC'
                          }"
                        ></i>
                        <i
                          class="sort-caret sort-caret-down"
                          :class="{
                            active: sortState.prop === 'flash_energy' && sortState.order === 'DESC'
                          }"
                        ></i>
                      </span>
                    </button>
                  </th>
                  <th>
                    <button type="button" class="sort-header" @click="handleSort('stroke_energy')">
                      按笔数
                      <span class="sort-icon" aria-hidden="true">
                        <i
                          class="sort-caret sort-caret-up"
                          :class="{
                            active: sortState.prop === 'stroke_energy' && sortState.order === 'ASC'
                          }"
                        ></i>
                        <i
                          class="sort-caret sort-caret-down"
                          :class="{
                            active: sortState.prop === 'stroke_energy' && sortState.order === 'DESC'
                          }"
                        ></i>
                      </span>
                    </button>
                  </th>
                  <th>
                    <button type="button" class="sort-header" @click="handleSort('hosting')">
                      托管
                      <span class="sort-icon" aria-hidden="true">
                        <i
                          class="sort-caret sort-caret-up"
                          :class="{
                            active: sortState.prop === 'hosting' && sortState.order === 'ASC'
                          }"
                        ></i>
                        <i
                          class="sort-caret sort-caret-down"
                          :class="{
                            active: sortState.prop === 'hosting' && sortState.order === 'DESC'
                          }"
                        ></i>
                      </span>
                    </button>
                  </th>
                  <th>
                    <button type="button" class="sort-header" @click="handleSort('weal_energy')">
                      福利
                      <span class="sort-icon" aria-hidden="true">
                        <i
                          class="sort-caret sort-caret-up"
                          :class="{
                            active: sortState.prop === 'weal_energy' && sortState.order === 'ASC'
                          }"
                        ></i>
                        <i
                          class="sort-caret sort-caret-down"
                          :class="{
                            active: sortState.prop === 'weal_energy' && sortState.order === 'DESC'
                          }"
                        ></i>
                      </span>
                    </button>
                  </th>
                  <th>
                    <button type="button" class="sort-header" @click="handleSort('batch_energy')">
                      批量下单
                      <span class="sort-icon" aria-hidden="true">
                        <i
                          class="sort-caret sort-caret-up"
                          :class="{
                            active: sortState.prop === 'batch_energy' && sortState.order === 'ASC'
                          }"
                        ></i>
                        <i
                          class="sort-caret sort-caret-down"
                          :class="{
                            active: sortState.prop === 'batch_energy' && sortState.order === 'DESC'
                          }"
                        ></i>
                      </span>
                    </button>
                  </th>
                  <th>
                    <button type="button" class="sort-header" @click="handleSort('total')">
                      总计
                      <span class="sort-icon" aria-hidden="true">
                        <i
                          class="sort-caret sort-caret-up"
                          :class="{
                            active: sortState.prop === 'total' && sortState.order === 'ASC'
                          }"
                        ></i>
                        <i
                          class="sort-caret sort-caret-down"
                          :class="{
                            active: sortState.prop === 'total' && sortState.order === 'DESC'
                          }"
                        ></i>
                      </span>
                    </button>
                  </th>
                  <th> 福利占比 </th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="reportRows.length === 0">
                  <td class="empty-cell" colspan="8">暂无数据</td>
                </tr>
                <tr v-for="row in displayedRows" :key="row.date">
                  <td>{{ row.dateLabel }}</td>
                  <td>{{ formatCount(row.flash_energy) }}</td>
                  <td>{{ formatCount(row.stroke_energy) }}</td>
                  <td>{{ formatCount(row.hosting) }}</td>
                  <td>{{ formatCount(row.weal_energy) }}</td>
                  <td>{{ formatCount(row.batch_energy) }}</td>
                  <td>{{ formatCount(row.total) }}</td>
                  <td>{{ formatPercent(row.welfareRatio) }}</td>
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
import { formatStatsDateLabel } from '@/utils/statsDate'
import { simpleExportToExcel } from '@/utils/excel'
import { handleErrorMessage, handleSuccessMessage } from '@/utils/messageHelper'
import {
  getEnergyStatisticsReport,
  type EnergyStatisticsDetailItem,
  type EnergyStatisticsReportParams,
  type EnergyStatisticsSummary
} from '@/api/opertion/DataStatistics/EnergyStatisticsReport'

type DateRangeValue = [string, string]
type SortOrder = 'ASC' | 'DESC'
type SortableField =
  | 'flash_energy'
  | 'stroke_energy'
  | 'hosting'
  | 'weal_energy'
  | 'batch_energy'
  | 'total'

const SORT_FIELD_MAP: Record<SortableField, string> = {
  flash_energy: 'flash_energy',
  stroke_energy: 'stroke_energy',
  hosting: 'hosting',
  weal_energy: 'weal_energy',
  batch_energy: 'batch_energy',
  total: 'total'
}
const DEFAULT_ORDER = 'date DESC'
interface SearchFormState {
  dateRange: DateRangeValue
}

interface ReportRow {
  date: string
  dateLabel: string
  flash_energy: number
  stroke_energy: number
  hosting: number
  weal_energy: number
  batch_energy: number
  total: number
  welfareRatio: number
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

const createEmptySummary = (): Required<EnergyStatisticsSummary> => ({
  batch_energy: 0,
  flash_energy: 0,
  hosting: 0,
  stroke_energy: 0,
  time_energy: 0,
  total: 0,
  weal_energy: 0
})

const normalizeSummary = (
  summary?: EnergyStatisticsSummary
): Required<EnergyStatisticsSummary> => ({
  batch_energy: toNumber(summary?.batch_energy),
  flash_energy: toNumber(summary?.flash_energy),
  hosting: toNumber(summary?.hosting),
  stroke_energy: toNumber(summary?.stroke_energy),
  time_energy: toNumber(summary?.time_energy),
  total: toNumber(summary?.total),
  weal_energy: toNumber(summary?.weal_energy)
})

const normalizeRow = (row: EnergyStatisticsDetailItem): ReportRow => {
  const flashEnergy = toNumber(row.flash_energy)
  const strokeEnergy = toNumber(row.stroke_energy)
  const hosting = toNumber(row.hosting)
  const wealEnergy = toNumber(row.weal_energy)
  const batchEnergy = toNumber(row.batch_energy)
  const total =
    row.total === undefined
      ? flashEnergy + strokeEnergy + hosting + wealEnergy + batchEnergy
      : toNumber(row.total)

  return {
    date: row.date,
    dateLabel: formatStatsDateLabel(row.date),
    flash_energy: flashEnergy,
    stroke_energy: strokeEnergy,
    hosting,
    weal_energy: wealEnergy,
    batch_energy: batchEnergy,
    total,
    welfareRatio: total > 0 ? wealEnergy / total : 0
  }
}

const loading = ref(false)
const defaultRange = createDefaultRange()
const searchForm = reactive<SearchFormState>({
  dateRange: [...defaultRange] as DateRangeValue
})
const activeRange = ref<DateRangeValue>([...defaultRange] as DateRangeValue)
const reportRows = ref<ReportRow[]>([])
const summaryTotals = ref<Required<EnergyStatisticsSummary>>(createEmptySummary())
const sortState = reactive<{
  prop: SortableField | ''
  order: SortOrder | ''
}>({
  prop: '',
  order: ''
})

const summaryWelfareRatio = computed(() => {
  const total = toNumber(summaryTotals.value.total)
  const wealEnergy = toNumber(summaryTotals.value.weal_energy)
  return total > 0 ? wealEnergy / total : 0
})

const displayedRows = computed(() => reportRows.value)

const formatCount = (value: number | string | undefined) => {
  return toNumber(value).toLocaleString('zh-CN')
}

const formatPercent = (value: number) => {
  return `${(value * 100).toFixed(1)}%`
}

const buildParams = (range: DateRangeValue): EnergyStatisticsReportParams => {
  const params: EnergyStatisticsReportParams = toSecondRange(range)

  params.order =
    sortState.prop && sortState.order
      ? `${SORT_FIELD_MAP[sortState.prop]} ${sortState.order}`
      : DEFAULT_ORDER

  return params
}

const loadData = async (range: DateRangeValue) => {
  loading.value = true

  try {
    const res = await getEnergyStatisticsReport(buildParams(range))
    if (res.code !== '000000' || !res.data) {
      handleErrorMessage(new Error(res.msg || '接口返回异常'), '获取能量统计报表失败')
      return
    }

    const data = res.data
    activeRange.value = [...range] as DateRangeValue
    summaryTotals.value = normalizeSummary(data.summary)
    reportRows.value = Array.isArray(data.detail) ? data.detail.map(normalizeRow) : []
  } catch (error) {
    summaryTotals.value = createEmptySummary()
    reportRows.value = []
    handleErrorMessage(error, '获取能量统计报表失败')
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
  sortState.order = ''
  searchForm.dateRange = [...defaultRange] as DateRangeValue
  await loadData(defaultRange)
}

const handleSort = async (field: SortableField) => {
  if (sortState.prop === field) {
    sortState.order = sortState.order === 'ASC' ? 'DESC' : 'ASC'
  } else {
    sortState.prop = field
    sortState.order = 'DESC'
  }

  await loadData(activeRange.value)
}

const handleExport = () => {
  if (reportRows.value.length === 0) {
    handleErrorMessage('暂无可导出的数据', '导出失败')
    return
  }

  const exportRows = [
    {
      日期: '数据汇总',
      闪租: toNumber(summaryTotals.value.flash_energy),
      按笔数: toNumber(summaryTotals.value.stroke_energy),
      托管: toNumber(summaryTotals.value.hosting),
      福利: toNumber(summaryTotals.value.weal_energy),
      批量下单: toNumber(summaryTotals.value.batch_energy),
      总计: toNumber(summaryTotals.value.total),
      福利占比: formatPercent(summaryWelfareRatio.value)
    },
    ...displayedRows.value.map((row) => ({
      日期: row.dateLabel,
      闪租: row.flash_energy,
      按笔数: row.stroke_energy,
      托管: row.hosting,
      福利: row.weal_energy,
      批量下单: row.batch_energy,
      总计: row.total,
      福利占比: formatPercent(row.welfareRatio)
    }))
  ]

  simpleExportToExcel(
    exportRows,
    `能量统计报表_${dayjs(activeRange.value[0]).format('YYYYMMDD')}_${dayjs(activeRange.value[1]).format('YYYYMMDD')}`
  )
  handleSuccessMessage('导出成功')
}

onMounted(async () => {
  await loadData(defaultRange)
})
</script>

<style scoped>
.energy-statistics-report {
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

.energy-report-table {
  width: 1176px;
  min-width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.energy-report-table th,
.energy-report-table td {
  height: 46px;
  padding: 0 12px;
  font-size: 14px;
  color: #1f2d3d;
  text-align: center;
  vertical-align: middle;
  border: 1px solid #dcdfe6;
}

.energy-report-table .summary-row td {
  height: 48px;
  font-weight: 600;
  color: #111827;
  background: #ffe4bd;
  border-color: #f5d6aa;
}

.energy-report-table .header-row th {
  height: 48px;
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
