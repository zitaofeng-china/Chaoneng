import { simpleExportToExcel } from '@/utils/excel'
import { handleSuccessMessage } from '@/utils/messageHelper'
import { formatToDateTime } from '@/utils/dateUtil'
import { h } from 'vue'
import { ElTag } from 'element-plus'

export type TableTagType = 'success' | 'warning' | 'info' | 'primary' | 'danger'

export interface StatusMeta {
  label: string
  type?: TableTagType
}

export type TableSlot<T> = { row: T }

export type DateRangeValue = [number | string | Date, number | string | Date]
type DateTimeRangeValue = [Date, Date]

interface PageParamsLike {
  current_page?: number | string
  page_size?: number | string
}

interface SearchMethodsLike {
  getFormData?: () => Promise<Recordable | undefined>
}

interface SearchTableLike {
  searchMethods?: SearchMethodsLike
}

interface RefLike<T> {
  value?: T
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const isSearchTableLike = (value: unknown): value is SearchTableLike => {
  return isRecord(value) && isRecord(value.searchMethods)
}

const unwrapRef = <T>(value: T | RefLike<T>): T | undefined => {
  if (isRecord(value) && 'value' in value) {
    return value.value as T | undefined
  }
  return value as T
}

export const hasSearchValue = (value: unknown) =>
  value !== undefined && value !== null && value !== ''

export const createDefaultDateTimeRange = (): DateTimeRangeValue => [
  new Date(2000, 1, 1, 0, 0, 0),
  new Date(2000, 1, 1, 23, 59, 59)
]

export const createPageParams = (
  params: PageParamsLike = {},
  defaultPageSize = 10,
  pageSize?: number
) => ({
  current_page: Number(params.current_page) || 1,
  page_size: (pageSize ?? Number(params.page_size)) || defaultPageSize
})

const normalizeNullablePageSize = (pageSize?: number | string) => {
  if (pageSize === undefined || pageSize === '') return undefined
  return Number(pageSize)
}

export const createNullablePageParams = (
  params: PageParamsLike = {},
  defaultPageSize = 10,
  pageSize?: number
) => ({
  current_page: Number(params.current_page) || 1,
  page_size: pageSize ?? normalizeNullablePageSize(params.page_size) ?? defaultPageSize
})

type DateTimeValue = number | string | Date | null | undefined

const normalizeDateTimeValue = (value: DateTimeValue) => {
  if (value === undefined || value === null || value === '') return undefined
  if (value instanceof Date) return value

  if (typeof value === 'number') {
    return value
  }

  const trimmedValue = value.trim()
  if (!trimmedValue) return undefined

  if (/^\d+$/.test(trimmedValue)) {
    return Number(trimmedValue)
  }

  const parsedTimestamp = new Date(trimmedValue).getTime()
  return Number.isNaN(parsedTimestamp) ? undefined : parsedTimestamp
}

export const formatTableDateTime = (value: DateTimeValue, fallback = '-') => {
  const normalizedValue = normalizeDateTimeValue(value)
  return normalizedValue === undefined ? fallback : formatToDateTime(normalizedValue)
}

const parseDateOnlyToSecond = (value: string, boundary: 'start' | 'end') => {
  const [year, month, day] = value.split('-').map(Number)
  const date =
    boundary === 'start'
      ? new Date(year, month - 1, day, 0, 0, 0)
      : new Date(year, month - 1, day, 23, 59, 59)
  return Math.floor(date.getTime() / 1000)
}

const toSecondTimestamp = (value: number | string | Date, boundary: 'start' | 'end') => {
  if (value instanceof Date) {
    return Math.floor(value.getTime() / 1000)
  }

  if (typeof value === 'number') {
    return String(Math.trunc(value)).length <= 10 ? Math.trunc(value) : Math.floor(value / 1000)
  }

  const trimmedValue = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
    return parseDateOnlyToSecond(trimmedValue, boundary)
  }

  if (/^\d+$/.test(trimmedValue)) {
    const numericValue = Number(trimmedValue)
    return trimmedValue.length <= 10 ? numericValue : Math.floor(numericValue / 1000)
  }

  const parsedTimestamp = new Date(trimmedValue).getTime()
  return Number.isNaN(parsedTimestamp) ? undefined : Math.floor(parsedTimestamp / 1000)
}

export const dateRangeToSeconds = (dateRange?: DateRangeValue) => {
  if (!dateRange || dateRange.length !== 2) return {}
  const startTime = toSecondTimestamp(dateRange[0], 'start')
  const endTime = toSecondTimestamp(dateRange[1], 'end')
  if (startTime === undefined || endTime === undefined) return {}

  return {
    start_time: String(startTime),
    end_time: String(endTime)
  }
}

export const getStatusLabel = (
  statusMap: Record<number, StatusMeta>,
  status: number | string | null | undefined,
  fallback = '-'
) => {
  if (status === undefined || status === null || status === '') return fallback
  return statusMap[Number(status)]?.label || fallback
}

export const getStatusTagType = (
  statusMap: Record<number, StatusMeta>,
  status: number | string | null | undefined,
  fallback: TableTagType = 'info'
) => {
  if (status === undefined || status === null || status === '') return fallback
  return statusMap[Number(status)]?.type || fallback
}

export const renderStatusTag = (
  statusMap: Record<number, StatusMeta>,
  status: number | string | null | undefined,
  fallback = '-',
  size: 'default' | 'small' | 'large' = 'small'
) => {
  return h(ElTag, { type: getStatusTagType(statusMap, status), size }, () =>
    getStatusLabel(statusMap, status, fallback)
  )
}

export type SelectOption<T extends string | number | undefined = string | number | undefined> = {
  label: string
  value: T
}

export const createAllOption = <T extends string | number | undefined = ''>(
  value: T = '' as T
): SelectOption<T> => ({
  label: '全部',
  value
})

export const withAllOption = <
  T extends string | number | undefined,
  TAllValue extends string | number | undefined = ''
>(
  options: SelectOption<T>[],
  allValue: TAllValue = '' as TAllValue
): SelectOption<T | TAllValue>[] => [createAllOption(allValue), ...options]

export const createStatusOptions = (
  statusMap: Record<number, StatusMeta>,
  allValue: string | number | undefined = ''
) => [
  createAllOption(allValue),
  ...Object.entries(statusMap).map(([value, meta]) => ({
    label: meta.label,
    value: Number(value)
  }))
]

export const buildBackendOrder = (order?: string): string | undefined => {
  if (!order) return undefined

  const [field, direction] = order.split(' ')
  if (!field || !direction) return undefined

  return `${field} ${direction}`
}

export const getSearchFormData = async <T extends Recordable = Recordable>(
  searchTableRef?: unknown,
  fallbackParams: T = {} as T
): Promise<T> => {
  try {
    const target = unwrapRef(searchTableRef)
    if (!isSearchTableLike(target)) return fallbackParams

    const formData = await target.searchMethods?.getFormData?.()
    return (formData || fallbackParams) as T
  } catch {
    return fallbackParams
  }
}

type TableDataResponse<T> = {
  code: string | number
  msg?: string
  message?: string
  data: {
    list: T[]
  } & Recordable
  list?: T[]
} & Recordable

type ExportParams<TSearchParams extends Recordable> = TSearchParams & {
  page_size?: number
}

interface ExportTableDataBaseOptions<T, TSearchParams extends Recordable = Recordable> {
  searchTableRef?: unknown
  fallbackParams?: TSearchParams
  filename: string
  getList?: (response: TableDataResponse<T>) => T[]
  mapItem: (item: T) => Recordable
  successMessage?: string
}

interface ExportTableDataWithBuildParamsOptions<
  T,
  TSearchParams extends Recordable = Recordable,
  TApiParams extends Recordable = Recordable
> extends ExportTableDataBaseOptions<T, TSearchParams> {
  fetchData: (params: TApiParams) => Promise<unknown>
  buildParams: (params: ExportParams<TSearchParams>) => TApiParams
}

interface ExportTableDataWithoutBuildParamsOptions<T, TSearchParams extends Recordable = Recordable>
  extends ExportTableDataBaseOptions<T, TSearchParams> {
  fetchData: (params: ExportParams<TSearchParams>) => Promise<unknown>
  buildParams?: undefined
}

const getDefaultList = <T>(response: TableDataResponse<T>): T[] => {
  return response.data?.list || response.list || []
}

const toTableResponse = <T>(response: unknown): TableDataResponse<T> => {
  if (!isRecord(response)) {
    throw new Error('导出失败：数据格式错误')
  }

  if (response.code !== undefined && String(response.code) !== '000000') {
    const message =
      typeof response.msg === 'string'
        ? response.msg
        : typeof response.message === 'string'
          ? response.message
          : '导出失败'
    throw new Error(message)
  }

  return response as TableDataResponse<T>
}

export function exportTableData<T, TSearchParams extends Recordable = Recordable>(
  options: ExportTableDataWithoutBuildParamsOptions<T, TSearchParams>
): Promise<void>

export function exportTableData<
  T,
  TSearchParams extends Recordable = Recordable,
  TApiParams extends Recordable = Recordable
>(options: ExportTableDataWithBuildParamsOptions<T, TSearchParams, TApiParams>): Promise<void>

export async function exportTableData<
  T,
  TSearchParams extends Recordable = Recordable,
  TApiParams extends Recordable = Recordable
>(
  options:
    | ExportTableDataWithoutBuildParamsOptions<T, TSearchParams>
    | ExportTableDataWithBuildParamsOptions<T, TSearchParams, TApiParams>
) {
  const {
    searchTableRef,
    fallbackParams = {} as TSearchParams,
    filename,
    getList,
    mapItem,
    successMessage = '导出成功'
  } = options
  const formData = await getSearchFormData(searchTableRef, fallbackParams)
  const exportParams = { ...formData, page_size: -1 } as ExportParams<TSearchParams>
  const response = toTableResponse<T>(
    await (options.buildParams
      ? options.fetchData(options.buildParams(exportParams))
      : options.fetchData(exportParams))
  )
  const list = getList ? getList(response) : getDefaultList<T>(response)
  if (!Array.isArray(list)) {
    throw new Error('导出失败：数据格式错误')
  }

  simpleExportToExcel(list.map(mapItem), filename)
  handleSuccessMessage(successMessage)
}
