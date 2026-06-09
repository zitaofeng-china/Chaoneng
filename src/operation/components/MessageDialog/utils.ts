import type { UploadUserFile } from 'element-plus'

export type MessageFileType = 'image' | 'video'

const getFileMimeType = (file: File | UploadUserFile) => {
  if ('type' in file && typeof file.type === 'string') {
    return file.type
  }

  if ('raw' in file) {
    return file.raw?.type || ''
  }

  return ''
}

export const getMessageFileType = (file: File | UploadUserFile): MessageFileType => {
  const fileName = file.name || ''
  const fileType = getFileMimeType(file)

  if (fileType.startsWith('video/') || /\.(mp4|avi|mov|wmv|flv|mkv)$/i.test(fileName)) {
    return 'video'
  }

  return 'image'
}
