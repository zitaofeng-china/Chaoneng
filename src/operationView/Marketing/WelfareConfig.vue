<template>
  <div class="app-container">
    <ContentWrap>
      <el-tabs v-model="activeTab">
        <!-- 基础设置 -->
        <el-tab-pane label="基础设置" name="basic">
          <!-- 福利价格配置 -->
          <el-divider content-position="left">福利价格</el-divider>
          <Form
            labelPosition="top"
            :schema="priceSchema"
            @register="priceFormRegister"
            :gridColumns="2"
          />
          <div class="section-actions">
            <el-button type="primary" @click="handleSavePrice" :loading="submitting">
              保存价格配置
            </el-button>
          </div>

          <!-- 福利收款钱包地址 -->
          <el-divider content-position="left">福利收款钱包地址</el-divider>
          <div class="weal-address-section">
            <SearchTable
              ref="searchTableRef"
              :columns="addressColumns"
              :fetch-data-api="fetchWealAddresses"
              :table-props="{ border: true }"
              :show-search="false"
              :pagination="{
                pageSize: 10,
                pageSizes: [10, 20, 50, 100]
              }"
            >
              <template #toolbar>
                <el-button type="primary" @click="handleAddAddress">
                  <Icon icon="ep:plus" class="mr-5px" />
                  添加地址
                </el-button>
                <el-button type="danger" @click="handleBatchDeleteDialog">
                  <Icon icon="ep:delete" class="mr-5px" />
                  批量删除
                </el-button>
              </template>
            </SearchTable>
          </div>
        </el-tab-pane>

        <!-- 高级设置 -->
        <el-tab-pane label="高级设置" name="advanced">
          <div style="margin: 0 0 16px; font-size: 14px; font-weight: bold; color: #f56c6c">
            提示：满足以下全部条件可发放！！！
          </div>

          <!-- 购买限制 -->
          <el-divider content-position="left">
            购买限制<span style="font-size: 10px; color: #f56c6c">(需小于以下条件)</span>
          </el-divider>
          <Form
            labelPosition="top"
            :schema="welfareSchema"
            @register="welfareFormRegister"
            :gridColumns="2"
          />
          <div class="section-actions">
            <el-button type="primary" @click="handleSaveWelfare" :loading="submitting">
              保存福利条件
            </el-button>
          </div>
        </el-tab-pane>
      </el-tabs>

      <!-- 添加地址对话框 -->
      <Dialog v-model="addDialogVisible" title="添加福利收款地址" width="600px" max-height="300px">
        <div style="margin-bottom: 16px">
          <div style="margin-bottom: 8px">
            <span style="font-size: 14px; font-weight: 500">钱包地址</span>
            <span style="margin-left: 8px; font-size: 12px; color: #909399">
              （每行一个地址，支持批量添加）
            </span>
          </div>
          <el-input
            v-model="addressForm.addresses"
            type="textarea"
            :rows="12"
            placeholder="请输入福利收款钱包地址，每行一个"
            style="font-family: monospace"
          />
        </div>
        <template #footer>
          <div style="display: flex; justify-content: flex-end; gap: 12px">
            <el-button @click="addDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="handleConfirmAdd" :loading="submitting">
              确定添加
            </el-button>
          </div>
        </template>
      </Dialog>

      <!-- 批量删除对话框 -->
      <Dialog
        v-model="batchDeleteVisible"
        title="批量删除福利收款地址"
        width="600px"
        max-height="300px"
      >
        <div style="margin-bottom: 16px">
          <div style="margin-bottom: 8px">
            <span style="font-size: 14px; font-weight: 500">要删除的钱包地址</span>
            <span style="margin-left: 8px; font-size: 12px; color: #909399">
              （每行一个地址，支持批量删除）
            </span>
          </div>
          <el-input
            v-model="batchDeleteForm.addresses"
            type="textarea"
            :rows="12"
            placeholder="请输入要删除的钱包地址，每行一个"
            style="font-family: monospace"
          />
        </div>
        <template #footer>
          <div style="display: flex; justify-content: flex-end; gap: 12px">
            <el-button @click="batchDeleteVisible = false">取消</el-button>
            <el-button type="danger" @click="handleConfirmBatchDelete" :loading="submitting">
              确定删除
            </el-button>
          </div>
        </template>
      </Dialog>
    </ContentWrap>
  </div>
</template>

<script setup lang="tsx">
import { ref, reactive, onMounted, h } from 'vue'
import { ElButton, ElMessage, ElMessageBox, ElDivider, ElTabs, ElTabPane } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { Icon } from '@/components/Icon'
import { Dialog } from '@/components/Dialog'
import { Form, FormSchema } from '@/components/Form'
import { useForm } from '@/hooks/web/useForm'
import { formatToDateTime } from '@/utils/dateUtil'
import { SearchTable } from '@/components/SearchTable'
import type { TableColumn } from '@/components/Table'
import { handleErrorMessage, handleSuccessMessage } from '@/utils/messageHelper'
import {
  v1GetBotWealConfig,
  v1UpdateBotWealConfig,
  v1GetBotPriceConfig,
  v1UpdateBotPrice,
  v1GetAddressList,
  v1AddAddressList,
  v1DeleteAddressList,
  v1GetSystemPrice,
  v2GetBotList
} from '@/api/botlist'

// 标签页
const activeTab = ref('basic')

// 状态
const submitting = ref(false)
const costPrices = reactive<Record<string, any>>({})
const currentBotId = ref<number | null>(null)
const currentPriceId = ref<number | null>(null)

// 地址相关
const searchTableRef = ref<InstanceType<typeof SearchTable> | null>(null)
const addDialogVisible = ref(false)
const batchDeleteVisible = ref(false)
const addressForm = reactive({ addresses: '' })
const batchDeleteForm = reactive({ addresses: '' })

// 表单
const { formRegister: priceFormRegister, formMethods: priceFormMethods } = useForm()
const { formRegister: welfareFormRegister, formMethods: welfareFormMethods } = useForm()

// 获取第一个机器人ID
const loadFirstBot = async () => {
  try {
    const res = await v2GetBotList({ current_page: 1, page_size: 1, status: 1 })
    const list = res.data?.list || []
    if (list.length > 0) {
      currentBotId.value = list[0].id
    }
  } catch (error) {
    console.error('获取机器人列表失败:', error)
  }
}

// 加载价格配置
const loadPriceConfig = async () => {
  if (!currentBotId.value) return
  try {
    const [systemPriceRes, botPriceRes] = await Promise.all([
      v1GetSystemPrice(),
      v1GetBotPriceConfig(currentBotId.value)
    ])

    if (systemPriceRes.code === '000000' && systemPriceRes.data) {
      Object.assign(costPrices, {
        weal: parseFloat(systemPriceRes.data.weal || '0') || 0
      })
    }

    if (botPriceRes.code === '000000' && botPriceRes.data) {
      currentPriceId.value = botPriceRes.data.id
      priceFormMethods.setValues({
        weal: parseFloat(botPriceRes.data.weal) || 0
      })
    }
  } catch (error) {
    handleErrorMessage(error, '获取价格配置失败')
  }
}

// 加载福利条件配置
const loadWelfareConfig = async () => {
  if (!currentBotId.value) return
  try {
    const res = await v1GetBotWealConfig(currentBotId.value)
    if (res.code === '000000' && res.data) {
      const wealData = res.data
      welfareFormMethods.setValues({
        max_count: wealData.max_count || 0,
        min_interval: (wealData.min_interval || 0) / 3600,
        max_energy: wealData.max_energy || 0,
        max_bandwidth: wealData.max_bandwidth || 0,
        min_active_day: wealData.min_active_day || 0,
        min_balance_trx: parseFloat(wealData.min_balance_trx) || 0,
        min_balance_usdt: parseFloat(wealData.min_balance_usdt) || 0,
        min_avg_transfer_trx: parseFloat(wealData.min_avg_transfer_trx) || 0,
        min_avg_transfer_usdt: parseFloat(wealData.min_avg_transfer_usdt) || 0,
        min_send_interval: (wealData.min_send_interval || 0) / 60,
        same_send_max_count_trx: wealData.same_send_max_count_trx || 0,
        same_send_min_amount_trx: parseFloat(wealData.same_send_min_amount_trx) || 0
      })
    }
  } catch (error) {
    handleErrorMessage(error, '获取福利配置失败')
  }
}

// 保存价格配置
const handleSavePrice = async () => {
  if (!currentBotId.value) {
    ElMessage.warning('未找到机器人信息')
    return
  }
  try {
    submitting.value = true
    const priceData = await priceFormMethods.getFormData()

    await v1UpdateBotPrice({
      id: currentPriceId.value,
      weal: priceData.weal || 0
    })
    handleSuccessMessage('价格配置保存成功')
  } catch (error) {
    handleErrorMessage(error, '保存价格配置失败')
  } finally {
    submitting.value = false
  }
}

// 保存福利条件配置
const handleSaveWelfare = async () => {
  if (!currentBotId.value) {
    ElMessage.warning('未找到机器人信息')
    return
  }
  try {
    submitting.value = true
    const welfareData = await welfareFormMethods.getFormData()

    const welfareConfig = {
      bot_id: currentBotId.value,
      max_count: welfareData.max_count || 0,
      min_interval: Math.round((welfareData.min_interval || 0) * 3600),
      max_energy: welfareData.max_energy || 0,
      max_bandwidth: welfareData.max_bandwidth || 0,
      min_active_day: welfareData.min_active_day || 0,
      min_balance_trx: welfareData.min_balance_trx || 0,
      min_balance_usdt: welfareData.min_balance_usdt || 0,
      min_avg_transfer_trx: welfareData.min_avg_transfer_trx || 0,
      min_avg_transfer_usdt: welfareData.min_avg_transfer_usdt || 0,
      min_send_interval: Math.round((welfareData.min_send_interval || 0) * 60),
      same_send_max_count_trx: welfareData.same_send_max_count_trx || 0,
      same_send_min_amount_trx: welfareData.same_send_min_amount_trx || 0
    }

    await v1UpdateBotWealConfig(currentBotId.value, welfareConfig)
    handleSuccessMessage('福利条件保存成功')
  } catch (error) {
    handleErrorMessage(error, '保存福利条件失败')
  } finally {
    submitting.value = false
  }
}

// ========== 价格表单 ==========
const priceSchema = reactive<FormSchema[]>([
  {
    field: 'weal',
    component: 'InputNumber' as const,
    label: '福利能量（TRX）',
    componentProps: {
      placeholder: '请输入福利能量价格',
      min: 0,
      precision: 2
    },
    formItemProps: {
      rules: [{ required: true, message: '福利能量是必填项' }],
      slots: {
        label: () => {
          const costPrice = costPrices.weal
          const costText = costPrice !== undefined ? `成本价: ${costPrice} TRX` : '成本价: N/A'
          return (
            <>
              福利能量（TRX） <small style="color: #909399; font-size: 10px;">（{costText}）</small>
            </>
          )
        }
      }
    }
  }
])

// ========== 福利条件表单 ==========
const welfareSchema = reactive<FormSchema[]>([
  {
    field: 'max_count',
    component: 'InputNumber' as const,
    label: {
      text: '最大购买次数',
      tips: '每个地址最多可购买的次数'
    },
    componentProps: {
      placeholder: '请输入最大次数',
      min: 0,
      precision: 0
    },
    formItemProps: {
      rules: [{ required: true, message: '最大购买次数是必填项' }]
    }
  },
  {
    field: 'min_interval',
    component: 'InputNumber' as const,
    label: {
      text: '最小购买间隔（小时）',
      tips: '两次购买之间的最小时间间隔'
    },
    componentProps: {
      placeholder: '请输入最小间隔',
      min: 0,
      precision: 1
    },
    formItemProps: {
      rules: [{ required: true, message: '最小购买间隔是必填项' }]
    }
  },

  // 能量和带宽限制
  {
    field: 'divider_energy_limit',
    component: 'Divider' as const,
    label: () => (
      <>
        能量和带宽限制<span style={{ color: '#f56c6c', fontSize: '10px' }}>(需小于以下条件)</span>
      </>
    ),
    colProps: { span: 24 }
  },
  {
    field: 'max_energy',
    component: 'InputNumber' as const,
    label: {
      text: '持有最大能量',
      tips: '地址持有最大能量值'
    },
    componentProps: {
      placeholder: '请输入持有最大能量',
      min: 0,
      precision: 0
    },
    formItemProps: {
      rules: [{ required: true, message: '持有最大能量是必填项' }]
    }
  },
  {
    field: 'max_bandwidth',
    component: 'InputNumber' as const,
    label: {
      text: '持有最大带宽',
      tips: '地址持有最大带宽值'
    },
    componentProps: {
      placeholder: '请输入持有最大带宽',
      min: 0,
      precision: 0
    },
    formItemProps: {
      rules: [{ required: true, message: '持有最大带宽是必填项' }]
    }
  },

  // 转账要求
  {
    field: 'divider_transfer_requirement',
    component: 'Divider' as const,
    label: () => (
      <>
        转账要求<span style={{ color: '#f56c6c', fontSize: '10px' }}>(需大于以下条件)</span>
      </>
    ),
    colProps: { span: 24 }
  },
  {
    field: 'min_avg_transfer_trx',
    component: 'InputNumber' as const,
    label: {
      text: '最小平均转账（TRX）',
      tips: '地址的最小平均TRX转账金额'
    },
    componentProps: {
      placeholder: '请输入最小平均转账TRX',
      min: 0,
      precision: 2
    },
    formItemProps: {
      rules: [{ required: true, message: '最小平均转账（TRX）是必填项' }]
    }
  },
  {
    field: 'min_avg_transfer_usdt',
    component: 'InputNumber' as const,
    label: {
      text: '最小平均转账（USDT）',
      tips: '地址的最小平均USDT转账金额'
    },
    componentProps: {
      placeholder: '请输入最小平均转账USDT',
      min: 0,
      precision: 2
    },
    formItemProps: {
      rules: [{ required: true, message: '最小平均转账（USDT）是必填项' }]
    }
  },
  {
    field: 'min_send_interval',
    component: 'InputNumber' as const,
    label: {
      text: '最小发送间隔（分钟）',
      tips: '两次转账之间的最小时间间隔'
    },
    componentProps: {
      placeholder: '请输入最小发送间隔',
      min: 0,
      precision: 1
    },
    formItemProps: {
      rules: [{ required: true, message: '最小发送间隔是必填项' }]
    }
  },

  // 账户要求
  {
    field: 'divider_account_requirement',
    component: 'Divider' as const,
    label: () => (
      <>
        账户要求<span style={{ color: '#f56c6c', fontSize: '10px' }}>(需大于以下条件)</span>
      </>
    ),
    colProps: { span: 24 }
  },
  {
    field: 'min_active_day',
    component: 'InputNumber' as const,
    label: {
      text: '最小激活天数',
      tips: '地址需要激活的最少天数'
    },
    componentProps: {
      placeholder: '请输入最小激活天数',
      min: 0,
      precision: 0
    },
    formItemProps: {
      rules: [{ required: true, message: '最小激活天数是必填项' }]
    }
  },
  {
    field: 'min_balance_trx',
    component: 'InputNumber' as const,
    label: {
      text: '最小余额（TRX）',
      tips: '地址持有最小TRX余额'
    },
    componentProps: {
      placeholder: '请输入最小TRX余额',
      min: 0,
      precision: 2
    },
    formItemProps: {
      rules: [{ required: true, message: '最小余额（TRX）是必填项' }]
    }
  },
  {
    field: 'min_balance_usdt',
    component: 'InputNumber' as const,
    label: {
      text: '最小余额（USDT）',
      tips: '地址持有最小USDT余额'
    },
    componentProps: {
      placeholder: '请输入最小USDT余额',
      min: 0,
      precision: 2
    },
    formItemProps: {
      rules: [{ required: true, message: '最小余额（USDT）是必填项' }]
    }
  },

  // 相同地址转账限制
  {
    field: 'divider_same_amount_limit',
    component: 'Divider' as const,
    label: () => (
      <>
        相同地址转账限制
        <span style={{ color: '#f56c6c', fontSize: '10px' }}>(需同时满足以下条件)</span>
      </>
    ),
    colProps: { span: 24 }
  },
  {
    field: 'same_send_max_count_trx',
    component: 'InputNumber' as const,
    label: {
      text: '相同地址最大次数（TRX）',
      tips: '相同地址TRX转账的最大允许次数。注意：此字段与"相同地址最小值"是一同判断'
    },
    componentProps: {
      placeholder: '请输入最大次数',
      min: 0,
      precision: 0
    },
    formItemProps: {
      rules: [{ required: true, message: '相同地址最大次数（TRX）是必填项' }]
    }
  },
  {
    field: 'same_send_min_amount_trx',
    component: 'InputNumber' as const,
    label: {
      text: '相同地址最小值（TRX）',
      tips: '触发相同地址检测的最小TRX金额。注意：此字段与"相同地址最大次数"是一同判断'
    },
    componentProps: {
      placeholder: '请输入最小金额',
      min: 0,
      precision: 2
    },
    formItemProps: {
      rules: [{ required: true, message: '相同地址最小值（TRX）是必填项' }]
    }
  }
])

// ========== 地址列表 ==========
const addressColumns = ref<TableColumn[]>([
  {
    field: 'address',
    label: '地址',
    minWidth: '200px'
  },
  {
    field: 'created_at',
    label: '创建时间',
    width: '180px',
    formatter: (row) => formatToDateTime(row.created_at * 1000)
  },
  {
    field: 'updated_at',
    label: '修改时间',
    width: '180px',
    formatter: (row) => formatToDateTime(row.updated_at * 1000)
  },
  {
    label: '操作',
    field: 'action',
    width: '120px',
    fixed: 'right',
    formatter: (row) => {
      return h(
        ElButton,
        {
          type: 'danger',
          size: 'small',
          onClick: () => handleDeleteAddress(row)
        },
        () => '删除'
      )
    }
  }
])

// 获取福利地址列表
const fetchWealAddresses = async (params: any) => {
  try {
    if (!currentBotId.value) {
      return { list: [], totalCount: 0 }
    }

    const res = await v1GetAddressList({
      bot_id: currentBotId.value,
      kind: 6,
      current_page: params.current_page || 1,
      page_size: params.page_size || 10
    })

    const data = res.data || {}
    return {
      list: data.list || [],
      totalCount: data.pager?.total || 0
    }
  } catch (error) {
    console.error('获取福利地址列表失败:', error)
    return { list: [], totalCount: 0 }
  }
}

// 刷新表格
const reloadTable = () => {
  searchTableRef.value?.reload()
}

// 删除单个地址
const handleDeleteAddress = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除该地址吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await v1DeleteAddressList({
      bot_id: currentBotId.value!,
      list: [row.address]
    })

    ElMessage.success('删除成功')
    reloadTable()
  } catch (error: any) {
    if (error !== 'cancel') {
      const errorMsg = error?.msg || error?.message || '删除失败'
      ElMessage.error(errorMsg)
    }
  }
}

// 添加地址
const handleAddAddress = () => {
  addressForm.addresses = ''
  addDialogVisible.value = true
}

// 确认添加
const handleConfirmAdd = async () => {
  if (!addressForm.addresses.trim()) {
    ElMessage.warning('请输入地址')
    return
  }

  const addressList = addressForm.addresses
    .split(/[\n\r]+/)
    .map((addr: string) => addr.trim())
    .filter((addr: string) => addr !== '')

  if (addressList.length === 0) {
    ElMessage.warning('未输入有效地址')
    return
  }

  try {
    submitting.value = true
    await v1AddAddressList({
      bot_id: currentBotId.value!,
      kind: 6,
      list: addressList
    })
    ElMessage.success(`成功添加 ${addressList.length} 个地址`)
    addDialogVisible.value = false
    reloadTable()
  } catch (error: any) {
    const errorMsg = error?.msg || error?.message || '添加失败'
    ElMessage.error(errorMsg)
  } finally {
    submitting.value = false
  }
}

// 批量删除对话框
const handleBatchDeleteDialog = () => {
  batchDeleteForm.addresses = ''
  batchDeleteVisible.value = true
}

// 确认批量删除
const handleConfirmBatchDelete = async () => {
  if (!batchDeleteForm.addresses.trim()) {
    ElMessage.warning('请输入要删除的地址')
    return
  }

  const addressList = batchDeleteForm.addresses
    .split(/[\n\r]+/)
    .map((addr: string) => addr.trim())
    .filter((addr: string) => addr !== '')

  if (addressList.length === 0) {
    ElMessage.warning('未输入有效地址')
    return
  }

  try {
    await ElMessageBox.confirm(`确定要删除 ${addressList.length} 个地址吗？`, '批量删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    submitting.value = true
    await v1DeleteAddressList({
      bot_id: currentBotId.value!,
      list: addressList
    })

    ElMessage.success(`成功删除 ${addressList.length} 个地址`)
    batchDeleteVisible.value = false
    reloadTable()
  } catch (error: any) {
    if (error !== 'cancel') {
      const errorMsg = error?.msg || error?.message || '批量删除失败'
      ElMessage.error(errorMsg)
    }
  } finally {
    submitting.value = false
  }
}

// 初始化
onMounted(async () => {
  await loadFirstBot()
  if (currentBotId.value) {
    await Promise.all([loadPriceConfig(), loadWelfareConfig()])
  }
})
</script>

<style scoped>
.section-actions {
  display: flex;
  justify-content: flex-end;
  margin: 16px 0 24px;
}

.weal-address-section {
  padding: 10px;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
}
</style>
