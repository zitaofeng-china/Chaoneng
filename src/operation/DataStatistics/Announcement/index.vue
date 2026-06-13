<template>
  <div class="app-container">
    <ContentWrap>
      <!-- 顶部工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <el-select
            v-model="dateRange"
            placeholder="近7天"
            style="width: 120px"
            @change="handleDateRangeChange"
          >
            <el-option label="近7天" value="7" />
            <el-option label="近15天" value="15" />
            <el-option label="自定义时间" value="custom" />
          </el-select>
          <el-date-picker
            v-if="dateRange === 'custom'"
            v-model="customStartDate"
            type="date"
            placeholder="选择开始日期"
            style="width: 160px"
            :disabled-date="disableFutureDate"
            @change="handleCustomDateChange"
          />
          <el-upload
            :auto-upload="false"
            :show-file-list="false"
            accept=".xlsx,.xls,.csv,.txt"
            @change="handleFileChange"
          >
            <el-button>选择文件</el-button>
          </el-upload>
          <el-button type="primary" @click="handleImport">导入</el-button>
          <el-button type="success" @click="handleDownloadTemplate">下载模板</el-button>
          <el-button @click="handleManualAdd">手动添加</el-button>
          <el-input v-model="addressInput" placeholder="请输入地址（TRON）" style="width: 200px" />
          <span class="toolbar-label">名称</span>
          <el-input v-model="nameInput" placeholder="请输入名称" style="width: 140px" />
        </div>
        <div class="toolbar-right">
          <el-button type="primary" @click="handleExport">导出数据</el-button>
          <el-button type="primary" @click="handlePushReport">推送余额播报到机器人</el-button>
        </div>
      </div>

      <!-- 统计卡片 -->
      <div class="stats-cards">
        <div class="stat-card stat-card-green">
          <div class="stat-title">总USDT余额</div>
          <div class="stat-value">{{ formatNumber(statsData.totalUsdt) }}</div>
        </div>
        <div class="stat-card stat-card-blue">
          <div class="stat-title">总TRX余额</div>
          <div class="stat-value">{{ formatNumber(statsData.totalTrx) }}</div>
        </div>
        <div class="stat-card stat-card-purple">
          <div class="stat-title">折合总资产</div>
          <div class="stat-value">{{ formatNumber(statsData.totalAsset) }}（USDT）</div>
        </div>
        <div class="stat-card stat-card-pink">
          <div class="stat-title">资金池变化（较昨天）</div>
          <div class="stat-value">{{ formatNumber(statsData.dailyChange) }}</div>
          <div class="stat-desc">
            资金变化（{{ avgChangeLabel }}）{{ formatNumber(statsData.avgChange) }}
          </div>
        </div>
      </div>

      <!-- 每日资金明细报表 -->
      <div class="report-section">
        <h3 class="section-title">每日资金明细报表</h3>
        <el-table
          :data="dailyReport"
          border
          style="width: 100%"
          max-height="380"
          :header-cell-style="{ background: '#fafafa', color: '#606266', textAlign: 'center' }"
          :cell-style="{ textAlign: 'center' }"
          empty-text="暂无数据"
        >
          <el-table-column prop="date" label="日期" width="110" fixed="left" align="center" />
          <!-- 动态账户列 -->
          <el-table-column
            v-for="account in accountColumns"
            :key="account.key"
            :label="account.name"
            align="center"
          >
            <el-table-column
              :prop="`${account.key}_usdt`"
              label="USDT"
              min-width="90"
              align="center"
            />
            <el-table-column
              :prop="`${account.key}_trx`"
              label="TRX"
              min-width="90"
              align="center"
            />
          </el-table-column>
          <!-- 固定的合计列 -->
          <el-table-column label="合计" align="center" fixed="right">
            <el-table-column prop="total_usdt" label="USDT" width="100" align="center" />
            <el-table-column prop="total_trx" label="TRX" width="100" align="center" />
          </el-table-column>
          <el-table-column
            prop="total_u"
            label="折合（U）汇率*0.3"
            width="130"
            align="center"
            fixed="right"
          />
          <el-table-column
            prop="pool_change"
            label="资金池变化"
            width="110"
            align="center"
            fixed="right"
          />
        </el-table>
      </div>

      <!-- 图表区域 -->
      <div class="charts-section">
        <!-- 折合总资产变化趋势 -->
        <el-card shadow="hover" class="chart-card">
          <Echart :options="totalAssetOptions" :height="300" />
        </el-card>

        <!-- USDT / TRX 余额走势 -->
        <el-card shadow="hover" class="chart-card">
          <Echart :options="balanceTrendOptions" :height="300" />
        </el-card>

        <!-- 每日资金池净变化 -->
        <el-card shadow="hover" class="chart-card">
          <Echart :options="dailyChangeOptions" :height="300" />
        </el-card>
      </div>
      <NotifyBotDialog v-model:visible="notifyBotDialogVisible" mode="asset" title="通知机器人" />
    </ContentWrap>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, shallowRef, type ShallowRef } from 'vue'
import {
  ElMessage,
  ElTable,
  ElTableColumn,
  ElCard,
  ElSelect,
  ElOption,
  ElUpload,
  ElDatePicker
} from 'element-plus'
import type { UploadFile } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { Echart } from '@/components/Echart'
import NotifyBotDialog from '@/operation/Agent/components/NotifyBotDialog.vue'
import { handleErrorMessage, handleSuccessMessage } from '@/utils/messageHelper'
import {
  createAssetAccount,
  getAssetReport,
  batchCreateAssetAccount,
  type AssetBalanceData,
  type AccountBalanceSnapshot
} from '@/api/opertion/DataStatistics/Announcement'
import { simpleExportToExcel } from '@/utils/excel'
import type { EChartsOption } from 'echarts'

const DEFAULT_STATS = {
  totalUsdt: 0,
  totalTrx: 0,
  totalAsset: 0,
  dailyChange: 0,
  avgChange: 0
}

interface AccountColumn {
  key: string
  name: string
}

type DailyReportRow = {
  date: string
  total_usdt: string
  total_trx: string
  total_u: string
  pool_change: string
} & Record<string, string>

interface DailyChangePoint {
  value: number
  itemStyle: {
    color: string
  }
}

type ChartSeriesData = Array<number | string | DailyChangePoint>
type MutableSeriesOption = Record<string, unknown> & {
  data?: ChartSeriesData
}

interface ImportAccountRow {
  名称?: unknown
  name?: unknown
  地址?: unknown
  address?: unknown
}

// 状态
const dateRange = ref('7')
const customStartDate = ref<Date>()
const addressInput = ref('')

// 禁用今天之后的日期
const disableFutureDate = (time: Date) => {
  return time.getTime() > Date.now()
}
const nameInput = ref('')
const notifyBotDialogVisible = ref(false)

// 动态账户列配置
const accountColumns = ref<AccountColumn[]>([])

// 统计数据
const statsData = reactive({
  ...DEFAULT_STATS
})

// TRX 价格
const priceTrx = ref(0)

// 每日报表数据
const dailyReport = ref<DailyReportRow[]>([])

const avgChangeLabel = computed(() => {
  if (dateRange.value === 'custom') {
    return '较所选时间平均值'
  }

  const days = parseInt(dateRange.value, 10)
  return Number.isNaN(days) ? '较所选时间平均值' : `较近${days}天平均值`
})

// 格式化数字
const formatNumber = (num: number) => {
  if (!num && num !== 0) return '-'
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// 格式化本地日期为 YYYY-MM-DD
const formatLocalDate = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const isSameNumber = (a: number, b: number, epsilon = 0.000001) => {
  return Math.abs(a - b) < epsilon
}

// 图表配置 - 折合总资产变化趋势
const totalAssetChartOptions = shallowRef<EChartsOption>({
  title: { text: '折合总资产变化趋势（U）', left: 'left' },
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: [] },
  yAxis: { type: 'value' },
  series: [
    {
      type: 'line',
      data: [],
      smooth: true,
      areaStyle: { opacity: 0.2 },
      itemStyle: { color: '#409EFF' },
      lineStyle: { width: 2 }
    }
  ],
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true }
})

// 图表配置 - USDT/TRX余额走势
const balanceTrendChartOptions = shallowRef<EChartsOption>({
  title: { text: 'USDT / TRX 余额走势', left: 'left' },
  tooltip: { trigger: 'axis' },
  legend: { data: ['USDT', 'TRX'], top: 10, right: 20 },
  xAxis: { type: 'category', data: [] },
  yAxis: { type: 'value' },
  series: [
    {
      name: 'USDT',
      type: 'line',
      data: [],
      smooth: true,
      itemStyle: { color: '#409EFF' },
      lineStyle: { width: 2 }
    },
    {
      name: 'TRX',
      type: 'line',
      data: [],
      smooth: true,
      itemStyle: { color: '#67C23A' },
      lineStyle: { width: 2 }
    }
  ],
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true }
})

// 图表配置 - 每日资金池净变化
const dailyChangeChartOptions = shallowRef<EChartsOption>({
  title: { text: '每日资金池净变化（U）', left: 'left' },
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: [] },
  yAxis: { type: 'value' },
  series: [
    {
      type: 'bar',
      data: []
    }
  ],
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true }
})

const totalAssetOptions = computed<EChartsOption>(() => totalAssetChartOptions.value)
const balanceTrendOptions = computed<EChartsOption>(() => balanceTrendChartOptions.value)
const dailyChangeOptions = computed<EChartsOption>(() => dailyChangeChartOptions.value)

const setCategoryAxisData = (optionsRef: ShallowRef<EChartsOption>, data: string[]) => {
  const xAxis = optionsRef.value.xAxis
  const nextXAxis = Array.isArray(xAxis)
    ? xAxis.map((axis, index) => (index === 0 ? { ...axis, data } : axis))
    : { ...(xAxis ?? {}), data }

  optionsRef.value = {
    ...optionsRef.value,
    xAxis: nextXAxis
  }
}

const setSeriesData = (
  optionsRef: ShallowRef<EChartsOption>,
  index: number,
  data: ChartSeriesData
) => {
  const series = Array.isArray(optionsRef.value.series)
    ? optionsRef.value.series
    : optionsRef.value.series
      ? [optionsRef.value.series]
      : []
  const nextSeries = series.map((item, currentIndex) =>
    currentIndex === index ? { ...(item as MutableSeriesOption), data } : item
  )

  optionsRef.value = {
    ...optionsRef.value,
    series: nextSeries as EChartsOption['series']
  }
}

const getVisibleDateRange = () => {
  const now = new Date()
  let startDate: string

  if (dateRange.value === 'custom' && customStartDate.value) {
    startDate = formatLocalDate(customStartDate.value)
  } else {
    const days = parseInt(dateRange.value, 10) || 7
    const start = new Date(now)
    start.setDate(start.getDate() - days)
    startDate = formatLocalDate(start)
  }

  return {
    startDate,
    endDate: formatLocalDate(now)
  }
}

// 获取时间范围参数
const getTimeParams = () => {
  const now = new Date()
  let startTime: string
  const endTime: string = formatDateStr(now)

  if (dateRange.value === 'custom' && customStartDate.value) {
    startTime = formatDateStr(customStartDate.value)
  } else {
    const days = parseInt(dateRange.value) || 7
    const start = new Date(now)
    start.setDate(start.getDate() - days)
    startTime = formatDateStr(start)
  }

  return { start_time: startTime, end_time: endTime }
}

// 格式化日期为 Unix 时间戳（秒）
const formatDateStr = (date: Date) => {
  return String(Math.floor(date.getTime() / 1000))
}

// 加载数据
const loadData = async () => {
  try {
    Object.assign(statsData, DEFAULT_STATS)

    const params = getTimeParams()
    const res = await getAssetReport(params)

    if (res?.data) {
      const data = res.data
      priceTrx.value = parseFloat(data.price_trx) || 0

      // 更新当前余额统计（current 为当天各账户数组）
      const currentUsdt = data.current.reduce(
        (sum, item) => sum + (parseFloat(item.balance_usdt) || 0),
        0
      )
      const currentTrx = data.current.reduce(
        (sum, item) => sum + (parseFloat(item.balance_trx) || 0),
        0
      )
      statsData.totalUsdt = currentUsdt
      statsData.totalTrx = currentTrx
      statsData.totalAsset = currentUsdt + currentTrx * priceTrx.value

      // 解析历史数据
      const history = data.history
      // 将当天 current 数据加入 history（以今天日期为 key）
      const today = formatLocalDate(new Date()) // YYYY-MM-DD
      if (data.current.length > 0) {
        history[today] = data.current.map((item) => ({
          created_at: 0,
          name: item.name,
          balance_trx: item.balance_trx,
          balance_usdt: item.balance_usdt
        }))
      }
      const visibleDateRange = getVisibleDateRange()
      const dates = Object.keys(history)
        .filter((date) => date >= visibleDateRange.startDate && date <= visibleDateRange.endDate)
        .sort()

      // 提取所有账户名称（动态列）
      const accountNameSet = new Set<string>()
      dates.forEach((date) => {
        history[date].forEach((item: AccountBalanceSnapshot) => {
          accountNameSet.add(item.name)
        })
      })
      const accountNames = Array.from(accountNameSet)
      accountColumns.value = accountNames.map((name) => ({
        key: name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_'),
        name
      }))

      // 构建表格数据
      const tableData: DailyReportRow[] = []
      const dateLabels: string[] = []
      const totalUsdtArr: number[] = []
      const totalTrxArr: number[] = []
      const totalAssetArr: number[] = []

      dates.forEach((date, index) => {
        const row: DailyReportRow = {
          date,
          total_usdt: '0.00',
          total_trx: '0.00',
          total_u: '0.00',
          pool_change: '0.00'
        }
        let dayUsdt = 0
        let dayTrx = 0

        history[date].forEach((item: AccountBalanceSnapshot) => {
          const key = item.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')
          const usdt = parseFloat(item.balance_usdt) || 0
          const trx = parseFloat(item.balance_trx) || 0
          row[`${key}_usdt`] = item.balance_usdt
          row[`${key}_trx`] = item.balance_trx
          dayUsdt += usdt
          dayTrx += trx
        })

        row.total_usdt = dayUsdt.toFixed(2)
        row.total_trx = dayTrx.toFixed(2)
        const dayAsset = dayUsdt + dayTrx * priceTrx.value
        row.total_u = dayAsset.toFixed(2)

        // 资金池变化（与前一天对比）
        if (index > 0) {
          const prevAsset = totalAssetArr[index - 1]
          row.pool_change = (dayAsset - prevAsset).toFixed(2)
        } else {
          row.pool_change = '0.00'
        }

        tableData.push(row)
        dateLabels.push(date)
        totalUsdtArr.push(dayUsdt)
        totalTrxArr.push(dayTrx)
        totalAssetArr.push(dayAsset)
      })

      // 卡片统计：
      // 如果历史数据最后一天已经是今天，则“较昨天”要对比倒数第二天。
      if (totalAssetArr.length >= 1) {
        let yesterdayAsset = totalAssetArr[totalAssetArr.length - 1]

        if (totalAssetArr.length >= 2 && isSameNumber(yesterdayAsset, statsData.totalAsset)) {
          yesterdayAsset = totalAssetArr[totalAssetArr.length - 2]
        }

        statsData.dailyChange = statsData.totalAsset - yesterdayAsset
      }

      // 较平均值 = 当前折合总资产 - (历史折合汇率总和 / 选择的天数)
      // 分母用用户选择的天数，不含当天
      const historyAssetArr = totalAssetArr.filter((_, i) => dateLabels[i] !== today)
      if (historyAssetArr.length >= 1) {
        const selectedDays =
          dateRange.value === 'custom' && customStartDate.value
            ? Math.ceil(
                (new Date().getTime() - customStartDate.value.getTime()) / (1000 * 60 * 60 * 24)
              ) + 1
            : parseInt(dateRange.value) || 7
        const totalSum = historyAssetArr.reduce((sum, val) => sum + val, 0)
        const avg = totalSum / selectedDays
        statsData.avgChange = statsData.totalAsset - avg
      }

      dailyReport.value = tableData.reverse() // 最新日期在前

      // 更新图表
      setCategoryAxisData(totalAssetChartOptions, dateLabels)
      setSeriesData(totalAssetChartOptions, 0, totalAssetArr)
      setCategoryAxisData(balanceTrendChartOptions, dateLabels)
      setSeriesData(balanceTrendChartOptions, 0, totalUsdtArr)
      setSeriesData(balanceTrendChartOptions, 1, totalTrxArr)

      // 每日净变化
      const dailyChanges: DailyChangePoint[] = totalAssetArr.map((val, i) => {
        if (i === 0) return { value: 0, itemStyle: { color: '#67C23A' } }
        const change = val - totalAssetArr[i - 1]
        return {
          value: parseFloat(change.toFixed(2)),
          itemStyle: { color: change >= 0 ? '#67C23A' : '#F56C6C' }
        }
      })
      setCategoryAxisData(dailyChangeChartOptions, dateLabels)
      setSeriesData(dailyChangeChartOptions, 0, dailyChanges)
    }
  } catch (error) {
    handleErrorMessage(error, '获取数据失败')
  }
}

// 文件变更
const importFile = ref<File | null>(null)
const handleFileChange = (uploadFile: UploadFile) => {
  importFile.value = uploadFile.raw ?? null
}

// 导入
const handleImport = async () => {
  if (!importFile.value) {
    ElMessage.warning('请先选择文件')
    return
  }

  try {
    const XLSX = await import('xlsx')
    const arrayBuffer = await importFile.value.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const jsonData = XLSX.utils.sheet_to_json<ImportAccountRow>(sheet)

    if (!jsonData || jsonData.length === 0) {
      ElMessage.warning('文件中无有效数据')
      return
    }

    // 解析数据，支持表头为"名称"/"地址" 或 "name"/"address"
    const accounts = jsonData
      .map((row) => ({
        name: String(row['名称'] || row['name'] || ''),
        address: String(row['地址'] || row['address'] || '')
      }))
      .filter((item) => item.name && item.address)

    if (accounts.length === 0) {
      ElMessage.warning('未识别到有效的名称和地址数据')
      return
    }

    await batchCreateAssetAccount(accounts)
    handleSuccessMessage(`成功导入 ${accounts.length} 条账户`)
    importFile.value = null
    loadData()
  } catch (error) {
    handleErrorMessage(error, '导入失败')
  }
}

// 下载模板
const handleDownloadTemplate = () => {
  import('xlsx').then((XLSX) => {
    const data = [
      ['名称', '地址'],
      ['示例账户', 'TXxxxxxxxxxxxxxxxxxx']
    ]
    const ws = XLSX.utils.aoa_to_sheet(data)
    ws['!cols'] = [{ wch: 20 }, { wch: 40 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '地址导入模板')
    XLSX.writeFile(wb, '地址导入模板.xlsx')
    ElMessage.success('模板下载成功')
  })
}

// 手动添加
const handleManualAdd = async () => {
  if (!addressInput.value) {
    ElMessage.warning('请输入地址')
    return
  }
  if (!nameInput.value) {
    ElMessage.warning('请输入名称')
    return
  }

  try {
    await createAssetAccount({
      address: addressInput.value,
      name: nameInput.value
    })
    handleSuccessMessage(`已添加账户：${nameInput.value}`)

    // 添加到本地列表
    const key = nameInput.value.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')
    accountColumns.value.push({
      key,
      name: nameInput.value
    })

    addressInput.value = ''
    nameInput.value = ''
    loadData()
  } catch (error) {
    handleErrorMessage(error, '添加账户失败')
  }
}

// 导出数据
const handleExport = async () => {
  try {
    const params = getTimeParams()
    const res = await getAssetReport(params)

    if (!res?.data || !res.data.history) {
      ElMessage.warning('暂无数据可导出')
      return
    }

    const data = res.data
    const price = parseFloat(data.price_trx) || 0
    const history = data.history

    // 将当天 current 数据加入 history
    const today = new Date().toISOString().slice(0, 10)
    if (data.current.length > 0) {
      history[today] = data.current.map((item) => ({
        created_at: 0,
        name: item.name,
        balance_trx: item.balance_trx,
        balance_usdt: item.balance_usdt
      }))
    }

    const dates = Object.keys(history).sort().reverse()

    // 提取所有账户名称
    const accountNameSet = new Set<string>()
    dates.forEach((date) => {
      history[date].forEach((item: AccountBalanceSnapshot) => {
        accountNameSet.add(item.name)
      })
    })
    const accountNames = Array.from(accountNameSet)

    // 构建导出数据
    const exportData = dates.map((date, index) => {
      const row: Record<string, string | number> = { 日期: date }
      let dayUsdt = 0
      let dayTrx = 0

      history[date].forEach((item: AccountBalanceSnapshot) => {
        const usdt = parseFloat(item.balance_usdt) || 0
        const trx = parseFloat(item.balance_trx) || 0
        row[`${item.name}-USDT`] = item.balance_usdt
        row[`${item.name}-TRX`] = item.balance_trx
        dayUsdt += usdt
        dayTrx += trx
      })

      // 补齐没有数据的账户列
      accountNames.forEach((name) => {
        if (row[`${name}-USDT`] === undefined) row[`${name}-USDT`] = ''
        if (row[`${name}-TRX`] === undefined) row[`${name}-TRX`] = ''
      })

      row['合计-USDT'] = dayUsdt.toFixed(2)
      row['合计-TRX'] = dayTrx.toFixed(2)
      row['折合（U）汇率*0.3'] = (dayUsdt + dayTrx * price).toFixed(2)

      // 资金池变化需要与前一天对比（注意dates是倒序的，所以下一个index是前一天）
      if (index < dates.length - 1) {
        const prevDate = dates[index + 1]
        let prevAsset = 0
        history[prevDate].forEach((item: AccountBalanceSnapshot) => {
          prevAsset +=
            (parseFloat(item.balance_usdt) || 0) + (parseFloat(item.balance_trx) || 0) * price
        })
        const currentAsset = dayUsdt + dayTrx * price
        row['资金池变化'] = (currentAsset - prevAsset).toFixed(2)
      } else {
        row['资金池变化'] = '0.00'
      }

      return row
    })

    // 生成文件名（根据用户选择的时间范围）
    const now = new Date()
    let startDateStr: string
    const endDateStr: string = formatLocalDate(now)
    if (dateRange.value === 'custom' && customStartDate.value) {
      startDateStr = formatLocalDate(customStartDate.value)
    } else {
      const days = parseInt(dateRange.value) || 7
      const start = new Date(now)
      start.setDate(start.getDate() - days)
      startDateStr = formatLocalDate(start)
    }
    simpleExportToExcel(exportData, `资金明细报表_${startDateStr}_${endDateStr}`)
    handleSuccessMessage('导出成功')
  } catch (error) {
    handleErrorMessage(error, '导出失败')
  }
}

// 推送余额播报
const handlePushReport = () => {
  notifyBotDialogVisible.value = true
}

// 时间范围变更
const handleDateRangeChange = (val: string) => {
  if (val !== 'custom') {
    customStartDate.value = undefined
    loadData()
  }
}

// 自定义时间变更
const handleCustomDateChange = () => {
  if (customStartDate.value) {
    loadData()
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.toolbar {
  display: flex;
  padding: 16px;
  margin-bottom: 20px;
  background: #f5f7fa;
  border-radius: 4px;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toolbar-label {
  font-size: 14px;
  color: #606266;
  white-space: nowrap;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  padding: 20px;
  color: #fff;
  border-radius: 8px;
}

.stat-card-green {
  background: linear-gradient(135deg, #67c23a, #4caf50);
}

.stat-card-blue {
  background: linear-gradient(135deg, #409eff, #2196f3);
}

.stat-card-purple {
  background: linear-gradient(135deg, #9c27b0, #7b1fa2);
}

.stat-card-pink {
  background: linear-gradient(135deg, #e91e63, #c2185b);
}

.stat-title {
  margin-bottom: 8px;
  font-size: 14px;
  opacity: 0.9;
}

.stat-value {
  margin-bottom: 6px;
  font-size: 28px;
  font-weight: bold;
}

.stat-desc {
  font-size: 12px;
  opacity: 0.8;
}

.report-section {
  margin-bottom: 24px;
}

.section-title {
  margin-bottom: 12px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.charts-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.chart-card {
  width: 100%;
}
</style>
