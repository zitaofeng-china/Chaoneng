import dayjs from 'dayjs'

export type ApiDateTime = string | number | null | undefined

/** The conversation API returns Unix timestamps in seconds, while local messages use ISO strings. */
export function parseApiDateTime(value: ApiDateTime) {
  if (typeof value === 'number') return dayjs(value < 100_000_000_000 ? value * 1000 : value)

  const trimmedValue = value?.trim()
  if (trimmedValue && /^\d+$/.test(trimmedValue)) {
    const timestamp = Number(trimmedValue)
    return dayjs(timestamp < 100_000_000_000 ? timestamp * 1000 : timestamp)
  }

  return dayjs(value)
}
