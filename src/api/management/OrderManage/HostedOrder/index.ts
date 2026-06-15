import request from '@/axios'

// 获取托管订单列表
export const getHostedOrderListApi = (params: any) => {
  return request.get({ url: '/v1/order/hosted_order/list', params })
}

// 获取托管订单详情
export const getHostedOrderDetailApi = (id: number) => {
  return request.get({ url: `/v1/order/hosted_order/detail/${id}` })
}

// 获取交易详情
export const getTransactionDetailApi = (transaction_hash: string) => {
  return request.get({ url: '/v1/order/transaction/detail', params: { transaction_hash } })
}

// 导出托管订单
export const exportHostedOrderApi = (params: any) => {
  return request.get({ url: '/v1/order/hosted_order/export', params, responseType: 'blob' })
}
