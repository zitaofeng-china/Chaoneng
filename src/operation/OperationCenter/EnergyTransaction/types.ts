import type {
  V2EnergyItem,
  V2EnergyListParams
} from '@/api/opertion/OperationCenter/EnergyTransaction'
import type { DateRangeValue } from '@/utils/tableHelpers'

export type EnergyOrder = V2EnergyItem
export type EnergyListParams = V2EnergyListParams

export type EnergyDateRange = DateRangeValue

export interface SearchFormParams {
  keyword?: string
  bot_id?: number | string
  origin?: number | string
  kind?: number | number[]
  receive_address?: string
  energy_address?: string
  status?: number
  dateRange?: EnergyDateRange
}

export interface ExportDataItem {
  订单号?: string
  代理名称?: string
  机器人昵称?: string
  TG用户名?: string
  TG用户昵称?: string
  用户账号?: string
  用户邮箱?: string
  来源: string
  订单类型: string
  交易金额: string
  金额币种: string
  应发放能量: string
  实际发放能量: string
  收款方式: string
  能量接收地址: string
  笔数: number | string
  订单状态: string
  备注: string
  创建时间: string
  回收时间: string
}
