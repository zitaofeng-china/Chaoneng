import request from '@/axios'
import type { PaymentStatisticsReportData, PaymentStatisticsReportParams } from './types'

export * from './types'

export const getPaymentStatisticsReport = (
  params?: PaymentStatisticsReportParams
): Promise<IResponse<PaymentStatisticsReportData>> => {
  return request.get<PaymentStatisticsReportData>({
    url: '/v2/system/stats/payment',
    params
  })
}
