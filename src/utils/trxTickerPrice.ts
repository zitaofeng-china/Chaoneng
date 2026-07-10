/**
 * @deprecated 请直接从 `@/api/common/ticker` 引入
 * 保留此文件仅为兼容旧 import 路径，内部统一走项目 axios baseURL + /v1/ticker/price
 */
export { getTickerPrice, getTrxUsdtTickerPrice, fetchTrxUsdtTickerPrice } from '@/api/common/ticker'
