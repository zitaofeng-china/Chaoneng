import request from '@/axios'

// 模拟获取某个字典
export const getDictOneApi = async () => {
  return request.get({ url: '/mock/dict/one' })
}
