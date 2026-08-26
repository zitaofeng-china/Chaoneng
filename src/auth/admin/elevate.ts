import { ElMessage } from 'element-plus'
import { useAdminAuthStoreWithOut } from '@/store/modules/adminAuth'
import { createPasskeyChallenge, elevateAdminSession } from './api'
import {
  getPasskeyAssertion,
  getPasskeyDeviceId,
  getPasskeyErrorMessage,
  isPasskeySupported,
  rememberPasskeyCredentialId
} from './passkey'

let elevatePromise: Promise<void> | undefined

const runElevateCeremony = async () => {
  try {
    if (!isPasskeySupported()) {
      throw new Error('敏感操作需要通行密钥验证，当前浏览器不支持')
    }

    const accessToken = useAdminAuthStoreWithOut().getAccessToken
    if (!accessToken) {
      throw new Error('登录已过期，请重新登录')
    }

    ElMessage.info('敏感操作需要通行密钥验证')
    const device_id = getPasskeyDeviceId()
    const challenge = await createPasskeyChallenge({ device_id, purpose: 'elevate' }, accessToken)
    const credential = await getPasskeyAssertion(challenge.options)
    rememberPasskeyCredentialId(credential.id)
    await elevateAdminSession(accessToken, {
      ceremony_id: challenge.ceremony_id,
      credential,
      device_id
    })
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
