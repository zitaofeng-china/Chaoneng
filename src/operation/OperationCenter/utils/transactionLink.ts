import { h } from 'vue'
import { ElTooltip } from 'element-plus'
import { getTronscanTransactionUrl } from '@/utils/tronscan'

const TRANSACTION_LINK_STYLE = 'color: #409eff; cursor: pointer; text-decoration: none;'

export const formatTransactionHash = (
  txid?: string | number | null,
  prefixLength = 8,
  suffixLength = 10
) => {
  const normalizedTxid = String(txid ?? '').trim()
  if (!normalizedTxid) return '-'
  if (normalizedTxid.length <= prefixLength + suffixLength) return normalizedTxid

  return `${normalizedTxid.slice(0, prefixLength)}...${normalizedTxid.slice(-suffixLength)}`
}

export const isDisplayableTransactionHash = (txid?: string | number | null) => {
  return String(txid ?? '').trim().length === 64
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
