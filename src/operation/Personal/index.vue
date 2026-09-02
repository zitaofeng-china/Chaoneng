<script setup lang="ts">
import { computed, onActivated, onMounted, ref, watch } from 'vue'
import { ElButton, ElMessage, ElMessageBox, ElSkeleton, ElTag } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { Icon } from '@/components/Icon'
import { v1GetAdminMe } from '@/api/common/login'
import {
  createAdminPasskey,
  createPasskeyChallenge,
  deleteAdminPasskey,
  listAdminLoginLogs,
  listAdminPasskeys
} from '@/auth/admin/api'
import { buildIpLookupUrl, lookupIpLocations, resolveIpLocationSync } from '@/auth/admin/ipLocation'
import type { AdminLoginLogView } from '@/auth/admin/loginLogs'
import {
  createPasskeyCredential,
  getPasskeyDeviceId,
  getPasskeyErrorMessage,
  hasLocalNativePasskey,
  isPasskeySupported,
  LOCAL_NATIVE_PASSKEY_EXISTS_MESSAGE,
  rememberPasskeyCredentialId,
  suggestPasskeyDisplayName
} from '@/auth/admin/passkey'
import {
  ADMIN_TOTP_ENABLED,
  buildEmailCodeVerification,
  getAdminSecurity,
  type AdminMe,
  type AdminPasskey
} from '@/auth/admin/types'
import { useAdminAuthStore } from '@/store/modules/adminAuth'
import { useUserStore } from '@/store/modules/user'
import PasskeyVerifyDialog from './components/PasskeyVerifyDialog.vue'
import {
  calcSecurityScore,
  formatLoginDevice,
  formatPasskeyTime,
  formatRelativeTime,
  getPreAuthWarning,
  latestPasskeyUsedAt,
  loginStatusMeta,
  maskEmail
} from './helpers'

defineOptions({
  name: 'PersonalCenter'
})

const SCORE_RADIUS = 36
const SCORE_CIRCUMFERENCE = 2 * Math.PI * SCORE_RADIUS

const authStore = useAdminAuthStore()
const userStore = useUserStore()
const ready = ref(false)
const verifyVisible = ref(false)
const verifySubmitting = ref(false)
const verifyAction = ref<'remove' | 'set'>('set')
const defaultPasskeyName = ref('')
const me = ref<AdminMe>()
const passkeys = ref<AdminPasskey[]>([])
const loginLogs = ref<AdminLoginLogView[]>([])
const ipLocations = ref<Record<string, string>>({})
const selectedPasskeyId = ref('')
const supported = isPasskeySupported()

const username = computed(() => me.value?.username || userStore.getUserInfo?.username || '')
const email = computed(() => String(me.value?.email || '').trim())
const security = computed(() => getAdminSecurity(me.value))
const hasPasskeys = computed(() => passkeys.value.length > 0 || security.value.passkey_count > 0)
const currentDeviceHasPasskey = computed(() => hasLocalNativePasskey(passkeys.value))
const selectedPasskey = computed(
  () =>
    passkeys.value.find((item) => String(item.id) === selectedPasskeyId.value) || passkeys.value[0]
)
const passkeyLastLoginText = computed(() => {
  if (!passkeys.value.length) return ''
  const latest = latestPasskeyUsedAt(passkeys.value)
  return latest ? formatPasskeyTime(latest) : '从未使用'
})
const score = computed(() =>
  calcSecurityScore({
    hasAccount: Boolean(username.value || me.value?.id),
    hasEmail: Boolean(email.value),
    hasPasskey: hasPasskeys.value
  })
)
const preAuthWarning = computed(() =>
  getPreAuthWarning({
    hasPasskey: hasPasskeys.value,
    totpAvailable: ADMIN_TOTP_ENABLED,
    totpEnabled: security.value.totp_enabled
  })
)
const displayLogs = computed(() =>
  loginLogs.value.map((item) => ({
    ...item,
    deviceText: formatLoginDevice({
      ...item,
      location: ipLocations.value[item.ip] || item.location
    }),
    timeText: formatRelativeTime(item.time),
    statusMeta: loginStatusMeta(item.status)
  }))
)
const scoreOffset = computed(() => SCORE_CIRCUMFERENCE * (1 - score.value / 100))
const scoreTone = computed(() => {
  if (score.value >= 80) return 'success'
  if (score.value >= 50) return 'warning'
  return 'danger'
})

const finish = (message: string) => {
  verifyVisible.value = false
  authStore.clearSession()
  userStore.reset()
  ElMessage.success(message)
}

const fillLoginLocations = async (logs: AdminLoginLogView[]) => {
  const next = { ...ipLocations.value }
  for (const item of logs) {
    const sync = resolveIpLocationSync(item.ip)
    if (sync) next[item.ip] = sync
  }
  ipLocations.value = next
  const map = await lookupIpLocations(logs.map((item) => item.ip))
  ipLocations.value = { ...ipLocations.value, ...map }
}

const load = async () => {
  const token = authStore.getAccessToken
  if (!token) {
    ready.value = true
    return
  }

  try {
    const res = await v1GetAdminMe()
    me.value = res.data
  } catch {
    if (!me.value) me.value = undefined
  }

  try {
    const list = await listAdminPasskeys(token)
    passkeys.value = list
    selectedPasskeyId.value = list[0] ? String(list[0].id) : selectedPasskeyId.value
    if (!list.length && getAdminSecurity(me.value).passkey_count > 0) {
      ElMessage.warning('未获取到通行密钥列表，请稍后重试')
    }
  } catch (error: unknown) {
    if (!passkeys.value.length) {
      selectedPasskeyId.value = ''
      ElMessage.error((error as { msg?: string } | undefined)?.msg || '通行密钥列表加载失败')
    }
  }

  try {
    loginLogs.value = await listAdminLoginLogs(token, { current_page: 1, page_size: 5 })
    void fillLoginLocations(loginLogs.value)
  } catch {
    if (!ready.value) loginLogs.value = []
  } finally {
    ready.value = true
  }
}

const blockAddOnThisDevice = async () => {
  verifyVisible.value = false
  await ElMessageBox.alert(LOCAL_NATIVE_PASSKEY_EXISTS_MESSAGE, '无法在本机添加', {
    type: 'warning',
    confirmButtonText: '知道了'
  }).catch(() => {})
}

const enablePasskey = async (payload: { email_code: string; name: string }) => {
  if (currentDeviceHasPasskey.value) {
    await blockAddOnThisDevice()
    return
  }
  const account = email.value.trim()
  if (!account) {
    ElMessage.warning('当前账号未绑定邮箱，请先设置邮箱')
    return
  }
  const challenge = await createPasskeyChallenge({
    purpose: 'set',
    account,
    email_code: payload.email_code
  })
  if (hasLocalNativePasskey(passkeys.value)) {
    await blockAddOnThisDevice()
    return
  }
  const credential = await createPasskeyCredential(
    challenge.options as Parameters<typeof createPasskeyCredential>[0]
  )
  rememberPasskeyCredentialId(credential.id)
  const result = await createAdminPasskey(authStore.getAccessToken, {
    ceremony_id: challenge.ceremony_id,
    credential,
    name: payload.name,
    account,
    device_id: getPasskeyDeviceId(),
    email_code: payload.email_code
  })
  finish(result.msg || '通行密钥设置成功，请重新登录')
}

const disablePasskey = async (emailCode: string) => {
  const current = selectedPasskey.value
  const account = email.value
  if (!current) {
    ElMessage.warning('未获取到通行密钥列表，请稍后重试')
    return
  }
  if (!account) {
    ElMessage.warning('当前账号未绑定邮箱，请先设置邮箱')
    return
  }
  await deleteAdminPasskey(authStore.getAccessToken, current.id, {
    account,
    ...buildEmailCodeVerification(emailCode)
  })
  finish('通行密钥已删除，请重新登录')
}

const onVerifyConfirm = async (payload: { email_code: string; name: string }) => {
  if (verifySubmitting.value) return
  verifySubmitting.value = true
  try {
    if (verifyAction.value === 'set') {
      await enablePasskey(payload)
    } else {
      await disablePasskey(payload.email_code)
    }
  } catch (error: unknown) {
    if (error === 'cancel' || error === 'close') return
    const message = getPasskeyErrorMessage(error, '通行密钥操作失败')
    ElMessage[(error as { name?: string })?.name === 'NotAllowedError' ? 'info' : 'error'](message)
  } finally {
    verifySubmitting.value = false
  }
}

const openAddPasskey = async () => {
  if (verifySubmitting.value) return
  if (!supported) {
    ElMessage.warning('当前环境不支持通行密钥')
    return
  }
  if (currentDeviceHasPasskey.value) {
    await blockAddOnThisDevice()
    return
  }
  verifyAction.value = 'set'
  verifyVisible.value = true
}

watch(currentDeviceHasPasskey, (blocked) => {
  if (blocked && verifyAction.value === 'set') verifyVisible.value = false
})

const openRemovePasskey = async () => {
  if (!passkeys.value.length) {
    ElMessage.warning('未获取到通行密钥列表，请稍后重试')
    return
  }

  try {
    await ElMessageBox.confirm(
      `删除「${selectedPasskey.value?.name || '通行密钥'}」后，该密钥将无法用于登录，当前会话会立即退出。`,
      '确认删除通行密钥',
      {
        type: 'warning',
        confirmButtonText: '继续',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger'
      }
    )
    verifyAction.value = 'remove'
    verifyVisible.value = true
  } catch {
    /* 取消删除 */
  }
}

onMounted(() => {
  void suggestPasskeyDisplayName().then((name) => {
    if (!defaultPasskeyName.value) defaultPasskeyName.value = name.slice(0, 32)
  })
  load()
})

onActivated(() => {
  if (ready.value) load()
})
</script>

<template>
  <div class="account-security">
    <h2 class="account-security__title">个人中心</h2>
    <ElSkeleton v-if="!ready" animated :rows="10" />
    <template v-else>
      <div class="account-security__grid">
        <ContentWrap title="基础设置">
          <div class="basics">
            <div class="basics__main">
              <div class="info-row">
                <div class="info-row__icon">
                  <Icon icon="vi-mdi:account-circle-outline" :size="20" />
                </div>
                <div class="info-row__body">
                  <div class="info-row__label">
                    登录账号
                    <span v-if="username" class="info-row__ok">
                      <Icon icon="vi-mdi:check-circle" :size="14" />
                      已验证
                    </span>
                  </div>
                  <div class="info-row__value">{{ username || '—' }}</div>
                </div>
              </div>
              <div class="info-row">
                <div class="info-row__icon">
                  <Icon icon="vi-mdi:email-outline" :size="20" />
                </div>
                <div class="info-row__body">
                  <div class="info-row__label">
                    验证邮箱
                    <span v-if="email" class="info-row__ok">
                      <Icon icon="vi-mdi:check-circle" :size="14" />
                      已验证
                    </span>
                  </div>
                  <div class="info-row__value">{{ maskEmail(email) }}</div>
                </div>
              </div>
              <div class="info-row">
                <div class="info-row__icon">
                  <Icon icon="vi-mdi:fingerprint" :size="20" />
                </div>
                <div class="info-row__body">
                  <div class="info-row__label">
                    通行密钥
                    <span v-if="hasPasskeys" class="info-row__ok">
                      <Icon icon="vi-mdi:check-circle" :size="14" />
                      已验证
                    </span>
                  </div>
                  <div class="info-row__value">{{ hasPasskeys ? '已设置' : '未设置' }}</div>
                  <div v-if="passkeyLastLoginText" class="info-row__extra">
                    最后登录 {{ passkeyLastLoginText }}
                  </div>
                </div>
              </div>
              <div v-if="preAuthWarning" class="basics__warning">
                <Icon icon="vi-mdi:alert" :size="16" />
                <span>{{ preAuthWarning }}</span>
              </div>
            </div>
            <div class="score" :class="`is-${scoreTone}`">
              <div class="score__chart">
                <svg class="score__ring" viewBox="0 0 88 88" aria-hidden="true">
                  <circle class="score__track" cx="44" cy="44" :r="SCORE_RADIUS" />
                  <circle
                    class="score__bar"
                    cx="44"
                    cy="44"
                    :r="SCORE_RADIUS"
                    :stroke-dasharray="SCORE_CIRCUMFERENCE"
                    :stroke-dashoffset="scoreOffset"
                  />
                </svg>
                <div class="score__value">{{ score }}</div>
              </div>
              <div class="score__label">安全评分</div>
            </div>
          </div>
        </ContentWrap>

        <ContentWrap title="最近登录">
          <div v-if="!displayLogs.length" class="login-empty">暂无登录记录</div>
          <ul v-else class="login-list">
            <li v-for="item in displayLogs" :key="item.id" class="login-item">
              <div class="login-item__main">
                <div class="login-item__device">{{ item.deviceText }}</div>
                <div class="login-item__meta">
                  <a
                    v-if="item.ip"
                    class="login-item__ip"
                    :href="buildIpLookupUrl(item.ip)"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {{ item.ip }}
                  </a>
                  <span v-else>—</span>
                  <span>{{ item.timeText }}</span>
                </div>
              </div>
              <ElTag
                v-if="item.statusMeta.label"
                :type="item.statusMeta.type"
                size="small"
                effect="light"
              >
                {{ item.statusMeta.label }}
              </ElTag>
            </li>
          </ul>
        </ContentWrap>
      </div>

      <ContentWrap title="添加验证方法">
        <div class="method">
          <div class="method__main">
            <div class="method__icon">
              <Icon icon="vi-mdi:fingerprint" :size="22" />
            </div>
            <div class="method__body">
              <div class="method__title">通行密钥 (Passkey)</div>
              <p class="method__desc">使用指纹、面容、屏幕锁定或安全密钥，在本机完成身份验证。</p>
              <p class="method__hint">
                {{
                  currentDeviceHasPasskey
                    ? '本机已有通行密钥，无法再添加。多把密钥请换其他电脑、手机或安全密钥。'
                    : '同一台设备的浏览器原生通行密钥通常只能保存一把。多把密钥请换其他电脑、手机或安全密钥。'
                }}
              </p>
              <p v-if="passkeyLastLoginText" class="method__used">
                最后登录 {{ passkeyLastLoginText }}
              </p>
            </div>
          </div>
          <ElTag
            class="method__status"
            :type="hasPasskeys ? 'success' : 'info'"
            size="small"
            effect="light"
          >
            {{ hasPasskeys ? '已设置' : '未设置' }}
          </ElTag>
          <div class="method__actions">
            <span class="method__add" @click="openAddPasskey">
              <ElButton
                type="primary"
                plain
                :disabled="verifySubmitting || currentDeviceHasPasskey"
              >
                添加通行密钥
              </ElButton>
            </span>
            <ElButton
              type="danger"
              plain
              :disabled="verifySubmitting || !passkeys.length"
              @click="openRemovePasskey"
            >
              删除选中密钥
            </ElButton>
          </div>
        </div>
        <div class="passkey-panel">
          <p v-if="!passkeys.length" class="passkey-panel__empty">尚未登记通行密钥</p>
          <button
            v-for="item in passkeys"
            :key="String(item.id)"
            type="button"
            class="passkey-item"
            :class="{ 'is-active': String(item.id) === String(selectedPasskey?.id) }"
            @click="selectedPasskeyId = String(item.id)"
          >
            <span class="passkey-item__name">{{ item.name }}</span>
            <span class="passkey-item__meta">
              创建 {{ formatPasskeyTime(item.created_at, '—') }} · 最后登录
              {{ formatPasskeyTime(item.last_used_at) }}
            </span>
          </button>
        </div>
      </ContentWrap>
    </template>

    <PasskeyVerifyDialog
      v-model="verifyVisible"
      :action="verifyAction"
      :default-name="defaultPasskeyName"
      :email="email"
      :need-email="!email"
      :selected-name="selectedPasskey?.name"
      :submitting="verifySubmitting"
      @confirm="onVerifyConfirm"
    />
  </div>
</template>

<style lang="less" scoped>
.account-security {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.account-security__title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  line-height: 28px;
  color: var(--el-text-color-primary);
}

.account-security__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  gap: 16px;
}

.basics {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.basics__main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 14px;
}

.basics__warning {
  display: flex;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-color-warning-dark-2);
  background: var(--el-color-warning-light-9);
  border: 1px solid var(--el-color-warning-light-7);
  border-radius: 8px;
  gap: 8px;
  align-items: flex-start;
}

.info-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.info-row__icon {
  display: flex;
  margin-top: 2px;
  color: var(--el-text-color-secondary);
}

.info-row__body {
  min-width: 0;
}

.info-row__label {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.info-row__ok {
  display: inline-flex;
  font-size: 12px;
  color: var(--el-color-success);
  gap: 4px;
  align-items: center;
}

.info-row__value {
  margin-top: 4px;
  overflow: hidden;
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-row__extra {
  margin-top: 2px;
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
}

.score {
  position: relative;
  display: flex;
  width: 108px;
  flex-shrink: 0;
  flex-direction: column;
  align-items: center;
}

.score__chart {
  position: relative;
  width: 88px;
  height: 88px;
}

.score__ring {
  width: 88px;
  height: 88px;
}

.score__track,
.score__bar {
  fill: none;
  stroke-width: 8;
}

.score__track {
  stroke: var(--el-fill-color);
}

.score__bar {
  stroke-linecap: round;
  transform: rotate(-90deg);
  transform-origin: 44px 44px;
  transition: stroke-dashoffset 0.4s ease;
}

.score.is-success .score__bar {
  stroke: var(--el-color-success);
}

.score.is-warning .score__bar {
  stroke: var(--el-color-warning);
}

.score.is-danger .score__bar {
  stroke: var(--el-color-danger);
}

.score__value {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  line-height: 32px;
  color: var(--el-text-color-primary);
}

.score__label {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.login-empty {
  padding: 24px 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  text-align: center;
}

.login-list {
  display: flex;
  flex-direction: column;
  padding: 0;
  margin: 0;
  list-style: none;
  gap: 12px;
}

.login-item {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.login-item__main {
  min-width: 0;
}

.login-item__device {
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.login-item__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-top: 2px;
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
}

.login-item__ip {
  color: var(--el-color-primary);
  text-decoration: none;
  cursor: pointer;
}

.login-item__ip:hover {
  text-decoration: underline;
}

.method {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.method__main {
  display: flex;
  min-width: 0;
  flex: 1;
  gap: 12px;
  align-items: center;
}

.method__icon {
  display: flex;
  width: 40px;
  height: 40px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: 10px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
}

.method__body {
  min-width: 0;
  flex: 1;
}

.method__title {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
}

.method__desc {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 20px;
  color: var(--el-text-color-secondary);
}

.method__hint,
.method__used {
  margin: 2px 0 0;
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
}

.method__hint {
  color: var(--el-color-warning-dark-2);
}

.method__status {
  flex-shrink: 0;
}

.method__actions {
  display: flex;
  flex-wrap: wrap;
  flex-shrink: 0;
  gap: 8px;
  margin-left: auto;
  align-items: center;
  justify-content: flex-end;
}

.method__add {
  display: inline-flex;

  :deep(.el-button) {
    pointer-events: none;
  }
}

.passkey-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.passkey-panel__empty {
  padding: 10px 12px;
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  border-radius: 8px;
}

.passkey-item {
  display: flex;
  padding: 8px 12px;
  color: var(--el-text-color-primary);
  text-align: left;
  cursor: pointer;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  flex-direction: column;
  gap: 4px;
}

.passkey-item:hover {
  border-color: var(--el-color-primary-light-5);
}

.passkey-item.is-active {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary);
}

.passkey-item__name {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}

.passkey-item__meta {
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-secondary);
}

@media (width <= 900px) {
  .account-security__grid {
    grid-template-columns: 1fr;
  }

  .method__actions {
    width: 100%;
  }
}
</style>
