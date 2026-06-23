import type { UploadUserFile } from 'element-plus'
import { handleWarningMessage } from '@/utils/messageHelper'
import { getMessageFileType } from './utils'

export type PreviewFileType = 'image' | 'video'

interface ResolvePreviewResult {
  fileType: PreviewFileType
  previewUrl: string
  revokePreviousVideoUrl?: boolean
}

export const resolveMessageFilePreview = (
  uploadFile: UploadUserFile,
  previousVideoUrl?: string
): ResolvePreviewResult | null => {
  const fileType = getMessageFileType(uploadFile)
  const directUrl = uploadFile.url

  if (directUrl) {
    return {
      fileType,
      previewUrl: directUrl
    }
  }

  if (uploadFile.raw) {
    return {
      fileType,
      previewUrl: URL.createObjectURL(uploadFile.raw),
      revokePreviousVideoUrl: fileType === 'video' && Boolean(previousVideoUrl?.startsWith('blob:'))
    }
  }

  handleWarningMessage(
    fileType === 'video' ? '无法预览视频，缺少视频URL' : '无法预览文件，缺少文件URL'
  )
  return null
}
