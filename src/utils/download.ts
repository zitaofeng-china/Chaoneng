import { ElMessage } from 'element-plus'

/**
 * 根据后端返回的二进制数据触发浏览器下载
 * @param data Blob 数据或包含 Blob 的响应对象
 * @param filename 要下载的文件名
 * @param mimeType 可选的文件 MIME 类型 (例如 'application/vnd.ms-excel')
 */
export function downloadByData(data: any, filename: string, mimeType?: string) {
  // 确保 data 存在
  if (!data) {
    ElMessage.warning('下载数据为空')
    return
  }

  // 尝试从响应对象中提取 Blob (如果 data 不是直接的 Blob)
  // 通常 Axios 设置 responseType: 'blob' 后，data 就直接是 Blob
  const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType })

  // 创建一个指向 Blob 的 URL
  const blobUrl = URL.createObjectURL(blob)

  // 创建一个隐藏的 <a> 标签用于下载
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = filename || 'download' // 设置下载文件名
  link.style.display = 'none' // 隐藏标签

  // 将链接添加到文档中 (兼容 Firefox)
  document.body.appendChild(link)

  // 模拟点击链接
  link.click()

  // 清理：从文档中移除链接并释放 Blob URL
  document.body.removeChild(link)
  URL.revokeObjectURL(blobUrl)
}

/**
 * 将 Base64 字符串转换为 Blob 对象并下载
 * @param base64Data Base64 编码的字符串 (可以包含 data:mime/type;base64, 前缀)
 * @param filename 下载的文件名
 */
export function downloadByBase64(base64Data: string, filename: string) {
  // 移除 Base64 字符串前缀 (例如 "data:image/png;base64,") 并获取 MIME 类型
  const parts = base64Data.match(/^data:(.+);base64,(.+)$/)
  let base64String = base64Data
  let mimeType: string | undefined

  if (parts && parts.length === 3) {
    mimeType = parts[1] // 获取 MIME 类型
    base64String = parts[2] // 获取纯 Base64 数据
  }

  try {
    // 解码 Base64
    const byteCharacters = atob(base64String)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)

    // 创建 Blob 对象
    const blob = new Blob([byteArray], { type: mimeType }) // 使用提取的 MIME 类型

    // 调用现有的下载函数
    downloadByData(blob, filename)
  } catch {
    ElMessage.error('下载失败，文件数据无效')
  }
}
