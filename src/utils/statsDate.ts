import dayjs from 'dayjs'

type DateValue = string | number | null | undefined

const parseStatsDate = (value: DateValue) => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const digitLength = String(Math.trunc(Math.abs(value))).length
    if (digitLength === 10) {
      return dayjs.unix(value)
    }
    if (digitLength === 13) {
      return dayjs(value)
    }
    return dayjs(value)
  }

  const rawValue = String(value).trim()
  if (!rawValue) {
    return null
  }

  if (/^\d{10}$/.test(rawValue)) {
    return dayjs.unix(Number(rawValue))
  }

  if (/^\d{13}$/.test(rawValue)) {
    return dayjs(Number(rawValue))
  }

  if (/^\d{8}$/.test(rawValue)) {
    return dayjs(`${rawValue.slice(0, 4)}-${rawValue.slice(4, 6)}-${rawValue.slice(6, 8)}`)
  }

  return dayjs(rawValue)
}

export const formatStatsDateLabel = (
  value: DateValue,
  format: string = 'M月D日',
  fallback: string = '-'
) => {
  const parsed = parseStatsDate(value)
  return parsed?.isValid() ? parsed.format(format) : String(value || fallback)
}
