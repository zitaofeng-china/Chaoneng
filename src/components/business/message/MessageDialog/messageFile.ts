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

/** 消息/关键词回复仅允许上传 1 个文件（图片或视频） */
export const MAX_MESSAGE_UPLOAD_FILES = 1

export const toSingleFileUrl = (value?: string | string[] | null): string => {
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === 'string' && item.trim())
    return first ? first.trim() : ''
  }
  return ''
}

export const clampMessageUploadFiles = <T>(files: T[]): T[] =>
  files.slice(0, MAX_MESSAGE_UPLOAD_FILES)

export const buildSinglePreviewFile = (value?: string | string[] | null) => {
  const url = toSingleFileUrl(value)
  if (!url) return []
  return [
    {
      type: getMessageFileType(url),
      url,
      name: url.split('/').pop()?.split('?')[0] || 'file'
    }
  ]
}
