import { h } from 'vue'
import { ElTooltip } from 'element-plus'
import { getTronscanTransactionUrl } from '@/utils/tronscan'

const TRANSACTION_LINK_STYLE = 'color: #409eff; cursor: pointer; text-decoration: none;'

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
            style: TRANSACTION_LINK_STYLE
          },
          linkText
        )
    }
  )
}
