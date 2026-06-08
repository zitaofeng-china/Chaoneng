export const PAYMENT_ADDRESS_KIND_MAP: Record<number, { label: string; className: string }> = {
  1: { label: '【代理余额充值】收款地址', className: 'kind-agent' },
  2: { label: '【用户余额充值】收款地址', className: 'kind-user' },
  3: { label: '【闪兑T / U】收款地址', className: 'kind-exchange' },
  4: { label: '【能量闪租】收款地址', className: 'kind-flash' },
  5: { label: '【按笔数购买】收款地址', className: 'kind-count' },
  6: { label: '【福利能量】收款地址', className: 'kind-welfare' }
}

export const PAYMENT_ADDRESS_KIND_OPTIONS = Object.entries(PAYMENT_ADDRESS_KIND_MAP).map(
  ([value, item]) => ({
    label: item.label,
    value: Number(value)
  })
)

export const PAYMENT_AGENT_BALANCE_ADDRESS_KIND = 1
export const PAYMENT_WELFARE_ADDRESS_KIND = 6
export const PAYMENT_MULTI_ADDRESS_KINDS = new Set([
  PAYMENT_AGENT_BALANCE_ADDRESS_KIND,
  PAYMENT_WELFARE_ADDRESS_KIND
])
export const ALLOWED_PAYMENT_ADDRESS_KINDS = new Set(
  PAYMENT_ADDRESS_KIND_OPTIONS.map((item) => item.value)
)

export const AGENT_PRICE_LEVEL_LABELS: Record<number, string> = {
  1: '一级代理',
  2: '二级代理',
  3: '三级代理',
  4: '四级代理',
  5: '五级代理',
  6: '六级代理',
  7: '七级代理',
  8: '八级代理',
  9: '九级代理',
  10: '十级代理',
  11: '十一级代理'
}
