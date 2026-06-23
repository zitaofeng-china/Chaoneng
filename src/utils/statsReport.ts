import dayjs from 'dayjs'

export type StatsDateRangeValue = [string, string]

export const createRecentDateRange = (recentDays: number): StatsDateRangeValue => {
  const endDate = dayjs().format('YYYY-MM-DD')
  const startDate = dayjs()
    .subtract(Math.max(recentDays - 1, 0), 'day')
    .format('YYYY-MM-DD')

  return [startDate, endDate]
}

export const toStatsSecondRange = ([startDate, endDate]: StatsDateRangeValue) => {
  return {
    start_time: String(dayjs(startDate).startOf('day').unix()),
    end_time: String(dayjs(endDate).endOf('day').unix())
  }
}

export const isValidStatsDateRange = (
  range: StatsDateRangeValue | string[] | undefined | null
): range is StatsDateRangeValue => {
  return Array.isArray(range) && range.length === 2 && !!range[0] && !!range[1]
}

export const buildStatsExportFilename = (title: string, range: StatsDateRangeValue) => {
  return `${title}_${dayjs(range[0]).format('YYYYMMDD')}_${dayjs(range[1]).format('YYYYMMDD')}`
}
