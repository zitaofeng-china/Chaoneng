import request from '@/axios'
import type { EnergyStatisticsReportData, EnergyStatisticsReportParams } from './types'

export * from './types'

export const getEnergyStatisticsReport = (
  params?: EnergyStatisticsReportParams
): Promise<IResponse<EnergyStatisticsReportData>> => {
  return request.get<EnergyStatisticsReportData>({
    url: '/v2/system/stats/energy',
    params
  })
}
