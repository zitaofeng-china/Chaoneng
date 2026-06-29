import type { UploadUserFile } from 'element-plus'

export type MessageFileType = 'image' | 'video'

type FileLike = File | UploadUserFile | string

const VIDEO_FILE_PATTERN = /\.(mp4|avi|mov|wmv|flv|mkv|webm|m4v|mpeg|mpg)(?:$|[?#])/i

const getFileMimeType = (file: Exclude<FileLike, string>) => {
  if ('type' in file && typeof file.type === 'string' && file.type) {
    return file.type
  }

  if ('raw' in file) {
    return file.raw?.type || ''
  }

  return ''
}

const getFileName = (file: FileLike) => {
  if (typeof file === 'string') return file
  return file.name || file.url || file.raw?.name || ''
}

const getFileUrl = (file: FileLike) => {
  if (typeof file === 'string') return file
  return file.url || ''
}

export const isVideoFile = (file: FileLike): boolean => {
  if (typeof file !== 'string') {
    const fileType = getFileMimeType(file)
    if (fileType.startsWith('video/')) {
      return true
    }
  }

  const fileName = getFileName(file)
  const fileUrl = getFileUrl(file)
  return VIDEO_FILE_PATTERN.test(fileName) || VIDEO_FILE_PATTERN.test(fileUrl)
}

export const getMessageFileType = (file: FileLike): MessageFileType =>
  isVideoFile(file) ? 'video' : 'image'
