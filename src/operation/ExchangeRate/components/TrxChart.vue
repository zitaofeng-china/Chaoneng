<template>
  <div class="chart-wrapper">
    <div class="chart-header">
      <h3>TRX 交易量趋势图</h3>
      <div class="chart-filters">
        <div class="quick-filters">
          <el-radio-group v-model="timeRange" size="small" @change="handleTimeRangeChange">
            <el-radio-button label="1month">近一个月</el-radio-button>
            <el-radio-button label="3months">近三个月</el-radio-button>
            <el-radio-button label="1year">近一年</el-radio-button>
            <el-radio-button label="all">全部</el-radio-button>
          </el-radio-group>
        </div>
        <div class="date-picker">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            size="small"
            :clearable="false"
            format="YYYY-MM-DD"
            :disabledDate="disableFutureDates"
            @change="handleDateRangeChange"
          />
        </div>
      </div>
    </div>
    <ElCard shadow="hover">
      <ElSkeleton :loading="isLoading" animated :rows="4">
        <div v-if="!allChartData || (allChartData.length === 0 && !isLoading)" class="no-data">
          <el-empty description="暂无数据" />
        </div>
        <Echart v-else :options="chartOptions" :height="350" @init="handleChartInit" />
      </ElSkeleton>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Echart } from '@/components/Echart'
import { ElCard, ElSkeleton, ElRadioGroup, ElRadioButton, ElDatePicker } from 'element-plus'
import type { EChartsOption } from 'echarts'
import * as echarts from 'echarts/core'
import { DataZoomComponent } from 'echarts/components'
import { handleErrorMessage } from '@/utils/messageHelper'
import { getTrxVolumeApi } from '@/api/opertion/ExchangeRate/ExchangeRateIndex'
import {
  formatPriceValue,
  getFirstTooltipParam,
  normalizeTrxVolumeList,
  sortByTimeAsc,
  toNumber,
  type TrxVolumeData
} from './trxData'

// 注册DataZoom组件
echarts.use([DataZoomComponent])

type EChartsInstance = echarts.ECharts

const props = defineProps({
  loading: {
    type: Boolean,
    default: false
  }
})

// 组件自身的加载状态
const localLoading = ref(false)

// 计算当前加载状态（组合外部和内部的加载状态）
const isLoading = computed(() => {
  return props.loading || localLoading.value
})

// 时间范围选择
const timeRange = ref('1month') // 默认显示近一个月数据

// 日期范围选择器的值 - 初始化时使用占位值，数据加载后会更新
const dateRange = ref<[Date, Date]>([
  new Date(new Date().setMonth(new Date().getMonth() - 1)),
  new Date()
])

// 存储原始数据和筛选后的数据
const allChartData = ref<TrxVolumeData[]>([])

// 添加响应式的 dataZoom 范围
const currentZoomRange = ref({ start: 0, end: 100 })

// 时间处理工具函数
const timeUtils = {
  // 创建日期范围（起始时间戳和结束时间戳）- 使用UTC时间
  createDateRange(startDate: Date, endDate: Date) {
    // 转换为UTC时间戳，API需要的是UTC时间
    const startTimestamp = Date.UTC(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
      0,
      0,
      0,
      0
    )

    const endTimestamp = Date.UTC(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate(),
      23,
      59,
      59,
      999
    )

    return {
      startTimestamp,
      endTimestamp
    }
  },

  // 根据特定时间范围创建时间戳范围
  getRangeByType(rangeType: string) {
    // 使用数据的最新日期作为结束日期，而不是今天
    // 因为数据可能不是实时更新的
    let endDate: Date
    let startDate: Date

    if (allChartData.value && allChartData.value.length > 0) {
      // 使用数据中最新的日期
      const latestData = allChartData.value[allChartData.value.length - 1]
      const latestTimestamp = latestData.time || latestData.timestamp || 0
      endDate = new Date(latestTimestamp)

      // 对于"全部"选项，使用数据中最早的日期
      if (rangeType === 'all') {
        const earliestData = allChartData.value[0]
        const earliestTimestamp = earliestData.time || earliestData.timestamp || 0
        startDate = new Date(earliestTimestamp)
        return this.createDateRange(startDate, endDate)
      }
    } else {
      // 如果没有数据，使用今天
      endDate = new Date()
    }

    if (rangeType === '1month') {
      startDate = new Date(endDate)
      startDate.setMonth(startDate.getMonth() - 1)
    } else if (rangeType === '3months') {
      startDate = new Date(endDate)
      startDate.setMonth(startDate.getMonth() - 3)
    } else if (rangeType === '1year') {
      startDate = new Date(endDate)
      startDate.setFullYear(startDate.getFullYear() - 1)
    } else if (rangeType === 'all') {
      // 如果没有数据，使用 TRX 发行时间
      startDate = new Date(1507564800000)
    } else {
      // 默认一个月
      startDate = new Date(endDate)
      startDate.setMonth(startDate.getMonth() - 1)
    }

    return this.createDateRange(startDate, endDate)
  },

  // 检查日期是否不可选（数据最新日期之后的日期）
  isDateDisabled(date: Date) {
    // 如果有数据，使用数据的最新日期
    if (allChartData.value && allChartData.value.length > 0) {
      const latestData = allChartData.value[allChartData.value.length - 1]
      const latestTimestamp = latestData.time || latestData.timestamp || 0
      const latestDate = new Date(latestTimestamp)
      latestDate.setHours(23, 59, 59, 999)

      // 禁用数据最新日期之后的日期
      return date > latestDate
    }

    // 如果没有数据，禁用今天及以后的日期
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date >= today
  }
}

// 处理时间范围选择
const handleTimeRangeChange = (value: string) => {
  if (value === 'custom' && dateRange.value && dateRange.value.length === 2) {
    // 自定义时间范围，使用dateRange的值
    const { startTimestamp, endTimestamp } = timeUtils.createDateRange(
      new Date(dateRange.value[0]),
      new Date(dateRange.value[1])
    )
    // 过滤数据并调整dataZoom位置
    filterDataByTimeRange(startTimestamp, endTimestamp)
    return
  }

  // 使用预设的时间范围
  const { startTimestamp, endTimestamp } = timeUtils.getRangeByType(value)

  // 更新日期选择器的值 - 使用本地日期对象
  const startDate = new Date(startTimestamp)
  const endDate = new Date(endTimestamp)
  dateRange.value = [
    new Date(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()),
    new Date(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate())
  ]

  // 过滤数据并调整dataZoom位置
  filterDataByTimeRange(startTimestamp, endTimestamp)
}

// 处理日期范围变化
const handleDateRangeChange = (value: [Date, Date]) => {
  if (!value || value.length !== 2) return

  // 设置为自定义模式
  timeRange.value = 'custom'

  // 创建日期范围
  const { startTimestamp, endTimestamp } = timeUtils.createDateRange(
    new Date(value[0]),
    new Date(value[1])
  )

  // 过滤数据并调整dataZoom位置
  filterDataByTimeRange(startTimestamp, endTimestamp)
}

// 根据时间范围过滤数据并更新图表
const filterDataByTimeRange = (startTimestamp: number, endTimestamp: number) => {
  if (!allChartData.value || allChartData.value.length === 0) {
    return
  }

  // 找到时间范围在全部数据中的索引位置
  let startIndex = -1
  let endIndex = -1

  for (let i = 0; i < allChartData.value.length; i++) {
    const itemTimestamp = allChartData.value[i].time || allChartData.value[i].timestamp

    if (startIndex === -1 && itemTimestamp >= startTimestamp) {
      startIndex = i
    }

    if (itemTimestamp > endTimestamp) {
      endIndex = i
      break
    }
  }

  // 如果没有找到结束索引，说明数据都在范围内
  if (endIndex === -1) {
    endIndex = allChartData.value.length
  }

  // 如果没有找到开始索引，使用第一个数据
  if (startIndex === -1) {
    startIndex = 0
  }

  // 计算在全部数据中的百分比位置
  const totalLength = allChartData.value.length
  const startPercent = (startIndex / totalLength) * 100
  const endPercent = (endIndex / totalLength) * 100

  // 更新响应式的 zoom 范围 - 这会触发 chartOptions 的重新计算
  currentZoomRange.value = {
    start: startPercent,
    end: endPercent
  }
}

// 获取所有历史数据
const fetchAllData = async () => {
  localLoading.value = true
  // 在请求开始前设置为空数组
  allChartData.value = []

  try {
    // 获取从TRX发行至今的所有数据
    const trxLaunchDate = new Date(1507564800000) // TRX发行时间附近
    const today = new Date()

    const startTimestamp = trxLaunchDate.getTime()
    const endTimestamp = today.getTime()

    // 发起API请求，获取所有历史数据
    const data = await getTrxVolumeApi({
      start_timestamp: startTimestamp,
      end_timestamp: endTimestamp,
      limit: 2700,
      source: 'coinmarketcap'
    })

    if (Array.isArray(data.data)) {
      if (data.data.length > 0) {
        const processedData = sortByTimeAsc(normalizeTrxVolumeList(data.data))

        // 保存所有历史数据
        allChartData.value = processedData

        // 初始化 currentZoomRange - 先设置为默认值
        const defaultZoom = calculateDefaultZoomRange.value
        currentZoomRange.value = defaultZoom

        // 如果图表已经初始化，立即应用时间范围过滤
        if (chartInstance.value) {
          // 根据当前选择的时间范围调整dataZoom位置
          const { startTimestamp, endTimestamp } = timeUtils.getRangeByType(timeRange.value)
          filterDataByTimeRange(startTimestamp, endTimestamp)
        }
      } else {
        allChartData.value = []
      }
    } else {
      allChartData.value = []
    }
  } catch (error) {
    handleErrorMessage(error, '获取TRX历史数据失败')
    allChartData.value = []
  } finally {
    localLoading.value = false
  }
}

// 加载所有图表数据
const loadAllData = async () => {
  try {
    localLoading.value = true

    // 获取所有历史数据
    await fetchAllData()

    // 如果图表已经初始化，则更新图表
    if (chartInstance.value) {
      // 应用完整的图表配置
      chartInstance.value.setOption(chartOptions.value)
    }
  } catch (error) {
    handleErrorMessage(error, '加载图表数据失败')
  } finally {
    localLoading.value = false
  }
}

// 格式化价格
const formatPrice = (price: number | string | null | undefined) => formatPriceValue(price, 4)

// 提取的日期数据
const dates = computed(() => {
  if (!allChartData.value || allChartData.value.length === 0) return []

  return allChartData.value.map((item) => {
    // 从时间戳创建日期
    const timeValue = typeof item.time === 'number' ? item.time : 0
    const date = new Date(timeValue)

    // 使用UTC日期格式化，避免时区问题
    return date.toISOString().split('T')[0]
  })
})

// 提取的价格数据
const closePrices = computed(() => {
  if (!allChartData.value || allChartData.value.length === 0) return []

  return allChartData.value.map((item) => {
    return toNumber(item.close)
  })
})

// 计算默认的区域选择范围
const calculateDefaultZoomRange = computed(() => {
  if (!allChartData.value || allChartData.value.length <= 15) {
    // 数据少于15条，显示全部
    return { start: 0, end: 100 }
  } else if (allChartData.value.length <= 30) {
    // 数据少于30条，显示全部
    return { start: 0, end: 100 }
  } else if (allChartData.value.length <= 60) {
    // 数据在30-60条之间，显示最近的75%
    return { start: 25, end: 100 }
  } else {
    // 数据较多，显示最近的50%
    return { start: 80, end: 100 }
  }
})

// 初始化图表选项
const chartOptions = computed<EChartsOption>(() => {
  if (!allChartData.value || allChartData.value.length === 0) {
    return {
      title: {
        text: '暂无数据',
        left: 'center',
        top: 'center'
      }
    } as EChartsOption
  }

  // 使用响应式的 zoom 范围
  const zoomRange = currentZoomRange.value

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      show: true,
      formatter: (params: unknown) => {
        const { dataIndex } = getFirstTooltipParam(params)
        if (dataIndex === undefined || dataIndex >= allChartData.value.length) return ''

        const data = allChartData.value[dataIndex]
        if (!data) return ''

        const timestamp = data.timestamp || data.time || 0
        const dateObj = new Date(timestamp)
        const formattedDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`

        return `<div style="padding:10px;font-size:14px;">
                  <div style="font-weight:bold;color:#ff5200;margin-bottom:5px;">${formattedDate}</div>
                  <div>收盘价: $${formatPrice(data.close)}</div>
                </div>`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '13%', // 增加底部空间以容纳区域选择器
      containLabel: true
    },
    // 添加dataZoom组件，实现区域选择功能
    dataZoom: [
      {
        type: 'slider', // 滑动条型数据区域缩放组件
        show: true,
        xAxisIndex: [0],
        start: zoomRange.start,
        end: zoomRange.end,
        height: 30,
        bottom: 10,
        borderColor: 'rgba(255, 82, 0, 0.2)',
        dataBackground: {
          lineStyle: {
            color: '#ff5200',
            opacity: 0.5
          },
          areaStyle: {
            color: 'rgba(255, 82, 0, 0.2)'
          }
        },
        fillerColor: 'rgba(255, 82, 0, 0.1)',
        handleStyle: {
          color: '#ff5200',
          borderColor: '#ff5200'
        },
        textStyle: {
          color: '#666'
        },
        brushSelect: true, // 允许框选
        emphasis: {
          handleStyle: {
            borderWidth: 2,
            color: '#ff7a4d'
          }
        }
      },
      {
        type: 'inside', // 内置型数据区域缩放组件（通过鼠标滚轮或触摸板）
        xAxisIndex: [0],
        start: zoomRange.start,
        end: zoomRange.end,
        zoomOnMouseWheel: true,
        moveOnMouseMove: true
      }
    ],
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates.value,
      axisLabel: {
        rotate: 45,
        interval: 'auto',
        formatter: function (value: string) {
          // 简化显示，只保留月-日
          const parts = value.split('-')
          if (parts.length === 3) {
            return `${parts[1]}-${parts[2]}`
          }
          return value
        }
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: function (value: number) {
          return formatPrice(value)
        }
      },
      scale: true, // 设置成true可以使y轴自适应数据范围
      splitLine: {
        lineStyle: {
          type: 'dashed'
        }
      }
    },
    series: [
      {
        name: '收盘价',
        type: 'line',
        smooth: true, // 设置为平滑的曲线
        symbol: 'circle',
        symbolSize: 5,
        data: closePrices.value,
        itemStyle: {
          color: '#ff5200'
        },
        lineStyle: {
          width: 1.5, // 稍微加粗线条
          color: '#ff5200',
          type: 'solid'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(255, 82, 0, 0.3)' },
              { offset: 1, color: 'rgba(255, 82, 0, 0.05)' }
            ]
          }
        },
        markPoint: {
          symbol: 'pin',
          symbolSize: 40,
          data: [
            { type: 'max', name: '最大值' },
            { type: 'min', name: '最小值' }
          ]
        },
        animationDuration: 2000,
        animationEasing: 'cubicInOut'
      }
    ]
  } as EChartsOption
})

const chartInstance = ref<EChartsInstance | null>(null)

const handleChartInit = (chart: EChartsInstance) => {
  chartInstance.value = chart

  // 如果数据已加载，则设置初始视图
  if (allChartData.value && allChartData.value.length > 0) {
    // 初始化 currentZoomRange
    const defaultZoom = calculateDefaultZoomRange.value
    currentZoomRange.value = defaultZoom

    // 完整设置图表选项
    chart.setOption(chartOptions.value, true)

    // 根据当前选择的时间范围调整dataZoom位置
    const { startTimestamp, endTimestamp } = timeUtils.getRangeByType(timeRange.value)
    filterDataByTimeRange(startTimestamp, endTimestamp)

    // 添加dataZoom事件监听器
    chart.on('datazoom', function () {
      // 延迟一点时间，等待缩放完成
      setTimeout(() => {
        // 确保tooltip仍然可用
        const tooltipConfig = {
          trigger: 'axis',
          show: true,
          axisPointer: {
            type: 'cross'
          }
        }
        // 重新设置tooltip
        chart.setOption(
          {
            tooltip: tooltipConfig
          },
          false
        )
      }, 100)
    })
  }
}

const handleResize = () => {
  chartInstance.value?.resize()
}

// 禁用今天和未来日期，只允许选择今天之前的日期
const disableFutureDates = (time: Date) => {
  return timeUtils.isDateDisabled(time)
}

// 初始化
onMounted(async () => {
  // 初始加载所有数据
  await loadAllData()

  // 监听窗口大小变化，自动调整图表大小
  window.addEventListener('resize', handleResize)
})

// 在组件卸载时清理资源
onUnmounted(() => {
  // 移除窗口大小变化监听
  window.removeEventListener('resize', handleResize)

  // 释放图表实例
  if (chartInstance.value) {
    chartInstance.value.dispose()
    chartInstance.value = null
  }
})
</script>

<style scoped>
.chart-wrapper {
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 8px;
}

.chart-header {
  margin-bottom: 16px;
}

.chart-header h3 {
  margin: 0;
  margin-bottom: 12px;
  font-size: 18px;
  color: #333;
}

.chart-filters {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
}

.quick-filters {
  flex: 1;
}

.date-picker {
  min-width: 300px;
}

@media (width <= 768px) {
  .chart-filters {
    flex-direction: column;
    align-items: flex-start;
  }

  .date-picker {
    width: 100%;
  }
}

.chart-controls {
  display: flex;
  margin: 10px 0;
  justify-content: flex-end;
  gap: 10px;
}

.refresh-chart-btn,
.fullscreen-btn {
  display: flex;
  align-items: center;
  gap: 5px;
}

.fullscreen {
  position: fixed !important;
  top: 0;
  left: 0;
  z-index: 9999;
  width: 100vw !important;
  height: 100vh !important;
  padding: 20px;
  margin: 0;
  overflow: auto;
  background-color: rgb(255 255 255 / 98%);
  border-radius: 0;
}
</style>
