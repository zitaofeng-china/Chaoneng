interface TrxTickerPriceResponse {
  code: string
  data: string
  msg: string
}

const TRX_USDT_TICKER_PRICE_URL = 'http://47.84.135.181:8888/v1/ticker/price?symbol=TRXUSDT'

export const fetchTrxUsdtTickerPrice = async () => {
  const response = await fetch(TRX_USDT_TICKER_PRICE_URL, {
    headers: {
      accept: 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`获取 TRXUSDT 行情价格失败: ${response.status}`)
  }

  const data = (await response.json()) as TrxTickerPriceResponse
  const isSuccessCode = /^0+$/.test(String(data.code))
  if (!isSuccessCode || data.data === undefined || data.data === null || data.data === '') {
    throw new Error(data.msg || '获取 TRXUSDT 行情价格失败')
  }

  return data.data
}
