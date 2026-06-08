import axios from 'axios'
import type { TrxTokenPriceResponse, TrxVolumeParams, TrxVolumeResponse } from './types'

const TRONSCAN_API_BASE = 'https://apilist.tronscanapi.com/api'

export const getTrxVolumeApi = async (params: TrxVolumeParams) => {
  const { data } = await axios.get<TrxVolumeResponse>(`${TRONSCAN_API_BASE}/trx/volume`, {
    params
  })
  return data
}

export const getTrxTokenPriceApi = async () => {
  const { data } = await axios.get<TrxTokenPriceResponse>(`${TRONSCAN_API_BASE}/token/price`, {
    params: {
      token: 'trx'
    }
  })
  return data
}
