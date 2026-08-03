<template>
  <div class="app-container">
    <div
      v-loading="loading"
      class="price-cards-container"
      @focusin.capture="enableTwoDecimalEditMode"
      @keydown.capture="preventMoreThanTwoDecimalInput"
      @paste.capture="preventMoreThanTwoDecimalPaste"
    >
      <!-- 动态渲染代理卡片 -->
      <el-card v-for="agent in priceList" :key="agent.id" shadow="never" class="agent-card">
        <template #header>
          <div class="card-header">
            <div class="header-left">
              <span class="agent-level">{{ getAgentLevelName(agent.id) }}</span>
              <el-text type="info" size="small" class="update-time">
                最后更新：{{ formatTime(agent.id) }}
              </el-text>
            </div>
            <div class="header-actions">
              <template v-if="!editModeMap[agent.id]">
                <el-button size="default" :loading="refreshing" @click="handleRefresh">
                  刷新
                </el-button>
                <el-button
                  v-if="hasEditPermission"
                  type="primary"
                  size="default"
                  @click="handleEdit(agent.id)"
                >
                  修改
                </el-button>
              </template>
              <template v-else>
                <el-button size="default" @click="handleCancel(agent.id)"> 取消 </el-button>
                <el-button
                  type="primary"
                  size="default"
                  :loading="isAgentSavePending(agent.id)"
                  :disabled="!hasChanges(agent.id)"
                  @click="handleSave(agent.id)"
                >
                  保存
                </el-button>
              </template>
            </div>
          </div>
        </template>

        <div class="price-items-grid">
          <!-- 第一行：托管 - 即用能量 - 按时间 - 速充 - 闪兑 -->
          <div class="row-first">
            <!-- 托管 -->
            <div class="price-item-card">
              <div class="item-title">托管</div>
              <div class="item-content">
                <div class="time-row">
                  <div class="value-wrapper">
                    <span class="time-label">65k</span>
                    <el-input-number
                      v-if="editModeMap[agent.id]"
                      v-model="formDataMap[agent.id].hosting_65k"
                      :precision="2"
                      :step="0.1"
                      :min="0"
                      size="small"
                      controls-position="right"
                    />
                    <span v-else class="value-text">{{ formDataMap[agent.id].hosting_65k }}</span>
                    <span class="unit">TRX</span>
                  </div>
                </div>
                <div class="time-row">
                  <div class="value-wrapper">
                    <span class="time-label">131k</span>
                    <el-input-number
                      v-if="editModeMap[agent.id]"
                      v-model="formDataMap[agent.id].hosting_131k"
                      :precision="2"
                      :step="0.1"
                      :min="0"
                      size="small"
                      controls-position="right"
                    />
                    <span v-else class="value-text">{{ formDataMap[agent.id].hosting_131k }}</span>
                    <span class="unit">TRX</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 即用能量 -->
            <div class="price-item-card">
              <div class="item-title">即用能量</div>
              <div class="item-content single-input">
                <div class="value-wrapper">
                  <el-input-number
                    v-if="editModeMap[agent.id]"
                    v-model="formDataMap[agent.id].instant"
                    :precision="2"
                    :step="0.1"
                    :min="0"
                    size="small"
                    controls-position="right"
                  />
                  <span v-else class="value-text">{{ formDataMap[agent.id].instant }}</span>
                  <span class="unit">TRX</span>
                </div>
              </div>
            </div>

            <!-- 按时间 -->
            <div class="price-item-card time-card">
              <div class="item-title">按时间</div>
              <div class="item-content time-grid">
                <div class="time-row">
                  <div class="value-wrapper">
                    <span class="time-label">1小时</span>
                    <el-input-number
                      v-if="editModeMap[agent.id]"
                      v-model="formDataMap[agent.id].time_1h"
                      :precision="2"
                      :step="0.1"
                      :min="0"
                      size="small"
                      controls-position="right"
                    />
                    <span v-else class="value-text">{{ formDataMap[agent.id].time_1h }}</span>
                    <span class="unit">TRX</span>
                  </div>
                </div>
                <div class="time-row">
                  <div class="value-wrapper">
                    <span class="time-label">1天</span>
                    <el-input-number
                      v-if="editModeMap[agent.id]"
                      v-model="formDataMap[agent.id].time_1d"
                      :precision="2"
                      :step="0.1"
                      :min="0"
                      size="small"
                      controls-position="right"
                    />
                    <span v-else class="value-text">{{ formDataMap[agent.id].time_1d }}</span>
                    <span class="unit">TRX</span>
                  </div>
                </div>
                <div class="time-row">
                  <div class="value-wrapper">
                    <span class="time-label">3天</span>
                    <el-input-number
                      v-if="editModeMap[agent.id]"
                      v-model="formDataMap[agent.id].time_3d"
                      :precision="2"
                      :step="0.1"
                      :min="0"
                      size="small"
                      controls-position="right"
                    />
                    <span v-else class="value-text">{{ formDataMap[agent.id].time_3d }}</span>
                    <span class="unit">TRX</span>
                  </div>
                </div>
                <div class="time-row">
                  <div class="value-wrapper">
                    <span class="time-label">7天</span>
                    <el-input-number
                      v-if="editModeMap[agent.id]"
                      v-model="formDataMap[agent.id].time_7d"
                      :precision="2"
                      :step="0.1"
                      :min="0"
                      size="small"
                      controls-position="right"
                    />
                    <span v-else class="value-text">{{ formDataMap[agent.id].time_7d }}</span>
                    <span class="unit">TRX</span>
                  </div>
                </div>
                <div class="time-row">
                  <div class="value-wrapper">
                    <span class="time-label">15天</span>
                    <el-input-number
                      v-if="editModeMap[agent.id]"
                      v-model="formDataMap[agent.id].time_15d"
                      :precision="2"
                      :step="0.1"
                      :min="0"
                      size="small"
                      controls-position="right"
                    />
                    <span v-else class="value-text">{{ formDataMap[agent.id].time_15d }}</span>
                    <span class="unit">TRX</span>
                  </div>
                </div>
                <div class="time-row">
                  <div class="value-wrapper">
                    <span class="time-label">30天</span>
                    <el-input-number
                      v-if="editModeMap[agent.id]"
                      v-model="formDataMap[agent.id].time_30d"
                      :precision="2"
                      :step="0.1"
                      :min="0"
                      size="small"
                      controls-position="right"
                    />
                    <span v-else class="value-text">{{ formDataMap[agent.id].time_30d }}</span>
                    <span class="unit">TRX</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 速充 -->
            <div class="price-item-card quick-charge-card">
              <div class="item-title">速充</div>
              <div class="item-content single-input">
                <div class="value-wrapper">
                  <el-input-number
                    v-if="editModeMap[agent.id]"
                    v-model="formDataMap[agent.id].charge"
                    :precision="2"
                    :step="0.1"
                    :min="0"
                    size="small"
                    controls-position="right"
                  />
                  <span v-else class="value-text">{{ formDataMap[agent.id].charge }}</span>
                  <span class="unit">SUN</span>
                </div>
              </div>
            </div>

            <!-- 闪兑 -->
            <div class="price-item-card">
              <div class="item-title">闪兑</div>
              <div class="item-content">
                <div class="time-row">
                  <div class="value-wrapper">
                    <span class="time-label">TRX→USDT</span>
                    <el-input-number
                      v-if="editModeMap[agent.id]"
                      v-model="getTrx2UsdtDisplay(agent.id).value"
                      :precision="2"
                      :step="1"
                      :min="0"
                      :max="100"
                      size="small"
                      controls-position="right"
                    />
                    <span v-else class="value-text">{{ getTrx2UsdtDisplay(agent.id).value }}</span>
                    <span class="unit">%</span>
                  </div>
                </div>
                <div class="time-row">
                  <div class="value-wrapper">
                    <span class="time-label">USDT→TRX</span>
                    <el-input-number
                      v-if="editModeMap[agent.id]"
                      v-model="getUsdt2TrxDisplay(agent.id).value"
                      :precision="2"
                      :step="1"
                      :min="0"
                      :max="100"
                      size="small"
                      controls-position="right"
                    />
                    <span v-else class="value-text">{{ getUsdt2TrxDisplay(agent.id).value }}</span>
                    <span class="unit">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 第二行：闪租 - 按笔数 - 首次激活 - 带宽 - 批量下单 - 机器人价格 -->
          <div class="row-second">
            <!-- 闪租 -->
            <div class="price-item-card">
              <div class="item-title">闪租</div>
              <div class="item-content single-input">
                <div class="value-wrapper">
                  <el-input-number
                    v-if="editModeMap[agent.id]"
                    v-model="formDataMap[agent.id].flash"
                    :precision="2"
                    :step="0.1"
                    :min="0"
                    size="small"
                    controls-position="right"
                  />
                  <span v-else class="value-text">{{ formDataMap[agent.id].flash }}</span>
                  <span class="unit">TRX</span>
                </div>
              </div>
            </div>

            <!-- 按笔数 -->
            <div class="price-item-card">
              <div class="item-title">按笔数</div>
              <div class="item-content single-input">
                <div class="value-wrapper">
                  <el-input-number
                    v-if="editModeMap[agent.id]"
                    v-model="formDataMap[agent.id].stroke"
                    :precision="2"
                    :step="0.1"
                    :min="0"
                    size="small"
                    controls-position="right"
                  />
                  <span v-else class="value-text">{{ formDataMap[agent.id].stroke }}</span>
                  <span class="unit">TRX</span>
                </div>
              </div>
            </div>

            <!-- 首次激活 -->
            <div class="price-item-card">
              <div class="item-title">首次激活</div>
              <div class="item-content single-input">
                <div class="value-wrapper">
                  <el-input-number
                    v-if="editModeMap[agent.id]"
                    v-model="formDataMap[agent.id].active"
                    :precision="2"
                    :step="0.1"
                    :min="0"
                    size="small"
                    controls-position="right"
                  />
                  <span v-else class="value-text">{{ formDataMap[agent.id].active }}</span>
                  <span class="unit">TRX</span>
                </div>
              </div>
            </div>

            <!-- 带宽 -->
            <div class="price-item-card">
              <div class="item-title">带宽</div>
              <div class="item-content single-input">
                <div class="value-wrapper">
                  <el-input-number
                    v-if="editModeMap[agent.id]"
                    v-model="formDataMap[agent.id].bandwidth"
                    :precision="2"
                    :step="0.1"
                    :min="0"
                    size="small"
                    controls-position="right"
                  />
                  <span v-else class="value-text">{{ formDataMap[agent.id].bandwidth }}</span>
                  <span class="unit">TRX</span>
                </div>
              </div>
            </div>

            <!-- 批量下单 -->
            <div class="price-item-card">
              <div class="item-title">批量下单</div>
              <div class="item-content single-input">
                <el-input-number
                  v-if="editModeMap[agent.id]"
                  v-model="formDataMap[agent.id].batch_flash"
                  :precision="2"
                  :step="0.1"
                  :min="0"
                  size="small"
                  controls-position="right"
                />
                <span v-else class="value-text">{{ formDataMap[agent.id].batch_flash }}</span>
                <span class="unit">TRX</span>
              </div>
            </div>

            <!-- 机器人价格 -->
            <div class="price-item-card">
              <div class="item-title">机器人价格</div>
              <div class="item-content single-input">
                <div class="value-wrapper">
                  <el-input-number
                    v-if="editModeMap[agent.id]"
                    v-model="formDataMap[agent.id].bot_fee"
                    :precision="2"
                    :step="0.1"
                    :min="0"
                    size="small"
                    controls-position="right"
                  />
                  <span v-else class="value-text">{{ formDataMap[agent.id].bot_fee }}</span>
                  <span class="unit">TRX</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <el-dialog
      v-model="secondaryPasswordDialogVisible"
      title="二级密钥验证"
      width="420px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="!secondaryPasswordLoading"
      @closed="resetSecondaryPasswordDialog"
    >
      <el-form
        ref="secondaryPasswordFormRef"
        :model="secondaryPasswordForm"
        :rules="secondaryPasswordRules"
        label-width="92px"
        @submit.prevent
      >
        <el-form-item label="二级密钥" prop="secret">
          <el-input
            v-model="secondaryPasswordForm.secret"
            type="password"
            show-password
            autocomplete="new-password"
            placeholder="请输入二级密钥"
            @keyup.enter="confirmSecondaryPassword"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button
          :disabled="secondaryPasswordLoading"
          @click="secondaryPasswordDialogVisible = false"
        >
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="secondaryPasswordLoading"
          @click="confirmSecondaryPassword"
        >
          确认
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="tsx">
import { ref, reactive, computed, nextTick } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import {
  v1GetPriceList,
  v1UpdatePrice,
  type V1PriceListResponse,
  type V1UpdatePriceParams
} from '@/api/opertion/Marketing/AgentPrice'
import { useRoute } from 'vue-router'
import { getErrorMessage } from '@/utils/messageHelper'
import { formatTableDateTime } from '@/utils/tableHelpers'
import { hasRouteButtonPermission } from '@/operation/utils/permission'
import { AGENT_PRICE_LEVEL_LABELS } from '../constants'

const route = useRoute()
const loading = ref(false)
const priceList = ref<V1PriceListResponse[]>([])
const editModeMap = reactive<Record<number, boolean>>({})
const refreshing = ref(false)
const pendingSaveAgentId = ref<number | null>(null)
const savingAgentId = ref<number | null>(null)
const secondaryPasswordDialogVisible = ref(false)
const secondaryPasswordFormRef = ref<FormInstance>()
const secondaryPasswordForm = reactive({
  secret: ''
})
const secondaryPasswordRules: FormRules<typeof secondaryPasswordForm> = {
  secret: [{ required: true, message: '请输入二级密钥', trigger: 'blur' }]
}
const secondaryPasswordLoading = computed(() => savingAgentId.value !== null)

interface PriceFormData {
  active: number
  time_1h: number
  time_1d: number
  time_3d: number
  time_7d: number
  time_15d: number
  time_30d: number
  stroke: number
  flash: number
  hosting_65k: number
  hosting_131k: number
  trx_2_usdt: number
  usdt_2_trx: number
  bot_fee: number
  batch_flash: number
  bandwidth: number
  charge: number
  instant: number
}

const hasEditPermission = computed(() => hasRouteButtonPermission(route, 'edit'))

const isAgentSavePending = (agentId: number) =>
  pendingSaveAgentId.value === agentId || savingAgentId.value === agentId

const getAgentLevelName = (id: number): string => {
  return AGENT_PRICE_LEVEL_LABELS[id] || `${id}级代理`
}

const formDataMap = reactive<Record<number, PriceFormData>>({})

const toNumber = (value: string | number | undefined | null) => Number(value || 0)

const toPriceNumber = (value: string | number | undefined | null) =>
  Number(toNumber(value).toFixed(2))

const getChargeValue = (item: V1PriceListResponse) => toPriceNumber(item.charge)

const twoDecimalPattern = /^\d*(?:\.\d{0,2})?$/
const controlKeys = new Set([
  'Backspace',
  'Delete',
  'Tab',
  'Escape',
  'Enter',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End'
])

const getNumberInputTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLInputElement)) return null
  return target.closest('.el-input-number') ? target : null
}

const enableTwoDecimalEditMode = (event: FocusEvent) => {
  const input = getNumberInputTarget(event.target)
  if (!input) return

  input.type = 'text'
  input.inputMode = 'decimal'
}

const getNextInputValue = (input: HTMLInputElement, insertedText: string) => {
  const value = input.value
  const selectionStart = input.selectionStart ?? value.length
  const selectionEnd = input.selectionEnd ?? value.length

  return `${value.slice(0, selectionStart)}${insertedText}${value.slice(selectionEnd)}`
}

const preventMoreThanTwoDecimalInput = (event: KeyboardEvent) => {
  const input = getNumberInputTarget(event.target)
  if (!input) return

  if (event.ctrlKey || event.metaKey || event.altKey || controlKeys.has(event.key)) return
  if (event.key.length !== 1) return

  const nextValue = getNextInputValue(input, event.key)
  if (!twoDecimalPattern.test(nextValue)) {
    event.preventDefault()
  }
}

const preventMoreThanTwoDecimalPaste = (event: ClipboardEvent) => {
  const input = getNumberInputTarget(event.target)
  if (!input) return

  const pastedText = event.clipboardData?.getData('text') ?? ''
  const nextValue = getNextInputValue(input, pastedText)
  if (!twoDecimalPattern.test(nextValue)) {
    event.preventDefault()
  }
}

const createPriceFormData = (item: V1PriceListResponse): PriceFormData => ({
  active: toPriceNumber(item.active),
  time_1h: toPriceNumber(item.time_1h),
  time_1d: toPriceNumber(item.time_1d),
  time_3d: toPriceNumber(item.time_3d),
  time_7d: toPriceNumber(item.time_7d),
  time_15d: toPriceNumber(item.time_15d),
  time_30d: toPriceNumber(item.time_30d),
  stroke: toPriceNumber(item.stroke),
  flash: toPriceNumber(item.flash),
  hosting_65k: toPriceNumber(item.hosting_65k),
  hosting_131k: toPriceNumber(item.hosting_131k),
  trx_2_usdt: toNumber(item.trx_2_usdt),
  usdt_2_trx: toNumber(item.usdt_2_trx),
  bot_fee: toPriceNumber(item.bot_fee),
  batch_flash: toPriceNumber(item.batch_flash),
  bandwidth: toPriceNumber(item.bandwidth),
  charge: getChargeValue(item),
  instant: toPriceNumber(item.instant)
})

const getTrx2UsdtDisplay = (agentId: number) => {
  return computed({
    get: () => {
      const formData = formDataMap[agentId]
      if (!formData) return 0
      return Number((formData.trx_2_usdt * 100).toFixed(2))
    },
    set: (val) => {
      if (formDataMap[agentId]) {
        formDataMap[agentId].trx_2_usdt = Number((val / 100).toFixed(4))
      }
    }
  })
}

const getUsdt2TrxDisplay = (agentId: number) => {
  return computed({
    get: () => {
      const formData = formDataMap[agentId]
      if (!formData) return 0
      return Number((formData.usdt_2_trx * 100).toFixed(2))
    },
    set: (val) => {
      if (formDataMap[agentId]) {
        formDataMap[agentId].usdt_2_trx = Number((val / 100).toFixed(4))
      }
    }
  })
}

const hasChanges = (agentId: number) => {
  const original = priceList.value.find((item) => item.id === agentId)
  const formData = formDataMap[agentId]

  if (!original || !formData) return false

  return (
    Number(formData.active) !== Number(original.active) ||
    Number(formData.time_1h) !== Number(original.time_1h) ||
    Number(formData.time_1d) !== Number(original.time_1d) ||
    Number(formData.time_3d) !== Number(original.time_3d) ||
    Number(formData.time_7d) !== Number(original.time_7d) ||
    Number(formData.time_15d) !== Number(original.time_15d) ||
    Number(formData.time_30d) !== Number(original.time_30d) ||
    Number(formData.stroke) !== Number(original.stroke) ||
    Number(formData.flash) !== Number(original.flash) ||
    Number(formData.hosting_65k) !== Number(original.hosting_65k) ||
    Number(formData.hosting_131k) !== Number(original.hosting_131k) ||
    Number(formData.trx_2_usdt) !== Number(original.trx_2_usdt) ||
    Number(formData.usdt_2_trx) !== Number(original.usdt_2_trx) ||
    Number(formData.bot_fee) !== Number(original.bot_fee) ||
    Number(formData.batch_flash) !== Number(original.batch_flash || 0) ||
    Number(formData.bandwidth) !== Number(original.bandwidth || 0) ||
    Number(formData.charge) !== getChargeValue(original) ||
    Number(formData.instant) !== Number(original.instant || 0)
  )
}

const handleEdit = (agentId: number) => {
  editModeMap[agentId] = true
}

const handleRefresh = async () => {
  if (refreshing.value || loading.value) return
  refreshing.value = true
  try {
    await loadPriceData()
    ElMessage.success('刷新成功')
  } finally {
    refreshing.value = false
  }
}

const handleCancel = (agentId: number) => {
  const original = priceList.value.find((item) => item.id === agentId)
  if (original) {
    formDataMap[agentId] = createPriceFormData(original)
  }
  editModeMap[agentId] = false
}

const formatTime = (agentId: number) => {
  const agent = priceList.value.find((item) => item.id === agentId)
  return formatTableDateTime(agent?.updated_at)
}

const buildUpdatePricePayload = (
  agentId: number,
  formData: PriceFormData
): V1UpdatePriceParams => ({
  id: agentId,
  active: toPriceNumber(formData.active),
  time_1h: toPriceNumber(formData.time_1h),
  time_1d: toPriceNumber(formData.time_1d),
  time_3d: toPriceNumber(formData.time_3d),
  time_7d: toPriceNumber(formData.time_7d),
  time_15d: toPriceNumber(formData.time_15d),
  time_30d: toPriceNumber(formData.time_30d),
  stroke: toPriceNumber(formData.stroke),
  flash: toPriceNumber(formData.flash),
  hosting_65k: toPriceNumber(formData.hosting_65k),
  hosting_131k: toPriceNumber(formData.hosting_131k),
  trx_2_usdt: formData.trx_2_usdt,
  usdt_2_trx: formData.usdt_2_trx,
  bot_fee: toPriceNumber(formData.bot_fee),
  batch_flash: toPriceNumber(formData.batch_flash),
  bandwidth: toPriceNumber(formData.bandwidth),
  charge: toPriceNumber(formData.charge),
  instant: toPriceNumber(formData.instant)
})

const validatePriceBeforeSave = (agentId: number) => {
  const formData = formDataMap[agentId]
  if (!formData) {
    ElMessage.warning('没有可保存的数据')
    return null
  }

  if (Number(formData.hosting_65k) > Number(formData.hosting_131k)) {
    ElMessage.error('托管的65k价格不能高于131k价格')
    return null
  }

  return formData
}

const loadPriceData = async () => {
  loading.value = true
  try {
    const res = await v1GetPriceList({
      current_page: 1,
      order: 'id ASC',
      page_size: 4
    })

    priceList.value = res.data.list || []

    priceList.value.forEach((item) => {
      editModeMap[item.id] = false
      formDataMap[item.id] = createPriceFormData(item)
    })
  } catch (error: unknown) {
    ElMessage.error(getErrorMessage(error, '加载价格数据失败'))
  } finally {
    loading.value = false
  }
}

const handleSave = async (agentId: number) => {
  if (loading.value || secondaryPasswordLoading.value) return
  if (!validatePriceBeforeSave(agentId)) {
    return
  }

  pendingSaveAgentId.value = agentId
  secondaryPasswordForm.secret = ''
  secondaryPasswordDialogVisible.value = true
  await nextTick()
  secondaryPasswordFormRef.value?.clearValidate()
}

const submitPriceUpdate = async (agentId: number, formData: PriceFormData, secret: string) => {
  loading.value = true
  savingAgentId.value = agentId
  try {
    await v1UpdatePrice(buildUpdatePricePayload(agentId, formData), secret)

    await loadPriceData()
    editModeMap[agentId] = false
    ElMessage.success('保存成功')
    return true
  } catch (error: unknown) {
    ElMessage.error(getErrorMessage(error, '保存失败'))
    return false
  } finally {
    loading.value = false
    savingAgentId.value = null
  }
}

const confirmSecondaryPassword = async () => {
  if (secondaryPasswordLoading.value) return

  const valid = await secondaryPasswordFormRef.value?.validate().catch(() => false)
  if (!valid) return

  const agentId = pendingSaveAgentId.value
  if (!agentId) {
    ElMessage.warning('没有可保存的数据')
    secondaryPasswordDialogVisible.value = false
    return
  }

  const formData = validatePriceBeforeSave(agentId)
  if (!formData) return

  const saved = await submitPriceUpdate(agentId, formData, secondaryPasswordForm.secret)
  if (saved) {
    secondaryPasswordDialogVisible.value = false
  }
}

const resetSecondaryPasswordDialog = () => {
  if (secondaryPasswordLoading.value) return

  pendingSaveAgentId.value = null
  secondaryPasswordForm.secret = ''
  secondaryPasswordFormRef.value?.clearValidate()
}

loadPriceData()
</script>

<style scoped>
@media (width <= 1280px) {
  .row-first > .price-item-card:nth-child(1),
  .row-first > .price-item-card:nth-child(2),
  .row-first > .price-item-card:nth-child(4),
  .row-first > .price-item-card:nth-child(5) {
    grid-column: span 2;
  }

  .row-first > .price-item-card:nth-child(3) {
    grid-column: span 4;
  }

  .row-second {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.price-cards-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.agent-card {
  width: 100%;
}

.agent-card :deep(.el-card__body) {
  padding: 10px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.agent-level {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.update-time {
  font-size: 13px;
}

.value-text {
  display: inline-block;
  max-width: 110px;
  min-width: 42px;
  padding: 0 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  text-align: center;
  flex-shrink: 0;
}

.price-items-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(60px, 1fr));
  gap: 10px;
  contain: layout;
}

.row-first {
  display: contents;
}

.row-first > .price-item-card:nth-child(1) {
  grid-column: span 2;
  min-width: 0;
}

.row-first > .price-item-card:nth-child(2) {
  grid-column: span 2;
  min-width: 0;
}

.row-first > .price-item-card:nth-child(3) {
  grid-column: span 4;
  min-width: 0;
}

.row-first > .price-item-card:nth-child(4) {
  grid-column: span 2;
  min-width: 0;
}

.row-first > .price-item-card:nth-child(5) {
  grid-column: span 2;
  min-width: 0;
}

.row-second {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  grid-column: 1 / -1;
  gap: 12px;
}

.row-second > .price-item-card {
  min-width: 0;
}

.price-item-card {
  display: flex;
  min-height: 78px;
  padding: 10px 12px;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  flex-direction: column;
  contain: layout style;
}

.item-title {
  padding-bottom: 6px;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.item-content {
  display: flex;
  flex-direction: column;
  gap: 7px;
  flex: 1;
  align-items: center;
  justify-content: center;
}

.item-content.time-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 7px 14px;
}

.item-content.single-input {
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.value-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.time-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.time-label {
  min-width: 35px;
  font-size: 12px;
  color: var(--el-text-color-regular);
  text-align: center;
}

.unit {
  margin-left: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
  white-space: nowrap;
}

:deep(.el-input-number) {
  width: auto;
  max-width: 140px;
  flex: 1;
}

:deep(.el-input-number--small) {
  width: auto;
  max-width: 120px;
  flex: 1;
}

:deep(.el-input-number--small .el-input__inner) {
  text-align: center;
}

/* 优化性能 */
* {
  box-sizing: border-box;
}

.agent-card {
  contain: layout style;
}
</style>
