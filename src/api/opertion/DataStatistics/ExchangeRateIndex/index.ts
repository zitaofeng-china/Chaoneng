import axios from 'axios'
import type { TrxVolumeParams, TrxVolumeResponse } from './types'

export * from './types'

const TRONSCAN_API_BASE = 'https://apilist.tronscanapi.com/api'

export const getTrxVolume = async (params: TrxVolumeParams) => {
  const { data } = await axios.get<TrxVolumeResponse>(`${TRONSCAN_API_BASE}/trx/volume`, {
    params
  })
  return data
}
