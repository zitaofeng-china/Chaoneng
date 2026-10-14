import { ElMessage } from 'element-plus'
import type { FormSchema } from '@/components/Form'

/**
 * 前七天 00:00:00 到当前时刻。
 * 必须是毫秒数字。13 位数字字符串会被 dayjs 按 YYYYMMDD 解析，结束时间会显示成 1799 年。
 */
export interface CreatedTimeBounds {
  createdStartTime: number
  createdEndTime: number
}

export interface CreatedTimeParams {
  createdStartTime?: unknown
  createdEndTime?: unknown
}

export const createdTimeFieldNames = ['createdStartTime', 'createdEndTime'] as const

export const createRecentCreatedTimeBounds = (days = 7): CreatedTimeBounds => {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - days)
  start.setHours(0, 0, 0, 0)
  return {
    createdStartTime: start.getTime(),
    createdEndTime: end.getTime()
  }
}

export const withLookupCreatedTime = <T extends Record<string, unknown>>(params: T) => ({
  ...params,
  createdStartTime: '',
  createdEndTime: ''
})

export const createCreatedTimeSearchFields = (
  bounds: CreatedTimeBounds = createRecentCreatedTimeBounds()
): FormSchema[] => [
  {
    field: 'createdStartTime',
    component: 'DatePicker',
    label: '开始时间',
    value: bounds.createdStartTime,
    componentProps: {
      type: 'datetime',
      valueFormat: 'x',
      format: 'YYYY-MM-DD HH:mm:ss',
      placeholder: '请选择开始时间',
      clearable: true,
      defaultTime: new Date(2000, 0, 1, 0, 0, 0)
    }
  },
  {
    field: 'createdEndTime',
    component: 'DatePicker',
    label: '结束时间',
    value: bounds.createdEndTime,
    componentProps: {
      type: 'datetime',
      valueFormat: 'x',
      format: 'YYYY-MM-DD HH:mm:ss',
      placeholder: '请选择结束时间',
      clearable: true,
      defaultTime: new Date(2000, 0, 1, 23, 59, 59)
    }
  }
]

const toExactUnixSeconds = (value: unknown) => {
  if (value === undefined || value === null || value === '') return undefined

  if (value instanceof Date) {
    const timestamp = value.getTime()
    return Number.isNaN(timestamp) ? undefined : String(Math.floor(timestamp / 1000))
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return undefined
    const normalized = Math.trunc(value)
    const seconds =
      String(Math.abs(normalized)).length <= 10 ? normalized : Math.floor(normalized / 1000)
    return String(seconds)
  }

  if (typeof value !== 'string') return undefined

  const trimmed = value.trim()
  if (!trimmed) return undefined

  if (/^\d+$/.test(trimmed)) {
    const numeric = Number(trimmed)
    const seconds = trimmed.length <= 10 ? numeric : Math.floor(numeric / 1000)
    return String(seconds)
  }

  const parsed = new Date(trimmed).getTime()
  return Number.isNaN(parsed) ? undefined : String(Math.floor(parsed / 1000))
}

/**
 * 把独立的开始/结束时间写成接口需要的秒级字符串。
 * 只填一侧时只传这一侧；两侧都填且开始晚于结束时不写入，并返回 false。
 */
export const assignCreatedTimeRange = (
  target: { start_time?: string | number; end_time?: string | number },
  params: object
) => {
  const source = params as CreatedTimeParams
  const startTime = toExactUnixSeconds(source.createdStartTime)
  const endTime = toExactUnixSeconds(source.createdEndTime)

  if (startTime !== undefined && endTime !== undefined && Number(startTime) > Number(endTime)) {
    if (typeof document !== 'undefined') {
      ElMessage.warning('开始时间不能晚于结束时间')
    }
    return false
  }

  if (startTime !== undefined) target.start_time = startTime
  if (endTime !== undefined) target.end_time = endTime
  return true
}
