<template>
  <div class="app-container">
    <ContentWrap>
      <div class="user-statistics-report" v-loading="loading">
        <div class="report-toolbar">
          <div class="toolbar-filters">
            <div class="filter-item filter-item-keyword">
              <span class="filter-label">关键词：</span>
              <ElInput
                v-model="searchForm.keyword"
                placeholder="机器人ID / 机器人用户名"
                clearable
                @keyup.enter="handleSearch"
              />
            </div>

            <div class="toolbar-actions">
              <ElButton @click="handleSearch">搜索</ElButton>
              <ElButton @click="handleReset">重置</ElButton>
              <ElButton type="warning" @click="handleExport">导出表格</ElButton>
            </div>
          </div>
        </div>

        <div class="report-table-card">
          <div class="report-table-scroll">
            <table class="report-table">
              <thead>
                <tr class="summary-row">
                  <td colspan="3" class="summary-label"
                    >合计：{{ formatCount(summaryGrandTotal) }}</td
                  >
                  <td v-for="column in METRIC_COLUMNS" :key="column.field">
                    {{ formatCount(getMetricValue(summaryTotals, column.field)) }}
                  </td>
                </tr>
                <tr class="header-row">
                  <th>机器人ID</th>
                  <th>机器人用户名</th>
                  <th>归属代理</th>
                  <th v-for="column in METRIC_COLUMNS" :key="column.field">
                    <button type="button" class="sort-header" @click="handleSort(column.field)">
                      {{ column.label }}
                      <span class="sort-icon" aria-hidden="true">
                        <i
                          class="sort-caret sort-caret-up"
                          :class="{
                            active:
                              sortState.prop === column.field && sortState.order === 'ascending'
                          }"
                        ></i>
                        <i
                          class="sort-caret sort-caret-down"
                          :class="{
                            active:
                              sortState.prop === column.field && sortState.order === 'descending'
                          }"
                        ></i>
                      </span>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="reportRows.length === 0">
                  <td colspan="11" class="empty-cell">暂无数据</td>
                </tr>
                <tr v-for="row in reportRows" :key="row.botId">
                  <td>{{ row.botId }}</td>
                  <td>{{ row.botUsername }}</td>
                  <td>{{ row.agentName }}</td>
                  <td v-for="column in METRIC_COLUMNS" :key="column.field">
                    {{ formatCount(getMetricValue(row, column.field)) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="report-pagination">
            <div class="pagination-total">
              共 {{ totalCount }} 条记录 第 {{ pagination.currentPage }} / {{ totalPages }} 页
            </div>

            <ElPagination
              v-model:current-page="pagination.currentPage"
              v-model:page-size="pagination.pageSize"
              background
              layout="prev, pager, next, sizes, jumper"
              :total="totalCount"
              :page-sizes="[10, 20, 50, 100]"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </div>
      </div>
    </ContentWrap>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElButton, ElInput, ElPagination } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { exportStyledAoaToExcel } from '@/utils/excel'
import { handleErrorMessage, handleSuccessMessage } from '@/utils/messageHelper'
import {
  getUserStatisticsReport,
  type UserStatisticsDetailItem,
  type UserStatisticsReportData,
  type UserStatisticsReportParams,
  type UserStatisticsSummary
} from '@/api/opertion/DataStatistics/UserStatisticsReport'

type SortableField =
  | 'todayNew'
  | 'todayOrderNew'
  | 'yesterdayNew'
  | 'yesterdayOrderNew'
  | 'currentMonthNew'
  | 'currentMonthOrderNew'
  | 'lastMonthNew'
  | 'lastMonthOrderNew'
type SortOrder = 'ascending' | 'descending' | null

interface SearchFormState {
  keyword: string
}

interface ReportRow {
  agentName: string
  botId: string
  botUsername: string
  currentMonthNew: number
  lastMonthNew: number
  todayNew: number
  yesterdayNew: number
  currentMonthOrderNew: number
  lastMonthOrderNew: number
  todayOrderNew: number
  yesterdayOrderNew: number
}

interface SummaryTotals {
  currentMonthNew: number
  lastMonthNew: number
  todayNew: number
  total: number
  yesterdayNew: number
  currentMonthOrderNew: number
  lastMonthOrderNew: number
  todayOrderNew: number
  yesterdayOrderNew: number
}

const METRIC_COLUMNS: Array<{ field: SortableField; label: string }> = [
  { field: 'todayNew', label: '今日增长人数' },
  { field: 'todayOrderNew', label: '今日增长订单' },
  { field: 'yesterdayNew', label: '昨日增长人数' },
  { field: 'yesterdayOrderNew', label: '昨日增长订单' },
  { field: 'currentMonthNew', label: '本月增长人数' },
  { field: 'currentMonthOrderNew', label: '本月增长订单' },
  { field: 'lastMonthNew', label: '上月增长人数' },
  { field: 'lastMonthOrderNew', label: '上月增长订单' }
]

const SORT_FIELD_MAP: Record<SortableField, string> = {
  currentMonthNew: 'growth_user_this_month',
  currentMonthOrderNew: 'growth_order_this_month',
  lastMonthNew: 'growth_user_last_month',
  lastMonthOrderNew: 'growth_order_last_month',
  todayNew: 'growth_user_today',
  todayOrderNew: 'growth_order_today',
  yesterdayNew: 'growth_user_yesterday',
  yesterdayOrderNew: 'growth_order_yesterday'
}

const toNumber = (value: number | string | undefined) => {
  const numberValue = Number(value ?? 0)
  return Number.isFinite(numberValue) ? numberValue : 0
}

const createEmptySummary = (): SummaryTotals => ({
  currentMonthNew: 0,
  lastMonthNew: 0,
  todayNew: 0,
  total: 0,
  yesterdayNew: 0,
  currentMonthOrderNew: 0,
  lastMonthOrderNew: 0,
  todayOrderNew: 0,
  yesterdayOrderNew: 0
})

const normalizePager = (pager?: UserStatisticsReportData['pager']) => {
  const currentPage = toNumber(pager?.current_page)
  const pageSize = toNumber(pager?.page_size)

  return {
    currentPage: currentPage > 0 ? currentPage : 1,
    pageSize: pageSize > 0 ? pageSize : 10,
    total: toNumber(pager?.total)
  }
}

const normalizeSummary = (summary?: UserStatisticsSummary): SummaryTotals => {
  const todayNew = toNumber(summary?.growth_user_today)
  const yesterdayNew = toNumber(summary?.growth_user_yesterday)
  const currentMonthNew = toNumber(summary?.growth_user_this_month)
  const lastMonthNew = toNumber(summary?.growth_user_last_month)
  const fallbackTotal = todayNew + yesterdayNew + currentMonthNew + lastMonthNew
  const todayOrderNew = toNumber(summary?.growth_order_today)
  const yesterdayOrderNew = toNumber(summary?.growth_order_yesterday)
  const currentMonthOrderNew = toNumber(summary?.growth_order_this_month)
  const lastMonthOrderNew = toNumber(summary?.growth_order_last_month)
  return {
    currentMonthNew,
    lastMonthNew,
    todayNew,
    total:
      summary?.growth_user_total === undefined
        ? fallbackTotal
        : toNumber(summary.growth_user_total),
    yesterdayNew,
    currentMonthOrderNew,
    lastMonthOrderNew,
    todayOrderNew,
    yesterdayOrderNew
  }
}

const normalizeRow = (row: UserStatisticsDetailItem): ReportRow => {
  return {
    agentName: row.agent_name || '-',
    botId: String(row.bot_id ?? ''),
    botUsername: row.bot_name || '-',
    currentMonthNew: toNumber(row.growth_user_this_month),
    lastMonthNew: toNumber(row.growth_user_last_month),
    todayNew: toNumber(row.growth_user_today),
    yesterdayNew: toNumber(row.growth_user_yesterday),
    currentMonthOrderNew: toNumber(row.growth_order_this_month),
    lastMonthOrderNew: toNumber(row.growth_order_last_month),
    todayOrderNew: toNumber(row.growth_order_today),
    yesterdayOrderNew: toNumber(row.growth_order_yesterday)
  }
}

const getDetailList = (data: UserStatisticsReportData) => {
  return Array.isArray(data.detail) ? data.detail : data.list || []
}

const loading = ref(false)
const reportRows = ref<ReportRow[]>([])
const totalCount = ref(0)
const summaryTotals = ref<SummaryTotals>(createEmptySummary())
const searchForm = reactive<SearchFormState>({
  keyword: ''
})
const activeFilters = reactive<SearchFormState>({
  keyword: ''
})
const pagination = reactive({
  currentPage: 1,
  pageSize: 10
})
const sortState = reactive<{
  order: SortOrder
  prop: SortableField | null
}>({
  order: null,
  prop: null
})

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(totalCount.value / pagination.pageSize))
})

const summaryGrandTotal = computed(() => {
  return summaryTotals.value.total
})

const formatCount = (value: number) => {
  return toNumber(value).toLocaleString('zh-CN')
}

const getMetricValue = (row: Pick<ReportRow, SortableField>, field: SortableField) => row[field]

const buildParams = (): UserStatisticsReportParams => {
  const params: UserStatisticsReportParams = {
    current_page: pagination.currentPage,
    page_size: pagination.pageSize
  }

  if (activeFilters.keyword) {
    params.keyword = activeFilters.keyword
  }

  if (sortState.prop && sortState.order) {
    params.order = `${SORT_FIELD_MAP[sortState.prop]} ${sortState.order === 'ascending' ? 'ASC' : 'DESC'}`
  }

  return params
}

const resetReportState = () => {
  reportRows.value = []
  totalCount.value = 0
  summaryTotals.value = createEmptySummary()
}

const loadData = async () => {
  loading.value = true

  try {
    const res = await getUserStatisticsReport(buildParams())
    if (res.code !== '000000' || !res.data) {
      resetReportState()
      handleErrorMessage(new Error(res.msg || '接口返回异常'), '获取增长统计报表失败')
      return
    }

    const detail = getDetailList(res.data)
    const pager = normalizePager(res.data.pager)
    reportRows.value = detail.map(normalizeRow)
    summaryTotals.value = normalizeSummary(res.data.summary)
    pagination.currentPage = pager.currentPage
    pagination.pageSize = pager.pageSize
    totalCount.value = pager.total || toNumber(res.data.total ?? detail.length)
  } catch (error) {
    resetReportState()
    handleErrorMessage(error, '获取增长统计报表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = async () => {
  activeFilters.keyword = searchForm.keyword.trim()
  pagination.currentPage = 1
  await loadData()
}

const handleReset = async () => {
  searchForm.keyword = ''
  activeFilters.keyword = ''
  pagination.currentPage = 1
  pagination.pageSize = 10
  sortState.prop = null
  sortState.order = null
  await loadData()
}

const handleExport = async () => {
  if (totalCount.value === 0) {
    handleErrorMessage('暂无可导出的数据', '导出失败')
    return
  }

  try {
    const res = await getUserStatisticsReport({
      ...buildParams(),
      current_page: 1,
      page_size: totalCount.value
    })

    if (res.code !== '000000' || !res.data) {
      handleErrorMessage(new Error(res.msg || '接口返回异常'), '导出失败')
      return
    }

    const exportSummary = normalizeSummary(res.data.summary)
    const exportRows = [
      ['机器人ID', '机器人用户名', '归属代理', ...METRIC_COLUMNS.map((column) => column.label)],
      ['合计', '-', '-', ...METRIC_COLUMNS.map((column) => exportSummary[column.field])],
      ...getDetailList(res.data).map((item) => {
        const row = normalizeRow(item)
        return [
          row.botId,
          row.botUsername || '-',
          row.agentName || '-',
          ...METRIC_COLUMNS.map((column) => row[column.field])
        ]
      })
    ]

    exportStyledAoaToExcel({
      data: exportRows,
      filename: '增长统计报表',
      sheetName: '增长统计报表',
      columnWidths: [
        { wpx: 120 },
        { wpx: 160 },
        { wpx: 140 },
        ...METRIC_COLUMNS.map(() => ({ wpx: 130 }))
      ],
      rowHeights: [{ hpx: 36 }, ...exportRows.slice(1).map(() => ({ hpx: 32 }))],
      highlightRows: [1]
    })
    handleSuccessMessage('导出成功')
  } catch (error) {
    handleErrorMessage(error, '导出失败')
  }
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
    sortState.prop = null
  }

  pagination.currentPage = 1
  await loadData()
}

const handleCurrentChange = async (page: number) => {
  pagination.currentPage = page
  await loadData()
}

const handleSizeChange = async (size: number) => {
  pagination.pageSize = size
  pagination.currentPage = 1
  await loadData()
}

onMounted(async () => {
  await loadData()
})
</script>

<style scoped>
.user-statistics-report {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.report-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.toolbar-filters {
  display: flex;
  gap: 20px;
  align-items: center;
  flex-wrap: wrap;
}

.filter-item {
  display: flex;
  gap: 8px;
  align-items: center;
}

.filter-item-keyword :deep(.el-input) {
  width: 220px;
}

.filter-label {
  flex-shrink: 0;
  font-size: 14px;
  color: #303133;
}

.toolbar-actions {
  display: flex;
  gap: 12px;
  align-items: center;
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
  height: 44px;
  padding: 0 8px;
  font-size: 14px;
  color: #1f2d3d;
  text-align: center;
  white-space: nowrap;
  vertical-align: middle;
  border: 1px solid #dcdfe6;
}

.report-table .summary-row td {
  height: 48px;
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  background: #ffe4bd;
  border-color: #f5d6aa;
}

.report-table .summary-row .summary-label {
  padding-left: 12px;
  text-align: left;
}

.report-table .header-row th {
  height: 48px;
  font-weight: 600;
  color: #303133;
  background: #f5f7fa;
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

.report-pagination {
  display: flex;
  gap: 16px;
  justify-content: space-between;
  align-items: center;
  padding: 14px 12px;
}

.pagination-total {
  font-size: 14px;
  color: #606266;
}

@media (width <= 900px) {
  .report-toolbar,
  .report-pagination {
    align-items: flex-start;
    flex-direction: column;
  }

  .toolbar-filters {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
