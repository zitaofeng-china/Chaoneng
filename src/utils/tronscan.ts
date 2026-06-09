const DEFAULT_TRONSCAN_URL = 'https://tronscan.org'

const getTronscanBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_TRONSCAN_URL
  if (typeof configuredUrl === 'string' && configuredUrl.trim()) {
    return configuredUrl.trim().replace(/\/+$/, '')
  }

  return DEFAULT_TRONSCAN_URL
}

export const getTronscanTransactionUrl = (txid?: string | number | null) => {
  const normalizedTxid = String(txid ?? '').trim()
  if (!normalizedTxid) return ''

  return `${getTronscanBaseUrl()}/#/transaction/${normalizedTxid}`
}
