<template>
  <div class="app-container">
    <ContentWrap>
      <SearchTable
        :columns="columns"
        :search-schema="searchSchema"
        :fetch-data-api="fetchBotList"
        :default-params="initialSearchParams"
        :action-column="actionColumn"
        :table-props="{
          rowKey: 'id',
          highlightCurrentRow: false,
          reserveSelection: false
        }"
        ref="searchTableRef"
        @add="handleAdd"
        @loaded="handleDataLoaded"
        @error="handleLoadError"
        :search-props="{
          layout: 'inline',
          buttonPosition: 'center'
        }"
        :pagination="{
          total: totalCount
        }"
      >
        <template #searchButtons>
          <BaseButton type="primary" @click="openConsumptionRecord">消费记录</BaseButton>
        </template>
      </SearchTable>

      <Dialog v-model="dialogVisible" title="添加机器人">
        <Form :isCol="false" :schema="formSchema" @register="formRegister" />
        <template #footer>
          <div class="flex justify-end">
            <ElButton :disabled="dialogSubmitting" @click="dialogVisible = false">
              {{ t('common.cancel') }}
            </ElButton>
            <ElButton type="primary" :loading="dialogSubmitting" @click="handleSubmit">
              提交
            </ElButton>
          </div>
        </template>
      </Dialog>
    </ContentWrap>

    <ConsumptionRecord ref="consumptionRecordRef" />
    <RenewBot ref="renewBotRef" @success="handleRenewSuccess" />
    <BotConfig ref="botConfigRef" @success="handleConfigSuccess" />
  </div>
</template>

<script setup lang="tsx">
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElButton, ElLink, ElMessage, ElSwitch } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { Dialog } from '@/components/Dialog'
import { Form, FormSchema } from '@/components/Form'
import { SearchTable } from '@/components/SearchTable'
import type { SearchTableExpose } from '@/components/SearchTable'
import { useForm } from '@/hooks/web/useForm'
import { useI18n } from '@/hooks/web/useI18n'
import { useValidator } from '@/hooks/web/useValidator'
import { BaseButton } from '@/components/Button'
import ConsumptionRecord from './components/ConsumptionRecord.vue'
import RenewBot from './components/RenewBot.vue'
import BotConfig from './components/BotConfig.vue'
import {
  v1GetBotList,
  v1CreateBot,
  v1GetBotDetail,
  v1UpdateBot,
  v1GetBotRenewPrice
} from '@/api/management/BotManage/BotList'
import { Tips } from '@/components/Tips'
import { formatToDateTime } from '@/utils/dateUtil'
import { useRoute, useRouter } from 'vue-router'
import { handleListMessage, handleErrorMessage, handleSuccessMessage } from '@/utils/messageHelper'
import { buildBotUpdatePayload, validateBotUpdatePayload } from '@/utils/botUpdatePayload'
import { openTelegramUser } from '@/utils/telegram'

const route = useRoute()
const router = useRouter()
const initialSearchParams = (() => {
  const keyword = (route.query.tg_bot_id as string) || (route.query.name as string)
  return keyword ? { keyword } : {}
})()
const { t } = useI18n()
const { required } = useValidator()

const searchTableRef = ref<SearchTableExpose | null>(null)
const consumptionRecordRef = ref()
const renewBotRef = ref()
const botConfigRef = ref()
const isLoaded = ref(false)
const botPrice = ref<any>(null)
const totalCount = ref(0)
const dialogVisible = ref(false)
const dialogType = ref<'add' | 'edit'>('add')
const DEFAULT_CREATED_AT_ORDER = 'created_at DESC'
const dialogSubmitting = ref(false)

// 表格列配置
const columns = [
  { field: 'id', label: '机器人ID', minWidth: 110 },
  {
    field: 'user_name',
    label: '机器人用户名',
    minWidth: 140,
    slots: {
      default: (data: any) => {
        const username = data.row.user_name
        return (
          <ElLink type="primary" onClick={() => openTelegramUser(username)} style="cursor: pointer">
            {username}
          </ElLink>
        )
      }
    }
  },
  {
    field: 'first_name',
    label: '机器人昵称',
    minWidth: 130,
    formatter: (row: any) => row.first_name || '-'
  },
  {
    field: 'status',
    label: '状态',
    width: 100,
    slots: {
      default: (data: any) => {
        return (
          <ElSwitch
            v-model={data.row.status}
            activeValue={1}
            inactiveValue={2}
            onChange={(value) => handleBotSwitchChange(data.row, 'status', Number(value))}
          />
        )
      }
    }
  },
  {
    field: 'auto_renew',
    minWidth: 110,
    slots: {
      header: () => {
        return (
          <div style="display: inline-flex; align-items: center; white-space: nowrap;">
            自动续费
            <Tips content="当机器人余额不足时，将会自动续费" />
          </div>
        )
      },
      default: (data: any) => {
        return (
          <ElSwitch
            v-model={data.row.auto_renew}
            activeValue={1}
            inactiveValue={2}
            onChange={(value) => handleBotSwitchChange(data.row, 'auto_renew', Number(value))}
          />
        )
      }
    }
  },
  {
    field: 'user_count',
    label: '用户数量',
    minWidth: 110,
    slots: {
      default: (data: any) => {
        return (
          <ElLink
            type="primary"
            style="cursor:pointer"
            onClick={() => handleUserCountClick(data.row.id)}
          >
            {data.row.user_count || 0}
          </ElLink>
        )
      }
    }
  },
  {
    field: 'created_at',
    label: '创建时间',
    minWidth: 170,
    sortable: 'custom',
    formatter: (row: any) => (row.created_at ? formatToDateTime(row.created_at * 1000) : '-')
  },
  {
    field: 'expired_at',
    label: '到期时间',
    minWidth: 200,
    sortable: 'custom',
    formatter: (row: any) => (row.expired_at ? formatToDateTime(row.expired_at * 1000) : '-'),
    slots: {
      header: () => {
        return (
          <div style="display: inline-flex; align-items: center; white-space: nowrap;">
            到期时间
            <Tips content="到期后，您的机器人将会被暂停使用" />
          </div>
        )
      }
    }
  }
]

// 操作列配置
const actionColumn = {
  field: 'action',
  label: '操作',
  width: 160,
  fixed: 'right',
  slots: {
    default: (data: any) => {
      const row = data.row
      return (
        <>
          <BaseButton type="primary" onClick={() => handleEdit(row)}>
            配置
          </BaseButton>
          <BaseButton type="success" onClick={() => handleRenew(row)}>
            续费
          </BaseButton>
        </>
      )
    }
  }
}

// 搜索表单配置
const searchSchema = [
  {
    field: 'keyword',
    component: 'Input' as const,
    label: '机器人ID/用户名：',
    componentProps: {
      placeholder: '请输入机器人ID/用户名',
      clearable: true
    }
  }
]

// 表单配置
const formSchema = reactive<FormSchema[]>([
  {
    field: 'fee',
    component: 'InputNumber' as const,
    componentProps: {
      placeholder: '请输入机器人费用',
      min: 0,
      precision: 2,
      disabled: true,
      slots: {
        suffix: () => {
          return <span>TRX/个</span>
        }
      }
    },
    formItemProps: {
      slots: {
        label: () => {
          return (
            <div>
              机器人费用
              <Tips content="将会从您的trongas账号扣费，请确保您的trongas账户余额充足" />：
            </div>
          )
        }
      }
    }
  },
  {
    field: 'token',
    component: 'Input' as const,
    componentProps: {
      placeholder: '请输入机器人token'
    },
    formItemProps: {
      rules: [required()],
      slots: {
        label: () => {
          return (
            <div>
              机器人token
              <Tips content="请输入BotFather返回的token" />：
            </div>
          )
        }
      }
    }
  },
  {
    field: 'tg_admin',
    component: 'Input' as const,
    label: '管理员TG账号：',
    componentProps: {
      placeholder: '请输入管理员TG账号'
    },
    formItemProps: {
      rules: [
        required(),
        {
          pattern: /^@.+$/,
          message: 'TG账号必须以@开头'
        }
      ]
    }
  },
  {
    field: 'describe',
    component: 'Input' as const,
    label: '备注：',
    componentProps: {
      placeholder: '请输入备注',
      type: 'textarea',
      rows: 3,
      maxlength: 100,
      showWordLimit: true
    }
  },
  {
    field: 'status',
    component: 'Switch' as const,
    label: '状态：',
    value: true,
    componentProps: {
      activeValue: 1,
      inactiveValue: 2
    }
  }
]) as FormSchema[]

const { formRegister, formMethods } = useForm()

const handleAdd = () => {
  dialogType.value = 'add'
  dialogVisible.value = true
  formMethods.setValues({
    fee: botPrice.value?.amount || 100,
    token: '',
    tg_admin: '',
    describe: '',
    status: 2
  })
}

const handleBotSwitchChange = async (row: any, field: 'status' | 'auto_renew', value: number) => {
  if (!isLoaded.value) return
  const previousValue = value === 1 ? 2 : 1

  try {
    const detailRes = await v1GetBotDetail(row.id)
    if (detailRes.code !== '000000' || !detailRes.data) {
      row[field] = previousValue
      handleErrorMessage(detailRes, '获取机器人详情失败')
      return
    }

    const payload = buildBotUpdatePayload(detailRes.data, { [field]: value })
    const validationMessage = validateBotUpdatePayload(payload)

    if (validationMessage) {
      row[field] = previousValue
      handleErrorMessage(validationMessage, '状态更新失败')
      return
    }

    const res = await v1UpdateBot(payload)
    if (res.code === '000000') {
      await searchTableRef.value?.reload()
      handleSuccessMessage('状态更新成功')
    } else {
      row[field] = previousValue
      handleErrorMessage(res, '状态更新失败')
    }
  } catch (error) {
    row[field] = previousValue
    handleErrorMessage(error, '状态更新失败')
  }
}

const handleEdit = (row: any) => {
  if (botConfigRef.value) {
    botConfigRef.value.open(row)
  }
}

const handleRenew = (row: any) => {
  const botInfo = {
    ...row,
    fee: row.fee || botPrice.value?.amount || 100
  }

  if (renewBotRef.value) {
    renewBotRef.value.open(botInfo)
  }
}

const handleSubmit = async () => {
  const elForm = await formMethods.getElFormExpose()

  await elForm?.validate(async (valid) => {
    if (!valid) return

    const formData = await formMethods.getFormData()
    dialogSubmitting.value = true

    try {
      const res = await v1CreateBot({
        agent_id: 0,
        token: formData.token,
        tg_admin: formData.tg_admin,
        describe: formData.describe || '',
        status: formData.status
      })

      if (res.code === '000000') {
        await searchTableRef.value?.reload()
        dialogVisible.value = false
        handleSuccessMessage(dialogType.value === 'add' ? '添加成功' : '编辑成功')
      } else {
        const errorMsg = (res as any)?.msg || (res as any)?.message || ''
        if (
          errorMsg.includes('Duplicate entry') ||
          errorMsg.includes('duplicate') ||
          errorMsg.includes('1062')
        ) {
          ElMessage.error('该机器人已存在，请勿重复添加')
        } else {
          handleErrorMessage(res, '操作失败')
        }
      }
    } catch (error: any) {
      const errorMsg = error?.message || error?.msg || String(error)
      if (
        errorMsg.includes('Duplicate entry') ||
        errorMsg.includes('duplicate') ||
        errorMsg.includes('1062')
      ) {
        ElMessage.error('该机器人已存在，请勿重复添加')
      } else {
        handleErrorMessage(error, '创建机器人失败')
      }
    } finally {
      dialogSubmitting.value = false
    }
  })
}

const fetchBotList = async (params: any) => {
  try {
    const apiParams: any = {
      current_page: params.current_page || 1,
      page_size: params.page_size || 10
    }

    if (params.keyword) apiParams.keyword = params.keyword
    if (params.agent_name) apiParams.agent_name = params.agent_name
    if (params.status !== undefined && params.status !== '') apiParams.status = params.status
    apiParams.order = params.order || DEFAULT_CREATED_AT_ORDER

    const response = await v1GetBotList(apiParams)

    if (response.code === '000000' && response.data) {
      const list = response.data.list || []
      const total = response.data.pager?.total || 0

      totalCount.value = total

      const hasSearchCondition = !!(params.keyword || params.agent_name || params.status)
      handleListMessage(list, hasSearchCondition, '机器人')

      return { list, total }
    } else {
      handleErrorMessage(response, '获取机器人列表失败')
      return { list: [], total: 0 }
    }
  } catch (error) {
    handleErrorMessage(error, '获取机器人列表失败')
    return { list: [], total: 0 }
  }
}

const handleDataLoaded = ({ data, total, success }) => {
  isLoaded.value = true
}

const handleLoadError = () => {}

const openConsumptionRecord = () => {
  consumptionRecordRef.value?.open()
}

const handleRenewSuccess = async () => {
  await searchTableRef.value?.reload()
}

const handleConfigSuccess = async () => {
  await searchTableRef.value?.reload()
}

const getBotPrice = async () => {
  try {
    const res = await v1GetBotRenewPrice()
    if (res.code === '000000') {
      botPrice.value = res.data
    } else {
      handleErrorMessage(res, '获取机器人价格失败')
    }
  } catch (error) {
    handleErrorMessage(error, '获取机器人价格失败')
  }
}

const handleUserCountClick = (botId: number | string) => {
  router.push({ path: '/user_group/user_list', query: { bot_id: botId } })
}

onMounted(async () => {
  await getBotPrice()
})
</script>
