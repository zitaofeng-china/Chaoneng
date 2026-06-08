/**
 * 闪兑订单工具函数
 * 处理闪兑订单相关的业务逻辑
 */

/**
 * 闪兑订单类型枚举
 */
export enum ExchangeOrderType {
  USDT_TO_TRX = 1, // USDT 兑换 TRX
  TRX_TO_USDT = 2 // TRX 兑换 USDT
}

/**
 * 根据输入和输出币种判断闪兑订单类型
 * @param inCoin 输入币种
 * @param outCoin 输出币种
 * @returns 订单类型
 */
export function getExchangeOrderType(
  inCoin: string | undefined,
  outCoin: string | undefined
): ExchangeOrderType | null {
  if (!inCoin || !outCoin) return null

  const inCoinUpper = inCoin.toUpperCase()
  const outCoinUpper = outCoin.toUpperCase()

  if (inCoinUpper === 'USDT' && outCoinUpper === 'TRX') {
    return ExchangeOrderType.USDT_TO_TRX
  }

  if (inCoinUpper === 'TRX' && outCoinUpper === 'USDT') {
    return ExchangeOrderType.TRX_TO_USDT
  }

  return null
}
