import request from '@/axios'
import type { SaleByTimeReportData, SaleByTimeReportParams } from './types'

export * from './types'

export const getSaleByTimeReport = (
  params?: SaleByTimeReportParams
): Promise<IResponse<SaleByTimeReportData>> => {
  return request.get<SaleByTimeReportData>({
    url: '/v2/system/stats/summary',
    params
  })
}
