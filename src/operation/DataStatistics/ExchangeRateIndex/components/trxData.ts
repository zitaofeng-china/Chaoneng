import type { TrxVolumeItem } from '@/api/opertion/DataStatistics/ExchangeRateIndex'

export interface TrxVolumeData {
  volume: number | string
  timestamp: number
  time: number
  date: string
  open: number | string
  high: number | string
  low: number | string
  close: number | string
}

interface ChartTooltipParam {
  dataIndex?: number
}

export const toNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === '') return 0
  const num = typeof value === 'string' ? Number.parseFloat(value) : value
  return Number.isNaN(num) ? 0 : num
}

export const formatPriceValue = (price: number | string | null | undefined, digits = 4) => {
  if (price === null || price === undefined || price === '') return '-'
  return toNumber(price).toFixed(digits)
}

export const normalizeTrxVolumeItem = (item: TrxVolumeItem): TrxVolumeData => {
  const timestamp = item.timestamp ?? item.time ?? 0

  return {
    volume: item.volume ?? 0,
    timestamp,
    time: item.time ?? timestamp,
    date: item.date ?? '',
    open: item.open ?? 0,
    high: item.high ?? 0,
    low: item.low ?? 0,
    close: item.close ?? 0
  }
}

export const normalizeTrxVolumeList = (data: TrxVolumeItem[] = []) => {
  return data.map(normalizeTrxVolumeItem)
}

export const sortByTimeAsc = (data: TrxVolumeData[]) => {
  return [...data].sort((a, b) => a.time - b.time)
}

export const sortByTimeDesc = (data: TrxVolumeData[]) => {
  return [...data].sort((a, b) => b.time - a.time)
}

export const getFirstTooltipParam = (params: unknown): ChartTooltipParam => {
  if (Array.isArray(params)) {
    return (params[0] ?? {}) as ChartTooltipParam
  }
  return (params ?? {}) as ChartTooltipParam
}
