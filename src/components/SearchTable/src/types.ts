import { FormSchema } from '@/components/Form'
import type { FormSetProps } from '@/components/Form'
import type { SearchProps } from '@/components/Search'
import { TableColumn } from '@/components/Table'
import type { TableProps, TableSetProps } from '@/components/Table'
import { Ref } from 'vue'

export interface SearchTableProps {
  columns: TableColumn[]
  searchSchema?: FormSchema[]
  fetchDataApi: (params?: any) => Promise<{
    list: any[]
    total?: number
  }>
  fetchDelApi?: () => Promise<boolean>
  immediate?: boolean
  showAddButton?: boolean
  addButtonText?: string
  defaultParams?: Recordable
  pagination?: {
    total?: number
    [key: string]: any
  }
  searchProps?: Record<string, any>
  tableProps?: Record<string, any>
  actionColumn?: TableColumn
}

export interface SearchTableTableMethods {
  getList: () => Promise<void>
  setProps: (props?: TableProps) => Promise<void>
  setColumn: (columnProps: TableSetProps[]) => Promise<void>
  addColumn: (tableColumn: TableColumn, index?: number) => Promise<void>
  delColumn: (field: string) => Promise<void>
  getElTableExpose: () => Promise<any>
  refresh: () => Promise<void>
  reload: () => Promise<void>
  delList: (idsLength: number) => Promise<boolean | void>
}

export interface SearchTableSearchMethods {
  setProps: (props?: SearchProps) => Promise<void>
  setValues: (data: Recordable) => Promise<void>
  setSchema: (schemaProps: FormSetProps[]) => Promise<void>
  addSchema: (formSchema: FormSchema, index?: number) => Promise<void>
  delSchema: (field: string) => Promise<void>
  getFormData: <T = Recordable>() => Promise<T>
}

export interface SearchTableStateRefs {
  currentPage: Ref<number>
  pageSize: Ref<number>
  total: Ref<number>
  dataList: Ref<any[]>
  loading: Ref<boolean>
}

export interface SearchTableExpose {
  reload: () => Promise<void>
  reset: () => Promise<Recordable>
  search: () => Promise<Recordable>
  delete: (row: Recordable) => Promise<boolean>
  getTableData: () => Recordable[]
  currentRow: Ref<Recordable | null>
  tableMethods: SearchTableTableMethods
  searchMethods: SearchTableSearchMethods
  tableState: SearchTableStateRefs
  searchParams: Ref<Recordable>
  setSearchParams: (params: Recordable) => Recordable
}

export interface SearchTableEmits {
  (e: 'add'): void
  (e: 'search', params: Recordable): void
  (e: 'reset', params: Recordable): void
  (e: 'delete', row: Recordable, result: boolean): void
  (e: 'update:searchParams', params: Recordable): void
}
