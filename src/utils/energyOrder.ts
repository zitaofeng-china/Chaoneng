/**
 * 能量订单工具函数
 * 处理能量订单相关的业务逻辑
 */

import { withAllOption } from '@/utils/tableHelpers'

/**
 * 能量订单类型枚举
 */
export enum EnergyOrderKind {
  TIME_ENERGY = 4, // 时间能量
  COUNT_ENERGY = 5, // 笔数能量
  WELFARE_ENERGY = 6, // 福利能量
  QUICK_ENERGY = 7, // 快速能量
  INSTANT_ENERGY = 8, // 即用能量
  BATCH_ENERGY = 9, // 批量能量
  BATCH_ACTIVE = 10, // 批量激活
  MANUAL_QUICK_CHARGE = 15, // 速充能量
  AUTO_HOSTING = 20, // 托管
  HOSTING_QUICK_CHARGE = 21 // 托管速充
}

/**
 * 能量订单类型文本映射
 */
export const ENERGY_ORDER_KIND_TEXT: Record<number, string> = {
  [EnergyOrderKind.TIME_ENERGY]: '按时间',
  [EnergyOrderKind.COUNT_ENERGY]: '按笔数',
  [EnergyOrderKind.WELFARE_ENERGY]: '福利',
  [EnergyOrderKind.QUICK_ENERGY]: '闪租',
  [EnergyOrderKind.INSTANT_ENERGY]: '即用能量',
  [EnergyOrderKind.AUTO_HOSTING]: '托管',
  [EnergyOrderKind.BATCH_ENERGY]: '批量下单',
  [EnergyOrderKind.BATCH_ACTIVE]: '激活',
  [EnergyOrderKind.MANUAL_QUICK_CHARGE]: '速充能量',
  [EnergyOrderKind.HOSTING_QUICK_CHARGE]: '托管速充'
}

type EnergyOrderKindTagType = 'success' | 'warning' | 'info' | 'primary' | 'danger'

export const ENERGY_ORDER_KIND_TAG_TYPE: Record<number, EnergyOrderKindTagType> = {
  [EnergyOrderKind.TIME_ENERGY]: 'success',
  [EnergyOrderKind.COUNT_ENERGY]: 'primary',
  [EnergyOrderKind.WELFARE_ENERGY]: 'primary',
  [EnergyOrderKind.QUICK_ENERGY]: 'success',
  [EnergyOrderKind.INSTANT_ENERGY]: 'warning',
  [EnergyOrderKind.AUTO_HOSTING]: 'warning',
  [EnergyOrderKind.BATCH_ENERGY]: 'danger',
  [EnergyOrderKind.BATCH_ACTIVE]: 'info',
  [EnergyOrderKind.MANUAL_QUICK_CHARGE]: 'warning',
  [EnergyOrderKind.HOSTING_QUICK_CHARGE]: 'primary'
}

const ENERGY_RESOURCE_CODE = 1
const BANDWIDTH_RESOURCE_CODES = new Set([0, 2])

const RESOURCE_TYPE_TEXT_MAP: Record<number, string> = {
  1: '能量',
  0: '带宽'
}

const RESOURCE_TYPE_TAG_MAP: Record<number, EnergyOrderKindTagType> = {
  1: 'primary',
  0: 'success'
}

const normalizeResourceType = (value?: number | string | null) => {
  if (value === undefined || value === null || value === '') return undefined

  const normalizedValue = Number(value)
  return Number.isNaN(normalizedValue) ? undefined : normalizedValue
}

export const getResourceTypeText = (value?: number | string | null, fallback = '未知') => {
  const normalizedValue = normalizeResourceType(value)
  return normalizedValue === undefined
    ? fallback
    : RESOURCE_TYPE_TEXT_MAP[normalizedValue] || fallback
}

export const getResourceTypeTagType = (
  value?: number | string | null,
  fallback: EnergyOrderKindTagType = 'info'
) => {
  const normalizedValue = normalizeResourceType(value)
  return normalizedValue === undefined
    ? fallback
    : RESOURCE_TYPE_TAG_MAP[normalizedValue] || fallback
}

type EnergyAmountResource = {
  code?: number | string | null
  amount?: number | string | null
}

export function getEnergyResourceAmount(
  resources?: EnergyAmountResource[] | null,
  fallback?: number | string | null
) {
  const list = resources || []
  const energyResource =
    list.find((item) => Number(item.code) === ENERGY_RESOURCE_CODE) ||
    list.find((item) => !BANDWIDTH_RESOURCE_CODES.has(Number(item.code)))
  const value = energyResource?.amount ?? fallback
  if (value === null || value === undefined || value === '') return undefined
  return value
}

/**
 * 获取能量订单类型文本
 * @param kind 订单类型
 * @returns 类型文本
 */
export function getEnergyOrderKindText(kind: number | undefined): string {
  if (kind === undefined || kind === null) return '-'
  return ENERGY_ORDER_KIND_TEXT[kind] || '未知类型'
}

export function getEnergyOrderKindTagType(kind: number | undefined): EnergyOrderKindTagType {
  if (kind === undefined || kind === null) return 'info'
  return ENERGY_ORDER_KIND_TAG_TYPE[kind] || 'info'
}

/**
 * 能量订单类型选项 (用于搜索表单的下拉选择)
 */
export const ENERGY_ORDER_KIND_OPTIONS = withAllOption([
  { label: '按时间', value: EnergyOrderKind.TIME_ENERGY },
  { label: '按笔数', value: EnergyOrderKind.COUNT_ENERGY },
  { label: '福利', value: EnergyOrderKind.WELFARE_ENERGY },
  { label: '闪租', value: EnergyOrderKind.QUICK_ENERGY },
  { label: '即用能量', value: EnergyOrderKind.INSTANT_ENERGY },
  { label: '托管', value: EnergyOrderKind.AUTO_HOSTING },
  { label: '批量下单', value: EnergyOrderKind.BATCH_ENERGY },
  { label: '激活', value: EnergyOrderKind.BATCH_ACTIVE }
])

export const HIDDEN_ENERGY_ORDER_KINDS = [
  EnergyOrderKind.MANUAL_QUICK_CHARGE,
  EnergyOrderKind.HOSTING_QUICK_CHARGE
] as const

export function shouldHideEnergyOrderKind(kind: number | string | null | undefined): boolean {
  if (kind === undefined || kind === null || kind === '') return false
  const normalizedKind = Number(kind)
  return !Number.isNaN(normalizedKind) && HIDDEN_ENERGY_ORDER_KINDS.includes(normalizedKind as any)
}

/**
 * ISO 时间字符串转 Unix 时间戳（秒）
 * @param isoTime ISO 时间字符串
 * @returns Unix 时间戳（秒），如果转换失败返回 0
 */
export function isoToTimestamp(isoTime: string | null | undefined): number {
  if (!isoTime) return 0
  try {
    const timestamp = new Date(isoTime).getTime()
    return Number.isNaN(timestamp) ? 0 : Math.floor(timestamp / 1000)
  } catch {
    return 0
  }
}

/**
 * 计算能量有效时长文本
 * @param kind 订单类型
 * @param delegatedAt 委托时间（ISO格式字符串）
 * @param recycledAt 回收时间（ISO格式字符串）
 * @returns 有效时长文本，如 "1天" 或 "3天"
 */
export function calculateEnergyRentText(
  kind: number | undefined,
  delegatedAt: string | null | undefined,
  recycledAt: string | null | undefined
): string {
  // 如果不是时间能量类型，返回 "-"
  if (kind !== EnergyOrderKind.TIME_ENERGY) {
    return '-'
  }

  // 如果没有委托时间或回收时间，返回 "-"
  if (!delegatedAt || !recycledAt) {
    return '-'
  }

  try {
    const delegatedTimestamp = isoToTimestamp(delegatedAt)
    const recycledTimestamp = isoToTimestamp(recycledAt)

    if (delegatedTimestamp === 0 || recycledTimestamp === 0) {
      return '-'
    }

    // 计算时间差（秒）
    const diffSeconds = recycledTimestamp - delegatedTimestamp

    // 转换为小时
    const hours = Math.floor(diffSeconds / 3600)

    // 如果小于24小时，显示小时数
    if (hours < 24) {
      return `${hours}小时`
    }

    // 否则显示天数
    const days = Math.floor(hours / 24)
    return `${days}天`
  } catch {
    return '-'
  }
}

/**
 * 格式化能量数量显示
 * @param amount 能量数量
 * @returns 格式化后的字符串
 */
export function formatEnergyAmount(amount: string | number | undefined, fallback = '-'): string {
  if (amount === undefined || amount === null || amount === '') return fallback
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return fallback
  return num.toLocaleString('en-US')
}

/**
 * 获取收款方式文本
 * @param energyAddress 能量接收地址
 * @param receiveAddress 收款地址
 * @returns 收款方式文本
 */
export function getPaymentMethodText(
  energyAddress: string | null | undefined,
  receiveAddress: string | null | undefined
): string {
  // 如果能量接收地址为空，显示横杠
  if (!energyAddress || energyAddress.trim() === '') {
    return '-'
  }

  // 如果能量接收地址不为空，且收款地址为空，显示"余额支付"
  if (!receiveAddress || receiveAddress.trim() === '') {
    return '余额支付'
  }

  // 其他情况显示收款地址
  return receiveAddress
}
