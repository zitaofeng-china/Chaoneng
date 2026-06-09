// ========== 代理价格配置相关类型定义 ==========

// v1 价格列表查询参数
export interface V1PriceListParams {
  agent_id?: number // 代理ID
  current_page?: number // 页码
  keyword?: string // 关键字搜索
  order?: string // 排序，格式: column [ASC|DESC]，多字段用逗号分隔
  page_size?: number // 每页大小
}

// v1 价格列表响应数据（带分页）
export interface V1PriceListResponseData {
  list: V1PriceListResponse[]
  pager: {
    current_page: number
    page_size: number
    total: number
  }
}

// v1 价格列表单项数据
export interface V1PriceListResponse {
  id: number
  created_at: number // Unix时间戳
  updated_at: number // Unix时间戳
  active: string | number // 首次激活价格
  time_1h: string | number // 按时间-1小时价格
  time_1d: string | number // 按时间-1天价格
  time_3d: string | number // 按时间-3天价格
  time_7d: string | number // 按时间-7天价格
  time_15d: string | number // 按时间-15天价格
  time_30d: string | number // 按时间-30天价格
  stroke: string | number // 按笔数价格
  flash: string | number // 闪租价格
  hosting_65k: string | number // 托管65k价格
  hosting_131k: string | number // 托管131k价格
  trx_2_usdt: string | number // 闪兑-TRX兑换USDT费率（小数，显示时需乘以100）
  usdt_2_trx: string | number // 闪兑-USDT兑换TRX费率（小数，显示时需乘以100）
  bot_fee: string | number // 机器人价格
  batch_flash: string | number // 批量下单价格
  bandwidth?: string | number // 带宽价格
  charge?: string | number // 速充价格
  weal?: string | number // 福利价格
}

// 价格参数更新参数 - v1
export interface V1UpdatePriceParams {
  id: number // 必须：记录ID
  // 以下字段为可选，只传需要修改的字段
  active?: string | number // 首次激活价格
  time_1h?: string | number // 按时间-1小时价格
  time_1d?: string | number // 按时间-1天价格
  time_3d?: string | number // 按时间-3天价格
  time_7d?: string | number // 按时间-7天价格
  time_15d?: string | number // 按时间-15天价格
  time_30d?: string | number // 按时间-30天价格
  stroke?: string | number // 按笔数价格
  flash?: string | number // 闪租价格
  hosting_65k?: string | number // 托管65k价格
  hosting_131k?: string | number // 托管131k价格
  trx_2_usdt?: string | number // 闪兑-TRX兑换USDT费率（小数，保存时需除以100）
  usdt_2_trx?: string | number // 闪兑-USDT兑换TRX费率（小数，保存时需除以100）
  bot_fee?: string | number // 机器人价格
  batch_flash?: string | number // 批量下单价格
  bandwidth?: string | number // 带宽价格
  charge?: string | number // 速充价格
  weal?: string | number // 福利价格
}
