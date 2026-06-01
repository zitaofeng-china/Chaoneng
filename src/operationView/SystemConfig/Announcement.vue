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
            v-model="customDateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 240px"
            @change="handleCustomDateChange"
          />
          <el-upload
            :auto-upload="false"
            :show-file-list="false"
            accept=".xlsx,.xls,.csv"
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
          <Echart :options="totalAssetChartOptions" :height="300" />
        </el-card>

        <!-- USDT / TRX 余额走势 -->
        <el-card shadow="hover" class="chart-card">
          <Echart :options="balanceTrendChartOptions" :height="300" />
        </el-card>

        <!-- 每日资金池净变化 -->
        <el-card shadow="hover" class="chart-card">
          <Echart :options="dailyChangeChartOptions" :height="300" />
        </el-card>
      </div>
      <!-- 机器人设置弹窗 -->
      <Dialog v-model="botSettingVisible" title="机器人设置" width="500px" max-height="300px">
        <div class="bot-setting-form">
          <div class="form-item">
            <label class="form-label">机器人token</label>
            <el-input v-model="botSetting.token" placeholder="请输入机器人token" />
          </div>
          <div class="form-item">
            <label class="form-label">推送群ID</label>
            <el-input v-model="botSetting.groupId" placeholder="请输入推送群ID" />
          </div>
          <div class="form-item">
            <label class="form-label">推送时间</label>
            <el-select v-model="botSetting.interval" style="width: 100%">
              <el-option label="每30分钟" value="30" />
              <el-option label="每1小时" value="60" />
              <el-option label="每2小时" value="120" />
              <el-option label="每6小时" value="360" />
              <el-option label="每12小时" value="720" />
              <el-option label="每24小时" value="1440" />
            </el-select>
          </div>
        </div>
        <template #footer>
          <div style="display: flex; justify-content: flex-end; gap: 12px">
            <el-button @click="botSettingVisible = false">取消</el-button>
            <el-button type="primary" @click="handleSaveBotSetting" :loading="submitting">
              确认
            </el-button>
          </div>
        </template>
      </Dialog>
    </ContentWrap>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
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
import { ContentWrap } from '@/components/ContentWrap'
import { Echart } from '@/components/Echart'
import { handleErrorMessage, handleSuccessMessage } from '@/utils/messageHelper'
import { createAssetAccount, getAssetReport } from '@/api/asset'
import type { AssetBalanceData, AccountBalanceSnapshot } from '@/api/asset/types'
import type { EChartsOption } from 'echarts'

const DEFAULT_STATS = {
  totalUsdt: 0,
  totalTrx: 0,
  totalAsset: 0,
  dailyChange: 0,
  avgChange: 0
}

// 状态
const dateRange = ref('7')
const customDateRange = ref<[Date, Date] | null>(null)
const addressInput = ref('')
const nameInput = ref('')
const submitting = ref(false)

// 机器人设置
const botSettingVisible = ref(false)
const botSetting = reactive({
  token: '',
  groupId: '',
  interval: '30'
})

// 动态账户列配置
const accountColumns = ref<Array<{ key: string; name: string }>>([])

// 统计数据
const statsData = reactive({
  ...DEFAULT_STATS
})

// TRX 价格
const priceTrx = ref(0)

// 每日报表数据
const dailyReport = ref<any[]>([])

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

const isSameNumber = (a: number, b: number, epsilon = 0.000001) => {
  return Math.abs(a - b) < epsilon
}

// 图表配置 - 折合总资产变化趋势
const totalAssetChartOptions = reactive<EChartsOption>({
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
const balanceTrendChartOptions = reactive<EChartsOption>({
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
const dailyChangeChartOptions = reactive<EChartsOption>({
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

// 获取时间范围参数
const getTimeParams = () => {
  const now = new Date()
  let startTime: string
  let endTime: string = formatDateStr(now)

  if (dateRange.value === 'custom' && customDateRange.value) {
    startTime = formatDateStr(customDateRange.value[0])
    endTime = formatDateStr(customDateRange.value[1])
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

      // 更新当前余额统计
      const currentUsdt = parseFloat(data.current.balance_usdt) || 0
      const currentTrx = parseFloat(data.current.balance_trx) || 0
      statsData.totalUsdt = currentUsdt
      statsData.totalTrx = currentTrx
      statsData.totalAsset = currentUsdt + currentTrx * priceTrx.value

      // 解析历史数据
      const history = data.history
      const dates = Object.keys(history).sort()

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
      const tableData: any[] = []
      const dateLabels: string[] = []
      const totalUsdtArr: number[] = []
      const totalTrxArr: number[] = []
      const totalAssetArr: number[] = []

      dates.forEach((date, index) => {
        const row: any = { date }
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

      // 较平均值 = 当前折合总资产 - 所选时间范围内日折合资产平均值
      if (totalAssetArr.length >= 1) {
        const avg = totalAssetArr.reduce((sum, val) => sum + val, 0) / totalAssetArr.length
        statsData.avgChange = statsData.totalAsset - avg
      }

      dailyReport.value = tableData.reverse() // 最新日期在前

      // 更新图表
      ;(totalAssetChartOptions.xAxis as any).data = dateLabels
      ;(totalAssetChartOptions.series as any[])[0].data = totalAssetArr
      ;(balanceTrendChartOptions.xAxis as any).data = dateLabels
      ;(balanceTrendChartOptions.series as any[])[0].data = totalUsdtArr
      ;(balanceTrendChartOptions.series as any[])[1].data = totalTrxArr

      // 每日净变化
      const dailyChanges = totalAssetArr.map((val, i) => {
        if (i === 0) return { value: 0, itemStyle: { color: '#67C23A' } }
        const change = val - totalAssetArr[i - 1]
        return {
          value: parseFloat(change.toFixed(2)),
          itemStyle: { color: change >= 0 ? '#67C23A' : '#F56C6C' }
        }
      })
      ;(dailyChangeChartOptions.xAxis as any).data = dateLabels
      ;(dailyChangeChartOptions.series as any[])[0].data = dailyChanges
    }
  } catch (error) {
    handleErrorMessage(error, '获取数据失败')
  }
}

// 文件变更
const handleFileChange = (file: any) => {
  // TODO: 处理文件上传
  ElMessage.info(`已选择文件: ${file.name}`)
}

// 导入
const handleImport = () => {
  // TODO: 调用导入接口
  ElMessage.info('导入功能待实现')
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
const handleExport = () => {
  // TODO: 调用导出接口
  ElMessage.info('导出功能待实现')
}

// 推送余额播报
const handlePushReport = () => {
  botSettingVisible.value = true
}

// 保存机器人设置
const handleSaveBotSetting = async () => {
  if (!botSetting.token) {
    ElMessage.warning('请输入机器人token')
    return
  }
  if (!botSetting.groupId) {
    ElMessage.warning('请输入推送群ID')
    return
  }
  try {
    submitting.value = true
    // TODO: 调用保存机器人设置接口
    // await saveBotPushSetting(botSetting)
    handleSuccessMessage('机器人设置保存成功')
    botSettingVisible.value = false
  } catch (error) {
    handleErrorMessage(error, '保存失败')
  } finally {
    submitting.value = false
  }
}

// 时间范围变更
const handleDateRangeChange = (val: string) => {
  if (val !== 'custom') {
    customDateRange.value = null
    loadData()
  }
}

// 自定义时间变更
const handleCustomDateChange = () => {
  if (customDateRange.value) {
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

.bot-setting-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.bot-setting-form .form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bot-setting-form .form-label {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}
</style>
