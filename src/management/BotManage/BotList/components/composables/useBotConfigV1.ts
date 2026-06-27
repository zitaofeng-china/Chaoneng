// 机器人配置管理 V1 - 专门管理重构后的三个标签页（使用 v1 新接口）
import { ref, reactive } from 'vue'
import { ElLoading, ElMessage, ElMessageBox } from 'element-plus'
import {
  v1GetBotDetail,
  v1GetBotPriceConfig,
  v1GetSystemPrice,
  v1GetAddressList,
  v1GetBotWealConfig,
  v1UpdateBot,
  v1UpdateBotPrice,
  v1UpdateBotWealConfig,
  v1AddAddressList,
  v1DeleteAddressList,
  v1UpdateAddress,
  syncTgStatusApi
} from '@/api/management/BotManage/BotList'
import { v1UpdateSite, v1GetSiteDetail } from '@/api/management/BotManage/common/site'
import { getAccountListApi } from '@/api/management/AccountManage/AccountList'
import { buildBotUpdatePayload, validateBotUpdatePayload } from '@/utils/botUpdatePayload'

export function useBotConfigV1() {
  // 共享状态
  const dialogVisible = ref(false)
  const activeTab = ref('botInfo')
  const currentBot = ref<Record<string, any>>({})
  const tgStatus = ref('pending')
  const syncing = ref(false)
  const loading = ref(false)
  const submitting = ref(false)
  const showBandwidthCost = ref(false)

  // 价格配置数据（成本价）
  const costPrices = reactive<Record<string, any>>({})
  // 当前价格配置数据
  const currentPrices = reactive<Record<string, any>>({})
  // 收款地址原始记录（用于区分创建/更新）
  // key 为 kind，value 为地址记录的 id（存在则说明已绑定过，保存时用 update）
  const addressRecordIds = reactive<Record<number, number | null>>({
    2: null, // 余额充值
    3: null, // 闪兑
    4: null, // 时间能量
    5: null // 笔数能量
  })

  const parsePriceValue = (value: unknown) => {
    const numericValue = typeof value === 'number' ? value : parseFloat(String(value ?? '0'))
    return Number.isFinite(numericValue) ? numericValue : 0
  }

  const getChargePrice = (priceData: Record<string, any>) => parsePriceValue(priceData.charge)
  // 缓存原始地址值（用于清空时调用删除接口）
  const addressRecordValues = reactive<Record<number, string>>({
    2: '',
    3: '',
    4: '',
    5: ''
  })
  // TG状态同步
  const syncTgStatus = async () => {
    if (syncing.value || !currentBot.value.id) return

    try {
      syncing.value = true
      ElMessage.info('正在同步TG状态...')

      const res = await syncTgStatusApi(currentBot.value.id)
      const data = res.data || {}

      tgStatus.value = data.status || 'pending'
      ElMessage.success('TG状态同步' + (tgStatus.value === 'success' ? '成功' : '失败'))
    } catch (error) {
      ElMessage.error('TG状态同步失败，请稍后重试')
      tgStatus.value = 'error'
    } finally {
      syncing.value = false
    }
  }

  // 加载机器人基本信息
  const loadBotInfo = async (id: number, formMethods: any) => {
    try {
      const botDetailRes = await v1GetBotDetail(id)

      if (botDetailRes.code !== '000000' || !botDetailRes.data) {
        ElMessage.error('获取机器人详情失败')
        return false
      }

      // 保存机器人信息
      currentBot.value = botDetailRes.data

      // 设置TG同步状态
      tgStatus.value = 'pending'

      // 设置表单值
      formMethods.setValues({
        tg_bot_id: botDetailRes.data.id || '',
        firstname: botDetailRes.data.first_name || '',
        name: botDetailRes.data.user_name || '',
        avatar: botDetailRes.data.avatar || '',
        short_description: botDetailRes.data.short_description || '',
        description: botDetailRes.data.description || '',
        token: botDetailRes.data.token || '',
        api_key: '',
        tg_admin: botDetailRes.data.tg_admin || '',
        invite_reward: botDetailRes.data.reward?.standard_invite
          ? Number(botDetailRes.data.reward.standard_invite)
          : 0,
        invite_reward_vip: botDetailRes.data.reward?.premium_invite
          ? Number(botDetailRes.data.reward.premium_invite)
          : 0,
        visit_reward: botDetailRes.data.reward?.first_deposit
          ? Number(botDetailRes.data.reward.first_deposit)
          : 0,
        describe: botDetailRes.data.describe || '',
        status: botDetailRes.data.status || 2
      })

      return true
    } catch (error) {
      ElMessage.error('加载机器人信息失败')
      return false
    }
  }

  // 加载收款配置
  const loadPaymentConfig = async (id: number, formMethods: any, paymentTabRef: any) => {
    try {
      const addressListRes = await v1GetAddressList({
        bot_id: id,
        current_page: 1,
        page_size: 100
      })

      if (addressListRes.code !== '000000' || !addressListRes.data) {
        ElMessage.error('获取收款地址失败')
        return false
      }

      const addressList = addressListRes.data.list || []

      if (addressList.length === 0) {
        ElMessage.warning('该机器人还未配置收款地址')
      }

      // 根据 kind 类型提取不同的地址
      const timeEnergyAddress = addressList.find((item) => Number(item.kind) === 4)
      const userDepositAddress = addressList.find((item) => Number(item.kind) === 2)
      const strokeEnergyAddress = addressList.find((item) => Number(item.kind) === 5)
      const exchangeAddress = addressList.find((item) => Number(item.kind) === 3)

      // 记录每个 kind 的地址记录 ID，用于保存时判断用创建还是更新接口
      addressRecordIds[4] = timeEnergyAddress ? timeEnergyAddress.id : null
      addressRecordIds[2] = userDepositAddress ? userDepositAddress.id : null
      addressRecordIds[5] = strokeEnergyAddress ? strokeEnergyAddress.id : null
      addressRecordIds[3] = exchangeAddress ? exchangeAddress.id : null

      // 缓存原始地址值
      addressRecordValues[4] = timeEnergyAddress?.address || ''
      addressRecordValues[2] = userDepositAddress?.address || ''
      addressRecordValues[5] = strokeEnergyAddress?.address || ''
      addressRecordValues[3] = exchangeAddress?.address || ''

      formMethods.setValues({
        energy_address: timeEnergyAddress?.address || '',
        receive_address: userDepositAddress?.address || '',
        energy_usdt_address: strokeEnergyAddress?.address || '',
        transfer_address: exchangeAddress?.address || '',
        notice_order_tg_admin: 2
      })

      // 设置福利地址的 bot_id，触发 SearchTable 加载
      if (paymentTabRef && paymentTabRef.setBotId) {
        paymentTabRef.setBotId(id)
      }

      return true
    } catch (error) {
      ElMessage.error('加载收款配置失败')
      return false
    }
  }

  // 加载价格配置
  const loadPriceConfig = async (id: number, formMethods: any) => {
    try {
      const [systemPriceRes, botPriceRes, accountRes] = await Promise.all([
        v1GetSystemPrice(),
        v1GetBotPriceConfig(id),
        getAccountListApi()
      ])

      if (systemPriceRes.code !== '000000' || !systemPriceRes.data) {
        ElMessage.error('获取系统成本价失败')
        return false
      }

      if (botPriceRes.code !== '000000' || !botPriceRes.data) {
        ElMessage.error('获取机器人价格配置失败')
        return false
      }

      showBandwidthCost.value = accountRes.data?.gift_bandwidth === true

      // 保存成本价数据
      const systemPrice = systemPriceRes.data
      Object.assign(costPrices, {
        flash: parsePriceValue(systemPrice.flash),
        time_1h: parsePriceValue(systemPrice.time_1h),
        time_1d: parsePriceValue(systemPrice.time_1d),
        time_3d: parsePriceValue(systemPrice.time_3d),
        time_7d: parsePriceValue(systemPrice.time_7d),
        time_15d: parsePriceValue(systemPrice.time_15d),
        time_30d: parsePriceValue(systemPrice.time_30d),
        stroke: parsePriceValue(systemPrice.stroke),
        hosting_65k: parsePriceValue(systemPrice.hosting_65k),
        hosting_131k: parsePriceValue(systemPrice.hosting_131k),
        batch_flash: parsePriceValue(systemPrice.batch_flash),
        charge: getChargePrice(systemPrice),
        bandwidth: parsePriceValue(systemPrice.bandwidth),
        active: parsePriceValue(systemPrice.active),
        instant: parsePriceValue(systemPrice.instant)
      })

      // 保存当前价格配置
      const botPriceData = botPriceRes.data
      Object.assign(currentPrices, botPriceData)

      // 设置表单值
      formMethods.setValues({
        flash: parsePriceValue(botPriceData.flash),
        time_1h: parsePriceValue(botPriceData.time_1h),
        time_1d: parsePriceValue(botPriceData.time_1d),
        time_3d: parsePriceValue(botPriceData.time_3d),
        time_7d: parsePriceValue(botPriceData.time_7d),
        time_15d: parsePriceValue(botPriceData.time_15d),
        time_30d: parsePriceValue(botPriceData.time_30d),
        stroke: parsePriceValue(botPriceData.stroke),
        stroke_usdt: parsePriceValue(botPriceData.stroke_usdt),
        hosting_65k: parsePriceValue(botPriceData.hosting_65k),
        hosting_131k: parsePriceValue(botPriceData.hosting_131k),
        batch_flash: parsePriceValue(botPriceData.batch_flash),
        charge: getChargePrice(botPriceData),
        active: parsePriceValue(botPriceData.active),
        min_trx_balance: parsePriceValue(botPriceData.min_trx_balance),
        usdt_2_trx: parsePriceValue(botPriceData.usdt_2_trx) * 100,
        max_usdt_2_trx: parsePriceValue(botPriceData.max_usdt_2_trx),
        trx_2_usdt: parsePriceValue(botPriceData.trx_2_usdt) * 100,
        max_trx_2_usdt: parsePriceValue(botPriceData.max_trx_2_usdt),
        instant: parsePriceValue(botPriceData.instant)
      })

      return true
    } catch (error) {
      ElMessage.error('加载价格配置失败')
      return false
    }
  }

  // 加载福利配置
  const loadWelfareConfig = async (id: number, formMethods: any) => {
    try {
      const wealConfigRes = await v1GetBotWealConfig(id)

      if (wealConfigRes.code !== '000000' || !wealConfigRes.data) {
        ElMessage.error('获取福利配置失败')
        return false
      }

      const wealData = wealConfigRes.data

      // 设置表单值，时间单位转换：
      // min_interval: 后端秒 → 前端小时
      // min_send_interval: 后端秒 → 前端分钟
      formMethods.setValues({
        max_count: wealData.max_count || 0,
        min_interval: (wealData.min_interval || 0) / 3600,
        max_energy: wealData.max_energy || 0,
        max_bandwidth: wealData.max_bandwidth || 0,
        min_active_day: wealData.min_active_day || 0,
        min_balance_trx: parseFloat(wealData.min_balance_trx) || 0,
        min_balance_usdt: parseFloat(wealData.min_balance_usdt) || 0,
        min_avg_transfer_trx: parseFloat(wealData.min_avg_transfer_trx) || 0,
        min_avg_transfer_usdt: parseFloat(wealData.min_avg_transfer_usdt) || 0,
        min_send_interval: (wealData.min_send_interval || 0) / 60,
        same_send_max_count_trx: wealData.same_send_max_count_trx || 0,
        same_send_min_amount_trx: parseFloat(wealData.same_send_min_amount_trx) || 0
      })

      return true
    } catch (error) {
      ElMessage.error('加载福利配置失败')
      return false
    }
  }

  // 统一的加载函数
  const loadTabConfig = async (id: number, tabName: string, formMethods: any, tabRef?: any) => {
    if (!id) {
      ElMessage.error('机器人ID不能为空')
      return false
    }

    const loadingInstance = ElLoading.service({
      target: '.el-dialog__body',
      text: '加载配置中...'
    })

    loading.value = true

    try {
      let success = false

      switch (tabName) {
        case 'botInfo':
          success = await loadBotInfo(id, formMethods)
          break
        case 'payment':
          success = await loadPaymentConfig(id, formMethods, tabRef)
          break
        case 'priceConfig':
          success = await loadPriceConfig(id, formMethods)
          break
        case 'welfareConfig':
          success = await loadWelfareConfig(id, formMethods)
          break
        default:
          ElMessage.warning(`未知的标签页: ${tabName}`)
      }

      return success
    } catch (error) {
      ElMessage.error('加载配置失败，请稍后重试')
      return false
    } finally {
      loading.value = false
      loadingInstance.close()
    }
  }

  // 提交机器人基本信息
  const submitBotInfo = async (formMethods: any) => {
    try {
      const botInfoData = await formMethods.getFormData()

      const botPayload = buildBotUpdatePayload(currentBot.value, botInfoData)
      const validationMessage = validateBotUpdatePayload(botPayload)

      if (validationMessage) {
        ElMessage.error(validationMessage)
        return false
      }

      // 1. 更新机器人基本信息
      await v1UpdateBot(botPayload)

      // 2. 更新Site信息（客服账号和H5端开关）
      await v1UpdateSite({
        id: currentBot.value.id,
        tg_admin: botInfoData.site_tg_admin,
        status: botInfoData.h5_enable === 1 ? 1 : 2
      })

      // 3. 重新获取机器人详情 + Site详情，刷新显示数据
      // 注意：bot 详情的 tg_admin = 管理员TG账号；site 详情的 tg_admin = 客服账号(site_tg_admin)
      // 两个接口都返回 tg_admin 字段名但含义不同，不要串了
      try {
        const [botRes, siteRes] = await Promise.all([
          v1GetBotDetail(currentBot.value.id),
          v1GetSiteDetail(currentBot.value.id)
        ])

        const currentFormData = await formMethods.getFormData()
        const refreshedData: Record<string, any> = { ...currentFormData }

        // 刷新机器人详情：管理员TG账号、备注、状态、奖励
        if (botRes && botRes.code === '000000' && botRes.data) {
          currentBot.value = botRes.data
          refreshedData.avatar = botRes.data.avatar || ''
          refreshedData.short_description = botRes.data.short_description || ''
          refreshedData.description = botRes.data.description || ''
          refreshedData.firstname = botRes.data.first_name || ''
          refreshedData.tg_admin = botRes.data.tg_admin || ''
          refreshedData.describe = botRes.data.describe || ''
          refreshedData.status = botRes.data.status || 2
          refreshedData.invite_reward = botRes.data.reward?.standard_invite
            ? Number(botRes.data.reward.standard_invite)
            : 0
          refreshedData.invite_reward_vip = botRes.data.reward?.premium_invite
            ? Number(botRes.data.reward.premium_invite)
            : 0
          refreshedData.visit_reward = botRes.data.reward?.first_deposit
            ? Number(botRes.data.reward.first_deposit)
            : 0
        }

        // 刷新Site详情：客服账号(site_tg_admin)、H5地址、H5开关
        if (siteRes && siteRes.data) {
          refreshedData.url = siteRes.data.url || ''
          refreshedData.site_tg_admin = siteRes.data.tg_admin || ''
          refreshedData.h5_enable = siteRes.data.status === 1 ? 1 : 0
        }

        formMethods.setValues(refreshedData)
      } catch (refreshError) {
        // 刷新失败不影响保存成功的提示
      }

      ElMessage.success('保存成功')
      return true
    } catch (error) {
      console.error('保存基本信息失败:', error)
      ElMessage.error('保存失败')
      return false
    }
  }

  // 提交收款配置
  const submitPaymentConfig = async (formMethods: any) => {
    try {
      const paymentData = await formMethods.getFormData()
      const promises: Promise<any>[] = []

      // 只处理 kind 2/3/4/5，福利(6)通过 SearchTable 独立管理
      const addressFields: Array<{ field: string; kind: number }> = [
        { field: 'energy_address', kind: 4 },
        { field: 'receive_address', kind: 2 },
        { field: 'energy_usdt_address', kind: 5 },
        { field: 'transfer_address', kind: 3 }
      ]

      for (const { field, kind } of addressFields) {
        const address = paymentData[field]?.trim()
        const existingId = addressRecordIds[kind]
        const originalAddress = addressRecordValues[kind]

        if (!address && existingId !== null && existingId !== undefined && originalAddress) {
          // 输入框清空了，但缓存里有值 → 调用删除接口
          promises.push(
            v1DeleteAddressList({
              bot_id: currentBot.value.id,
              list: [originalAddress]
            })
          )
        } else if (address && existingId !== null && existingId !== undefined) {
          // 有值且已有记录 → 更新（传 kind、bot_id、agent_id）
          promises.push(
            v1UpdateAddress({
              id: existingId,
              address,
              kind,
              bot_id: currentBot.value.id,
              agent_id: currentBot.value.agent_id || 0
            })
          )
        } else if (address && (existingId === null || existingId === undefined)) {
          // 有值但无记录 → 创建
          promises.push(
            v1AddAddressList({
              bot_id: currentBot.value.id,
              kind,
              list: [address]
            })
          )
        }
        // 无值且无记录 → 什么都不做
      }

      if (promises.length === 0) {
        ElMessage.info('没有需要保存的变更')
        return true
      }

      await loadPaymentConfig(currentBot.value.id, formMethods, null)
      ElMessage.success('保存成功')

      return true
    } catch (error) {
      ElMessage.error('保存失败')
      return false
    }
  }

  // 提交价格配置
  const submitPriceConfig = async (formMethods: any) => {
    try {
      const priceData = await formMethods.getFormData()

      // 检查是否有价格低于成本价，给出确认提示
      const belowCostFields: string[] = []
      const priceCheckMap: Array<{ field: string; label: string; costKey: string }> = [
        { field: 'flash', label: '闪租能量', costKey: 'flash' },
        { field: 'time_1h', label: '1小时租赁', costKey: 'time_1h' },
        { field: 'time_1d', label: '1天租赁', costKey: 'time_1d' },
        { field: 'time_3d', label: '3天租赁', costKey: 'time_3d' },
        { field: 'time_7d', label: '7天租赁', costKey: 'time_7d' },
        { field: 'time_15d', label: '15天租赁', costKey: 'time_15d' },
        { field: 'time_30d', label: '30天租赁', costKey: 'time_30d' },
        { field: 'stroke', label: '笔数能量TRX', costKey: 'stroke' },
        { field: 'hosting_65k', label: '65000能量', costKey: 'hosting_65k' },
        { field: 'hosting_131k', label: '131000能量', costKey: 'hosting_131k' },
        { field: 'batch_flash', label: '批量能量单价', costKey: 'batch_flash' },
        { field: 'charge', label: '速充', costKey: 'charge' },
        { field: 'instant', label: '即用能量', costKey: 'instant' },
        { field: 'active', label: '激活地址单价', costKey: 'active' }
      ]

      for (const item of priceCheckMap) {
        const price = priceData[item.field] || 0
        const cost = costPrices[item.costKey]
        if (cost !== undefined && price < cost) {
          belowCostFields.push(`${item.label}（当前: ${price}，成本: ${cost}）`)
        }
      }

      if (belowCostFields.length > 0) {
        try {
          const listHtml = belowCostFields
            .map((item) => `<li style="margin: 4px 0; color: #e6a23c;">${item}</li>`)
            .join('')
          await ElMessageBox.confirm(
            `<div style="margin-top: 8px;">
              <p style="margin-bottom: 10px; color: #606266;">以下价格低于成本价：</p>
              <ul style="list-style: none; padding-left: 0; margin: 0;">${listHtml}</ul>
              <p style="margin-top: 12px; color: #909399; font-size: 13px;">确定要继续保存吗？</p>
            </div>`,
            '低于成本价提示',
            {
              confirmButtonText: '确定保存',
              cancelButtonText: '取消',
              type: 'warning',
              dangerouslyUseHTMLString: true
            }
          )
        } catch {
          // 用户取消
          return false
        }
      }

      // 构建价格配置数据
      const priceConfig = {
        id: currentPrices.id,
        flash: priceData.flash || 0,
        time_1h: priceData.time_1h || 0,
        time_1d: priceData.time_1d || 0,
        time_3d: priceData.time_3d || 0,
        time_7d: priceData.time_7d || 0,
        time_15d: priceData.time_15d || 0,
        time_30d: priceData.time_30d || 0,
        stroke: priceData.stroke || 0,
        stroke_usdt: priceData.stroke_usdt || 0,
        hosting_65k: priceData.hosting_65k || 0,
        hosting_131k: priceData.hosting_131k || 0,
        batch_flash: priceData.batch_flash || 0,
        charge: priceData.charge || 0,
        active: priceData.active || 0,
        usdt_2_trx: (priceData.usdt_2_trx || 0) / 100,
        trx_2_usdt: (priceData.trx_2_usdt || 0) / 100,
        min_trx_balance: priceData.min_trx_balance || 0,
        max_usdt_2_trx: priceData.max_usdt_2_trx || 0,
        max_trx_2_usdt: priceData.max_trx_2_usdt || 0,
        instant: priceData.instant || 0
      }

      await v1UpdateBotPrice(priceConfig)
      await loadPriceConfig(currentBot.value.id, formMethods)
      ElMessage.success('保存成功')
      return true
    } catch (error) {
      ElMessage.error('保存失败')
      return false
    }
  }

  // 提交福利配置
  const submitWelfareConfig = async (formMethods: any) => {
    try {
      const welfareData = await formMethods.getFormData()

      if (!currentBot.value.id) {
        ElMessage.error('机器人ID不能为空')
        return false
      }

      // 构建福利配置数据，时间单位转换：
      // min_interval: 前端小时 → 后端秒
      // min_send_interval: 前端分钟 → 后端秒
      const welfareConfig = {
        bot_id: currentBot.value.id,
        max_count: welfareData.max_count || 0,
        min_interval: Math.round((welfareData.min_interval || 0) * 3600),
        max_energy: welfareData.max_energy || 0,
        max_bandwidth: welfareData.max_bandwidth || 0,
        min_active_day: welfareData.min_active_day || 0,
        min_balance_trx: welfareData.min_balance_trx || 0,
        min_balance_usdt: welfareData.min_balance_usdt || 0,
        min_avg_transfer_trx: welfareData.min_avg_transfer_trx || 0,
        min_avg_transfer_usdt: welfareData.min_avg_transfer_usdt || 0,
        min_send_interval: Math.round((welfareData.min_send_interval || 0) * 60),
        same_send_max_count_trx: welfareData.same_send_max_count_trx || 0,
        same_send_min_amount_trx: welfareData.same_send_min_amount_trx || 0
      }

      await v1UpdateBotWealConfig(currentBot.value.id, welfareConfig)
      await loadWelfareConfig(currentBot.value.id, formMethods)
      ElMessage.success('保存成功')
      return true
    } catch (error) {
      ElMessage.error('保存失败')
      return false
    }
  }

  // 统一的提交函数
  const submitTabConfig = async (tabName: string, formMethods: any) => {
    if (submitting.value) return false

    submitting.value = true

    try {
      // 验证表单
      const currentForm = await formMethods.getElFormExpose()
      const valid = await currentForm.validate().catch(() => false)

      if (!valid) {
        ElMessage.warning('表单验证失败，请检查填写内容')
        return false
      }

      let success = false

      switch (tabName) {
        case 'botInfo':
          success = await submitBotInfo(formMethods)
          break
        case 'payment':
          success = await submitPaymentConfig(formMethods)
          break
        case 'priceConfig':
          success = await submitPriceConfig(formMethods)
          break
        case 'welfareConfig':
          success = await submitWelfareConfig(formMethods)
          break
        default:
          ElMessage.warning(`未知的标签页: ${tabName}`)
      }

      return success
    } catch (error) {
      ElMessage.error('提交失败')
      return false
    } finally {
      submitting.value = false
    }
  }

  return {
    // 状态
    dialogVisible,
    activeTab,
    currentBot,
    tgStatus,
    syncing,
    loading,
    submitting,
    costPrices,
    showBandwidthCost,
    currentPrices,

    // 方法
    syncTgStatus,
    loadTabConfig,
    submitTabConfig
  }
}
