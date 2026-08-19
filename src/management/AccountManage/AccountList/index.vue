<template>
  <div class="app-container">
    <ContentWrap class="account-info-card">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold">账户信息</h2>
        <ElButtonGroup v-if="userData.id">
          <ElButton type="primary" @click="openPasswordDialog">修改密码</ElButton>
          <ElButton type="success" @click="openRechargeDialog">充值</ElButton>
          <ElButton type="warning" @click="handleRechargeRecord">充值记录</ElButton>
          <ElButton type="danger" @click="handleDeductionRecord">扣款记录</ElButton>
        </ElButtonGroup>
        <ElButton v-else type="primary" :loading="loading" @click="reloadAccountInfo"
          >刷新</ElButton
        >
      </div>
      <ElDivider />

      <div v-if="loading" class="loading-container py-10">
        <ElSkeleton :rows="5" animated />
      </div>

      <Descriptions v-else :column="1" :schema="accountSchema" :data="userData" />
    </ContentWrap>

    <!-- 修改密码弹窗 -->
    <Dialog v-model="passwordDialogVisible" title="修改密码" width="600px">
      <div class="pw-reset-container">
        <h3 class="text-lg font-bold mb-4">账户信息</h3>
        <ElDescriptions :column="1" border label-width="120px">
          <ElDescriptionsItem label="账户ID">{{ userData.id }}</ElDescriptionsItem>
          <ElDescriptionsItem label="账户名">{{ userData.username }}</ElDescriptionsItem>
        </ElDescriptions>

        <ElForm
          ref="resetFormRef"
          :model="resetForm"
          :rules="resetRules"
          label-position="top"
          class="mt-4"
        >
          <ElFormItem prop="email" label="邮箱">
            <ElInput v-model="resetForm.email" disabled />
          </ElFormItem>

          <!-- 验证码 -->
          <ElFormItem prop="code" label="验证码">
            <div class="flex">
              <ElInput v-model="resetForm.code" placeholder="请输入验证码" />
              <ElButton
                type="primary"
                class="ml-2 w-[120px]"
                :disabled="isCounting"
                @click="handleSendCodeClick"
              >
                {{ isCounting ? `${countdown}秒` : '获取验证码' }}
              </ElButton>
            </div>
          </ElFormItem>

          <!-- 新密码 -->
          <ElFormItem prop="password" label="新密码">
            <ElInput
              v-model="resetForm.password"
              type="password"
              placeholder="请输入6-20位且不能为纯数字的密码"
              show-password
            />
          </ElFormItem>

          <!-- 确认密码 -->
          <ElFormItem prop="confirmPassword" label="确认密码">
            <ElInput
              v-model="resetForm.confirmPassword"
              type="password"
              placeholder="请再次输入6-20位且不能为纯数字的密码"
              show-password
            />
          </ElFormItem>
        </ElForm>
      </div>

      <template #footer>
        <div class="flex justify-end">
          <ElButton @click="passwordDialogVisible = false">取消</ElButton>
          <ElButton type="primary" :loading="submitting" @click="handleUpdatePassword"
            >确认</ElButton
          >
        </div>
      </template>
    </Dialog>

    <!-- 充值弹窗 -->
    <Dialog v-model="rechargeDialogVisible" title="账户充值" width="600px">
      <div v-if="userData.address">
        <ElDescriptions :column="1" border label-width="120px">
          <ElDescriptionsItem label="账户ID">{{ userData.id }}</ElDescriptionsItem>
          <ElDescriptionsItem label="账户名">{{ userData.username }}</ElDescriptionsItem>
          <ElDescriptionsItem label="TRX余额">{{
            formatTrx(userData.trx_balance)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="收款地址">
            <div class="flex items-center">
              <div class="truncate mr-2">{{ userData.address }}</div>
              <ElButton type="primary" size="small" @click="copyAddress">复制</ElButton>
            </div>
          </ElDescriptionsItem>
        </ElDescriptions>

        <div v-if="qrCodeDataUrl" class="mt-4 text-center">
          <div class="font-bold mb-2">扫描二维码充值</div>
          <img :src="qrCodeDataUrl" alt="收款二维码" class="recharge-qrcode" />
          <div class="flex items-center justify-center mt-2">
            <Icon icon="cryptocurrency-color:trx" :size="24" />
            <div class="text-sm text-gray-500">（可转入大于 0.01 TRX 或 USDT 的任意金额）</div>
          </div>
          <div class="mt-1 text-sm text-gray-500"
            >支持USDT，汇率1USDT ≈ {{ usdtExchangeRate }} TRX</div
          >
        </div>
      </div>
      <div v-else class="py-4 text-center text-red-500"> 充值地址已分配完毕，请联系客服处理 </div>
    </Dialog>
    <!-- 充值记录弹窗 -->
    <RechargeRecordDialog
      ref="rechargeRecordDialogRef"
      :account-id="userData.id || 0"
      width="1200"
    />

    <!-- 扣款记录弹窗 -->
    <DeductionRecordDialog ref="deductionRecordDialogRef" :account-id="userData.id || 0" />
  </div>
</template>

<script setup lang="tsx">
import { ref, onMounted, onUnmounted, computed, reactive } from 'vue'
import {
  ElButton,
  ElForm,
  ElFormItem,
  ElInput,
  ElDescriptions,
  ElDescriptionsItem,
  ElDivider,
  ElSkeleton,
  ElButtonGroup
} from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { Dialog } from '@/components/Dialog'
import { Descriptions } from '@/components/Descriptions'
import type { DescriptionsSchema } from '@/components/Descriptions'
import { UnixTime } from '@/components/UnixTime'
import { v1GetAccountDetail, v1GetAddressList } from '@/api/management/AccountManage/AccountList'
import { v1GetSystemPrice } from '@/api/management/BotManage/BotList'
import { useValidator } from '@/hooks/web/useValidator'
import RechargeRecordDialog from './components/RechargeRecordDialog.vue'
import DeductionRecordDialog from './components/DeductionRecordDialog.vue'
import { useClipboard } from '@/hooks/web/useClipboard'
import { changePasswordApi, sendEmailCodeApi } from '@/api/common/login'
import { debounce } from 'lodash-es'
import { useUserStore } from '@/store/modules/user'
import QRCode from 'qrcode'
import {
  handleErrorMessage,
  handleSuccessMessage,
  handleWarningMessage
} from '@/utils/messageHelper'
import { formatRechargeMetricNumber } from '@/utils/rechargeOrder'
import { getTrxUsdtTickerPrice } from '@/api/common/ticker'

// 表单校验
const { required, passwordPolicy } = useValidator()

// 获取 user store 实例 (移除 router，因为 logout action 通常会处理跳转)
const userStore = useUserStore()

const rechargeRecordDialogRef = ref<InstanceType<typeof RechargeRecordDialog> | null>(null)
const deductionRecordDialogRef = ref<InstanceType<typeof DeductionRecordDialog> | null>(null)

// 当前账户数据
const userData = ref<Record<string, any>>({})
const loading = ref(false)
const submitting = ref(false)

// 弹窗状态
const passwordDialogVisible = ref(false)
const rechargeDialogVisible = ref(false)

// 收款地址生成的二维码 DataURL
const qrCodeDataUrl = ref('')
const usdtExchangeRate = ref('-')

const ensureAccountReady = (message: string) => {
  if (!userData.value.id) {
    handleWarningMessage(message)
    return false
  }
  return true
}

const resetPasswordFormState = () => {
  resetForm.code = ''
  resetForm.password = ''
  resetForm.confirmPassword = ''
  resetForm.email = userData.value.email || ''
}

const toFiniteNumber = (value?: string | number | null) => {
  if (value === undefined || value === null || value === '') return undefined
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

const updateUsdtExchangeRate = (
  systemUsdtToTrxRate?: string | number | null,
  trxUsdtPrice?: string | number | null
) => {
  const systemRate = toFiniteNumber(systemUsdtToTrxRate)
  const marketPrice = toFiniteNumber(trxUsdtPrice)

  if (systemRate === undefined || marketPrice === undefined || marketPrice <= 0) {
    usdtExchangeRate.value = '-'
    return
  }

  const calculatedRate = (1 / marketPrice) * (1 - systemRate)
  usdtExchangeRate.value = formatRechargeMetricNumber(calculatedRate, 6)
}

// 根据收款地址生成二维码
const generateQrCode = async (address: string) => {
  if (!address) {
    qrCodeDataUrl.value = ''
    return
  }
  try {
    qrCodeDataUrl.value = await QRCode.toDataURL(address, {
      width: 200,
      margin: 2,
      errorCorrectionLevel: 'M'
    })
  } catch (error) {
    handleErrorMessage(error, '生成充值二维码失败')
    qrCodeDataUrl.value = ''
  }
}

// 账户信息显示Schema
const accountSchema: DescriptionsSchema[] = [
  { field: 'id', label: '账户ID' },
  { field: 'username', label: '账户名' },
  {
    field: 'trx_balance',
    label: 'TRX余额',
    slots: {
      default: (data: any) => <span>{formatTrx(data.trx_balance)}</span>
    }
  },
  {
    field: 'created_at',
    label: '创建时间',
    slots: {
      default: (data: any) => <UnixTime timestamp={data.created_at} />
    }
  },
  {
    field: 'updated_at',
    label: '更新时间',
    slots: {
      default: (data: any) => <UnixTime timestamp={data.updated_at} />
    }
  }
]

// 格式化TRX数量
const formatTrx = (value: number | string) => {
  if (value === undefined || value === null || value === '') return '暂无'
  const num = Number(value)
  if (isNaN(num)) return `${value} TRX`
  return `${num.toFixed(2)} TRX`
}

// API 封装 - 获取账户信息
const fetchAccountList = async (params: any) => {
  loading.value = true

  try {
    const response = await v1GetAccountDetail(params)

    if (response && response.data) {
      userData.value = response.data
    } else {
      handleWarningMessage('获取账户信息失败，返回数据为空')
      userData.value = {}
    }
  } catch (error) {
    handleErrorMessage(error, '获取账户信息失败')
    userData.value = {}
  } finally {
    loading.value = false
  }
}

const reloadAccountInfo = async () => {
  await fetchAccountList({})
}

// ========== 密码修改相关 ==========
const resetFormRef = ref()

// 重置密码表单
const resetForm = reactive({
  email: '',
  code: '',
  password: '',
  confirmPassword: ''
})

// 表单校验规则
const resetRules = computed(() => {
  return {
    code: [{ required: true, message: '请输入验证码', trigger: 'blur' }],
    password: [{ required: true, message: '请输入新密码', trigger: 'blur' }, passwordPolicy()],
    confirmPassword: [
      { required: true, message: '请再次输入新密码', trigger: 'blur' },
      passwordPolicy(),
      {
        validator: (rule, value, callback) => {
          if (value !== resetForm.password) {
            callback(new Error('两次输入密码不一致'))
          } else {
            callback()
          }
        },
        trigger: 'blur'
      }
    ]
  }
})

// 倒计时相关
const countdown = ref(0)
const isCounting = computed(() => countdown.value > 0)
let timer: number | null = null

// 开始倒计时
const startCountdown = () => {
  countdown.value = 60
  timer = window.setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer!)
      timer = null
    }
  }, 1000)
}

// 实际执行 API 请求的防抖函数
const debouncedApiCall = debounce(async () => {
  try {
    // 发送邮箱验证码
    await sendEmailCodeApi({
      email: resetForm.email,
      username: userData.value.username,
      channel: 'change_passwd'
    })

    handleSuccessMessage('验证码已发送到邮箱')
  } catch (error) {
    handleErrorMessage(error, '发送验证码失败')
    resetCountdown()
  }
}, 1000)

// 重置倒计时的辅助函数
const resetCountdown = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  countdown.value = 0 // 这会使 isCounting 变为 false，按钮重新启用
}

// 按钮点击时触发的函数
const handleSendCodeClick = () => {
  if (isCounting.value) {
    return
  }
  if (!resetForm.email) {
    handleWarningMessage('邮箱地址为空，无法发送验证码')
    return
  }

  startCountdown()
  debouncedApiCall()
}

// 打开修改密码弹窗
const openPasswordDialog = () => {
  if (!ensureAccountReady('账户信息不完整，请刷新页面后重试')) {
    return
  }
  if (!userData.value.email) {
    handleWarningMessage('账户邮箱信息缺失，无法修改密码')
    return
  }

  resetPasswordFormState()
  resetFormRef.value?.clearValidate()
  passwordDialogVisible.value = true
}

const validateResetForm = async () => {
  if (!resetFormRef.value) {
    return false
  }

  return await new Promise<boolean>((resolve) => {
    resetFormRef.value.validate((valid: boolean) => resolve(valid))
  })
}

// 处理修改密码
const handleUpdatePassword = async () => {
  if (submitting.value) return
  if (!ensureAccountReady('账户信息不完整，无法修改密码')) {
    return
  }

  const valid = await validateResetForm()
  if (!valid) return

  submitting.value = true

  try {
    const params = {
      email: resetForm.email,
      password: resetForm.password,
      verify_code: resetForm.code
    }

    await changePasswordApi(params)
    handleSuccessMessage('密码修改成功')
    passwordDialogVisible.value = false
    await userStore.logout()
  } catch (error) {
    handleErrorMessage(error, '修改密码失败')
  } finally {
    submitting.value = false
  }
}

// 打开充值弹窗
const openRechargeDialog = async () => {
  if (!ensureAccountReady('账户信息不完整，请刷新页面后重试')) {
    return
  }

  try {
    const [addressResult, priceResult, tickerPriceResult] = await Promise.allSettled([
      v1GetAddressList({
        agent_id: Number(userData.value.id),
        kind: 1,
        current_page: 1,
        page_size: 1
      }),
      v1GetSystemPrice(),
      getTrxUsdtTickerPrice()
    ])

    if (addressResult.status !== 'fulfilled') {
      handleErrorMessage(addressResult.reason, '获取充值地址失败')
      return
    }

    const address = addressResult.value?.data?.list?.[0]?.address || ''
    userData.value = {
      ...userData.value,
      address
    }

    if (priceResult.status === 'fulfilled' && tickerPriceResult.status === 'fulfilled') {
      updateUsdtExchangeRate(priceResult.value?.data?.usdt_2_trx, tickerPriceResult.value)
    } else {
      updateUsdtExchangeRate(undefined, undefined)
    }

    await generateQrCode(address)
    rechargeDialogVisible.value = true

    if (!address) {
      handleWarningMessage('充值地址已分配完毕，请联系客服处理')
    }
  } catch (error) {
    handleErrorMessage(error, '获取充值地址失败')
  }
}

// 充值记录 - 打开充值记录弹窗
const handleRechargeRecord = () => {
  if (!ensureAccountReady('账户信息不完整，请刷新页面后重试')) {
    return
  }

  rechargeRecordDialogRef.value?.open(userData.value.id, userData.value.username || '')
}

// 扣款记录 - 打开扣款记录弹窗
const handleDeductionRecord = () => {
  if (!ensureAccountReady('账户信息不完整，请刷新页面后重试')) {
    return
  }

  deductionRecordDialogRef.value?.open(userData.value.id, userData.value.username || '')
}

// 复制地址
const { copy } = useClipboard()
const copyAddress = () => {
  if (!userData.value.address) {
    handleWarningMessage('收款地址为空，无法复制')
    return
  }

  copy(userData.value.address)
  handleSuccessMessage('地址复制成功')
}

// 页面加载时获取账户信息
onMounted(() => {
  reloadAccountInfo()
})

onUnmounted(() => {
  resetCountdown()
  debouncedApiCall.cancel()
})
</script>

<style scoped>
.loading-container {
  display: flex;
  min-height: 200px;
  align-items: center;
  justify-content: center;
}

.pw-reset-container {
  width: 100%;
}

/* 给账户信息卡片添加阴影 */
.account-info-card :deep(.el-card) {
  box-shadow: 0 2px 12px 0 rgb(0 0 0 / 10%);
}

/* 收款二维码 */
.recharge-qrcode {
  width: 200px;
  height: 200px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}
</style>
