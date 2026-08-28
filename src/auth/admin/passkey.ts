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

type UAData = {
  platform?: string
  getHighEntropyValues?: (hints: string[]) => Promise<{
    model?: string
    platform?: string
    platformVersion?: string
  }>
}

const majorVersion = (value?: string) => {
  const major = String(value || '').split(/[._]/)[0]
  return /^\d+$/.test(major) ? major : ''
}

/** 仅生成可编辑的候选名称，不可用作设备信任或风控依据。只取系统主版本。 */
export const suggestPasskeyDisplayName = async () => {
  const uaData = (navigator as Navigator & { userAgentData?: UAData }).userAgentData
  const hints = await uaData
    ?.getHighEntropyValues?.(['platform', 'platformVersion', 'model'])
    .catch(() => undefined)
  const platform = hints?.platform ?? uaData?.platform ?? ''
  const platformVersion = hints?.platformVersion?.trim()
  const model = hints?.model?.trim()
  const ua = navigator.userAgent

  if (platform === 'Windows' || /Windows NT/.test(ua)) {
    if (platformVersion) {
      const major = majorVersion(platformVersion)
      if (Number(major) >= 13) return '我的 Windows 11'
      if (major === '10') {
        const chromeVer = Number(ua.match(/Chrome\/(\d+)/)?.[1] || 0)
        return chromeVer >= 110 ? '我的 Windows 10' : '我的 Windows 10/11'
      }
      if (major) return `我的 Windows ${major}`
    }
    const nt = parseFloat(ua.match(/Windows NT ([\d.]+)/)?.[1] || '')
    if (nt >= 10) return '我的 Windows 10/11'
    if (nt >= 6.3) return '我的 Windows 8.1'
    if (nt >= 6.2) return '我的 Windows 8'
    if (nt >= 6.1) return '我的 Windows 7'
    return '我的 Windows 设备'
  }

  if (platform === 'Android' || /Android/.test(ua)) {
    const version = majorVersion(ua.match(/Android ([\d.]+)/)?.[1])
    if (model && version) return `我的${model}（Android ${version}）`.slice(0, 32)
    if (model) return `我的${model}`.slice(0, 32)
    if (version) return `我的 Android ${version}`
    return '我的 Android 设备'
  }

  if (/iPhone/.test(ua)) {
    const version = majorVersion(ua.match(/OS ([\d_]+)/)?.[1])
    return version ? `我的 iPhone（iOS ${version}）` : '我的 iPhone'
  }

  if (/iPad/.test(ua)) {
    const version = majorVersion(ua.match(/OS ([\d_]+)/)?.[1])
    return version ? `我的 iPad（iOS ${version}）` : '我的 iPad'
  }

  if (/Macintosh/.test(ua)) {
    const raw = ua.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, '.')
    const major = majorVersion(raw)
    return major ? `我的 macOS ${major}` : '我的 Mac'
  }

  if (model) return `我的 ${model}`.slice(0, 32)
  return '我的此设备'
}

type PasskeyErrorLike = {
  name?: string
  msg?: string
  message?: string
  response?: { data?: { msg?: string; message?: string } }
}

const pickPasskeyErrorText = (error: unknown) => {
  const err = error as PasskeyErrorLike | undefined
  return String(
    err?.msg || err?.message || err?.response?.data?.msg || err?.response?.data?.message || ''
  ).trim()
}

const hasLatinSentence = (text: string) =>
  /[A-Za-z]{4,}(?:[\s_-]+[A-Za-z]{3,})+/.test(text) || /[A-Za-z]{10,}/.test(text)

const PASSKEY_ERROR_ZH: Array<[RegExp, string]> = [
  [/notallowed|the operation was aborted|user cancelled|abort error/i, '通行密钥操作已取消'],
  [
    /令牌无效或已过期|(?:token|ceremony|challenge|session).*(?:invalid|expired)|(?:invalid|expired).*(?:token|ceremony|challenge|session)/i,
    '通行密钥验证已过期，请重新点击登录'
  ],
  [
    /failed to lookup client-side discoverable credential/i,
    '未找到可用的通行密钥，请重试或使用密码登录'
  ],
  [
    /error validating the authenticator response|authenticator response did not pass validation/i,
    '通行密钥验证失败，请确认使用已绑定的密钥后重试'
  ],
  [
    /unable to find the credential|credential (?:id )?is not|unknown credential|no credentials/i,
    '本机通行密钥未在该账号登记，请改用密码登录或重新绑定'
  ],
  [/sessiondata.*userid|user\.id do not match|user (?:id )?mismatch/i, '通行密钥与当前账号不匹配'],
  [/proof of user verification/i, '需要完成指纹、面容或锁屏验证'],
  [/proof of user presence/i, '需要在本机确认通行密钥操作'],
  [
    /relying party|rp id|well-known\/webauthn/i,
    '通行密钥域名不匹配：请在与站点域名一致的 HTTPS 地址下操作，本地 localhost 无法绑定测试环境的通行密钥'
  ],
  [/invalid origin|origin not allowed/i, '当前页面来源不被允许，请使用正式站点登录'],
  [
    /invalid attestation|error parsing registration|error creating authenticator/i,
    '通行密钥绑定失败，请重试'
  ],
  [/error (?:getting|parsing) assertion/i, '通行密钥签名失败，请重试']
]

export const getPasskeyErrorMessage = (error: unknown, fallback: string) => {
  const err = error as PasskeyErrorLike | undefined
  if (err?.name === 'NotAllowedError') return '通行密钥操作已取消'
  if (err?.name === 'InvalidStateError') return '该通行密钥已在本机登记，请直接登录或换用其他设备'
  if (err?.name === 'NotSupportedError') return '当前浏览器不支持通行密钥'
  if (err?.name === 'ConstraintError') return '当前设备不满足通行密钥要求'
  if (err?.name === 'TimeoutError') return '通行密钥验证超时，请重试'
  if (err?.name === 'SecurityError') {
    return '通行密钥域名不匹配：请在与站点域名一致的 HTTPS 地址下操作，本地 localhost 无法绑定测试环境的通行密钥'
  }

  const raw = pickPasskeyErrorText(error)
  if (!raw) return fallback

  for (const [pattern, zh] of PASSKEY_ERROR_ZH) {
    if (pattern.test(raw) || pattern.test(err?.name || '')) return zh
  }

  if (hasLatinSentence(raw)) return fallback
  return raw
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
    clientExtensionResults: (credential.getClientExtensionResults?.() || {}) as Record<
      string,
      unknown
    >,
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
