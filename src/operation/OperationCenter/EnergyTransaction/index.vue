<template>
  <div class="app-container">
    <ContentWrap>
      <SearchTable
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
        ref="searchTableRef"
        @loaded="handleDataLoaded"
        @error="handleLoadError"
        :search-props="{
          layout: 'inline',
          buttonPosition: 'center'
        }"
        :pagination="{
          total: totalCount
        }"
      >
        <template #searchButtons>
          <BaseButton type="primary" @click="handleExport">
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
import { ref, computed } from 'vue'
import { ContentWrap } from '@/components/ContentWrap'
import { SearchTable } from '@/components/SearchTable'
import type { SearchTableExpose } from '@/components/SearchTable'
import { BaseButton } from '@/components/Button'
import OrderDetail from './components/OrderDetail.vue'
import { v2GetEnergyList, v2RecycleOrder } from '@/api/opertion/OperationCenter/EnergyTransaction'
import { useRoute } from 'vue-router'
import { handleListMessage, handleErrorMessage, handleSuccessMessage } from '@/utils/messageHelper'
import { ORDER_STATUS_OPTIONS } from '@/utils/orderStatus'
import { SOURCE_TYPE_OPTIONS } from '@/utils/sourceFilter'
import {
  buildBackendOrder,
  createDefaultDateTimeRange,
  createPageParams,
  exportTableData,
  hasSearchValue
} from '@/utils/tableHelpers'
import { ENERGY_ORDER_KIND_OPTIONS } from '@/utils/energyOrder'
import { getFilteredColumns } from './columns'
import {
  buildEnergyListParams,
  transformOrderToExportData,
  sortOrdersByCreatedTime,
  filterVisibleEnergyOrders,
  hasSearchCondition,
  canStopOrder,
  STOP_POLLING_CONFIG
} from './utils'
import type { EnergyOrder, SearchFormParams, EnergyListParams } from './types'

const searchTableRef = ref<SearchTableExpose | null>(null)
const orderDetailRef = ref<InstanceType<typeof OrderDetail> | null>(null)
const route = useRoute()

const selectedSource = ref<number | string>('')
const totalCount = ref(0)
const stoppingOrders = ref<Set<string>>(new Set())
const stoppedOrders = ref<Set<string>>(new Set())
const DEFAULT_ORDER = 'created_at DESC'
const initialSearchParams: Partial<SearchFormParams> = route.query.query
  ? { keyword: String(route.query.query) }
  : {}

const columns = computed(() => [...getFilteredColumns(selectedSource.value), actionColumn])

const actionColumn = {
  field: 'action',
  label: '操作',
  minWidth: 200,
  fixed: 'right' as const,
  slots: {
    default: (data: { row: EnergyOrder }) => {
      const row = data.row
      const canStop = canStopOrder(row, stoppingOrders.value, stoppedOrders.value)
      const isStopping = stoppingOrders.value.has(row.id)

      return (
        <>
          {canStop ? (
            <BaseButton type="danger" onClick={() => handleStop(row)}>
              停止代理
            </BaseButton>
          ) : (
            <BaseButton type="info" disabled>
              {isStopping ? '停止中...' : '停止代理'}
            </BaseButton>
          )}
          <BaseButton type="primary" onClick={() => handleDetail(row)}>
            详情
          </BaseButton>
        </>
      )
    }
  }
}

const searchSchema = [
  {
    field: 'keyword',
    component: 'Input' as const,
    label: {
      tips: '订单ID/代理名称/机器人名称/TG用户名/TG用户昵称/用户账号/用户邮箱',
      text: '关键词'
    },
    componentProps: {
      placeholder: '请输入关键词',
      clearable: true
    }
  },
  {
    field: 'origin',
    component: 'Select' as const,
    label: '来源',
    componentProps: {
      placeholder: '请选择来源',
      clearable: true,
      options: SOURCE_TYPE_OPTIONS
    }
  },
  {
    field: 'receive_address',
    component: 'Input' as const,
    label: '收款钱包地址',
    componentProps: {
      placeholder: '请输入收款钱包地址',
      clearable: true
    }
  },
  {
    field: 'energy_address',
    component: 'Input' as const,
    label: '能量接收地址',
    componentProps: {
      placeholder: '请输入能量接收地址',
      clearable: true
    }
  },
  {
    field: 'status',
    component: 'Select' as const,
    label: '状态',
    componentProps: {
      placeholder: '请选择状态',
      clearable: true,
      options: ORDER_STATUS_OPTIONS
    }
  },
  {
    field: 'kind',
    component: 'Select' as const,
    label: '订单类型',
    componentProps: {
      placeholder: '请选择订单类型',
      options: ENERGY_ORDER_KIND_OPTIONS
    }
  },
  {
    field: 'dateRange',
    component: 'DatePicker' as const,
    label: '创建时间',
    componentProps: {
      type: 'datetimerange',
      valueFormat: 'x',
      startPlaceholder: '开始日期',
      endPlaceholder: '结束日期',
      defaultTime: createDefaultDateTimeRange()
    }
  }
]

const fetchDataWrapper = async (
  params: SearchFormParams & { current_page?: number; page_size?: number; order?: string }
) => {
  try {
    selectedSource.value = params.origin ?? ''

    const apiParams: EnergyListParams = {
      ...createPageParams(params),
      ...buildEnergyListParams(params)
    }

    apiParams.order = buildBackendOrder(params.order) || DEFAULT_ORDER

    const response = await v2GetEnergyList(apiParams)

    if (response?.code === '000000' && response.data) {
      const data = response.data
      const list = filterVisibleEnergyOrders(data.list || [])
      const total = data.pager?.total || 0

      totalCount.value = total
      handleListMessage(list, hasSearchCondition(params), '能量订单')

      return { list, total }
    } else {
      handleErrorMessage('获取数据失败')
      totalCount.value = 0
      return { list: [], total: 0 }
    }
  } catch (error) {
    handleErrorMessage(error, '获取能量交易列表失败')
    totalCount.value = 0
    return { list: [], total: 0 }
  }
}

const handleExport = async () => {
  try {
    await exportTableData<EnergyOrder, SearchFormParams, EnergyListParams>({
      searchTableRef,
      filename: '能量订单列表',
      fetchData: v2GetEnergyList,
      buildParams: (params) => ({
        ...buildEnergyListParams(params),
        page_size: -1
      }),
      getList: (response) =>
        sortOrdersByCreatedTime(filterVisibleEnergyOrders(response.data?.list || [])),
      mapItem: (item) => transformOrderToExportData(item, selectedSource.value),
      successMessage: '订单导出成功'
    })
  } catch (error) {
    handleErrorMessage(error, '订单导出失败')
  }
}

const pollOrderStatus = async (orderId: string) => {
  let attempts = 0

  const checkStatus = async () => {
    attempts++

    try {
      await searchTableRef.value?.reload()

      const currentData = (searchTableRef.value?.getTableData?.() || []) as EnergyOrder[]
      const order = currentData.find((item) => item.id === orderId)

      if (!order || order.status !== 3) {
        stoppingOrders.value.delete(orderId)
        stoppedOrders.value.add(orderId)
        return
      }

      if (attempts < STOP_POLLING_CONFIG.MAX_ATTEMPTS) {
        setTimeout(checkStatus, STOP_POLLING_CONFIG.INTERVAL)
      } else {
        stoppingOrders.value.delete(orderId)
      }
    } catch (error) {
      handleErrorMessage(error, '刷新订单状态失败')
      stoppingOrders.value.delete(orderId)
    }
  }

  setTimeout(checkStatus, STOP_POLLING_CONFIG.INTERVAL)
}

const handleStop = async (row: EnergyOrder) => {
  stoppingOrders.value.add(row.id)

  try {
    await v2RecycleOrder(row.id)
    handleSuccessMessage('停止代理成功')
    pollOrderStatus(row.id)
  } catch (error) {
    stoppingOrders.value.delete(row.id)
    handleErrorMessage(error, '停止代理失败')
  }
}

const handleDetail = (row: EnergyOrder) => {
  orderDetailRef.value?.open(row)
}

const handleDataLoaded = ({ success }: { success: boolean }) => {
  if (!success) {
    handleErrorMessage('加载数据失败')
  }
}

const handleLoadError = () => {
  handleErrorMessage('加载数据失败')
}
</script>
