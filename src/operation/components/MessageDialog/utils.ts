import type { UploadUserFile } from 'element-plus'

export type MessageFileType = 'image' | 'video'

export const getMessageFileType = (file: File | UploadUserFile): MessageFileType => {
  const fileName = file.name || ''
  const fileType = (file as File).type || (file as UploadUserFile).raw?.type || ''

  if (fileType.startsWith('video/') || /\.(mp4|avi|mov|wmv|flv|mkv)$/i.test(fileName)) {
    return 'video'
  }

  return 'image'
}
