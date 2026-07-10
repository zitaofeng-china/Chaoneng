<template>
  <div class="app-container">
    <ContentWrap>
      <SearchTable
        :columns="columns"
        :search-schema="searchSchema"
        :fetch-data-api="fetchResourceOrderList"
        :showAddButton="false"
        ref="searchTableRef"
        :default-params="defaultParams"
        :search-props="{
          layout: 'inline',
          buttonPosition: 'center'
        }"
        :table-props="tableProps"
      >
        <template #searchButtons>
          <BaseButton type="primary" :loading="exporting" @click="handleExport">
            <Icon icon="ep:download" class="mr-5px" />
            导出订单
          </BaseButton>
        </template>
      </SearchTable>

      <!-- 结算记录弹窗 -->
      <SettlementRecordDialog ref="settlementRecordDialogRef" />
    </ContentWrap>
  </div>
</template>

<script setup lang="tsx">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { SearchTable } from '@/components/SearchTable'
import type { SearchTableExpose } from '@/components/SearchTable'
import { BaseButton } from '@/components/Button'
import { Icon } from '@/components/Icon'
import type { TableColumn } from '@/components/Table'
import type { FormSchema } from '@/components/Form'
import {
  v2GetResourceOrderList,
  v2UpdateResourceOrder,
  type V2ResourceOrderItem,
  type V2ResourceOrderListParams
} from '@/api/opertion/FinancialManage/ResourceOrder'
import { v1GetMessageBotList, type MessageBotItem } from '@/api/opertion/common/message'
import { handleErrorMessage, handleListMessage, handleSuccessMessage } from '@/utils/messageHelper'
import { getEnergyOrderKindText } from '@/utils/energyOrder'
import {
  createPageParams,
  exportTableData,
  formatTableDateTime,
  getStatusLabel,
  hasSearchValue,
  renderStatusTag,
  withAllOption,
  type SelectOption,
  type TableSlot
} from '@/utils/tableHelpers'
import SettlementRecordDialog from './components/SettlementRecordDialog.vue'
import {
  RESOURCE_ORDER_KIND_MAP,
  RESOURCE_ORDER_KIND_SEARCH_OPTIONS,
  RESOURCE_ORDER_STATUS_OPTIONS,
  RESOURCE_ORDER_STATUS_MAP
} from '../constants'

const searchTableRef = ref<SearchTableExpose | null>(null)
const settlementRecordDialogRef = ref<InstanceType<typeof SettlementRecordDialog> | null>(null)
const DEFAULT_CREATED_AT_ORDER = 'created_at DESC'
const exporting = ref(false)
const updatingOrderId = ref<number | null>(null)
const defaultParams = {
  order: DEFAULT_CREATED_AT_ORDER
}
const tableProps = {
  defaultSort: {
    prop: 'created_at',
    order: 'descending'
  }
}

type ResourceOrderTableSlot = TableSlot<V2ResourceOrderItem>
type ResourceOrderSearchParams = V2ResourceOrderListParams & Recordable
type BotOption = SelectOption<number | string>

const getResourceOrderKindText = (kind: number) => {
  return RESOURCE_ORDER_KIND_MAP[kind] || getEnergyOrderKindText(kind) || String(kind || '-')
}

const formatTrxStake = (balance: number | null | undefined) => {
  if (balance == null) return '-'
  return (balance / 1_000_000).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const formatOffsetPrice = (offsetPrice: number | null | undefined) => {
  if (offsetPrice == null || offsetPrice === 0) return '-'
  return offsetPrice > 0 ? `+${offsetPrice}` : String(offsetPrice)
}

const columns: TableColumn[] = [
  {
    field: 'id',
    label: '订单ID',
    width: 100
  },
  {
    field: 'agent_name',
    label: '代理名称',
    width: 120,
    formatter: (row: V2ResourceOrderItem) => row.agent_name || '-'
  },
  {
    field: 'bot_name',
    label: '机器人名称',
    width: 140,
    formatter: (row: V2ResourceOrderItem) => row.bot_name || '-'
  },
  {
    field: 'kind',
    label: '订单类型',
    minWidth: 120,
    formatter: (row: V2ResourceOrderItem) => getResourceOrderKindText(row.kind)
  },
  {
    field: 'source',
    label: '用户发送地址',
    minWidth: 200,
    formatter: (row: V2ResourceOrderItem) => row.source || '-'
  },
  {
    field: 'target',
    label: '接收地址',
    minWidth: 200,
    formatter: (row: V2ResourceOrderItem) => row.target || '-'
  },
  {
    field: 'amount',
    label: '能量数量',
    width: 100,
    formatter: (row: V2ResourceOrderItem) => row.amount ?? '-'
  },
  {
    field: 'balance',
    label: 'TRX质押',
    width: 140,
    formatter: (row: V2ResourceOrderItem) => formatTrxStake(row.balance)
  },
  {
    field: 'profit_sum',
    label: '累计支出',
    width: 120,
    formatter: (row: V2ResourceOrderItem) => row.profit_sum || '-'
  },
  {
    field: 'offset_price',
    label: '价格浮动',
    width: 100,
    formatter: (row: V2ResourceOrderItem) => formatOffsetPrice(row.offset_price)
  },
  {
    field: 'status',
    label: '订单状态',
    width: 100,
    slots: {
      default: ({ row }: ResourceOrderTableSlot) =>
        renderStatusTag(RESOURCE_ORDER_STATUS_MAP, row.status)
    }
  },
  {
    field: 'describe',
    label: '备注',
    width: 120,
    formatter: (row: V2ResourceOrderItem) => row.describe || '-'
  },
  {
    field: 'created_at',
    label: '创建时间',
    sortable: 'custom',
    width: 180,
    formatter: (row: V2ResourceOrderItem) => formatTableDateTime(row.created_at)
  },
  {
    field: 'settled_at',
    label: '结束时间',
    sortable: 'custom',
    width: 180,
    formatter: (row: V2ResourceOrderItem) => formatTableDateTime(row.settled_at)
  },
  {
    field: 'action',
    label: '操作',
    width: 280,
    fixed: 'right',
    slots: {
      default: ({ row }: ResourceOrderTableSlot) => {
        return (
          <div class="action-buttons">
            <BaseButton type="primary" onClick={() => handleViewSettlement(row)}>
              查看结算记录
            </BaseButton>
            <BaseButton
              type="warning"
              loading={updatingOrderId.value === row.id}
              disabled={updatingOrderId.value !== null && updatingOrderId.value !== row.id}
              onClick={() => handleEditOffsetPrice(row)}
            >
              编辑浮动价格
            </BaseButton>
          </div>
        )
      }
    }
  }
]

const searchSchema = ref<FormSchema[]>([
  {
    field: 'keyword',
    component: 'Input' as const,
    label: {
      tips: '订单ID/代理名称/机器人名称/用户发送地址',
      text: '关键词'
    },
    componentProps: {
      placeholder: '请输入关键词',
      clearable: true
    }
  },
  {
    field: 'kind',
    component: 'Select' as const,
    label: '订单类型',
    componentProps: {
      placeholder: '全部',
      clearable: true,
      options: RESOURCE_ORDER_KIND_SEARCH_OPTIONS
    }
  },
  {
    field: 'status',
    component: 'Select' as const,
    label: '状态',
    componentProps: {
      placeholder: '全部',
      clearable: true,
      options: RESOURCE_ORDER_STATUS_OPTIONS
    }
  },
  {
    field: 'bot_id',
    component: 'Select' as const,
    label: '机器人',
    componentProps: {
      placeholder: '全部',
      clearable: true,
      filterable: true,
      options: [] as BotOption[]
    }
  }
])

const buildResourceOrderListParams = (
  params: ResourceOrderSearchParams = {}
): V2ResourceOrderListParams => {
  const apiParams: V2ResourceOrderListParams = {
    ...createPageParams(params)
  }

  if (hasSearchValue(params.keyword)) apiParams.keyword = String(params.keyword).trim()
  if (hasSearchValue(params.kind)) apiParams.kind = Number(params.kind)
  if (hasSearchValue(params.status)) apiParams.status = Number(params.status)
  if (hasSearchValue(params.bot_id)) apiParams.bot_id = Number(params.bot_id)
  apiParams.order = hasSearchValue(params.order) ? String(params.order) : DEFAULT_CREATED_AT_ORDER

  return apiParams
}

const fetchResourceOrderList = async (params: ResourceOrderSearchParams = {}) => {
  try {
    const apiParams = buildResourceOrderListParams(params)
    const res = await v2GetResourceOrderList(apiParams)

    if (res?.code === '000000' && res.data) {
      const list = res.data.list || []
      const total = res.data.pager?.total || 0

      handleListMessage(
        list,
        [params.keyword, params.kind, params.status, params.bot_id].some(hasSearchValue),
        '资源订单'
      )

      return { list, total }
    }

    return { list: [], total: 0 }
  } catch (error) {
    handleErrorMessage(error, '获取资源订单列表失败')
    return { list: [], total: 0 }
  }
}

const loadBotList = async () => {
  try {
    const res = await v1GetMessageBotList()
    if (res.code === '000000' && res.data) {
      const botOptions: BotOption[] = withAllOption(
        res.data.map((bot: MessageBotItem) => ({
          label: bot.user_name || `机器人${bot.id}`,
          value: bot.id
        }))
      )
      const botField = searchSchema.value.find((item) => item.field === 'bot_id')
      if (botField?.componentProps) {
        botField.componentProps.options = botOptions
      }
    }
  } catch (error) {
    handleErrorMessage(error, '加载机器人列表失败')
  }
}

onMounted(() => {
  loadBotList()
})

const handleViewSettlement = (row: V2ResourceOrderItem) => {
  settlementRecordDialogRef.value?.open(row)
}

const validateOffsetPrice = (value: string) => {
  const normalizedValue = value.trim()
  if (!/^[+-]?\d+$/.test(normalizedValue)) {
    return '请输入正整数、0或负整数'
  }

  return Number.isSafeInteger(Number(normalizedValue)) || '价格浮动超出有效范围'
}

const handleEditOffsetPrice = async (row: V2ResourceOrderItem) => {
  if (updatingOrderId.value !== null) return

  const currentOffsetPrice = row.offset_price ?? 0

  try {
    const { value } = await ElMessageBox.prompt(`请输入订单 ${row.id} 的价格浮动`, '编辑价格浮动', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: String(currentOffsetPrice),
      inputPlaceholder: '请输入价格浮动',
      inputValidator: validateOffsetPrice
    })
    const offsetPrice = Number(value.trim())

    if (offsetPrice === currentOffsetPrice) {
      ElMessage.info('价格浮动未发生变化')
      return
    }

    updatingOrderId.value = row.id
    await v2UpdateResourceOrder({
      id: row.id,
      offset_price: offsetPrice
    })
    await searchTableRef.value?.reload()
    handleSuccessMessage('价格浮动更新成功')
  } catch (error) {
    // 请求错误已由 Axios 拦截器统一提示，取消和关闭无需处理。
    if (error !== 'cancel' && error !== 'close') return
  } finally {
    if (updatingOrderId.value === row.id) {
      updatingOrderId.value = null
    }
  }
}

const handleExport = async () => {
  exporting.value = true
  try {
    await exportTableData<
      V2ResourceOrderItem,
      ResourceOrderSearchParams,
      V2ResourceOrderListParams
    >({
      searchTableRef,
      filename: '资源订单列表',
      fetchData: v2GetResourceOrderList,
      buildParams: (params) =>
        buildResourceOrderListParams({
          ...params,
          current_page: 1,
          page_size: -1
        }),
      getList: (res) => res.data?.list || [],
      mapItem: (item) => ({
        订单ID: item.id,
        代理名称: item.agent_name || '-',
        机器人名称: item.bot_name || '-',
        订单类型: getResourceOrderKindText(item.kind),
        来源地址: item.source || '-',
        目标地址: item.target || '-',
        接收地址: item.receiver || '-',
        能量数量: item.amount ?? '-',
        TRX质押: formatTrxStake(item.balance),
        累计支出: item.profit_sum || '-',
        价格浮动: formatOffsetPrice(item.offset_price),
        订单状态: getStatusLabel(RESOURCE_ORDER_STATUS_MAP, item.status),
        备注: item.describe || '-',
        支付时间: formatTableDateTime(item.paid_at),
        结算时间: formatTableDateTime(item.settled_at),
        创建时间: formatTableDateTime(item.created_at)
      }),
      successMessage: '订单导出成功'
    })
  } catch (error) {
    handleErrorMessage(error, '订单导出失败')
  } finally {
    exporting.value = false
  }
}
</script>

<style scoped>
.app-container {
  padding: 0;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.action-buttons :deep(.el-button + .el-button) {
  margin-left: 0;
}
</style>
