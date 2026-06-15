import { computed, h, ref, type ComputedRef, type Ref } from 'vue'
import { ElTag, ElTooltip } from 'element-plus'
import { getTronscanTransactionUrl } from '@/utils/tronscan'

type LocalListRef<T> = Ref<T[]> | ComputedRef<T[]>

export const renderNullableText = (value?: string | number | null, fallback = '-') => {
  return h('span', value === undefined || value === null || value === '' ? fallback : String(value))
}

export const renderTronscanTransactionLink = (
  txid?: string | number | null,
  linkText = '点击跳转'
) => {
  const normalizedTxid = String(txid ?? '').trim()
  if (!normalizedTxid) return h('span', '-')

  return h(
    ElTooltip,
    {
      content: normalizedTxid,
      placement: 'top'
    },
    {
      default: () =>
        h(
          'a',
          {
            href: getTronscanTransactionUrl(normalizedTxid),
            target: '_blank',
            style: 'color: #409eff; cursor: pointer; text-decoration: none;'
          },
          linkText
        )
    }
  )
}

export const renderActivationStatusTag = (txid?: string | null) => {
  const isActivated = Boolean(txid?.trim())
  const text = isActivated ? '已激活' : '待激活'
  const type = isActivated ? 'success' : 'warning'

  return h(ElTag, { type, size: 'small' }, () => text)
}

export const renderSummaryCountText = (count?: number | string | null, unit = '') => {
  const normalizedCount = count ?? 0
  return h('span', `${normalizedCount} ${unit}`.trim())
}

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
