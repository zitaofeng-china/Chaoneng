export interface TrxVolumeParams {
  start_timestamp: number
  end_timestamp: number
  limit: number
  source: string
}

export interface TrxVolumeItem {
  volume?: number | string
  timestamp?: number
  time?: number
  date?: string
  open?: number | string
  high?: number | string
  low?: number | string
  close?: number | string
}

export interface TrxVolumeResponse {
  data?: TrxVolumeItem[]
}
