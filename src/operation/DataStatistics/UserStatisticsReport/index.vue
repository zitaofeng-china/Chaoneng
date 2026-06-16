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
          <div class="report-summary-bar">
            <div class="summary-cell summary-cell-label">
              合计：{{ formatCount(summaryGrandTotal) }}
            </div>
            <div class="summary-cell">{{ formatCount(summaryTotals.todayNew) }}</div>
            <div class="summary-cell">{{ formatCount(summaryTotals.yesterdayNew) }}</div>
            <div class="summary-cell">{{ formatCount(summaryTotals.currentMonthNew) }}</div>
            <div class="summary-cell">{{ formatCount(summaryTotals.lastMonthNew) }}</div>
          </div>

          <ElTable
            ref="tableRef"
            :data="reportRows"
            border
            stripe
            class="report-table"
            empty-text="暂无数据"
            :header-cell-style="headerCellStyle"
            :cell-style="bodyCellStyle"
            @sort-change="handleSortChange"
          >
            <ElTableColumn prop="botId" label="机器人ID" min-width="160" />
            <ElTableColumn prop="botUsername" label="机器人用户名" min-width="180" />
            <ElTableColumn prop="agentName" label="归属代理" min-width="160" />
            <ElTableColumn
              prop="todayNew"
              label="今日新增"
              min-width="140"
              sortable="custom"
              align="center"
            />
            <ElTableColumn
              prop="yesterdayNew"
              label="昨日新增"
              min-width="140"
              sortable="custom"
              align="center"
            />
            <ElTableColumn
              prop="currentMonthNew"
              label="本月新增"
              min-width="140"
              sortable="custom"
              align="center"
            />
            <ElTableColumn
              prop="lastMonthNew"
              label="上月新增"
              min-width="140"
              sortable="custom"
              align="center"
            />
          </ElTable>

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
import { computed, nextTick, onMounted, reactive, ref, type CSSProperties } from 'vue'
import { ElButton, ElInput, ElPagination, ElTable, ElTableColumn } from 'element-plus'
import type { TableColumnCtx, TableInstance } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { simpleExportToExcel } from '@/utils/excel'
import { handleErrorMessage, handleSuccessMessage } from '@/utils/messageHelper'
import {
  getUserStatisticsReport,
  type UserStatisticsDetailItem,
  type UserStatisticsReportData,
  type UserStatisticsReportParams,
  type UserStatisticsSummary
} from '@/api/opertion/DataStatistics/UserStatisticsReport'

const DEFAULT_ORDER = 'created_at DESC'

type SortableField = 'todayNew' | 'yesterdayNew' | 'currentMonthNew' | 'lastMonthNew'
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
}

interface SummaryTotals {
  currentMonthNew: number
  lastMonthNew: number
  todayNew: number
  total: number
  yesterdayNew: number
}

const SORT_FIELD_MAP: Record<SortableField, string> = {
  currentMonthNew: 'growth_user_this_month',
  lastMonthNew: 'growth_user_last_month',
  todayNew: 'growth_user_today',
  yesterdayNew: 'growth_user_yesterday'
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
  yesterdayNew: 0
})

const normalizeSummary = (summary?: UserStatisticsSummary): SummaryTotals => {
  const todayNew = toNumber(summary?.growth_user_today)
  const yesterdayNew = toNumber(summary?.growth_user_yesterday)
  const currentMonthNew = toNumber(summary?.growth_user_this_month)
  const lastMonthNew = toNumber(summary?.growth_user_last_month)
  const fallbackTotal = todayNew + yesterdayNew + currentMonthNew + lastMonthNew

  return {
    currentMonthNew,
    lastMonthNew,
    todayNew,
    total:
      summary?.growth_user_total === undefined
        ? fallbackTotal
        : toNumber(summary.growth_user_total),
    yesterdayNew
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
    yesterdayNew: toNumber(row.growth_user_yesterday)
  }
}

const getDetailList = (data: UserStatisticsReportData) => {
  return Array.isArray(data.detail) ? data.detail : data.list || []
}

const loading = ref(false)
const reportRows = ref<ReportRow[]>([])
const totalCount = ref(0)
const summaryTotals = ref<SummaryTotals>(createEmptySummary())
const tableRef = ref<TableInstance>()
const isClearingSort = ref(false)
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

const headerCellStyle = (): CSSProperties => {
  return {
    background: '#f5f7fa',
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

const formatCount = (value: number) => {
  return toNumber(value).toLocaleString('zh-CN')
}

const buildParams = (): UserStatisticsReportParams => {
  const params: UserStatisticsReportParams = {
    current_page: pagination.currentPage,
    page_size: pagination.pageSize
  }

  if (activeFilters.keyword) {
    params.keyword = activeFilters.keyword
  }

  params.order =
    sortState.prop && sortState.order
      ? `${SORT_FIELD_MAP[sortState.prop]} ${sortState.order === 'ascending' ? 'ASC' : 'DESC'}`
      : DEFAULT_ORDER

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
      handleErrorMessage(new Error(res.msg || '接口返回异常'), '获取人数统计报表失败')
      return
    }

    const detail = getDetailList(res.data)
    reportRows.value = detail.map(normalizeRow)
    summaryTotals.value = normalizeSummary(res.data.summary)
    totalCount.value = toNumber(res.data.pager?.total ?? res.data.total ?? detail.length)
  } catch (error) {
    resetReportState()
    handleErrorMessage(error, '获取人数统计报表失败')
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
  isClearingSort.value = true
  tableRef.value?.clearSort()
  await nextTick()
  isClearingSort.value = false
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
      {
        机器人ID: '合计',
        机器人用户名: '-',
        归属代理: '-',
        今日新增: exportSummary.todayNew,
        昨日新增: exportSummary.yesterdayNew,
        本月新增: exportSummary.currentMonthNew,
        上月新增: exportSummary.lastMonthNew
      },
      ...getDetailList(res.data)
        .map(normalizeRow)
        .map((row) => ({
          机器人ID: row.botId,
          机器人用户名: row.botUsername || '-',
          归属代理: row.agentName || '-',
          今日新增: row.todayNew,
          昨日新增: row.yesterdayNew,
          本月新增: row.currentMonthNew,
          上月新增: row.lastMonthNew
        }))
    ]

    simpleExportToExcel(exportRows, '人数统计报表')
    handleSuccessMessage('导出成功')
  } catch (error) {
    handleErrorMessage(error, '导出失败')
  }
}

const handleSortChange = async ({
  order,
  prop
}: {
  column: TableColumnCtx<ReportRow> | null
  order: SortOrder
  prop: keyof ReportRow | null
}) => {
  if (isClearingSort.value) {
    return
  }

  if (
    prop !== 'todayNew' &&
    prop !== 'yesterdayNew' &&
    prop !== 'currentMonthNew' &&
    prop !== 'lastMonthNew'
  ) {
    sortState.prop = null
    sortState.order = null
    return
  }

  sortState.prop = prop
  sortState.order = order
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

.report-summary-bar {
  display: grid;
  grid-template-columns: 14% 17% 17% repeat(4, 13%);
  background: #ffe4bd;
  border-bottom: 1px solid #f5d6aa;
}

.summary-cell {
  min-width: 0;
  padding: 14px 16px;
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  text-align: center;
  border-right: 1px solid #f5d6aa;
  box-sizing: border-box;
}

.summary-cell-label {
  grid-column: 1 / span 3;
  text-align: left;
}

.report-summary-bar .summary-cell:last-child {
  border-right: none;
}

.report-table :deep(.el-table__cell) {
  height: 48px;
}

.report-pagination {
  display: flex;
  gap: 16px;
  justify-content: space-between;
  align-items: center;
  padding: 18px 16px;
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

  .report-summary-bar {
    min-width: 1060px;
    overflow-x: auto;
  }

  .summary-cell-label {
    min-width: 0;
  }
}
</style>
