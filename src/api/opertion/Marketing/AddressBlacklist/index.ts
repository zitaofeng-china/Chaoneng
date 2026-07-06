import request from '@/axios'
import type {
  AddressBlacklistListParams,
  AddressBlacklistListResponse,
  DeleteAddressBlacklistParams,
  SaveAddressBlacklistParams
} from './types'

export * from './types'

const BASE_URL = '/v1/blacklist'

export const getAddressBlacklist = (
  params: AddressBlacklistListParams
): Promise<IResponse<AddressBlacklistListResponse>> => {
  return request.get({
    url: BASE_URL,
    params
  })
}

export const createAddressBlacklist = (data: SaveAddressBlacklistParams): Promise<IResponse> => {
  return request.post({
    url: BASE_URL,
    data
  })
}

export const updateAddressBlacklist = (data: SaveAddressBlacklistParams): Promise<IResponse> => {
  return request.put({
    url: BASE_URL,
    data
  })
}

export const deleteAddressBlacklist = (data: DeleteAddressBlacklistParams): Promise<IResponse> => {
  return request.delete({
    url: BASE_URL,
    data
  })
}
