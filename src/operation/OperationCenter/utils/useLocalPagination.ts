import { computed, ref, type ComputedRef, type Ref } from 'vue'

type LocalListRef<T> = Ref<T[]> | ComputedRef<T[]>

export const useLocalPagination = <T>(sourceList: LocalListRef<T>, defaultPageSize = 10) => {
  const currentPage = ref(1)
  const pageSize = ref(defaultPageSize)

  const paginatedList = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return sourceList.value.slice(start, start + pageSize.value)
  })

  const totalCount = computed(() => sourceList.value.length)

  const handlePageChange = (page: number) => {
    currentPage.value = page
  }

  const handleSizeChange = (size: number) => {
    pageSize.value = size
    currentPage.value = 1
  }

  return {
    currentPage,
    pageSize,
    paginatedList,
    totalCount,
    handlePageChange,
    handleSizeChange
  }
}
