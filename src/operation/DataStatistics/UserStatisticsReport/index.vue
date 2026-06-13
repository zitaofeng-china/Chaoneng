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

            <div class="filter-item filter-item-month">
              <span class="filter-label">统计月份：</span>
              <ElSelect v-model="searchForm.month" class="month-select">
                <ElOption
                  v-for="option in monthOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </ElSelect>
            </div>
          </div>

          <div class="toolbar-actions">
            <ElButton @click="handleSearch">搜索</ElButton>
            <ElButton @click="handleReset">重置</ElButton>
            <ElButton type="warning" @click="handleExport">导出表格</ElButton>
          </div>
        </div>

        <div class="report-table-card">
          <div class="report-summary-bar">
            <div class="summary-cell summary-cell-label">合计：</div>
            <div class="summary-cell">{{ formatCount(summaryTotals.todayNew) }}</div>
            <div class="summary-cell">{{ formatCount(summaryTotals.yesterdayNew) }}</div>
            <div class="summary-cell">{{ formatCount(summaryTotals.currentMonthNew) }}</div>
            <div class="summary-cell">{{ formatCount(summaryTotals.lastMonthNew) }}</div>
          </div>

          <ElTable
            :data="pagedRows"
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
              共 {{ filteredRows.length }} 条记录 第 {{ pagination.currentPage }} /
              {{ totalPages }} 页
            </div>

            <ElPagination
              v-model:current-page="pagination.currentPage"
              v-model:page-size="pagination.pageSize"
              background
              layout="prev, pager, next, sizes, jumper"
              :total="filteredRows.length"
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
import { computed, onMounted, reactive, ref, watch, type CSSProperties } from 'vue'
import dayjs from 'dayjs'
import {
  ElButton,
  ElInput,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn
} from 'element-plus'
import type { TableColumnCtx } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { simpleExportToExcel } from '@/utils/excel'
import { handleErrorMessage, handleSuccessMessage } from '@/utils/messageHelper'

const DEFAULT_SORT_PROP: SortableField = 'currentMonthNew'
const DEFAULT_SORT_ORDER: SortOrder = 'descending'

type SortableField = 'todayNew' | 'yesterdayNew' | 'currentMonthNew' | 'lastMonthNew'
type SortOrder = 'ascending' | 'descending' | null

interface MonthOption {
  label: string
  value: string
}

interface SearchFormState {
  keyword: string
  month: string
}

interface ReportRow {
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
  yesterdayNew: number
}

const createMonthOptions = (count = 12): MonthOption[] => {
  const currentMonth = dayjs().startOf('month')
  return Array.from({ length: count }, (_, index) => {
    const month = currentMonth.subtract(index, 'month')
    return {
      label: month.format('YYYY年M月'),
      value: month.format('YYYY-MM')
    }
  })
}

const monthOptions = createMonthOptions()
const defaultMonth = monthOptions[0]?.value || dayjs().format('YYYY-MM')

const loading = ref(false)
const reportRows = ref<ReportRow[]>([])
const loadedMonth = ref(defaultMonth)
const searchForm = reactive<SearchFormState>({
  keyword: '',
  month: defaultMonth
})
const activeFilters = reactive<SearchFormState>({
  keyword: '',
  month: defaultMonth
})
const pagination = reactive({
  currentPage: 1,
  pageSize: 10
})
const sortState = reactive<{
  order: SortOrder
  prop: SortableField
}>({
  order: DEFAULT_SORT_ORDER,
  prop: DEFAULT_SORT_PROP
})

const createMockReportRows = (monthValue: string): ReportRow[] => {
  const monthSeed = dayjs(`${monthValue}-01`).month() + 1
  const baseRows: ReportRow[] = [
    {
      botId: '8643088561',
      botUsername: 'chaonengbendi_bot',
      todayNew: 6,
      yesterdayNew: 4,
      currentMonthNew: 30,
      lastMonthNew: 60
    },
    {
      botId: '8643088562',
      botUsername: 'chaonengvip_bot',
      todayNew: 12,
      yesterdayNew: 18,
      currentMonthNew: 68,
      lastMonthNew: 42
    },
    {
      botId: '8643088563',
      botUsername: 'energy_dispatch_bot',
      todayNew: 24,
      yesterdayNew: 16,
      currentMonthNew: 88,
      lastMonthNew: 53
    },
    {
      botId: '8643088564',
      botUsername: 'flashswap_center_bot',
      todayNew: 31,
      yesterdayNew: 29,
      currentMonthNew: 96,
      lastMonthNew: 71
    },
    {
      botId: '8643088565',
      botUsername: 'hosted_growth_bot',
      todayNew: 17,
      yesterdayNew: 13,
      currentMonthNew: 77,
      lastMonthNew: 49
    },
    {
      botId: '8643088566',
      botUsername: 'service_matrix_bot',
      todayNew: 28,
      yesterdayNew: 23,
      currentMonthNew: 109,
      lastMonthNew: 82
    },
    {
      botId: '8643088567',
      botUsername: 'finance_notice_bot',
      todayNew: 14,
      yesterdayNew: 20,
      currentMonthNew: 66,
      lastMonthNew: 47
    },
    {
      botId: '8643088568',
      botUsername: 'global_market_bot',
      todayNew: 35,
      yesterdayNew: 30,
      currentMonthNew: 120,
      lastMonthNew: 93
    },
    {
      botId: '8643088569',
      botUsername: 'quickcharge_sync_bot',
      todayNew: 19,
      yesterdayNew: 21,
      currentMonthNew: 91,
      lastMonthNew: 58
    },
    {
      botId: '8643088570',
      botUsername: 'agent_growth_lab_bot',
      todayNew: 22,
      yesterdayNew: 25,
      currentMonthNew: 101,
      lastMonthNew: 76
    }
  ]

  return baseRows.map((row, index) => {
    const offset = (monthSeed + index) % 5
    return {
      ...row,
      todayNew: row.todayNew + offset,
      yesterdayNew: row.yesterdayNew + (offset % 3),
      currentMonthNew: row.currentMonthNew + offset * 4,
      lastMonthNew: row.lastMonthNew + offset * 3
    }
  })
}

const filteredRows = computed<ReportRow[]>(() => {
  const keyword = activeFilters.keyword.trim().toLowerCase()
  const rows = keyword
    ? reportRows.value.filter((row) => {
        return (
          row.botId.toLowerCase().includes(keyword) ||
          row.botUsername.toLowerCase().includes(keyword)
        )
      })
    : reportRows.value

  const sortedRows = [...rows]
  const { order, prop } = sortState

  sortedRows.sort((left, right) => {
    const leftValue = left[prop]
    const rightValue = right[prop]

    if (leftValue === rightValue) {
      return left.botId.localeCompare(right.botId)
    }

    const factor = order === 'ascending' ? 1 : -1
    return (leftValue - rightValue) * factor
  })

  return sortedRows
})

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredRows.value.length / pagination.pageSize))
})

const pagedRows = computed(() => {
  const start = (pagination.currentPage - 1) * pagination.pageSize
  return filteredRows.value.slice(start, start + pagination.pageSize)
})

const summaryTotals = computed<SummaryTotals>(() => {
  return filteredRows.value.reduce<SummaryTotals>(
    (totals, row) => {
      totals.todayNew += row.todayNew
      totals.yesterdayNew += row.yesterdayNew
      totals.currentMonthNew += row.currentMonthNew
      totals.lastMonthNew += row.lastMonthNew
      return totals
    },
    {
      todayNew: 0,
      yesterdayNew: 0,
      currentMonthNew: 0,
      lastMonthNew: 0
    }
  )
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
  return value.toLocaleString('zh-CN')
}

const syncCurrentPage = () => {
  if (pagination.currentPage > totalPages.value) {
    pagination.currentPage = totalPages.value
  }
}

const loadData = async (monthValue: string) => {
  loading.value = true

  try {
    reportRows.value = createMockReportRows(monthValue)
    loadedMonth.value = monthValue
  } catch (error) {
    reportRows.value = []
    handleErrorMessage(error, '获取人数统计报表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = async () => {
  activeFilters.keyword = searchForm.keyword.trim()
  activeFilters.month = searchForm.month
  pagination.currentPage = 1

  if (loadedMonth.value !== activeFilters.month) {
    await loadData(activeFilters.month)
  }
}

const handleReset = async () => {
  searchForm.keyword = ''
  searchForm.month = defaultMonth
  activeFilters.keyword = ''
  activeFilters.month = defaultMonth
  pagination.currentPage = 1
  pagination.pageSize = 10
  sortState.prop = DEFAULT_SORT_PROP
  sortState.order = DEFAULT_SORT_ORDER
  await loadData(defaultMonth)
}

const handleExport = () => {
  if (filteredRows.value.length === 0) {
    handleErrorMessage('暂无可导出的数据', '导出失败')
    return
  }

  const exportRows = [
    {
      机器人ID: '合计',
      机器人用户名: '-',
      今日新增: summaryTotals.value.todayNew,
      昨日新增: summaryTotals.value.yesterdayNew,
      本月新增: summaryTotals.value.currentMonthNew,
      上月新增: summaryTotals.value.lastMonthNew
    },
    ...filteredRows.value.map((row) => ({
      机器人ID: row.botId,
      机器人用户名: row.botUsername || '-',
      今日新增: row.todayNew,
      昨日新增: row.yesterdayNew,
      本月新增: row.currentMonthNew,
      上月新增: row.lastMonthNew
    }))
  ]

  simpleExportToExcel(exportRows, `人数统计报表_${dayjs(activeFilters.month).format('YYYY年MM月')}`)
  handleSuccessMessage('导出成功')
}

const handleSortChange = ({
  order,
  prop
}: {
  column: TableColumnCtx<ReportRow>
  order: SortOrder
  prop: keyof ReportRow
}) => {
  if (
    prop !== 'todayNew' &&
    prop !== 'yesterdayNew' &&
    prop !== 'currentMonthNew' &&
    prop !== 'lastMonthNew'
  ) {
    return
  }

  sortState.prop = prop
  sortState.order = order || DEFAULT_SORT_ORDER
  pagination.currentPage = 1
}

const handleCurrentChange = (page: number) => {
  pagination.currentPage = page
}

const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  pagination.currentPage = 1
}

watch(
  () => [filteredRows.value.length, pagination.pageSize],
  () => {
    syncCurrentPage()
  }
)

onMounted(async () => {
  await loadData(defaultMonth)
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
  gap: 16px;
  justify-content: space-between;
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

.month-select {
  width: 140px;
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
  grid-template-columns:
    minmax(160px, 160fr)
    minmax(180px, 180fr)
    repeat(4, minmax(140px, 140fr));
  background: #fff5e6;
  border-bottom: 1px solid #ebeef5;
}

.summary-cell {
  padding: 14px 16px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  text-align: center;
}

.summary-cell-label {
  grid-column: 1 / span 2;
  text-align: left;
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

  .report-summary-bar {
    grid-template-columns:
      minmax(160px, 160fr)
      minmax(180px, 180fr)
      repeat(4, minmax(140px, 140fr));
    overflow-x: auto;
  }

  .summary-cell-label {
    min-width: 90px;
  }
}
</style>
