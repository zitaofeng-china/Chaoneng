import { useTable } from './useTable'
import { useSearch } from './useSearch'
import { ref, unref, onMounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { FormSchema } from '@/components/Form'
import { TableColumn } from '@/components/Table'
import { ElMessage } from 'element-plus'
import { ref as vueRef } from 'vue'
import { useUserStore } from '@/store/modules/user'
import { isOperationSystem } from '@/utils/system'

export interface SearchTableState {
  loading: boolean
  dataList: any[]
  pageSize: number
  currentPage: number
  total: number
}

interface UseSearchTableConfig {
  searchSchema?: FormSchema[] // 查询表单配置
  tableColumns: TableColumn[] // 表格列配置
  fetchDataApi: (params?: any) => Promise<{ list: any[]; total?: number }>
  fetchDelApi?: () => Promise<boolean>
  immediate?: boolean
  defaultParams?: Recordable // 默认参数
  handleSearchInfoFn?: (info: Recordable) => Recordable // 处理搜索参数
  actionColumn?: TableColumn // 操作列配置
}

export const useSearchTable = (config: UseSearchTableConfig, onReady?: (instance: any) => void) => {
  const searchParams = ref<Recordable>(config.defaultParams || {})
  const currentRow = ref<Recordable | null>(null)
  const searchTableRef = vueRef<any>(null)
  const searchTableInstance = vueRef<any>(null)

  // 注册追踪
  const searchRegistered = ref(false)
  const tableRegistered = ref(false)

  // 获取 Pinia Store 和 Route 实例
  const userStore = useUserStore()
  const route = useRoute()

  // 响应式地获取用户权限列表 (确保是 string[])
  const userPermissions = computed(() => (userStore.userInfo?.permissions || []).map(String))
  const isOperation = isOperationSystem()
  // 计算是否拥有当前页面的新增权限
  const hasAddPermission = computed(() => {
    if (!isOperation) {
      return true
    }
    if (userStore.isSuperAdmin) {
      return true
    }

    const currentRouteName = route.name
    if (!currentRouteName) {
      return false
    }
    const requiredPermission = `${String(currentRouteName)}.add`
    const hasPermission = userPermissions.value.includes(requiredPermission)
    return hasPermission
  })

  // 延迟初始化
  function tryInit() {
    // 如果没有搜索表单，只需要等待table注册
    const needsSearch = config.searchSchema && config.searchSchema.length > 0
    if (needsSearch) {
      if (searchRegistered.value && tableRegistered.value) {
        init()
      }
    } else {
      // 没有搜索表单时，只需要table注册完成
      if (tableRegistered.value) {
        init()
      }
    }
  }

  // 包装register方法
  const { searchRegister: _searchRegister, searchMethods } = useSearch()
  const {
    tableRegister: _tableRegister,
    tableMethods,
    tableState
  } = useTable({
    immediate: false,
    fetchDataApi: async () => {
      try {
        const apiParams = buildApiParams()
        const result = await config.fetchDataApi(apiParams)
        return adaptResponseData(result)
      } catch {
        ElMessage.error('数据加载失败')
        return { list: [], total: 0 }
      }
    },
    fetchDelApi: config.fetchDelApi
  })

  // 包装后的register
  function searchRegister(instance: any) {
    _searchRegister(instance)
    searchRegistered.value = true
    tryInit()
  }
  function tableRegister(instance: any, el?: any) {
    _tableRegister(instance, el)
    tableRegistered.value = true
    tryInit()
  }

  const adaptRequestParams = (params: Recordable): Recordable => {
    const adaptedParams = { ...params }
    if (adaptedParams.currentPage !== undefined) {
      adaptedParams.current_page = adaptedParams.currentPage
      delete adaptedParams.currentPage
    }
    if (adaptedParams.pageSize !== undefined) {
      adaptedParams.page_size = adaptedParams.pageSize
      delete adaptedParams.pageSize
    }
    return adaptedParams
  }

  const adaptResponseData = (result: any): { list: any[]; total: number } => {
    const list = result.list || []
    const total = result.total || 0
    return { list, total }
  }

  const { dataList, loading, total } = tableState

  const buildApiParams = (): Recordable => {
    const baseSearchParams = { ...unref(searchParams) }
    const currentPage = unref(tableState.currentPage)
    const pageSize = unref(tableState.pageSize)

    const searchFilters = { ...baseSearchParams }
    delete searchFilters.currentPage
    delete searchFilters.pageSize
    delete searchFilters.current_page
    delete searchFilters.page_size

    let processedFilters = searchFilters
    if (config.handleSearchInfoFn) {
      processedFilters = config.handleSearchInfoFn(searchFilters) as Recordable
    }

    const finalParams = {
      ...processedFilters,
      currentPage: currentPage,
      pageSize: pageSize
    }

    // 处理排序参数 - 转换为后端需要的格式
    const finalSortedParams: Recordable = { ...finalParams }
    if (finalParams['sort'] && finalParams['order']) {
      // 转换排序方向：ascending -> ASC, descending -> DESC
      const direction = finalParams['order'] === 'ascending' ? 'ASC' : 'DESC'
      // 合并为单个 order 参数，格式：'column ASC' 或 'column DESC'
      finalSortedParams['order'] = `${finalParams['sort']} ${direction}`
      delete finalSortedParams['sort']
    }

    const adaptedParams = adaptRequestParams(finalSortedParams)
    return adaptedParams
  }

  const search = async () => {
    try {
      const form = await searchMethods.getFormData()
      searchParams.value = { ...(config.defaultParams || {}), ...form }
      if (tableState.currentPage.value !== 1) {
        tableState.currentPage.value = 1
      } else {
        await tableMethods.getList()
      }
      return form
    } catch {
      ElMessage.error('搜索失败，请稍后重试')
      return unref(searchParams)
    }
  }

  const reset = async () => {
    try {
      searchParams.value = { ...(config.defaultParams || {}) }
      await searchMethods.setValues(searchParams.value)
      if (tableState.currentPage.value !== 1) {
        tableState.currentPage.value = 1
      } else {
        await tableMethods.getList()
      }
      return unref(searchParams)
    } catch {
      ElMessage.error('重置失败，请稍后重试')
      return unref(searchParams)
    }
  }

  const loadData = () => {
    return tableMethods.getList()
  }

  const setupActionColumn = () => {
    if (config.actionColumn) {
      const columns = [...config.tableColumns]
      const hasActionColumn = columns.some((col) => col.field === 'action')
      if (!hasActionColumn) {
        columns.push(config.actionColumn)
      }
      return columns
    }
    return config.tableColumns
  }

  const init = async () => {
    try {
      if (config.searchSchema && config.searchSchema.length > 0) {
        await searchMethods.setProps({ schema: config.searchSchema })
      }
      await tableMethods.setProps({ columns: setupActionColumn() })
      if (config.immediate !== false) {
        setTimeout(() => {
          loadData()
        }, 0)
      }
    } catch {
      ElMessage.error('表格初始化失败')
    }
  }

  const handleDelete = (row: Recordable) => {
    currentRow.value = row
    if (config.fetchDelApi) {
      return tableMethods.delList(1)
    }
    return Promise.resolve(false)
  }

  const setSearchParams = (params: Recordable) => {
    searchParams.value = { ...unref(searchParams), ...params }
    searchMethods.setValues(searchParams.value)
    return unref(searchParams)
  }

  // onMounted(() => {
  //   init()
  // })

  // 供父组件绑定ready事件
  function handleReady(instance: any) {
    searchTableInstance.value = instance
    if (onReady) onReady(instance)
  }

  return {
    searchRegister,
    tableRegister,
    searchMethods,
    tableMethods,
    tableState,
    search,
    reset,
    currentRow,
    handleDelete,
    searchParams,
    setSearchParams,
    loading,
    dataList,
    total,
    loadData,
    searchTableRef,
    searchTableInstance,
    handleReady,
    hasAddPermission
  }
}
