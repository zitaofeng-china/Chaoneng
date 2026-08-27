import { ElMessage } from 'element-plus'
import { useAdminAuthStoreWithOut } from '@/store/modules/adminAuth'
import { elevateAdminSession } from './api'
import { collectPasskeyAssertion } from './assertion'
import { getPasskeyErrorMessage } from './passkey'

let elevatePromise: Promise<void> | undefined

const runElevateCeremony = async () => {
  try {
    const accessToken = useAdminAuthStoreWithOut().getAccessToken
    if (!accessToken) {
      throw new Error('登录已过期，请重新登录')
    }

    ElMessage.info('敏感操作需要通行密钥验证')
    const assertion = await collectPasskeyAssertion('elevate', accessToken)
    await elevateAdminSession(accessToken, assertion)
  } catch (error: any) {
    const message = getPasskeyErrorMessage(
      error,
      error?.msg || error?.message || '通行密钥验证失败'
    )
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
