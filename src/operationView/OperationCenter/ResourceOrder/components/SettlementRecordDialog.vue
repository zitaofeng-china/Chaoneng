<template>
  <Dialog v-model="visible" title="结算记录" width="1400px">
    <div class="settlement-record-container">
      <!-- 订单详细信息 -->
      <div class="order-detail-info" v-if="orderInfo">
        <div class="info-row">
          <div class="info-item">
            <span class="info-label">用户发送地址：</span>
            <span class="info-value">{{ orderInfo.send_address || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">用户接收地址：</span>
            <span class="info-value">{{ orderInfo.receive_address || '-' }}</span>
          </div>
        </div>
        <div class="info-row">
          <span class="info-label">系统接收地址：</span>
          <span class="info-value">{{ orderInfo.system_receive_address || '-' }}</span>
        </div>
        <div class="info-row">
          <div class="info-item">
            <span class="info-label">回收哈希1：</span>
            <span class="info-value hash-link">{{ orderInfo.recycle_hash_1 || '-' }}</span>
          </div>
        </div>
        <div class="info-row">
          <div class="info-item">
            <span class="info-label">回收哈希2：</span>
            <span class="info-value hash-link">{{ orderInfo.recycle_hash_2 || '-' }}</span>
          </div>
        </div>
      </div>

      <!-- 结算记录标题 -->
      <div class="settlement-title">
        <span class="title-text">结算记录</span>
        <span class="title-desc">（按日结算，每天结算一次）</span>
      </div>

      <!-- 结算记录表格 -->
      <div class="settlement-table-wrapper">
        <ElTable
          :data="settlementList"
          v-loading="loading"
          border
          stripe
          style="width: 100%; margin-top: 20px"
          :max-height="500"
        >
          <ElTableColumn prop="id" label="结算批次" width="180" align="center" />
          <ElTableColumn prop="settlement_period" label="结算周期" width="180" align="center">
            <template #default="{ row }">
              {{ row.settlement_period || '-' }}
            </template>
          </ElTableColumn>
          <ElTableColumn prop="payable_amount" label="应付金额 (TRX)" width="150" align="center">
            <template #default="{ row }">
              <span class="amount-text">{{ row.payable_amount || 0 }}</span>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="paid_amount" label="实付金额 (TRX)" width="150" align="center">
            <template #default="{ row }">
              <span class="amount-text">{{ row.paid_amount || 0 }}</span>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="settlement_status" label="结算状态" width="120" align="center">
            <template #default="{ row }">
              <ElTag :type="getSettlementStatusType(row.settlement_status)" size="small">
                {{ getSettlementStatusText(row.settlement_status) }}
              </ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="remark" label="备注" min-width="200" show-overflow-tooltip />
          <ElTableColumn prop="settlement_time" label="结算时间" width="180" align="center">
            <template #default="{ row }">
              {{ row.settlement_time ? formatToDateTime(row.settlement_time) : '-' }}
            </template>
          </ElTableColumn>
          <ElTableColumn prop="transaction_hash" label="交易哈希" width="200" show-overflow-tooltip>
            <template #default="{ row }">
              <span v-if="row.transaction_hash" class="hash-text">{{ row.transaction_hash }}</span>
              <span v-else>-</span>
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

<script setup lang="tsx">
import { ref } from 'vue'
import {
  ElTable,
  ElTableColumn,
  ElTag,
  ElButton,
  ElDescriptions,
  ElDescriptionsItem,
  ElPagination,
  ElEmpty,
  ElMessage
} from 'element-plus'
import { Dialog } from '@/components/Dialog'
import { formatToDateTime } from '@/utils/dateUtil'
import { handleErrorMessage } from '@/utils/messageHelper'
import { v2GetSettlementRecordList } from '@/api/resource_order'
import type { V2SettlementRecordItem } from '@/api/resource_order/types'

const visible = ref(false)
const loading = ref(false)
const orderInfo = ref<any>(null)
const settlementList = ref<V2SettlementRecordItem[]>([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 结算状态统一展示为成功/失败两类
const getSettlementStatusType = (status: number): string => {
  return status === 2 ? 'success' : 'danger'
}

const getSettlementStatusText = (status: number): string => {
  return status === 2 ? '成功' : '失败'
}

// 打开弹窗
const open = async (row: any) => {
  if (!row || !row.id) {
    ElMessage.error('无效的订单信息')
    return
  }

  visible.value = true
  orderInfo.value = row
  currentPage.value = 1
  await fetchSettlementRecords()
}

// 获取结算记录列表
const fetchSettlementRecords = async () => {
  if (!orderInfo.value?.id) return

  loading.value = true
  try {
    // TODO: 替换为实际的API调用
    // const res = await v2GetSettlementRecordList({
    //   order_id: orderInfo.value.id,
    //   current_page: currentPage.value,
    //   page_size: pageSize.value
    // })

    // 模拟数据
    const mockData = {
      code: '000000',
      data: {
        list: [
          {
            id: '2025063001',
            order_id: orderInfo.value.id,
            settlement_date: Math.floor(Date.now() / 1000) - 86400,
            settlement_period: '按日结算、每天结算一次',
            payable_amount: 18.152,
            paid_amount: 18.152,
            settlement_status: 2,
            settlement_time: Math.floor(Date.now() / 1000) - 86400,
            transaction_hash: '914aae556****3250439',
            remark: '正常结算',
            created_at: Math.floor(Date.now() / 1000) - 86400
          },
          {
            id: '2025063001',
            order_id: orderInfo.value.id,
            settlement_date: Math.floor(Date.now() / 1000) - 172800,
            settlement_period: '按日结算、每天结算一次',
            payable_amount: 18.152,
            paid_amount: 18.152,
            settlement_status: 3,
            settlement_time: Math.floor(Date.now() / 1000) - 172800,
            transaction_hash: '914aae556****3250439',
            remark: '打款钱包余额不足',
            created_at: Math.floor(Date.now() / 1000) - 172800
          }
        ],
        pager: {
          current_page: currentPage.value,
          page_size: pageSize.value,
          total: 2
        }
      }
    }

    if (mockData.code === '000000' && mockData.data) {
      settlementList.value = mockData.data.list || []
      total.value = mockData.data.pager?.total || 0
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

// 分页大小变化
const handleSizeChange = (val: number) => {
  pageSize.value = val
  currentPage.value = 1
  fetchSettlementRecords()
}

// 当前页变化
const handleCurrentChange = (val: number) => {
  currentPage.value = val
  fetchSettlementRecords()
}

// 暴露方法
defineExpose({
  open
})
</script>

<style scoped>
.settlement-record-container {
  padding: 10px 0;
}

.order-detail-info {
  padding: 20px;
  margin-bottom: 20px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.info-row {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  line-height: 1.8;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-item {
  flex: 1;
  display: flex;
  align-items: center;
}

.info-label {
  margin-right: 8px;
  font-weight: 500;
  color: #606266;
  white-space: nowrap;
}

.info-value {
  color: #303133;
  word-break: break-all;
}

.hash-link {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: #409eff;
}

.settlement-title {
  padding-bottom: 12px;
  margin-bottom: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.title-text {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.title-desc {
  margin-left: 8px;
  font-size: 14px;
  color: #909399;
}

.order-summary {
  margin-bottom: 20px;
}

.settlement-table-wrapper {
  min-height: 300px;
}

.amount-text {
  font-weight: 600;
  color: #67c23a;
}

.hash-text {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #409eff;
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
