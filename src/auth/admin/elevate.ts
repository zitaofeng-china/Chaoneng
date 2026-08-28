import { ElMessage, ElMessageBox } from 'element-plus'
import { useAdminAuthStoreWithOut } from '@/store/modules/adminAuth'
import { elevateAdminSession } from './api'
import { collectPasskeyAssertion } from './assertion'
import { createElevateCancelledError, isElevateCancelled } from './elevateError'
import { getPasskeyErrorMessage } from './passkey'

export { isElevateCancelled } from './elevateError'

let elevatePromise: Promise<void> | undefined

const confirmElevate = async () => {
  try {
    await ElMessageBox.confirm(
      '本次操作为敏感操作，需要验证通行密钥后才能继续。是否继续验证？',
      '敏感操作确认',
      {
        type: 'warning',
        confirmButtonText: '继续验证',
        cancelButtonText: '取消',
        closeOnClickModal: false
      }
    )
  } catch {
    throw createElevateCancelledError()
  }
}

const runElevateCeremony = async () => {
  try {
    const accessToken = useAdminAuthStoreWithOut().getAccessToken
    if (!accessToken) {
      throw new Error('登录已过期，请重新登录')
    }

    await confirmElevate()
    const assertion = await collectPasskeyAssertion('elevate', accessToken)
    await elevateAdminSession(accessToken, assertion)
  } catch (error: any) {
    if (isElevateCancelled(error)) {
      throw error
    }
    const message = getPasskeyErrorMessage(error, '通行密钥验证失败')
    ElMessage[error?.name === 'NotAllowedError' ? 'info' : 'error'](message)
    throw error
  }
}

/** 并发 000008 共用一次 challenge → 签名 → elevate。有效期由后端控制（15 分钟）。 */
export const ensureAdminElevated = () => {
  if (!elevatePromise) {
    elevatePromise = runElevateCeremony().finally(() => {
      elevatePromise = undefined
    })
  }
  return elevatePromise
}
