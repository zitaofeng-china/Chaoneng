<template>
  <Dialog v-model="visible" title="结算记录" width="1200px">
    <div class="settlement-record-container">
      <!-- 订单地址信息 -->
      <div class="order-address-info" v-if="orderInfo">
        <div class="info-row">
          <span class="info-label">用户发送地址：</span>
          <span class="info-value">{{ orderInfo.source || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">用户接收地址：</span>
          <span class="info-value">{{ orderInfo.receiver || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">系统结算地址：</span>
          <span class="info-value">{{ orderInfo.target || '-' }}</span>
        </div>
      </div>

      <!-- 结算记录表格 -->
      <div class="settlement-table-wrapper">
        <p class="settlement-tip">按日结算，每天凌晨结算一次</p>
        <ElTable
          :data="settlementList"
          v-loading="loading"
          border
          stripe
          style="width: 100%"
          :max-height="500"
        >
          <ElTableColumn prop="order_id" label="订单ID" width="100" align="center" />
          <ElTableColumn prop="period" label="结算周期" width="140" align="center" />
          <ElTableColumn prop="amount" label="数量" width="100" align="center" />
          <ElTableColumn prop="price" label="SUN/天" width="120" align="center" />
          <ElTableColumn prop="duration" label="时长" width="140" align="center">
            <template #default="{ row }">
              {{ formatDuration(row.duration) }}
            </template>
          </ElTableColumn>
          <ElTableColumn prop="profit" label="金额" width="120" align="center">
            <template #default="{ row }">
              <span class="amount-text">{{ row.profit || '-' }}</span>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="status" label="状态" width="100" align="center">
            <template #default="{ row }">
              <ElTag :type="row.status === 1 ? 'success' : 'danger'" size="small">
                {{ row.status === 1 ? '成功' : '失败' }}
              </ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="txid" label="交易哈希" width="120" align="center">
            <template #default="{ row }">
              <ElLink
                v-if="row.txid"
                type="primary"
                :href="`${tronscanUrl}/#/transaction/${row.txid}`"
                target="_blank"
              >
                查看
              </ElLink>
              <span v-else>-</span>
            </template>
          </ElTableColumn>
          <ElTableColumn
            prop="describe"
            label="描述"
            width="120"
            align="center"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              {{ row.describe || '-' }}
            </template>
          </ElTableColumn>
          <ElTableColumn prop="created_at" label="创建时间" width="180" align="center">
            <template #default="{ row }">
              {{ row.created_at ? formatToDateTime(row.created_at * 1000) : '-' }}
            </template>
          </ElTableColumn>
        </ElTable>

        <!-- 分页 -->
        <div class="pagination-wrapper" v-if="total > 0">
          <ElPagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>

        <!-- 空状态 -->
        <div v-if="!loading && settlementList.length === 0" class="empty-state">
          <ElEmpty description="暂无结算记录" />
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <ElButton @click="visible = false">关闭</ElButton>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  ElTable,
  ElTableColumn,
  ElTag,
  ElButton,
  ElLink,
  ElPagination,
  ElEmpty,
  ElMessage
} from 'element-plus'
import { Dialog } from '@/components/Dialog'
import { formatToDateTime } from '@/utils/dateUtil'
import { handleErrorMessage } from '@/utils/messageHelper'
import { v2GetSettlementRecordList } from '@/api/resource_order'
import type { V2SettlementRecordItem } from '@/api/resource_order/types'

const tronscanUrl = import.meta.env.VITE_TRONSCAN_URL || 'https://tronscan.org'

// 将毫秒时长转换为 天+小时 格式
const formatDuration = (ms: number): string => {
  if (!ms) return '-'
  const totalHours = Math.floor(ms / 3600000)
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  if (days > 0 && hours > 0) return `${days}天${hours}小时`
  if (days > 0) return `${days}天`
  if (hours > 0) return `${hours}小时`
  return '-'
}

const visible = ref(false)
const loading = ref(false)
const orderId = ref<number>(0)
const orderInfo = ref<any>(null)
const settlementList = ref<V2SettlementRecordItem[]>([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 打开弹窗
const open = async (row: any) => {
  if (!row || !row.id) {
    ElMessage.error('无效的订单信息')
    return
  }

  visible.value = true
  orderId.value = row.id
  orderInfo.value = row
  currentPage.value = 1
  await fetchSettlementRecords()
}

// 获取结算记录列表
const fetchSettlementRecords = async () => {
  if (!orderId.value) return

  loading.value = true
  try {
    const res = await v2GetSettlementRecordList({
      order_id: orderId.value,
      current_page: currentPage.value,
      page_size: pageSize.value
    })

    if (res?.code === '000000' && res.data) {
      settlementList.value = res.data.list || []
      total.value = res.data.pager?.total || 0
    } else {
      settlementList.value = []
      total.value = 0
    }
  } catch (error) {
    handleErrorMessage(error, '获取结算记录失败')
    settlementList.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

// 分页
const handleSizeChange = (val: number) => {
  pageSize.value = val
  currentPage.value = 1
  fetchSettlementRecords()
}

const handleCurrentChange = (val: number) => {
  currentPage.value = val
  fetchSettlementRecords()
}

defineExpose({ open })
</script>

<style scoped>
.settlement-record-container {
  padding: 10px 0;
}

.order-address-info {
  padding: 16px 20px;
  margin-bottom: 16px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.order-address-info .info-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  line-height: 1.8;
}

.order-address-info .info-row:last-child {
  margin-bottom: 0;
}

.order-address-info .info-label {
  margin-right: 8px;
  font-weight: 500;
  color: #606266;
  white-space: nowrap;
}

.order-address-info .info-value {
  color: #303133;
  word-break: break-all;
}

.settlement-table-wrapper {
  min-height: 300px;
}

.settlement-tip {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 500;
  color: #e6a23c;
}

.amount-text {
  font-weight: 600;
  color: #67c23a;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}
</style>
