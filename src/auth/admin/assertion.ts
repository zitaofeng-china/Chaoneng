import { createPasskeyChallenge } from './api'
import {
  getPasskeyAssertion,
  getPasskeyDeviceId,
  isPasskeySupported,
  rememberPasskeyCredentialId
} from './passkey'
import type { PasskeyAssertionBody, PasskeyChallengePurpose } from './types'

type AssertionPurpose = Extract<PasskeyChallengePurpose, 'login' | 'elevate'>

/** 拉 challenge、完成本机签名，得到登录 / elevate 共用的断言请求体。 */
export const collectPasskeyAssertion = async (
  purpose: AssertionPurpose,
  accessToken?: string
): Promise<PasskeyAssertionBody> => {
  if (!isPasskeySupported()) {
    throw new Error(
      purpose === 'elevate'
        ? '敏感操作需要通行密钥验证，当前浏览器不支持'
        : '当前浏览器不支持通行密钥'
    )
  }

  const device_id = getPasskeyDeviceId()
  const challenge = await createPasskeyChallenge(
    purpose === 'login' ? { purpose: 'login', device_id } : { purpose: 'elevate', device_id },
    accessToken
  )
  const credential = await getPasskeyAssertion(challenge.options)
  rememberPasskeyCredentialId(credential.id)
  return {
    ceremony_id: challenge.ceremony_id,
    credential,
    device_id
  }
}
