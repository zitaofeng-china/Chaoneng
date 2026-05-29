import request from '@/axios'
import type { AgentBillListParamsV2, AgentBillListResponseV2 } from './ledger.types'

// 导出类型定义
export * from './ledger.types'

// ========== 代理账单接口（代理端 + 运营端通用） ==========

/**
 * 获取代理账单列表
 * GET /v1/bill/agent
 */
export const v2GetAgentBillList = (
  params: AgentBillListParamsV2
): Promise<IResponse<AgentBillListResponseV2>> => {
  return request.get({
    url: '/v1/bill/agent',
    params
  })
}

/**
 * 导出代理账单
 * GET /v1/bill/agent/export
 */
export const v2ExportAgentBill = (params: AgentBillListParamsV2): Promise<IResponse<Blob>> => {
  return request.get({
    url: '/v1/bill/agent/export',
    params,
    responseType: 'blob'
  })
}
