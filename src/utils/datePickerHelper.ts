/**
 * 日期时间选择器辅助工具
 */

/**
 * 获取日期时间范围选择器的默认时间配置
 * @param useCurrentTime 是否使用当前时间作为默认值（默认false，使用00:00:00和23:59:59）
 * @returns 默认时间数组 [开始时间, 结束时间]
 */
export const getDefaultTimeForDateRange = (useCurrentTime = false): [Date, Date] => {
  if (useCurrentTime) {
    const now = new Date()
    return [
      new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds()
      ),
      new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    ]
  }

  return [
    new Date(2000, 1, 1, 0, 0, 0), // 开始时间默认为 00:00:00
    new Date(2000, 1, 1, 23, 59, 59) // 结束时间默认为 23:59:59
  ]
}

/**
 * 获取日期时间选择器的默认时间配置
 * @param useCurrentTime 是否使用当前时间作为默认值（默认false，使用00:00:00）
 * @returns 默认时间
 */
export const getDefaultTimeForDateTime = (useCurrentTime = false): Date => {
  if (useCurrentTime) {
    return new Date()
  }

  return new Date(2000, 1, 1, 0, 0, 0)
}

/**
 * 创建日期时间范围选择器的配置
 * @param options 配置选项
 * @returns DatePicker componentProps 配置对象
 */
export const createDateTimeRangeConfig = (options?: {
  useCurrentTime?: boolean
  startPlaceholder?: string
  endPlaceholder?: string
  valueFormat?: string
}) => {
  const {
    useCurrentTime = false,
    startPlaceholder = '开始日期',
    endPlaceholder = '结束日期',
    valueFormat = 'x'
  } = options || {}

  return {
    type: 'datetimerange' as const,
    valueFormat,
    startPlaceholder,
    endPlaceholder,
    defaultTime: getDefaultTimeForDateRange(useCurrentTime)
  }
}

/**
 * 创建日期时间选择器的配置
 * @param options 配置选项
 * @returns DatePicker componentProps 配置对象
 */
export const createDateTimeConfig = (options?: {
  useCurrentTime?: boolean
  placeholder?: string
  valueFormat?: string
  format?: string
}) => {
  const {
    useCurrentTime = false,
    placeholder = '选择日期时间',
    valueFormat = 'x',
    format = 'YYYY-MM-DD HH:mm:ss'
  } = options || {}

  return {
    type: 'datetime' as const,
    valueFormat,
    format,
    placeholder,
    defaultTime: getDefaultTimeForDateTime(useCurrentTime)
  }
}
