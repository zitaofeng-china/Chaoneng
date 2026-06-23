<template>
  <div class="app-container">
    <ContentWrap>
      <SearchTable
        ref="searchTableRef"
        :columns="columns"
        :search-schema="searchSchema"
        :fetch-data-api="fetchDataWrapper"
        :default-params="initialSearchParams"
        :table-props="{
          rowKey: 'id',
          highlightCurrentRow: false,
          reserveSelection: false
        }"
        :show-add-button="false"
        :search-props="{
          layout: 'inline',
          buttonPosition: 'center'
        }"
        :pagination="{
          total: totalCount
        }"
        @loaded="handleDataLoaded"
        @error="handleLoadError"
      >
        <template #searchButtons>
          <BaseButton type="primary" :loading="exporting" @click="handleExport">
            <Icon icon="ep:download" class="mr-5px" />
            导出
          </BaseButton>
        </template>
      </SearchTable>

      <OrderDetail ref="orderDetailRef" />
    </ContentWrap>
  </div>
</template>

<script setup lang="tsx">
import { onMounted, ref } from 'vue'
import { ElLink, ElTag } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { SearchTable } from '@/components/SearchTable'
import type { SearchTableExpose } from '@/components/SearchTable'
import { BaseButton } from '@/components/Button'
import { Icon } from '@/components/Icon'
import OrderDetail from './components/OrderDetail.vue'
import { v2GetEnergyList } from '@/api/opertion/OperationCenter/EnergyTransaction'
import { v1GetMessageBotList, type MessageBotItem } from '@/api/opertion/common/message'
import { handleErrorMessage, handleListMessage } from '@/utils/messageHelper'
import { getStatusText, getStatusType, ORDER_STATUS_OPTIONS } from '@/utils/orderStatus'
import {
  buildBackendOrder,
  createPageParams,
  exportTableData,
  formatTableDateTime,
  hasSearchValue,
  withAllOption,
  type SelectOption,
  type TableSlot
} from '@/utils/tableHelpers'
import type { TableColumn } from '@/components/Table'
import type { FormSchema } from '@/components/Form'
import type { EnergyListParams, EnergyOrder } from '../EnergyTransaction/types'
import type { QuickChargeOrder, QuickChargeSearchParams } from './types'
import { useRoute, useRouter } from 'vue-router'
import {
  getQuickChargeOrderTypeTagType,
  getQuickChargeOrderTypeText,
  QUICK_CHARGE_RESOURCE_TYPE_OPTIONS
} from './constants'

const QUICK_CHARGE_ORDER_KINDS = [15, 21]
const DEFAULT_START_TIME_ORDER = 'delegated_at DESC'

const searchTableRef = ref<SearchTableExpose | null>(null)
const orderDetailRef = ref<InstanceType<typeof OrderDetail> | null>(null)
const route = useRoute()
const router = useRouter()
const totalCount = ref(0)
const exporting = ref(false)
const botOptions = ref<SelectOption<number | string>[]>(withAllOption<number | string>([]))
const initialSearchParams: Partial<QuickChargeSearchParams> = (() => {
  const keyword = route.query.keyword || route.query.query
  return keyword ? { keyword: String(keyword) } : {}
})()

type QuickChargeTableSlot = TableSlot<QuickChargeOrder>

const columns: TableColumn[] = [
  { field: 'id', label: '订单号', minWidth: 160 },
  {
    field: 'bot_user_name',
    label: '机器人用户名',
    minWidth: 130,
    slots: {
      default: ({ row }: QuickChargeTableSlot) => {
        const botUserName = row.bot_user_name
        if (!botUserName || botUserName === '-') {
          return <span>-</span>
        }

        return (
          <ElLink
            type="primary"
            onClick={() =>
              router.push({ path: '/agent/bot_list', query: { keyword: botUserName } })
            }
          >
            {botUserName}
          </ElLink>
        )
      }
    }
  },
  { field: 'agent_name', label: '代理', minWidth: 120 },
  { field: 'receive_address', label: '接收地址', minWidth: 210 },
  {
    field: 'order_type_label',
    label: '类型',
    width: 110,
    slots: {
      default: ({ row }: QuickChargeTableSlot) => (
        <ElTag type={getQuickChargeOrderTypeTagType(row.kind)} size="small">
          {row.order_type_label}
        </ElTag>
      )
    }
  },
  { field: 'amount', label: '数量', width: 130 },
  { field: 'unit_price', label: '单价（sun/天）', width: 130 },
  { field: 'start_time', label: '开始时间', width: 170 },
  { field: 'end_time', label: '结束时间', width: 170 },
  {
    field: 'status',
    label: '订单状态',
    width: 110,
    slots: {
      default: ({ row }: QuickChargeTableSlot) => (
        <ElTag type={getStatusType(row.status)} size="small">
          {getStatusText(row.status)}
        </ElTag>
      )
    }
  },
  { field: 'remark', label: '备注', minWidth: 120 },
  {
    field: 'action',
    label: '操作',
    width: 120,
    fixed: 'right',
    slots: {
      default: ({ row }: QuickChargeTableSlot) => (
        <BaseButton type="primary" onClick={() => handleDetail(row)}>
          查看详情
        </BaseButton>
      )
    }
  }
]

const searchSchema = ref<FormSchema[]>([
  {
    field: 'keyword',
    component: 'Input',
    label: {
      text: '关键词',
      tips: '订单号/机器人用户名/代理'
    },
    componentProps: {
      placeholder: '订单号/机器人用户名/代理',
      clearable: true,
      style: { width: '330px' }
    }
  },
  {
    field: 'type',
    component: 'Select' as const,
    label: '类型',
    componentProps: {
      placeholder: '全部',
      clearable: true,
      options: QUICK_CHARGE_RESOURCE_TYPE_OPTIONS
    }
  },
  {
    field: 'status',
    component: 'Select' as const,
    label: '状态',
    componentProps: {
      placeholder: '全部',
      clearable: true,
      options: ORDER_STATUS_OPTIONS
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
      options: botOptions.value
    }
  }
])

const buildQuickChargeListParams = (params: QuickChargeSearchParams): EnergyListParams => {
  const apiParams: EnergyListParams = {
    ...createPageParams(params),
    kind: hasSearchValue(params.type) ? Number(params.type) : QUICK_CHARGE_ORDER_KINDS
  }

  if (params.keyword) {
    apiParams.keyword = params.keyword
  }

  if (hasSearchValue(params.bot_id)) {
    apiParams.bot_id = Number(params.bot_id)
  }

  if (hasSearchValue(params.status)) {
    apiParams.status = Number(params.status)
  }

  apiParams.order = buildBackendOrder(params.order) || DEFAULT_START_TIME_ORDER

  return apiParams
}

const normalizeText = (value?: string | number | null, fallback = '-') => {
  if (value === undefined || value === null || value === '') return fallback
  return String(value)
}

const toFiniteNumber = (value?: string | number | null) => {
  if (value === undefined || value === null || value === '') return undefined
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

const formatUnitPrice = (
  amountValue?: string | number | null,
  feeValue?: string | number | null,
  energyCountValue?: string | number | null
) => {
  const amount = toFiniteNumber(amountValue)
  const fee = toFiniteNumber(feeValue) ?? 0
  const energyCount = toFiniteNumber(energyCountValue)

  if (amount === undefined || energyCount === undefined || energyCount <= 0) return '-'

  const unitPrice = ((amount - fee) / energyCount) * 1000000
  if (!Number.isFinite(unitPrice)) return '-'

  return String(Math.round(unitPrice))
}

const mapEnergyOrderToQuickChargeOrder = (item: EnergyOrder): QuickChargeOrder => {
  const startTimeValue = item.delegated_at || item.created_at
  const endTimeValue = item.recycled_at || item.updated_at
  const targetAddress = item.payment_address || item.energy_address

  return {
    id: normalizeText(item.id),
    bot_user_name: normalizeText(item.bot_user_name || item.bot_name),
    agent_name: normalizeText(item.agent_name),
    receive_address: normalizeText(targetAddress),
    type: item.kind,
    order_type_label: getQuickChargeOrderTypeText(item.kind),
    amount: normalizeText(item.energy_count),
    unit_price: formatUnitPrice(item.amount, item.fee, item.energy_count),
    start_time: formatTableDateTime(startTimeValue),
    end_time: formatTableDateTime(endTimeValue),
    status: item.status,
    remark: normalizeText(item.describe),
    bot_id: item.bot_id,
    bot_name: item.bot_name,
    tg_user_name: item.tg_user_name,
    energy_num: normalizeText(item.energy_count),
    kind: item.kind
  }
}

const hasQuickChargeSearchCondition = (params: QuickChargeSearchParams) =>
  [params.keyword, params.type, params.status, params.bot_id].some(hasSearchValue)

const loadBotOptions = async () => {
  try {
    const response = await v1GetMessageBotList()
    const options = (response.data || []).map((bot: MessageBotItem) => ({
      label: bot.user_name || `机器人${bot.id}`,
      value: bot.id
    }))

    botOptions.value = withAllOption(options)

    const botField = searchSchema.value.find((item) => item.field === 'bot_id')
    if (botField?.componentProps) {
      botField.componentProps.options = botOptions.value
    }
  } catch (error) {
    handleErrorMessage(error, '加载机器人列表失败')
  }
}

const fetchDataWrapper = async (params: QuickChargeSearchParams = {}) => {
  try {
    const response = await v2GetEnergyList(buildQuickChargeListParams(params))

    if (response?.code === '000000' && response.data) {
      const list = (response.data.list || []).map(mapEnergyOrderToQuickChargeOrder)
      const total = response.data.pager?.total || 0

      totalCount.value = total
      handleListMessage(list, hasQuickChargeSearchCondition(params), '速充订单')

      return { list, total }
    }

    handleErrorMessage('获取速充订单失败')
    totalCount.value = 0
    return { list: [], total: 0 }
  } catch (error) {
    handleErrorMessage(error, '获取速充订单失败')
    totalCount.value = 0
    return { list: [], total: 0 }
  }
}

const handleDetail = (row: QuickChargeOrder) => {
  orderDetailRef.value?.open(row)
}

const mapQuickChargeExportItem = (item: QuickChargeOrder) => ({
  订单号: item.id,
  机器人用户名: item.bot_user_name,
  代理: item.agent_name,
  接收地址: item.receive_address,
  类型: item.order_type_label,
  数量: item.amount,
  '单价（sun/天）': item.unit_price,
  开始时间: item.start_time,
  结束时间: item.end_time,
  订单状态: getStatusText(item.status),
  备注: item.remark
})

const handleExport = async () => {
  exporting.value = true
  try {
    await exportTableData<EnergyOrder, QuickChargeSearchParams, EnergyListParams>({
      searchTableRef,
      filename: '速充订单列表',
      fetchData: v2GetEnergyList,
      buildParams: buildQuickChargeListParams,
      getList: (response) => response.data?.list || [],
      mapItem: (item) => mapQuickChargeExportItem(mapEnergyOrderToQuickChargeOrder(item)),
      successMessage: '速充订单导出成功'
    })
  } catch (error) {
    handleErrorMessage(error, '速充订单导出失败')
  } finally {
    exporting.value = false
  }
}

const handleDataLoaded = (_payload: { success: boolean }) => {}

const handleLoadError = () => {}

onMounted(() => {
  loadBotOptions()
})
</script>

<style scoped>
.app-container {
  padding: 0;
}
</style>
