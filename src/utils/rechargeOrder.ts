export interface RechargeOrderUserBillLike {
  amount?: string | number | null
  coin?: string | null
}

export interface RechargeOrderMetricsLike {
  amount?: string | number | null
  fee?: string | number | null
  coin?: string | null
  user_bill?: RechargeOrderUserBillLike | null
  agent_bill?: RechargeOrderUserBillLike | null
}

const isEmptyValue = (value?: string | number | null) =>
  value === undefined || value === null || value === ''

const toFiniteNumber = (value?: string | number | null) => {
  if (isEmptyValue(value)) return undefined
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

const trimTrailingZeros = (value: string) => value.replace(/(\.\d*?[1-9])0+$|\.0+$/, '$1')

export const formatRechargeMetricNumber = (
  value?: string | number | null,
  maxFractionDigits = 6
) => {
  if (isEmptyValue(value)) return '-'

  const numberValue = toFiniteNumber(value)
  if (numberValue === undefined) return String(value)

  return trimTrailingZeros(numberValue.toFixed(maxFractionDigits))
}

export const normalizeRechargeCoin = (coin?: string | null) => coin?.toUpperCase() || ''

export const isUsdtRechargeOrder = (row?: RechargeOrderMetricsLike | null) =>
  normalizeRechargeCoin(row?.coin) === 'USDT'

const getRechargeBill = (
  row?: RechargeOrderMetricsLike | null,
  billField: 'user_bill' | 'agent_bill' = 'user_bill'
) => row?.[billField]

export const formatRechargeFeeText = (row?: RechargeOrderMetricsLike | null) => {
  const feeText = formatRechargeMetricNumber(row?.fee)
  if (feeText === '-') return feeText

  const coin = normalizeRechargeCoin(row?.coin) || normalizeRechargeCoin(row?.user_bill?.coin)
  return coin ? `${feeText} ${coin}` : feeText
}

export const getRechargeReceivedAmountText = (
  row?: RechargeOrderMetricsLike | null,
  billField: 'user_bill' | 'agent_bill' = 'user_bill'
) => {
  if (!isUsdtRechargeOrder(row)) return '-'

  const bill = getRechargeBill(row, billField)
  const amountText = formatRechargeMetricNumber(bill?.amount)
  if (amountText === '-') return amountText

  const coin = normalizeRechargeCoin(bill?.coin) || 'TRX'
  return `${amountText} ${coin}`
}

export const getRechargeProfitText = (row?: RechargeOrderMetricsLike | null) => {
  if (!isUsdtRechargeOrder(row)) return '-'

  const amount = toFiniteNumber(row?.amount)
  const fee = toFiniteNumber(row?.fee)
  if (amount === undefined || fee === undefined || amount === 0) return '-'

  const profit = (fee / amount) * 100
  if (!Number.isFinite(profit)) return '-'

  return `${formatRechargeMetricNumber(profit, 4)}%`
}

export const getRechargeActualRateText = (
  row?: RechargeOrderMetricsLike | null,
  billField: 'user_bill' | 'agent_bill' = 'user_bill'
) => {
  if (!isUsdtRechargeOrder(row)) return '-'

  const bill = getRechargeBill(row, billField)
  const receivedAmount = toFiniteNumber(bill?.amount)
  const amount = toFiniteNumber(row?.amount)
  if (receivedAmount === undefined || amount === undefined || amount <= 0) return '-'

  const actualRate = receivedAmount / amount
  if (!Number.isFinite(actualRate)) return '-'

  return formatRechargeMetricNumber(actualRate, 6)
}
