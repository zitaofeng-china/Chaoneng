import request from '@/axios'
import type {
  UserInfoResponse,
  PasswordLoginParams,
  VerifyCodeLoginParams,
  ChangePasswordParams,
  CaptchaParams,
  EmailCodeParams,
  PhoneCodeParams,
  LoginResponse
} from './types'
import { encryptAESCTR } from '@/utils/encrypt'

interface RoleParams {
  roleName: string
}

export const loginOutApi = (): Promise<IResponse> => {
  return request.get({ url: '/mock/user/loginOut' })
}

export const getAdminRoleApi = (
  params: RoleParams
): Promise<IResponse<AppCustomRouteRecordRaw[]>> => {
  return request.get({ url: '/mock/role/list', params })
}

export const getTestRoleApi = (params: RoleParams): Promise<IResponse<string[]>> => {
  return request.get({ url: '/mock/role/list2', params })
}

/**
 * 账号密码登录
 * @param data 登录参数
 */
export const passwordLoginApi = (
  data: PasswordLoginParams & { verify_code?: string; code_id?: string }
): Promise<IResponse<LoginResponse>> => {
  // 整体序列化加密，iv 拼接在密文前16位
  const encrypted = encryptAESCTR(JSON.stringify(data))
  return request.post({ url: '/v1/login', data: { data: encrypted } })
}

/**
 * 账号验证码登录
 * @param data 登录参数
 */
export const verifyCodeLoginApi = (
  data: VerifyCodeLoginParams
): Promise<IResponse<LoginResponse>> => {
  return request.post({ url: '/v1/user/verify/login', data })
}

/**
 * 退出登录
 */
export const logoutApi = (): Promise<IResponse> => {
  return request.post({ url: '/v1/logout' })
}

// 修改密码相关API
/**
 * 重置账号
 * @param data 重置账号参数
 */
export const changePasswordApi = (data: ChangePasswordParams): Promise<IResponse> => {
  return request.post({ url: '/v1/reset', data })
}

// 验证码相关API
/**
 * 发送邮箱验证码
 * @param data 发送验证码参数
 */
export const sendEmailCodeApi = (data: EmailCodeParams): Promise<IResponse> => {
  const { email, username } = data
  return request.get({ url: '/v1/captcha', params: { email, ...(username ? { username } : {}) } })
}

/**
 * 发送手机验证码
 * @param data 发送验证码参数
 */
export const sendPhoneCodeApi = (data: PhoneCodeParams): Promise<IResponse> => {
  return request.post({ url: '/v1/user/phone/code', data })
}

/**
 * 获取图形验证码
 */
export const getCaptchaApi = (
  params: CaptchaParams
): Promise<IResponse<{ id: string; data: string }>> => {
  return request.get({ url: '/v1/captcha', params })
}

/**
 * 获取用户信息
 */
export const getUserInfoApi = (): Promise<IResponse<UserInfoResponse>> => {
  return request.get({ url: '/v2/manage/user/use_info' })
}

/**
 * 获取管理账户谷歌动态验证码 key_url
 * 接口返回 otpauth://totp/... 字符串，前端用于生成二维码
 */
export const getGoogleKeyUrlApi = (): Promise<IResponse<string>> => {
  return request.get({ url: '/v1/key_url' })
}

/**
 * 更新管理账户谷歌动态验证码 key_url
 */
export const updateGoogleKeyUrlApi = (): Promise<IResponse<string>> => {
  return request.put({ url: '/v1/key_url' })
}
