/**
 * 能量交易页面工具函数
 */

import type { SearchFormParams, EnergyListParams, EnergyOrder, ExportDataItem } from './types'
import { getSourceText } from '@/utils/sourceFilter'
import {
  getEnergyOrderKindText,
  formatEnergyAmount,
  getPaymentMethodText,
  shouldHideEnergyOrderKind
} from '@/utils/energyOrder'
import { getStatusText, OrderStatus } from '@/utils/orderStatus'
import { dateRangeToSeconds, formatTableDateTime, hasSearchValue } from '@/utils/tableHelpers'

export function buildEnergyListParams(params: SearchFormParams): EnergyListParams {
  const apiParams: EnergyListParams = {}

  Object.assign(apiParams, dateRangeToSeconds(params.dateRange))

  if (params.keyword) {
    apiParams.keyword = params.keyword
  }

  if (hasSearchValue(params.bot_id)) {
    apiParams.bot_id = Number(params.bot_id)
  }

  if (hasSearchValue(params.origin)) {
    apiParams.origin = Number(params.origin)
  }

  if (hasSearchValue(params.pay_method)) {
    apiParams.pay_method = Number(params.pay_method)
  }

  if (hasSearchValue(params.kind)) {
    apiParams.kind = params.kind
  }

  if (params.receive_address) {
    apiParams.receive_address = params.receive_address
  }

  if (params.energy_address) {
    apiParams.energy_address = params.energy_address
  }

  if (hasSearchValue(params.status)) {
    apiParams.status = params.status
  }

  return apiParams
}

/**
 * 转换订单数据为导出格式
 * @param order 订单数据
 * @param selectedSource 当前选择的来源
 * @returns 导出数据项
 */
export function transformOrderToExportData(
  order: EnergyOrder,
  selectedSource: number | string
): ExportDataItem {
  // 根据来源判断导出哪些字段
  // 如果没有筛选来源，或者来源为机器人(1)，导出TG相关字段
  const tgData =
    !selectedSource || selectedSource === 1 || selectedSource === '1'
      ? {
          TG用户名: order.tg_user_name || '-',
          TG用户昵称: order.tg_first_name || '-'
        }
      : {}

  // 如果没有筛选来源，或者来源为H5(2)，导出H5相关字段
  const h5Data =
    !selectedSource || selectedSource === 2 || selectedSource === '2'
      ? {
          用户账号: order.username || '-',
          用户邮箱: order.email || '-'
        }
      : {}

  // 其他通用字段
  return {
    订单号: order.id || '-',
    代理名称: order.agent_name || '-',
    机器人昵称: order.bot_name || '-',
    ...tgData,
    ...h5Data,
    来源: getSourceText(order.origin, order.tg_user_name, order.username),
    订单类型: getEnergyOrderKindText(order.kind),
    交易金额: order.amount || '-',
    金额币种: order.coin || '-',
    应发放能量: formatEnergyAmount(order.energy_amount),
    实际发放能量: formatEnergyAmount(order.energy_actual_amount),
    收款方式: getPaymentMethodText(order.energy_address, order.receive_address),
    能量接收地址: order.energy_address || '-',
    笔数: order.energy_count || '-',
    订单状态: getStatusText(order.status),
    备注: order.describe || '-',
    创建时间: formatTableDateTime(order.created_at),
    回收时间: formatTableDateTime(order.recycled_at)
  }
}

const getTimeValue = (value?: string | number | null) => {
  if (!value) return 0
  if (typeof value === 'number') return String(value).length === 10 ? value * 1000 : value
  return new Date(value).getTime() || 0
}

export function sortOrdersByCreatedTime(orders: EnergyOrder[]): EnergyOrder[] {
  return [...orders].sort((a, b) => {
    return getTimeValue(b.created_at) - getTimeValue(a.created_at)
  })
}

export function filterVisibleEnergyOrders(orders: EnergyOrder[]): EnergyOrder[] {
  return orders.filter((order) => !shouldHideEnergyOrderKind(order.kind))
}

export function hasSearchCondition(params: SearchFormParams): boolean {
  return [
    params.keyword,
    params.bot_id,
    params.origin,
    params.pay_method,
    params.receive_address,
    params.energy_address,
    params.status,
    params.kind,
    params.dateRange
  ].some(hasSearchValue)
}

/** 可停止代理的订单状态：已发送、已中止 */
const STOPPABLE_ORDER_STATUSES = new Set<number>([OrderStatus.SENT, OrderStatus.ABORTED])

/**
 * 判断订单是否可以停止
 * @param order 订单数据
 * @param stoppingOrders 正在停止的订单集合
 * @param stoppedOrders 已停止的订单集合
 * @returns 是否可以停止
 */
export function canStopOrder(
  order: EnergyOrder,
  stoppingOrders: Set<string>,
  stoppedOrders: Set<string>
): boolean {
  return (
    STOPPABLE_ORDER_STATUSES.has(order.status) &&
    !stoppingOrders.has(order.id) &&
    !stoppedOrders.has(order.id)
  )
}

/**
 * 订单停止轮询配置
 */
export const STOP_POLLING_CONFIG = {
  MAX_ATTEMPTS: 3,
  INTERVAL: 3000
} as const
