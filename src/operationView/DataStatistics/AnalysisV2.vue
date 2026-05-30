<template>
  <div class="app-container analysis-v2">
    <ContentWrap>
      <!-- 时间范围选择 -->
      <div class="toolbar">
        <div class="time-range-bar">
          <span class="time-label">时间范围</span>
          <el-button
            v-for="item in timeRangeOptions"
            :key="item.value"
            :type="currentRange === item.value ? 'primary' : 'default'"
            size="small"
            @click="handleTimeRange(item.value)"
          >
            {{ item.label }}
          </el-button>
          <el-date-picker
            v-model="customRange"
            type="daterange"
            unlink-panels
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            size="small"
            value-format="YYYY-MM-DD"
            style="width: 260px; margin-left: 12px"
            @change="handleCustomRange"
          />
        </div>
        <div class="toolbar-actions">
          <el-button size="small" :loading="loading" @click="loadData">
            <Icon icon="ep:refresh" class="mr-4px" />刷新
          </el-button>
        </div>
      </div>

      <!-- 顶部 KPI 总览卡片 -->
      <div class="kpi-grid">
        <div v-for="kpi in kpiCards" :key="kpi.key" class="kpi-card" :class="`kpi-${kpi.tone}`">
          <div class="kpi-top">
            <span class="kpi-title">{{ kpi.title }}</span>
            <span class="kpi-icon" :class="`kpi-icon-${kpi.tone}`">
              <Icon :icon="kpi.icon" :size="16" />
            </span>
          </div>
          <div class="kpi-value">
            {{ kpi.value }}
            <span class="kpi-unit">{{ kpi.unit }}</span>
          </div>
          <div class="kpi-foot">
            <span class="kpi-sub">{{ kpi.sub }}</span>
          </div>
        </div>

        <!-- 资源消耗：上下滚动走马灯 -->
        <div class="kpi-card kpi-resource">
          <div class="kpi-top">
            <span class="kpi-title">资源消耗 / 收购</span>
            <span class="kpi-icon kpi-icon-resource">
              <Icon icon="ep:lightning" :size="16" />
            </span>
          </div>
          <div
            class="resource-carousel"
            @mouseenter="pauseResourceRoll"
            @mouseleave="startResourceRoll"
            @wheel.prevent="handleResourceWheel"
          >
            <div
              class="resource-carousel-track"
              :style="{
                transform: `translateY(-${resourceIndex * 38}px)`,
                transition: resourceNoTransition ? 'none' : 'transform 0.55s ease'
              }"
            >
              <div
                v-for="(item, idx) in resourceLoopItems"
                :key="idx"
                class="resource-item"
                :class="{ 'is-active': idx === resourceIndex }"
              >
                <span class="resource-item-label">{{ item.label }}</span>
                <span class="resource-item-value">
                  {{ item.value }}<span class="resource-item-unit">{{ item.unit }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 图表区：收入构成 / 支出构成 -->
      <div class="chart-grid">
        <div class="chart-card">
          <div class="chart-card-head">
            <span class="chart-card-title">收入构成</span>
            <div class="chart-card-right">
              <span class="chart-card-total">{{ formatNumber(statsData.income) }} TRX</span>
              <ViewToggle v-model="viewModes.income" />
            </div>
          </div>
          <template v-if="incomeTotal > 0">
            <Echart
              v-if="viewModes.income === 'chart'"
              :options="incomeChartOption"
              height="300px"
            />
            <DataList v-else :data="incomeData" :total="incomeTotal" unit="TRX" />
          </template>
          <div v-else class="chart-empty">暂无收入数据</div>
        </div>

        <div class="chart-card">
          <div class="chart-card-head">
            <span class="chart-card-title">支出构成</span>
            <div class="chart-card-right">
              <span class="chart-card-total">
                {{ formatNumber(statsData.expense) }} TRX
                <span v-if="toNum(statsData.exchangeUsdtOut) > 0" class="chart-card-total-sub">
                  + {{ formatNumber(toNum(statsData.exchangeUsdtOut)) }} USDT
                </span>
              </span>
              <ViewToggle v-model="viewModes.expense" />
            </div>
          </div>
          <template v-if="expenseTotal > 0">
            <Echart
              v-if="viewModes.expense === 'chart'"
              :options="expenseChartOption"
              height="300px"
            />
            <DataList v-else :data="expenseData" :show-percent="false" />
          </template>
          <div v-else class="chart-empty">暂无支出数据</div>
        </div>
      </div>

      <!-- 图表区：利润构成 / 资源池状态 -->
      <div class="chart-grid">
        <div class="chart-card">
          <div class="chart-card-head">
            <span class="chart-card-title">利润构成</span>
            <div class="chart-card-right">
              <span class="chart-card-total">{{ formatNumber(statsData.profit) }} TRX</span>
              <ViewToggle v-model="viewModes.profit" />
            </div>
          </div>
          <template v-if="profitTotal > 0">
            <Echart
              v-if="viewModes.profit === 'chart'"
              :options="profitChartOption"
              height="300px"
            />
            <DataList v-else :data="profitData" :total="profitTotal" unit="TRX" />
          </template>
          <div v-else class="chart-empty">暂无利润数据</div>
        </div>

        <div class="chart-card">
          <div class="chart-card-head">
            <span class="chart-card-title">资源消耗 / 收购</span>
            <div class="chart-card-right">
              <ViewToggle v-model="viewModes.resource" />
            </div>
          </div>
          <template v-if="hasResourceData">
            <Echart
              v-if="viewModes.resource === 'chart'"
              :options="resourceChartOption"
              height="300px"
            />
            <DataList v-else :data="resourceChartData" :show-percent="false" />
          </template>
          <div v-else class="chart-empty">暂无资源数据</div>
        </div>
      </div>

      <!-- 明细折叠区（保留原始全量数字，便于核对） -->
      <el-collapse v-model="activeDetail" class="detail-collapse">
        <el-collapse-item title="查看完整明细数据" name="detail">
          <div class="detail-row">
            <!-- 收入明细 -->
            <div class="detail-card">
              <div class="detail-title">收入明细</div>
              <div class="detail-item" v-for="row in incomeRows" :key="row.label">
                <span class="detail-label">{{ row.label }}</span>
                <span class="detail-value">{{ row.value }} TRX</span>
              </div>
            </div>

            <!-- 支出明细 -->
            <div class="detail-card">
              <div class="detail-title">支出明细</div>
              <div class="detail-item" v-for="row in expenseRows" :key="row.label">
                <span class="detail-label">{{ row.label }}</span>
                <span class="detail-value">
                  {{ row.value }} {{ row.unit || 'TRX' }}
                  <span v-if="row.count !== undefined" class="detail-count"
                    >{{ row.count }} 笔</span
                  >
                </span>
              </div>
            </div>

            <!-- 利润明细 -->
            <div class="detail-card">
              <div class="detail-title">利润明细</div>
              <div class="detail-item" v-for="row in profitRows" :key="row.label">
                <span class="detail-label">{{ row.label }}</span>
                <span class="detail-value">{{ row.value }} TRX</span>
              </div>
            </div>

            <!-- 资源明细 -->
            <div class="detail-card">
              <div class="detail-title">资源明细</div>
              <div class="detail-item" v-for="row in resourceRows" :key="row.label">
                <span class="detail-label">{{ row.label }}</span>
                <span class="detail-value">{{ row.value }}</span>
              </div>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>
    </ContentWrap>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { ElButton, ElDatePicker, ElCollapse, ElCollapseItem } from 'element-plus'
import type { EChartsOption } from 'echarts'
import { ContentWrap } from '@/components/ContentWrap'
import { Echart } from '@/components/Echart'
import { Icon } from '@/components/Icon'
import { handleErrorMessage } from '@/utils/messageHelper'
import ViewToggle from './components/ViewToggle.vue'
import DataList from './components/DataList.vue'

// ============== 图表/列表视图切换状态 ==============
const viewModes = reactive<Record<'income' | 'expense' | 'profit' | 'resource', 'chart' | 'list'>>({
  income: 'chart',
  expense: 'chart',
  profit: 'chart',
  resource: 'chart'
})

// ============== 设计令牌（参考 UI/UX Pro Max - Data-Dense Dashboard 色板）==============
const COLOR = {
  income: '#22C55E', // 收入-绿
  expense: '#F56C6C', // 支出-红
  profit: '#1E40AF', // 利润-蓝
  resource: '#E6A23C', // 资源-琥珀
  // 多类目调色板（≤6 项，对比色）
  palette: ['#1E40AF', '#3B82F6', '#22C55E', '#E6A23C', '#9333EA', '#14B8A6']
}

// ============== 时间范围 ==============
const currentRange = ref('today')
const customRange = ref<[string, string] | null>(null)

const timeRangeOptions = [
  { label: '今日', value: 'today' },
  { label: '昨日', value: 'yesterday' },
  { label: '7天', value: '7d' },
  { label: '30日', value: '30d' }
]

// ============== 统计数据（结构与后端对齐，先置 0）==============
const statsData = reactive({
  income: 0,
  expense: 0,
  profit: 0,
  // 收入明细
  agentIncome: 0,
  flashIncome: 0,
  hostingIncome: 0,
  exchangeIncome: 0,
  strokeIncome: 0,
  activeIncome: 0,
  // 支出明细
  exchangeExpense: 0,
  exchangeUsdtOut: 0,
  exchangeUsdtCount: 0,
  exchangeTrxOut: 0,
  exchangeTrxCount: 0,
  resourceSupplyExpense: 0,
  justlendExpense: 0,
  feeExpense: 0,
  trxfeeExpense: 0,
  energyPurchaseExpense: 0,
  energyPurchaseEnergy: 0,
  energyPurchaseBandwidth: 0,
  activeExpense: 0,
  // 利润明细
  exchangeProfit: 0,
  energyProfit: 0,
  activeProfit: 0,
  // 资源明细
  bandwidthUsed: '',
  energyUsed: '',
  activeAddress: '',
  energyPurchaseCount: '',
  bandwidthPurchaseCount: '',
  welfareExpense: '',
  welfareCount: ''
})

const loading = ref(false)
const activeDetail = ref<string[]>([])

// ============== 格式化 ==============
const formatNumber = (num: number) => {
  if (!num && num !== 0) return '0.00'
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
const toNum = (v: any) => {
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

// ============== KPI 卡片 ==============
const kpiCards = computed(() => [
  {
    key: 'income',
    title: '超能收入',
    value: formatNumber(statsData.income),
    unit: 'TRX',
    sub: '统计周期内全部收入',
    tone: 'income',
    icon: 'ep:top-right'
  },
  {
    key: 'expense',
    title: '超能支出',
    value: formatNumber(statsData.expense),
    unit: 'TRX',
    sub: '统计周期内全部支出',
    tone: 'expense',
    icon: 'ep:bottom-right'
  },
  {
    key: 'profit',
    title: '超能利润',
    value: formatNumber(statsData.profit),
    unit: 'TRX',
    sub: '收入 − 支出',
    tone: 'profit',
    icon: 'ep:wallet'
  }
])

// 资源指标（走马灯轮播展示）
const resourceItems = computed(() => [
  { label: '能量消耗', value: statsData.energyUsed || '0', unit: '' },
  { label: '带宽消耗', value: statsData.bandwidthUsed || '0', unit: '' },
  { label: '能量收购数量', value: statsData.energyPurchaseCount || '0', unit: '' },
  { label: '带宽收购数量', value: statsData.bandwidthPurchaseCount || '0', unit: '' },
  { label: '激活地址', value: statsData.activeAddress || '0', unit: '个' },
  { label: '福利订单支出', value: statsData.welfareExpense || '0', unit: 'TRX' },
  { label: '福利订单数量', value: statsData.welfareCount || '0', unit: '笔' }
])

// 走马灯：视口同时显示 2 行（当前 + 下一项），故首部补 2 项实现无缝循环
const resourceLoopItems = computed(() => {
  const list = resourceItems.value
  if (list.length === 0) return []
  if (list.length === 1) return [...list, list[0]]
  return [...list, list[0], list[1]]
})

const resourceIndex = ref(0)
const resourceNoTransition = ref(false)
let resourceTimer: ReturnType<typeof setInterval> | null = null
let resourceWheelLock = false

const rollNext = () => {
  const len = resourceItems.value.length
  if (len === 0) return
  resourceIndex.value += 1
  // 滚到补充的那一项（首项副本）后，等动画结束瞬间无动画归零
  if (resourceIndex.value >= len) {
    setTimeout(() => {
      resourceNoTransition.value = true
      resourceIndex.value = 0
      // 下一帧恢复过渡
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resourceNoTransition.value = false
        })
      })
    }, 560)
  }
}

const rollPrev = () => {
  const len = resourceItems.value.length
  if (len === 0) return
  // 在第 0 项继续往上时，先无动画跳到末尾副本位，再平滑回退一格
  if (resourceIndex.value <= 0) {
    resourceNoTransition.value = true
    resourceIndex.value = len
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resourceNoTransition.value = false
        resourceIndex.value -= 1
      })
    })
  } else {
    resourceIndex.value -= 1
  }
}

// 悬停时滚轮手动切换（带节流，避免一次滚轮触发多格）
const handleResourceWheel = (e: WheelEvent) => {
  if (resourceWheelLock) return
  resourceWheelLock = true
  if (e.deltaY > 0) {
    rollNext()
  } else {
    rollPrev()
  }
  setTimeout(() => {
    resourceWheelLock = false
  }, 600)
}

const startResourceRoll = () => {
  pauseResourceRoll()
  resourceTimer = setInterval(rollNext, 2500)
}

const pauseResourceRoll = () => {
  if (resourceTimer) {
    clearInterval(resourceTimer)
    resourceTimer = null
  }
}

// ============== 明细行（表格化）==============
const incomeRows = computed(() => [
  { label: '代理收款', value: statsData.agentIncome },
  { label: '闪租', value: statsData.flashIncome },
  { label: '托管', value: statsData.hostingIncome },
  { label: '闪兑', value: statsData.exchangeIncome },
  { label: '按笔数', value: statsData.strokeIncome },
  { label: '激活', value: statsData.activeIncome }
])

const expenseRows = computed(() => [
  { label: '闪兑支出', value: statsData.exchangeExpense },
  {
    label: '闪兑支出',
    value: statsData.exchangeUsdtOut,
    unit: 'USDT',
    count: statsData.exchangeUsdtCount
  },
  {
    label: '闪兑支出',
    value: statsData.exchangeTrxOut,
    unit: 'TRX',
    count: statsData.exchangeTrxCount
  },
  { label: '资源补充支出', value: statsData.resourceSupplyExpense },
  { label: 'justlend', value: statsData.justlendExpense },
  { label: 'feee', value: statsData.feeExpense },
  { label: 'trxfee', value: statsData.trxfeeExpense },
  { label: '能量收购支出', value: statsData.energyPurchaseExpense },
  { label: '能量', value: statsData.energyPurchaseEnergy },
  { label: '带宽', value: statsData.energyPurchaseBandwidth },
  { label: '激活支出', value: statsData.activeExpense }
])

const profitRows = computed(() => [
  { label: '闪兑利润', value: statsData.exchangeProfit },
  { label: '能量利润', value: statsData.energyProfit },
  { label: '激活利润', value: statsData.activeProfit }
])

const resourceRows = computed(() => [
  { label: '带宽消耗', value: statsData.bandwidthUsed || '0' },
  { label: '能量消耗', value: statsData.energyUsed || '0' },
  { label: '激活地址', value: statsData.activeAddress || '0' },
  { label: '能量收购数量', value: statsData.energyPurchaseCount || '0' },
  { label: '带宽收购数量', value: statsData.bandwidthPurchaseCount || '0' },
  { label: '福利订单支出', value: statsData.welfareExpense || '0' },
  { label: '福利订单数量', value: statsData.welfareCount || '0' }
])

// ============== 饼图/环形图配置 ==============
const buildDonut = (title: string, data: { name: string; value: number }[]): EChartsOption => {
  const total = data.reduce((s, d) => s + d.value, 0)
  return {
    color: COLOR.palette,
    tooltip: {
      trigger: 'item',
      formatter: (p: any) => `${p.name}<br/>${formatNumber(p.value)} TRX (${p.percent}%)`
    },
    legend: {
      type: 'scroll',
      orient: 'vertical',
      right: 10,
      top: 'center',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { fontSize: 12 }
    },
    series: [
      {
        name: title,
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['38%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold', formatter: '{b}\n{d}%' }
        },
        labelLine: { show: false },
        data
      }
    ],
    graphic: total
      ? [
          {
            type: 'text',
            left: '30%',
            top: '43%',
            style: { text: '合计', fill: '#909399', fontSize: 12, textAlign: 'center' }
          },
          {
            type: 'text',
            left: '30%',
            top: '51%',
            style: {
              text: `${formatNumber(total)}`,
              fill: '#303133',
              fontSize: 15,
              fontWeight: 'bold',
              textAlign: 'center'
            }
          }
        ]
      : []
  }
}

// 收入构成
const incomeData = computed(() =>
  [
    { name: '代理收款', value: toNum(statsData.agentIncome) },
    { name: '闪租', value: toNum(statsData.flashIncome) },
    { name: '托管', value: toNum(statsData.hostingIncome) },
    { name: '闪兑', value: toNum(statsData.exchangeIncome) },
    { name: '按笔数', value: toNum(statsData.strokeIncome) },
    { name: '激活', value: toNum(statsData.activeIncome) }
  ].filter((d) => d.value > 0)
)
const incomeTotal = computed(() => incomeData.value.reduce((s, d) => s + d.value, 0))
const incomeChartOption = computed(() => buildDonut('收入构成', incomeData.value))

// 支出构成（>5 项，用柱状图避免饼图过碎）
const expenseData = computed(() =>
  [
    {
      name: '闪兑支出(TRX)',
      value: toNum(statsData.exchangeExpense),
      unit: 'TRX',
      count: toNum(statsData.exchangeTrxCount)
    },
    {
      name: '闪兑支出(USDT)',
      value: toNum(statsData.exchangeUsdtOut),
      unit: 'USDT',
      count: toNum(statsData.exchangeUsdtCount)
    },
    { name: '资源补充', value: toNum(statsData.resourceSupplyExpense), unit: 'TRX' },
    { name: 'justlend', value: toNum(statsData.justlendExpense), unit: 'TRX' },
    { name: 'feee', value: toNum(statsData.feeExpense), unit: 'TRX' },
    { name: 'trxfee', value: toNum(statsData.trxfeeExpense), unit: 'TRX' },
    { name: '能量收购', value: toNum(statsData.energyPurchaseExpense), unit: 'TRX' },
    { name: '激活支出', value: toNum(statsData.activeExpense), unit: 'TRX' }
  ].filter((d) => d.value > 0)
)
const expenseTotal = computed(() => expenseData.value.reduce((s, d) => s + d.value, 0))
// 大额数值缩写：1.2w / 3.5k
const abbrNum = (v: number) => {
  const n = Number(v) || 0
  if (Math.abs(n) >= 10000) return `${(n / 10000).toFixed(1)}w`
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k`
  return `${n}`
}

// 纵向渐变色生成
const barGradient = (from: string, to: string) => ({
  type: 'linear' as const,
  x: 0,
  y: 0,
  x2: 0,
  y2: 1,
  colorStops: [
    { offset: 0, color: from },
    { offset: 1, color: to }
  ]
})

const expenseChartOption = computed<EChartsOption>(() => {
  const sorted = [...expenseData.value].sort((a, b) => b.value - a.value)
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (p: any) => {
        const item = Array.isArray(p) ? p[0] : p
        const row = sorted[item.dataIndex]
        const u = row?.unit || 'TRX'
        const countStr = row?.count !== undefined ? `（${row.count} 笔）` : ''
        return `${item.name}<br/><b>${formatNumber(item.value)}</b> ${u}${countStr}`
      }
    },
    grid: { left: 56, right: 20, top: 30, bottom: 70 },
    xAxis: {
      type: 'category',
      data: sorted.map((d) => d.name),
      axisTick: { alignWithLabel: true },
      axisLine: { lineStyle: { color: '#dcdfe6' } },
      axisLabel: { fontSize: 11, color: '#606266', interval: 0, rotate: 35 }
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 11, color: '#909399', formatter: (v: number) => abbrNum(v) },
      splitLine: { lineStyle: { type: 'dashed', color: '#f0f0f0' } }
    },
    series: [
      {
        name: '支出',
        type: 'bar',
        barWidth: '48%',
        barMaxWidth: 40,
        data: sorted.map((d) => d.value),
        itemStyle: {
          color: barGradient('#FF9A9E', COLOR.expense),
          borderRadius: [4, 4, 0, 0]
        },
        emphasis: { itemStyle: { color: barGradient('#FFB3B6', '#E04848') } },
        label: {
          show: true,
          position: 'top',
          fontSize: 10,
          color: '#909399',
          formatter: (p: any) => abbrNum(p.value)
        }
      }
    ]
  }
})

// 利润构成
const profitData = computed(() =>
  [
    { name: '闪兑利润', value: toNum(statsData.exchangeProfit) },
    { name: '能量利润', value: toNum(statsData.energyProfit) },
    { name: '激活利润', value: toNum(statsData.activeProfit) }
  ].filter((d) => d.value > 0)
)
const profitTotal = computed(() => profitData.value.reduce((s, d) => s + d.value, 0))
const profitChartOption = computed(() => buildDonut('利润构成', profitData.value))

// 资源消耗/收购（柱状图）
const resourceChartData = computed(() => {
  return [
    { name: '能量消耗', value: toNum(statsData.energyUsed), unit: '' },
    { name: '带宽消耗', value: toNum(statsData.bandwidthUsed), unit: '' },
    { name: '能量收购', value: toNum(statsData.energyPurchaseCount), unit: '' },
    { name: '带宽收购', value: toNum(statsData.bandwidthPurchaseCount), unit: '' },
    { name: '激活地址', value: toNum(statsData.activeAddress), unit: '' },
    { name: '福利订单支出', value: toNum(statsData.welfareExpense), unit: 'TRX' },
    { name: '福利订单数量', value: toNum(statsData.welfareCount), unit: '' }
  ]
})
const hasResourceData = computed(() => resourceChartData.value.some((d) => d.value > 0))
const resourceChartOption = computed<EChartsOption>(() => {
  const data = resourceChartData.value
  // 颜色分组：消耗-琥珀，收购-蓝，激活-紫，福利-青
  const colorFor = (name: string) => {
    if (name.includes('消耗')) return barGradient('#FFD08A', COLOR.resource)
    if (name.includes('收购')) return barGradient('#6E9BF5', COLOR.profit)
    if (name.includes('激活')) return barGradient('#C49BFF', '#9333EA')
    return barGradient('#7EE0D3', '#14B8A6') // 福利
  }
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (p: any) => {
        const item = Array.isArray(p) ? p[0] : p
        const u = data[item.dataIndex]?.unit
        return `${item.name}<br/><b>${Number(item.value).toLocaleString()}</b>${u ? ' ' + u : ''}`
      }
    },
    grid: { left: 56, right: 20, top: 30, bottom: 70 },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.name),
      axisTick: { alignWithLabel: true },
      axisLine: { lineStyle: { color: '#dcdfe6' } },
      axisLabel: { fontSize: 11, color: '#606266', interval: 0, rotate: 35 }
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 11, color: '#909399', formatter: (v: number) => abbrNum(v) },
      splitLine: { lineStyle: { type: 'dashed', color: '#f0f0f0' } }
    },
    series: [
      {
        name: '资源',
        type: 'bar',
        barWidth: '48%',
        barMaxWidth: 40,
        data: data.map((d) => ({
          value: d.value,
          itemStyle: { color: colorFor(d.name), borderRadius: [4, 4, 0, 0] }
        })),
        label: {
          show: true,
          position: 'top',
          fontSize: 10,
          color: '#909399',
          formatter: (p: any) => abbrNum(p.value)
        }
      }
    ]
  }
})

// ============== 数据加载 ==============
const handleTimeRange = (range: string) => {
  currentRange.value = range
  customRange.value = null
  loadData()
}

const handleCustomRange = (val: [string, string] | null) => {
  if (val && val.length === 2) {
    currentRange.value = ''
    loadData()
  }
}

const loadData = async () => {
  loading.value = true
  try {
    // TODO: 调用实际的统计接口
    // const res = await getStatisticsData({
    //   range: currentRange.value,
    //   start: customRange.value?.[0],
    //   end: customRange.value?.[1]
    // })
    // Object.assign(statsData, res.data)

    // ===== 模拟数据（接口接入后删除）=====
    await new Promise((r) => setTimeout(r, 300))
    Object.assign(statsData, buildMockData(currentRange.value))
  } catch (error) {
    handleErrorMessage(error, '获取统计数据失败')
  } finally {
    loading.value = false
  }
}

// ===== 模拟数据生成（接口接入后删除）=====
const buildMockData = (range: string) => {
  // 不同时间范围给不同倍率，方便观察图表变化
  const factorMap: Record<string, number> = {
    today: 1,
    yesterday: 0.9,
    '7d': 6.5,
    '30d': 27
  }
  const f = factorMap[range] ?? 8
  const r = (base: number) => Math.round(base * f * (0.85 + Math.random() * 0.3) * 100) / 100

  const agentIncome = r(3200)
  const flashIncome = r(2600)
  const hostingIncome = r(1800)
  const exchangeIncome = r(1500)
  const strokeIncome = r(900)
  const activeIncome = r(700)
  const income =
    agentIncome + flashIncome + hostingIncome + exchangeIncome + strokeIncome + activeIncome

  const exchangeExpense = r(1200)
  const resourceSupplyExpense = r(2100)
  const justlendExpense = r(800)
  const feeExpense = r(150)
  const trxfeeExpense = r(90)
  const energyPurchaseExpense = r(1600)
  const activeExpense = r(500)
  const expense =
    exchangeExpense +
    resourceSupplyExpense +
    justlendExpense +
    feeExpense +
    trxfeeExpense +
    energyPurchaseExpense +
    activeExpense

  const exchangeProfit = r(620)
  const energyProfit = r(1450)
  const activeProfit = r(380)

  return {
    income,
    expense,
    profit: income - expense,
    // 收入明细
    agentIncome,
    flashIncome,
    hostingIncome,
    exchangeIncome,
    strokeIncome,
    activeIncome,
    // 支出明细
    exchangeExpense,
    exchangeUsdtOut: r(450),
    exchangeUsdtCount: Math.round(12 * f),
    exchangeTrxOut: r(680),
    exchangeTrxCount: Math.round(20 * f),
    resourceSupplyExpense,
    justlendExpense,
    feeExpense,
    trxfeeExpense,
    energyPurchaseExpense,
    energyPurchaseEnergy: r(980),
    energyPurchaseBandwidth: r(320),
    activeExpense,
    // 利润明细
    exchangeProfit,
    energyProfit,
    activeProfit,
    // 资源明细
    bandwidthUsed: String(Math.round(8200 * f)),
    energyUsed: String(Math.round(130000 * f)),
    activeAddress: String(Math.round(46 * f)),
    energyPurchaseCount: String(Math.round(115000 * f)),
    bandwidthPurchaseCount: String(Math.round(7600 * f)),
    welfareExpense: String(r(260)),
    welfareCount: String(Math.round(18 * f))
  }
}

onMounted(() => {
  loadData()
  startResourceRoll()
})

onBeforeUnmount(() => {
  pauseResourceRoll()
})
</script>

<style scoped>


/* 响应式：窄屏降级为 2 列 / 1 列 */
@media (width <= 1200px) {
  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .detail-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width <= 768px) {
  .chart-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .kpi-grid,
  .detail-row {
    grid-template-columns: minmax(0, 1fr);
  }
}

.analysis-v2 {
  --gap: 16px;
  --card-radius: 10px;
}

/* 工具栏 */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin-bottom: var(--gap);
  background: #f5f7fa;
  border-radius: 8px;
}

.time-range-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.time-label {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  white-space: nowrap;
}

/* KPI 卡片 */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--gap);
  margin-bottom: var(--gap);
}

.kpi-card {
  position: relative;
  padding: 18px 20px;
  overflow: hidden;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: var(--card-radius);
  transition:
    box-shadow 0.2s,
    transform 0.2s;
}

.kpi-card::before {
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  content: '';
}

.kpi-income::before {
  background: #22c55e;
}

.kpi-expense::before {
  background: #f56c6c;
}

.kpi-profit::before {
  background: #1e40af;
}

.kpi-resource::before {
  background: #e6a23c;
}

.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgb(0 0 0 / 8%);
}

.kpi-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.kpi-title {
  font-size: 14px;
  color: #606266;
}

.kpi-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
}

.kpi-icon-income {
  color: #22c55e;
  background: #f0f9eb;
}

.kpi-icon-expense {
  color: #f56c6c;
  background: #fef0f0;
}

.kpi-icon-profit {
  color: #1e40af;
  background: #ecf2ff;
}

.kpi-icon-resource {
  color: #e6a23c;
  background: #fdf6ec;
}

.kpi-value {
  font-feature-settings: 'tnum';
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
  color: #1f2937;
}

.kpi-unit {
  margin-left: 4px;
  font-size: 13px;
  font-weight: 500;
  color: #909399;
}

.kpi-foot {
  margin-top: 8px;
}

.kpi-sub {
  font-size: 12px;
  color: #a0a3ab;
}

/* 资源走马灯 */
.resource-carousel {
  height: 76px;
  margin-top: 4px;
  overflow: hidden;
}

.resource-carousel-track {
  will-change: transform;
}

.resource-item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  height: 38px;
  opacity: 0.55;
  transition: opacity 0.55s ease;
}

.resource-item.is-active {
  opacity: 1;
}

.resource-item-label {
  font-size: 12px;
  color: #b4b7bd;
  transition:
    color 0.55s ease,
    font-size 0.55s ease;
}

.resource-item.is-active .resource-item-label {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
}

.resource-item-value {
  font-feature-settings: 'tnum';
  font-size: 15px;
  font-weight: 600;
  line-height: 38px;
  color: #c0c4cc;
  transition:
    color 0.55s ease,
    font-size 0.55s ease;
}

.resource-item.is-active .resource-item-value {
  font-size: 24px;
  font-weight: 700;
  color: #e6a23c;
}

.resource-item-unit {
  margin-left: 3px;
  font-size: 12px;
  font-weight: 500;
  color: #b4b7bd;
}

.resource-item.is-active .resource-item-unit {
  color: #909399;
}

/* 图表卡片 */
.chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--gap);
  margin-bottom: var(--gap);
}

.chart-card {
  padding: 16px 20px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: var(--card-radius);
}

.chart-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  margin-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.chart-card-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chart-card-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.chart-card-total {
  font-feature-settings: 'tnum';
  font-size: 14px;
  font-weight: 600;
  color: #1e40af;
}

.chart-card-total-sub {
  margin-left: 4px;
  font-size: 13px;
  font-weight: 600;
  color: #e6a23c;
}

.chart-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  font-size: 13px;
  color: #c0c4cc;
}

/* 明细折叠 */
.detail-collapse {
  margin-top: 4px;
  border-top: none;
}

.detail-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--gap);
}

.detail-card {
  padding: 12px 16px;
  background: #fafbfc;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}

.detail-title {
  padding-bottom: 8px;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  border-bottom: 1px solid #ebeef5;
}

.detail-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
}

.detail-label {
  font-size: 12px;
  color: #606266;
}

.detail-value {
  font-feature-settings: 'tnum';
  font-size: 12px;
  font-weight: 500;
  color: #303133;
}

.detail-count {
  margin-left: 6px;
  font-size: 11px;
  color: #f56c6c;
}
</style>
