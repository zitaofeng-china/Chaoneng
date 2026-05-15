import { FormSchema } from '@/components/Form'
import { TableColumn } from '@/components/Table'
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

export interface SearchTableExpose {
  reload: () => Promise<void>
  reset: () => Promise<Recordable>
  search: () => Promise<Recordable>
  delete: (row: Recordable) => Promise<boolean>
  currentRow: Ref<Recordable | null>
  tableMethods: any
  searchMethods: any
  tableState: any
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
