import { h } from 'vue'
import { ElTag } from 'element-plus'

const hasActivationTxid = (txid?: string | null) => {
  return Boolean(txid?.trim())
}

export const renderActivationStatusTag = (txid?: string | null) => {
  const isActivated = hasActivationTxid(txid)
  const text = isActivated ? '已激活' : '待激活'
  const type = isActivated ? 'success' : 'warning'

  return h(ElTag, { type, size: 'small' }, () => text)
}
