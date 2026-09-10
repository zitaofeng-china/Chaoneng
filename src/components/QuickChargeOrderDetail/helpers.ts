import { computed, h, ref, type ComputedRef, type Ref } from 'vue'
import { ElTag, ElTooltip } from 'element-plus'
import { getTronscanTransactionUrl } from '@/utils/tronscan'
import type {
  QuickChargeOrderDetail,
  QuickChargeOrderDetailSource,
  QuickChargeResource
} from './types'

type LocalListRef<T> = Ref<T[]> | ComputedRef<T[]>

const TRANSACTION_LINK_STYLE = 'color: #409eff; cursor: pointer; text-decoration: none;'

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
            rel: 'noopener noreferrer',
            style: TRANSACTION_LINK_STYLE
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

const toTimestamp = (value?: string | number | null) => {
  if (!value) return 0
  if (typeof value === 'number') return value
  if (/^\d+$/.test(value)) return Number(value)
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

const createFallbackSummary = (orderId: string, energyCount = 0) => ({
  order_id: orderId,
  gift_bandwidth: false,
  active_count: 0,
  energy_count: energyCount,
  used_count: 0
})

const mapResources = (
  resources?: QuickChargeOrderDetailSource['resources']
): QuickChargeResource[] => {
  return (resources || []).map((resource) => ({
    id: resource.id,
    amount: resource.amount,
    target: resource.target,
    code: resource.code,
    source: resource.source,
    balance: resource.balance,
    expirated_at: resource.expirated_at,
    used_txid: resource.used_txid,
    delegated_txid: resource.delegated_txid,
    delegated_at: resource.delegated_at,
    recycled_txid: resource.recycled_txid,
    recycled_at: resource.recycled_at
  }))
}

export const buildQuickChargeOrderDetail = (
  detailData: QuickChargeOrderDetailSource
): QuickChargeOrderDetail => {
  const summary = detailData.summary || createFallbackSummary(detailData.id)
  const firstResource = detailData.resources?.[0]

  return {
    id: detailData.id,
    order_num: detailData.id,
    tg_name: detailData.tg_first_name || detailData.tg_user_name || '-',
    bot_id: detailData.bot_id || '-',
    bot_name: detailData.bot_user_name || detailData.bot_first_name || '-',
    username: detailData.agent_name || '-',
    order_type: detailData.kind,
    order_amount: String(detailData.amount ?? '-'),
    pay_unit: detailData.coin || '',
    energy_num: String(summary.energy_count ?? 0),
    receive_address: detailData.receive_address || '',
    energy_address: firstResource?.target || '',
    status: detailData.status,
    recycle_time: toTimestamp(firstResource?.recycled_at),
    create_time: toTimestamp(detailData.created_at),
    finish_time: toTimestamp(detailData.updated_at),
    pay_time: toTimestamp(detailData.paid_at),
    stop_time: null,
    stroke_num: summary.energy_count || 0,
    txid: firstResource?.delegated_txid || '',
    from_address: firstResource?.source || '',
    recycle_txid: firstResource?.recycled_txid || '',
    used_txid: firstResource?.used_txid || '',
    flash_price: String(detailData.amount ?? '-'),
    kind: detailData.kind,
    before_used: detailData.fast_charge?.before_used ?? null,
    summary,
    resources: mapResources(detailData.resources),
    activations: detailData.activations || []
  }
}
