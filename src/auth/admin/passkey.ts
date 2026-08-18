import type {
  PasskeyCredentialPayload,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON
} from './types'

const deviceStorageKey = 'admin-passkey-device-id'
const lastCredentialStorageKey = 'admin-passkey-last-credential-id'

const encodeBase64Url = (buffer: ArrayBuffer | null) => {
  if (!buffer) return undefined
  const bytes = new Uint8Array(buffer)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

const decodeBase64Url = (value?: string) => {
  if (!value) {
    throw new Error('通行密钥参数缺少 challenge 或用户标识')
  }
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return bytes.buffer
}

/** 后端返回 { publicKey: {...} }，浏览器凭据 API 需要内层 publicKey。 */
const unwrapPublicKeyOptions = <T extends object>(options: T | { publicKey?: T }): T => {
  if (options && typeof options === 'object' && 'publicKey' in options && options.publicKey) {
    return options.publicKey
  }
  return options as T
}

export const getPasskeyDeviceId = () => {
  let deviceId = localStorage.getItem(deviceStorageKey)
  if (!deviceId) {
    deviceId = crypto.randomUUID()
    localStorage.setItem(deviceStorageKey, deviceId)
  }
  return deviceId
}

export const rememberPasskeyCredentialId = (credentialId: string) => {
  if (credentialId) localStorage.setItem(lastCredentialStorageKey, credentialId)
}

const getLastPasskeyCredentialId = () => localStorage.getItem(lastCredentialStorageKey) || undefined

export const isPasskeySupported = () =>
  typeof window !== 'undefined' &&
  window.isSecureContext &&
  typeof PublicKeyCredential !== 'undefined' &&
  Boolean(navigator.credentials)

export const getPasskeyErrorMessage = (error: unknown, fallback: string) => {
  const err = error as { name?: string; msg?: string; message?: string } | undefined
  if (err?.name === 'NotAllowedError') return '通行密钥操作已取消'
  if (
    err?.name === 'SecurityError' ||
    /relying party ID|rp id|well-known\/webauthn/i.test(String(err?.message || ''))
  ) {
    return '通行密钥域名不匹配：请在与站点域名一致的 HTTPS 地址下操作，本地 localhost 无法绑定测试环境的通行密钥'
  }
  return err?.msg || err?.message || fallback
}

export const getPasskeyAssertion = async (
  options:
    | PublicKeyCredentialRequestOptionsJSON
    | { publicKey?: PublicKeyCredentialRequestOptionsJSON },
  mediation?: CredentialMediationRequirement
): Promise<PasskeyCredentialPayload> => {
  const publicKey = unwrapPublicKeyOptions(options)
  const allowCredentials =
    publicKey.allowCredentials?.map((descriptor) => ({
      ...descriptor,
      id: decodeBase64Url(descriptor.id)
    })) || []
  const lastCredentialId = getLastPasskeyCredentialId()
  // 无账号列表时带上本机上次成功的凭据，跳过「选择此设备上的账号」。
  if (!allowCredentials.length && lastCredentialId) {
    allowCredentials.push({ type: 'public-key', id: decodeBase64Url(lastCredentialId) })
  }
  const credential = (await navigator.credentials.get({
    mediation,
    publicKey: {
      ...publicKey,
      challenge: decodeBase64Url(publicKey.challenge),
      allowCredentials: allowCredentials.length ? allowCredentials : undefined
    }
  })) as PublicKeyCredential | null

  if (!credential || !(credential.response instanceof AuthenticatorAssertionResponse)) {
    throw new Error('未获取到通行密钥凭据')
  }

  return toWebAuthnCredentialJSON(credential)
}

export const createPasskeyCredential = async (
  options:
    | PublicKeyCredentialCreationOptionsJSON
    | { publicKey?: PublicKeyCredentialCreationOptionsJSON }
): Promise<PasskeyCredentialPayload> => {
  const publicKey = unwrapPublicKeyOptions(options)
  const credential = (await navigator.credentials.create({
    publicKey: {
      rp: publicKey.rp,
      user: {
        id: decodeBase64Url(publicKey.user.id),
        name: publicKey.user.name,
        displayName: publicKey.user.displayName
      },
      challenge: decodeBase64Url(publicKey.challenge),
      pubKeyCredParams: publicKey.pubKeyCredParams,
      timeout: publicKey.timeout,
      authenticatorSelection: publicKey.authenticatorSelection,
      attestation: publicKey.attestation,
      excludeCredentials: publicKey.excludeCredentials?.map((descriptor) => ({
        ...descriptor,
        id: decodeBase64Url(descriptor.id)
      }))
    }
  })) as PublicKeyCredential | null

  if (!credential || !(credential.response instanceof AuthenticatorAttestationResponse)) {
    throw new Error('未创建通行密钥凭据')
  }
  return toWebAuthnCredentialJSON(credential)
}

/** go-webauthn 解析的是浏览器 PublicKeyCredential JSON，不是服务端 Credential 存库结构。 */
const toWebAuthnCredentialJSON = (credential: PublicKeyCredential): PasskeyCredentialPayload => {
  const toJSON = (credential as PublicKeyCredential & { toJSON?: () => PasskeyCredentialPayload })
    .toJSON
  if (typeof toJSON === 'function') {
    return toJSON.call(credential)
  }

  const response = credential.response
  const payload: PasskeyCredentialPayload = {
    id: credential.id,
    rawId: encodeBase64Url(credential.rawId) || '',
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment || undefined,
    clientExtensionResults: credential.getClientExtensionResults?.() || {},
    response: {
      clientDataJSON: encodeBase64Url(response.clientDataJSON) || ''
    }
  }

  if (response instanceof AuthenticatorAttestationResponse) {
    payload.response.attestationObject = encodeBase64Url(response.attestationObject) || ''
    payload.response.transports = response.getTransports?.()
  } else if (response instanceof AuthenticatorAssertionResponse) {
    payload.response.authenticatorData = encodeBase64Url(response.authenticatorData) || ''
    payload.response.signature = encodeBase64Url(response.signature) || ''
    payload.response.userHandle = encodeBase64Url(response.userHandle)
  }

  return payload
}
