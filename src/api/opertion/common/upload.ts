import request from '@/axios'

export interface UploadFileResponse {
  filename: string
  url?: string
}

export const upload = (data: FormData): Promise<IResponse<UploadFileResponse>> => {
  return request.post({
    url: '/v1/bot/common/upload',
    data,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 上传文件（图片/视频）- 新接口
 * @param data FormData 对象，包含 file 字段
 * @returns Promise 返回 { code, data: { filename, url }, msg }
 */
export const uploadFile = (data: FormData): Promise<IResponse<UploadFileResponse>> => {
  return request.post({
    url: '/v1/file',
    data,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 上传文件（图片/视频）- 兼容旧方法名，实际使用 v1 接口（运营端）
 * @param data FormData 对象，包含 file 字段
 * @returns Promise 返回 { code, data: { filename, url }, msg }
 */
export const uploadFileV2 = (data: FormData): Promise<IResponse<UploadFileResponse>> => {
  return request.post({
    url: '/v1/file',
    data,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}
