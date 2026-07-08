import { h } from 'vue'
import { ElLink, ElTag } from 'element-plus'
import { getStatusText, getStatusType } from '@/utils/orderStatus'
import { getTronscanTransactionUrl } from '@/utils/tronscan'

export type RechargeBillField = 'user_bill' | 'agent_bill'

export interface RechargeOrderRecord extends Recordable {
  id?: string | number
  status?: number
  origin?: number
  user_id?: string | number
  tg_user_name?: string
  tg_first_name?: string
  username?: string
  email?: string
  agent_name?: string
  bot_id?: string | number
  bot_name?: string
  bot_user_name?: string
  bot_first_name?: string
  amount?: string | number
  coin?: string
  fee?: string | number
  describe?: string
  receive_address?: string
  pay_address?: string
  pay_id?: string
  pay_from?: string
  actual_rate?: string
  created_at?: string | number | null
  paid_at?: string | number | null
}

export interface RechargeTransactionRecord extends Recordable {
  id?: string | number
  from?: string
  to?: string
  pay_id?: string | number
  pay_from?: string
  pay_to?: string
  receive_address?: string
}

const RECHARGE_COIN_TAG_MAP: Record<
  string,
  { color: string; backgroundColor: string; borderColor: string }
> = {
  USDT: {
    color: '#409EFF',
    backgroundColor: '#ECF5FF',
    borderColor: '#B3D8FF'
  },
  TRX: {
    color: '#E6A23C',
    backgroundColor: '#FDF6EC',
    borderColor: '#F3D19E'
  }
}

export const renderText = (value?: string | number | null, fallback = '-') =>
  h('span', value === undefined || value === null || value === '' ? fallback : String(value))

export const renderRechargeCoinTag = (coin?: string | null) => {
  const normalizedCoin = coin?.toUpperCase()
  if (!normalizedCoin) return renderText()

  const tagStyle = RECHARGE_COIN_TAG_MAP[normalizedCoin]
  if (!tagStyle) return renderText(normalizedCoin)

  return h(
    ElTag,
    {
      size: 'small',
      effect: 'light',
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '76px',
        height: '28px',
        color: tagStyle.color,
        backgroundColor: tagStyle.backgroundColor,
        borderColor: tagStyle.borderColor,
        padding: '0 16px'
      }
    },
    () => normalizedCoin
  )
}

export const renderRechargeStatusTag = (status?: number) => {
  return h(ElTag, { type: getStatusType(status), size: 'small' }, () => getStatusText(status))
}

export const getRechargeSourceText = (origin?: number | null) => {
  if (origin === 1) return '机器人'
  if (origin === 2) return 'H5'
  return '-'
}

export const getRechargeBotName = (row?: RechargeOrderRecord | null) =>
  row?.bot_name || row?.bot_user_name || row?.bot_first_name || '-'

export const getTransactionId = (row?: RechargeTransactionRecord | null) => row?.id || row?.pay_id

export const getTransactionFrom = (row?: RechargeTransactionRecord | null) =>
  row?.from || row?.pay_from || '-'

export const getTransactionTo = (row?: RechargeTransactionRecord | null) =>
  row?.to || row?.pay_to || row?.receive_address || '-'

export const renderTransactionLink = (txid?: string | number | null) => {
  const normalizedTxid = String(txid ?? '').trim()
  if (!normalizedTxid) return renderText()

  return h(
    ElLink,
    {
      href: getTronscanTransactionUrl(normalizedTxid),
      type: 'primary',
      target: '_blank'
    },
    () => normalizedTxid
  )
}
