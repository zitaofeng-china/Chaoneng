<template>
  <div class="app-container">
    <ContentWrap>
      <!-- 时间范围选择 -->
      <div class="time-range-bar">
        <span class="time-label">时间范围：</span>
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
          v-model="customStart"
          type="date"
          placeholder="年 / 月 / 日"
          size="small"
          style="width: 140px; margin-left: 12px"
          value-format="YYYY-MM-DD"
        />
        <span style="margin: 0 8px; color: #999">至</span>
        <el-date-picker
          v-model="customEnd"
          type="date"
          placeholder="年 / 月 / 日"
          size="small"
          style="width: 140px"
          value-format="YYYY-MM-DD"
        />
      </div>

      <!-- 顶部统计卡片 - 第一行 -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-header">超能收入</div>
          <div class="stat-value">{{ formatNumber(statsData.income) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-header">超能支出</div>
          <div class="stat-value">{{ formatNumber(statsData.expense) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-header">超能利润</div>
          <div class="stat-value">{{ formatNumber(statsData.profit) }}</div>
        </div>
        <div class="stat-card stat-card-resource">
          <div class="resource-title">超能资源情况</div>
        </div>
      </div>

      <!-- 收入明细 + 支出明细 + 利润明细 + 资源明细 -->
      <div class="detail-row">
        <!-- 超能收入明细 -->
        <div class="detail-card">
          <div class="detail-item">
            <span class="detail-label">代理收款</span>
            <span class="detail-value">{{ statsData.agentIncome }} TRX</span>
          </div>
          <div class="detail-item tag-item tag-red">
            <span class="detail-label">闪租</span>
            <span class="detail-value">{{ statsData.flashIncome }} TRX</span>
          </div>
          <div class="detail-item tag-item tag-red">
            <span class="detail-label">托管</span>
            <span class="detail-value">{{ statsData.hostingIncome }} TRX</span>
          </div>
          <div class="detail-item tag-item tag-red">
            <span class="detail-label">闪兑</span>
            <span class="detail-value">{{ statsData.exchangeIncome }} TRX</span>
          </div>
          <div class="detail-item tag-item tag-red">
            <span class="detail-label">按笔数</span>
            <span class="detail-value">{{ statsData.strokeIncome }} TRX</span>
          </div>
          <div class="detail-item tag-item tag-red">
            <span class="detail-label">激活</span>
            <span class="detail-value">{{ statsData.activeIncome }} TRX</span>
          </div>
        </div>

        <!-- 超能支出明细 -->
        <div class="detail-card">
          <div class="detail-item">
            <span class="detail-label">闪兑支出</span>
            <span class="detail-value">{{ statsData.exchangeExpense }} TRX</span>
          </div>
          <div class="detail-item tag-item tag-blue">
            <span class="detail-label">支出</span>
            <span class="detail-value">{{ statsData.exchangeUsdtOut }} USDT</span>
            <span class="detail-count">{{ statsData.exchangeUsdtCount }} 笔</span>
          </div>
          <div class="detail-item tag-item tag-blue">
            <span class="detail-label">支出</span>
            <span class="detail-value">{{ statsData.exchangeTrxOut }} TRX</span>
            <span class="detail-count">{{ statsData.exchangeTrxCount }} 笔</span>
          </div>
          <div class="detail-item tag-item tag-blue">
            <span class="detail-label">资源补充支出</span>
            <span class="detail-value">{{ statsData.resourceSupplyExpense }} TRX</span>
          </div>
          <div class="detail-item tag-item tag-blue">
            <span class="detail-label">justlend</span>
            <span class="detail-value">{{ statsData.justlendExpense }} TRX</span>
          </div>
          <div class="detail-item tag-item tag-blue">
            <span class="detail-label">feee</span>
            <span class="detail-value">{{ statsData.feeExpense }} TRX</span>
          </div>
          <div class="detail-item tag-item tag-blue">
            <span class="detail-label">trxfee</span>
            <span class="detail-value">{{ statsData.trxfeeExpense }} TRX</span>
          </div>
          <div class="detail-item tag-item tag-blue">
            <span class="detail-label">能量收购支出</span>
            <span class="detail-value">{{ statsData.energyPurchaseExpense }} TRX</span>
          </div>
          <div class="detail-item tag-item tag-blue">
            <span class="detail-label">能量</span>
            <span class="detail-value">{{ statsData.energyPurchaseEnergy }} TRX</span>
          </div>
          <div class="detail-item tag-item tag-blue">
            <span class="detail-label">带宽</span>
            <span class="detail-value">{{ statsData.energyPurchaseBandwidth }} TRX</span>
          </div>
          <div class="detail-item tag-item tag-blue">
            <span class="detail-label">激活支出</span>
            <span class="detail-value">{{ statsData.activeExpense }} TRX</span>
          </div>
        </div>

        <!-- 利润明细 -->
        <div class="detail-card">
          <div class="detail-item">
            <span class="detail-label">利润明细</span>
          </div>
          <div class="detail-item tag-item tag-orange">
            <span class="detail-label">闪兑利润</span>
            <span class="detail-value">{{ statsData.exchangeProfit }} TRX</span>
          </div>
          <div class="detail-item tag-item tag-orange">
            <span class="detail-label">能量利润</span>
            <span class="detail-value">{{ statsData.energyProfit }} TRX</span>
          </div>
          <div class="detail-item tag-item tag-orange">
            <span class="detail-label">激活利润</span>
            <span class="detail-value">{{ statsData.activeProfit }} TRX</span>
          </div>
        </div>

        <!-- 资源明细 -->
        <div class="detail-card">
          <div class="detail-item">
            <span class="detail-label">资源明细</span>
          </div>
          <div class="detail-item tag-item tag-green">
            <span class="detail-label">带宽消耗：</span>
            <span class="detail-value">{{ statsData.bandwidthUsed }}</span>
          </div>
          <div class="detail-item tag-item tag-green">
            <span class="detail-label">能量消耗：</span>
            <span class="detail-value">{{ statsData.energyUsed }}</span>
          </div>
          <div class="detail-item tag-item tag-green">
            <span class="detail-label">激活地址：</span>
            <span class="detail-value">{{ statsData.activeAddress }}</span>
          </div>
          <div class="detail-item tag-item tag-green">
            <span class="detail-label">能量收购数量：</span>
            <span class="detail-value">{{ statsData.energyPurchaseCount }}</span>
          </div>
          <div class="detail-item tag-item tag-green">
            <span class="detail-label">带宽收购数量：</span>
            <span class="detail-value">{{ statsData.bandwidthPurchaseCount }}</span>
          </div>
          <div class="detail-item tag-item tag-green">
            <span class="detail-label">福利订单支出：</span>
            <span class="detail-value">{{ statsData.welfareExpense }}</span>
          </div>
          <div class="detail-item tag-item tag-green">
            <span class="detail-label">福利订单数量：</span>
            <span class="detail-value">{{ statsData.welfareCount }}</span>
          </div>
        </div>
      </div>

      <!-- 底部公式说明 -->
      <!-- <div class="formula-section">
        <div class="formula-item">闪租收入+闪兑 -闪兑支出TRX+闪兑支出USDT = 闪兑利润</div>
        <div class="formula-item">激活收入-激活支出=激活利润</div>
        <div class="formula-item">闪租+托管+按笔数收入 - 资源补充支出+能量收购支出 = 能量利润</div>
        <div class="formula-item">激活收入 - 激活支出 = 激活利润</div>
      </div> -->
    </ContentWrap>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElButton, ElDatePicker } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { handleErrorMessage } from '@/utils/messageHelper'

// 时间范围
const currentRange = ref('today')
const customStart = ref('')
const customEnd = ref('')

const timeRangeOptions = [
  { label: '今日', value: 'today' },
  { label: '昨日', value: 'yesterday' },
  { label: '7天', value: '7d' },
  { label: '30日', value: '30d' }
]

// 统计数据
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

const formatNumber = (num: number) => {
  if (!num && num !== 0) return '0.00'
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const handleTimeRange = (range: string) => {
  currentRange.value = range
  loadData()
}

const loadData = async () => {
  try {
    // TODO: 调用实际的统计接口
    // const res = await getStatisticsData({ range: currentRange.value, start: customStart.value, end: customEnd.value })
    // Object.assign(statsData, res.data)
  } catch (error) {
    handleErrorMessage(error, '获取统计数据失败')
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.time-range-bar {
  display: flex;
  padding: 16px;
  margin-bottom: 24px;
  background: #f5f7fa;
  border-radius: 4px;
  align-items: center;
  gap: 8px;
}

.time-label {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  white-space: nowrap;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  padding: 24px;
  text-align: center;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}

.stat-card-highlight {
  border-color: #409eff;
}

.stat-card-resource {
  display: flex;
  flex-direction: column;
  justify-content: center;
  border: 1px dashed #409eff;
}

.resource-title {
  font-size: 18px;
  font-weight: bold;
  color: #409eff;
}

.resource-subtitle {
  font-size: 13px;
  color: #606266;
}

.stat-header {
  margin-bottom: 12px;
  font-size: 20px;
  font-weight: bold;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
}

.detail-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.detail-card {
  padding: 16px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}

.detail-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  margin-bottom: 6px;
  border-radius: 4px;
}

.tag-item {
  border-radius: 4px;
}

.tag-red {
  background: #fef0f0;
  border-left: 3px solid #f56c6c;
}

.tag-blue {
  background: #ecf5ff;
  border-left: 3px solid #409eff;
}

.tag-orange {
  background: #fdf6ec;
  border-left: 3px solid #e6a23c;
}

.tag-green {
  background: #f0f9eb;
  border-left: 3px solid #67c23a;
}

.sub-item {
  padding-left: 24px;
  background: #fafafa;
}

.detail-label {
  font-size: 13px;
  color: #606266;
}

.detail-value {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
}

.detail-count {
  margin-left: 8px;
  font-size: 12px;
  color: #f56c6c;
}

.formula-section {
  padding: 16px 20px;
  background: #ecf5ff;
  border: 1px solid #d9ecff;
  border-radius: 4px;
}

.formula-item {
  font-size: 13px;
  line-height: 2;
  color: #409eff;
}

.resource-item {
  font-size: 13px;
  color: #606266;
}

.stat-content {
  text-align: left;
}
</style>
