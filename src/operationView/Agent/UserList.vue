<template>
  <div class="app-container">
    <ContentWrap>
      <SearchTable
        v-if="isBotListLoaded"
        :columns="columns"
        :search-schema="searchSchema"
        :fetch-data-api="fetchUserList"
        :showAddButton="false"
        :immediate="false"
        ref="searchTableRef"
        @ready="onSearchTableReady"
        :table-props="{
          rowKey: 'id',
          highlightCurrentRow: false,
          reserveSelection: false
        }"
      >
        <template #searchButtons>
          <BaseButton type="primary" @click="handleExport">
            <Icon icon="ep:download" class="mr-5px" />
            导出
          </BaseButton>
        </template>
      </SearchTable>

      <!-- 发送消息弹窗 -->
      <MessageDialog
        v-model="messageDialogVisible"
        type="mass"
        :user="currentUser"
        :bot-list="botsForDialog"
        custom-title="发送消息"
        :is-single-user="true"
        @success="handleMessageSent"
      />

      <!-- 充值弹窗 -->
      <RechargeDialog
        v-model:visible="rechargeDialogVisible"
        :user="currentUser"
        @success="handleRechargeSuccess"
      />

      <!-- 余额记录弹窗 -->
      <BalanceRecordDialog
        v-if="currentAccountId !== null"
        v-model:visible="balanceRecordDialogVisible"
        :account-id="currentAccountId"
      />

      <!-- 修改密码弹窗 -->
      <ChangePasswordDialog
        v-model:visible="changePasswordDialogVisible"
        :user="currentUser"
        @success="handlePasswordChangeSuccess"
      />
    </ContentWrap>
  </div>
</template>

<script setup lang="tsx">
import { ref, onMounted, computed, onActivated } from 'vue'
import { formatToDateTime } from '@/utils/dateUtil'
import { ElLink, ElMessage } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { SearchTable } from '@/components/SearchTable'
import { BaseButton } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { FormSchema } from '@/components/Form'
import type { TableColumn } from '@/components/Table'
import { v2GetUserList } from '@/api/agent/user_list'
import { v1GetMessageBotList } from '@/api/message'
import { useRoute, useRouter } from 'vue-router'
import { simpleExportToExcel } from '@/utils/excel'
import { handleListMessage, handleErrorMessage, handleSuccessMessage } from '@/utils/messageHelper'
import MessageDialog from './components/MessageDialog.vue'
import RechargeDialog from '@/views/UserGroup/user_list/components/RechargeDialog.vue'
import BalanceRecordDialog from '@/views/UserGroup/user_list/components/BalanceRecordDialog.vue'
import ChangePasswordDialog from '@/views/UserGroup/user_list/components/ChangePasswordDialog.vue'

const route = useRoute()
const router = useRouter()

// 当前选中用户
const currentUser = ref<any>({})
const currentAccountId = ref<number | string | null>(null)

// 消息发送相关
const messageDialogVisible = ref(false)

// 充值/余额记录/修改密码弹窗
const rechargeDialogVisible = ref(false)
const balanceRecordDialogVisible = ref(false)
const changePasswordDialogVisible = ref(false)

// 机器人列表
const isBotListLoaded = ref(false)
const botOptions = ref<{ label: string; value: string }[]>([{ label: '全部', value: '' }])
const botMap = ref<Map<number, any>>(new Map())

// 获取机器人列表
const fetchBotList = async () => {
  isBotListLoaded.value = false
  try {
    const res = await v1GetMessageBotList()
    const bots = (res.data || []).map((bot: any) => {
      botMap.value.set(bot.id, bot)
      return {
        label: bot.user_name,
        value: String(bot.id)
      }
    })

    botOptions.value = [{ label: '全部', value: '' }, ...bots]
    isBotListLoaded.value = true
  } catch (error) {
    handleErrorMessage(error, '获取机器人列表失败')
    isBotListLoaded.value = true
  }
}

// 为弹窗准备的机器人列表 (不包含"全部")
const botsForDialog = computed(() => {
  return botOptions.value.filter((option) => option.value !== '')
})

// 当前选择的来源
const selectedSource = ref<number | string>('')

// 表格字段
const columns = computed(() => {
  const allCols: TableColumn[] = [
    {
      field: 'tg_user_id',
      label: 'TG用户ID',
      minWidth: 120,
      formatter: (row) => (row.tg_user_id && row.tg_user_id !== 0 ? row.tg_user_id : '-'),
      hideWhen: 2
    },
    {
      field: 'tg_first_name',
      label: 'TG用户昵称',
      minWidth: 130,
      formatter: (row) => row.tg_first_name || '-',
      hideWhen: 2
    },
    {
      field: 'tg_user_name',
      label: 'TG用户名',
      minWidth: 120,
      slots: {
        default: ({ row }: any) => {
          if (!row.tg_user_name) return <span>-</span>
          return (
            <ElLink type="primary" href={`https://t.me/${row.tg_user_name}`} target="_blank">
              {row.tg_user_name}
            </ElLink>
          )
        }
      },
      hideWhen: 2
    },
    {
      field: 'username',
      label: '用户账号',
      minWidth: 120,
      formatter: (row) => row.username || '-',
      hideWhen: 1
    },
    {
      field: 'email',
      label: '用户邮箱',
      minWidth: 180,
      formatter: (row) => row.email || '-',
      hideWhen: 1
    },
    {
      field: 'bot_id',
      label: '机器人ID',
      minWidth: 110,
      slots: {
        default: ({ row }: any) => {
          return (
            <ElLink type="primary" onClick={() => openBotList(row.bot_id)}>
              {row.bot_id}
            </ElLink>
          )
        }
      }
    },
    {
      field: 'bot_user_name',
      label: '机器人用户名',
      minWidth: 140,
      formatter: (row) => row.bot_user_name || '-'
    },
    {
      field: 'agent_name',
      label: '代理名称',
      minWidth: 120,
      formatter: (row) => row.agent_name || '-'
    },
    {
      field: 'origin',
      label: '来源',
      width: 100,
      formatter: (row) => {
        // 根据 tg_user_id 和 tg_user_name 是否存在判断来源
        // 有 tg_user_id（且不为0）或有 tg_user_name → 机器人
        // 否则 → H5
        const hasTgUserId = row.tg_user_id && row.tg_user_id !== 0
        const hasTgUserName = row.tg_user_name && row.tg_user_name.trim() !== ''
        return hasTgUserId || hasTgUserName ? '机器人' : 'H5'
      }
    },
    {
      field: 'trx_balance',
      label: 'TRX余额',
      minWidth: 110,
      sortable: 'custom',
      formatter: (row) => `${row.trx_balance || 0} TRX`
    },
    {
      field: 'usdt_balance',
      sortable: 'custom',
      label: 'USDT余额',
      minWidth: 120,
      hidden: true,
      formatter: (row) => `${row.usdt_balance || 0} USDT`
    },
    {
      field: 'created_at',
      label: '创建时间',
      minWidth: 170,
      sortable: 'custom',
      formatter: (row) => (row.created_at ? formatToDateTime(row.created_at * 1000) : '-')
    },
    {
      field: 'updated_at',
      label: '更新时间',
      minWidth: 170,
      sortable: 'custom',
      formatter: (row) => (row.updated_at ? formatToDateTime(row.updated_at * 1000) : '-')
    },
    {
      field: 'action',
      label: '操作',
      width: 380,
      fixed: 'right',
      slots: {
        default: ({ row }) => {
          const isH5User = (!row.tg_user_id || row.tg_user_id === 0) && !row.tg_user_name
          const isBotUser = (row.tg_user_id && row.tg_user_id !== 0) || row.tg_user_name

          return (
            <div>
              <BaseButton
                type="primary"
                disabled={!isBotUser}
                onClick={() => openSendMessageDialog(row)}
              >
                发送消息
              </BaseButton>
              <BaseButton
                type="success"
                style="margin-left: 8px"
                onClick={() => openRechargeDialog(row)}
              >
                充值
              </BaseButton>
              <BaseButton
                type="warning"
                style="margin-left: 8px"
                onClick={() => handleBalanceRecord(row.id)}
              >
                余额记录
              </BaseButton>
              <BaseButton
                type="danger"
                style="margin-left: 8px"
                disabled={!isH5User}
                onClick={() => handleChangePassword(row)}
              >
                修改密码
              </BaseButton>
            </div>
          )
        }
      }
    }
  ]

  // 根据来源过滤列
  return allCols.filter((col) => {
    if (!col.hideWhen) return true
    return selectedSource.value !== col.hideWhen
  })
})

// 搜索表单配置
const searchSchema = computed<FormSchema[]>(() => [
  {
    field: 'keyword',
    component: 'Input' as const,
    label: {
      text: '关键字',
      tips: '支持用户名/昵称/用户账号/用户邮箱'
    },
    componentProps: {
      placeholder: '请输入关键字搜索'
    }
  },
  {
    field: 'bot_id',
    component: 'Select' as const,
    label: '机器人',
    componentProps: {
      options: botOptions.value,
      placeholder: '请选择机器人',
      valueKey: 'value',
      labelKey: 'label'
    }
  },
  {
    field: 'origin',
    component: 'Select' as const,
    label: '来源',
    componentProps: {
      options: [
        { label: '全部', value: '' },
        { label: '机器人', value: 1 },
        { label: 'H5', value: 2 }
      ],
      placeholder: '请选择来源',
      valueKey: 'value',
      labelKey: 'label'
    }
  },
  {
    field: 'dateRange',
    component: 'DatePicker' as const,
    label: '创建时间',
    componentProps: {
      type: 'datetimerange',
      valueFormat: 'x',
      startPlaceholder: '开始日期',
      endPlaceholder: '结束日期',
      defaultTime: [new Date(2000, 1, 1, 0, 0, 0), new Date(2000, 1, 1, 23, 59, 59)]
    }
  }
])

// 获取用户列表
const fetchUserList = async (params: any) => {
  try {
    selectedSource.value = params?.origin || ''

    const apiParams: any = {
      current_page: params?.current_page || 1,
      page_size: params?.page_size || 10
    }

    if (params?.keyword) apiParams.keyword = params.keyword
    if (params?.bot_id) apiParams.bot_id = Number(params.bot_id)
    if (params?.origin !== undefined && params?.origin !== '') {
      apiParams.origin = Number(params.origin)
    }

    // 处理排序参数
    if (params?.order) {
      apiParams.order = params.order
    }

    // 处理时间范围
    if (params?.dateRange && params.dateRange.length === 2) {
      apiParams.start_time = Math.floor(new Date(params.dateRange[0]).getTime() / 1000)
      apiParams.end_time = Math.floor(new Date(params.dateRange[1]).getTime() / 1000)
    }

    const response = await v2GetUserList(apiParams)

    // 直接使用后端返回的数据，添加机器人信息
    const list = (response.data?.list || []).map((item: any) => {
      const botInfo = botMap.value.get(item.bot_id)
      return {
        ...item,
        bot_user_name: botInfo?.user_name || '',
        agent_name: botInfo?.agent_name || ''
      }
    })

    const hasSearchCondition = !!(
      params?.keyword ||
      params?.bot_id ||
      params?.dateRange ||
      params?.origin
    )
    handleListMessage(list, hasSearchCondition, '用户')

    return {
      list,
      total: response.data?.pager?.total || 0
    }
  } catch (error) {
    handleErrorMessage(error, '获取用户列表失败')
    return { list: [], total: 0 }
  }
}

const searchTableRef = ref()

const openBotList = (botId: number) => {
  router.push({
    path: '/agent/bot_list',
    query: { bot_id: botId }
  })
}

function onSearchTableReady(instance: any) {
  const query = route.query
  const params: Record<string, any> = {}

  if (query.bot_id) {
    const botId = botOptions.value.find((opt) => opt.value === String(query.bot_id))?.value
    if (botId !== undefined) {
      params.bot_id = botId
    }
  }

  if (query.keyword) {
    params.keyword = String(query.keyword)
  }

  if (Object.keys(params).length > 0) {
    instance.setSearchParams(params)
  }
  instance.reload()
}

// 发送消息
const openSendMessageDialog = (row: any) => {
  currentUser.value = row
  messageDialogVisible.value = true
}

// 充值
const openRechargeDialog = (row: any) => {
  currentUser.value = row
  rechargeDialogVisible.value = true
}

const handleRechargeSuccess = () => {
  searchTableRef.value?.reload()
}

// 余额记录
const handleBalanceRecord = (accountId: number | string) => {
  if (!accountId) {
    ElMessage.warning('无法获取用户ID')
    return
  }
  currentAccountId.value = accountId
  balanceRecordDialogVisible.value = true
}

// 修改密码
const handleChangePassword = (row: any) => {
  currentUser.value = row
  changePasswordDialogVisible.value = true
}

const handlePasswordChangeSuccess = () => {
  searchTableRef.value?.reload()
}

// 消息发送成功
const handleMessageSent = () => {
  messageDialogVisible.value = false
}

// 导出
const handleExport = async () => {
  try {
    const params = await searchTableRef.value?.searchMethods.getFormData()

    const exportParams: any = {
      page_size: -1 // 导出所有数据
    }

    if (params?.keyword) exportParams.keyword = params.keyword
    if (params?.bot_id) exportParams.bot_id = Number(params.bot_id)
    if (params?.origin !== undefined && params?.origin !== '') {
      exportParams.origin = Number(params.origin)
    }

    if (params?.dateRange && params.dateRange.length === 2) {
      exportParams.start_time = Math.floor(new Date(params.dateRange[0]).getTime() / 1000)
      exportParams.end_time = Math.floor(new Date(params.dateRange[1]).getTime() / 1000)
    }

    const res = await v2GetUserList(exportParams)

    if (res.code === '000000' && res.data) {
      const list = (res.data.list || []).map((item: any) => {
        const botInfo = botMap.value.get(item.bot_id)
        const hasTgUserId = item.tg_user_id && item.tg_user_id !== 0
        const hasTgUserName = item.tg_user_name && item.tg_user_name.trim() !== ''
        return {
          TG用户ID: item.tg_user_id && item.tg_user_id !== 0 ? item.tg_user_id : '-',
          TG用户昵称: item.tg_first_name || '-',
          TG用户名: item.tg_user_name || '-',
          用户账号: item.username || '-',
          用户邮箱: item.email || '-',
          机器人ID: item.bot_id,
          机器人用户名: botInfo?.user_name || '-',
          代理名称: botInfo?.agent_name || '-',
          来源: hasTgUserId || hasTgUserName ? '机器人' : 'H5',
          TRX余额: item.trx_balance || 0,
          余额单位: 'TRX',
          创建时间: item.created_at ? formatToDateTime(item.created_at * 1000) : '-',
          更新时间: item.updated_at ? formatToDateTime(item.updated_at * 1000) : '-'
        }
      })

      simpleExportToExcel(list, '机器人用户列表')
      handleSuccessMessage('用户列表导出成功')
    } else {
      handleErrorMessage(res, '导出失败')
    }
  } catch (error) {
    handleErrorMessage(error, '用户列表导出失败')
  }
}

onMounted(async () => {
  await fetchBotList()
})

// 处理 keep-alive 缓存恢复
onActivated(async () => {
  // 重新获取机器人列表（保持下拉数据最新）
  await fetchBotList()

  if (!searchTableRef.value) return
  const query = route.query
  const params: Record<string, any> = {}

  if (query.bot_id) {
    const botId = botOptions.value.find((opt) => opt.value === String(query.bot_id))?.value
    if (botId !== undefined) {
      params.bot_id = botId
    }
  }

  if (query.keyword) {
    params.keyword = String(query.keyword)
  }

  if (Object.keys(params).length > 0) {
    searchTableRef.value.setSearchParams(params)
    searchTableRef.value.reload()
  }
})
</script>

<style scoped></style>
