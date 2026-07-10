import request from '@/axios'

/**
 * 行情价格接口（跨端共用）
 * 域名 / IP 走项目统一 baseURL：
 * - window.APP_CONFIG.API_BASE_URL
 * - import.meta.env.VITE_API_BASE_PATH
 * 路径固定：GET /v1/ticker/price
 */

export type TickerSymbol = 'TRXUSDT' | (string & {})

/**
 * 获取交易对行情价格
 * @param symbol 交易对，默认 TRXUSDT
 * @returns 价格字符串（接口 data 字段）
 */
export const getTickerPrice = async (symbol: TickerSymbol = 'TRXUSDT'): Promise<string> => {
  const res = await request.get<string>({
    url: '/v1/ticker/price',
    params: { symbol }
  })

  const price = res?.data
  if (price === undefined || price === null || price === '') {
    throw new Error(res?.msg || `获取 ${symbol} 行情价格失败`)
  }

  return String(price)
}

/** TRX/USDT 行情价格（业务侧最常用） */
export const getTrxUsdtTickerPrice = (): Promise<string> => getTickerPrice('TRXUSDT')

/** @deprecated 请使用 getTrxUsdtTickerPrice，保留别名兼容旧引用 */
export const fetchTrxUsdtTickerPrice = getTrxUsdtTickerPrice
