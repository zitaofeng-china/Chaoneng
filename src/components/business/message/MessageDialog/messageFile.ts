import type { UploadUserFile } from 'element-plus'

export type MessageFileType = 'image' | 'video'

export type MessageFileLike = File | UploadUserFile | string

const VIDEO_FILE_PATTERN = /\.(mp4|avi|mov|wmv|flv|mkv|webm|m4v|mpeg|mpg)(?:$|[?#])/i

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const getUploadFileRaw = (file: unknown) => {
  if (!isObject(file) || !('raw' in file)) return undefined
  const raw = file.raw
  return raw instanceof File ? raw : undefined
}

const getUploadFileStringField = (
  file: unknown,
  field: 'name' | 'url' | 'type'
): string | undefined => {
  if (!isObject(file) || !(field in file)) return undefined
  const value = file[field]
  return typeof value === 'string' ? value : undefined
}

const getFileMimeType = (file: Exclude<MessageFileLike, string>) => {
  const directMimeType = getUploadFileStringField(file, 'type')
  if (directMimeType) return directMimeType

  return getUploadFileRaw(file)?.type || ''
}

export const getMessageFileName = (file: MessageFileLike) => {
  if (typeof file === 'string') return file

  return (
    getUploadFileStringField(file, 'name') ||
    getUploadFileStringField(file, 'url') ||
    getUploadFileRaw(file)?.name ||
    ''
  )
}

export const getMessageFileUrl = (file: MessageFileLike) => {
  if (typeof file === 'string') return file
  return getUploadFileStringField(file, 'url') || ''
}

export const isVideoFile = (file: MessageFileLike): boolean => {
  if (typeof file !== 'string') {
    const fileType = getFileMimeType(file)
    if (fileType.startsWith('video/')) {
      return true
    }
  }

  const fileName = getMessageFileName(file)
  const fileUrl = getMessageFileUrl(file)
  return VIDEO_FILE_PATTERN.test(fileName) || VIDEO_FILE_PATTERN.test(fileUrl)
}

export const getMessageFileType = (file: MessageFileLike): MessageFileType =>
  isVideoFile(file) ? 'video' : 'image'
