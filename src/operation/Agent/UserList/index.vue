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
import { ElLink, ElMessage } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { SearchTable } from '@/components/SearchTable'
import type { SearchTableExpose } from '@/components/SearchTable'
import { BaseButton } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { FormSchema } from '@/components/Form'
import type { TableColumn } from '@/components/Table'
import {
  v1GetUserList,
  type UserListItem,
  type UserListParams
} from '@/api/opertion/Agent/UserList'
import { v1GetMessageBotList, type MessageBotItem } from '@/api/opertion/common/message'
import { useRoute, useRouter } from 'vue-router'
import { handleListMessage, handleErrorMessage } from '@/utils/messageHelper'
import {
  dateRangeToSeconds,
  exportTableData,
  formatTableDateTime,
  hasSearchValue
} from '@/utils/tableHelpers'
import MessageDialog from '../components/MessageDialog.vue'
import RechargeDialog from '../components/UserDialogs/RechargeDialog.vue'
import BalanceRecordDialog from '../components/UserDialogs/BalanceRecordDialog.vue'
import ChangePasswordDialog from '../components/UserDialogs/ChangePasswordDialog.vue'

const route = useRoute()
const router = useRouter()

type UserDateRange = [string | number | Date, string | number | Date]
type UserSearchParams = Omit<UserListParams, 'start_time' | 'end_time' | 'origin'> & {
  origin?: number | string
  dateRange?: UserDateRange
}

type BotOption = {
  label: string
  value: string
}

type UserListRow = UserListItem & {
  bot_user_name?: string
  agent_name?: string
}

const currentUser = ref<Partial<UserListRow>>({})
const currentAccountId = ref<number | string | null>(null)

// 消息发送相关
const messageDialogVisible = ref(false)

// 充值/余额记录/修改密码弹窗
const rechargeDialogVisible = ref(false)
const balanceRecordDialogVisible = ref(false)
const changePasswordDialogVisible = ref(false)

// 机器人列表
const isBotListLoaded = ref(false)
const botOptions = ref<BotOption[]>([{ label: '全部', value: '' }])
const botMap = ref<Map<number, MessageBotItem>>(new Map())
const searchTableRef = ref<SearchTableExpose | null>(null)

const buildUserListParams = (params: UserSearchParams = {}, pageSize?: number): UserListParams => {
  const apiParams: UserListParams = {
    current_page: Number(params.current_page) || 1,
    page_size: (pageSize ?? Number(params.page_size)) || 10
  }

  if (params.keyword) apiParams.keyword = params.keyword
  if (hasSearchValue(params.bot_id)) apiParams.bot_id = Number(params.bot_id)
  if (hasSearchValue(params.origin)) apiParams.origin = Number(params.origin)
  if (params.order) apiParams.order = params.order

  return {
    ...apiParams,
    ...dateRangeToSeconds(params.dateRange)
  }
}

const attachBotInfo = (item: UserListItem): UserListRow => {
  const botInfo = botMap.value.get(item.bot_id)
  return {
    ...item,
    bot_user_name: botInfo?.user_name || '',
    agent_name: botInfo?.agent_name || ''
  }
}

const isBotOriginUser = (row: Pick<UserListRow, 'tg_user_id' | 'tg_user_name'>) => {
  const hasTgUserId = row.tg_user_id && row.tg_user_id !== 0
  const hasTgUserName = row.tg_user_name && row.tg_user_name.trim() !== ''
  return Boolean(hasTgUserId || hasTgUserName)
}

const getRouteSearchParams = (): UserSearchParams => {
  const query = route.query
  const params: UserSearchParams = {}

  if (query.bot_id) {
    const botId = botOptions.value.find((opt) => opt.value === String(query.bot_id))?.value
    if (botId !== undefined) {
      params.bot_id = Number(botId)
    }
  }

  if (query.keyword) {
    params.keyword = String(query.keyword)
  }

  return params
}

const applyRouteSearchParams = (instance: SearchTableExpose) => {
  const params = getRouteSearchParams()

  if (Object.keys(params).length > 0) {
    instance.setSearchParams(params)
  }
  instance.reload()
}

// 获取机器人列表
const fetchBotList = async () => {
  isBotListLoaded.value = false
  try {
    const res = await v1GetMessageBotList()
    const bots = (res.data || []).map((bot: MessageBotItem) => {
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
        default: ({ row }: { row: UserListRow }) => {
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
        default: ({ row }: { row: UserListRow }) => {
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
        return isBotOriginUser(row) ? '机器人' : 'H5'
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
      formatter: (row) => formatTableDateTime(row.created_at)
    },
    {
      field: 'updated_at',
      label: '更新时间',
      minWidth: 170,
      sortable: 'custom',
      formatter: (row) => formatTableDateTime(row.updated_at)
    },
    {
      field: 'action',
      label: '操作',
      width: 380,
      fixed: 'right',
      slots: {
        default: ({ row }: { row: UserListRow }) => {
          const isH5User = (!row.tg_user_id || row.tg_user_id === 0) && !row.tg_user_name
          const isBotUser = isBotOriginUser(row)

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
      tips: '支持用户名/昵称/用户账号/用户邮箱查询'
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

const fetchUserList = async (
  params: UserSearchParams = {}
): Promise<{ list: UserListRow[]; total: number }> => {
  try {
    selectedSource.value = params.origin ?? ''

    const response = await v1GetUserList(buildUserListParams(params))
    const list = (response.data?.list || []).map(attachBotInfo)

    const hasSearchCondition = [
      params.keyword,
      params.bot_id,
      params.dateRange,
      params.origin
    ].some(hasSearchValue)
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

const openBotList = (botId: number) => {
  router.push({
    path: '/agent/bot_list',
    query: { bot_id: botId }
  })
}

function onSearchTableReady(instance: SearchTableExpose) {
  applyRouteSearchParams(instance)
}

// 发送消息
const openSendMessageDialog = (row: UserListRow) => {
  currentUser.value = row
  messageDialogVisible.value = true
}

// 充值
const openRechargeDialog = (row: UserListRow) => {
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
const handleChangePassword = (row: UserListRow) => {
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
    await exportTableData<UserListItem>({
      searchTableRef,
      filename: '机器人用户列表',
      fetchData: (params) => v1GetUserList(params as UserListParams),
      buildParams: (params) => buildUserListParams(params as UserSearchParams),
      mapItem: (item) => {
        const botInfo = botMap.value.get(item.bot_id)
        return {
          TG用户ID: item.tg_user_id && item.tg_user_id !== 0 ? item.tg_user_id : '-',
          TG用户昵称: item.tg_first_name || '-',
          TG用户名: item.tg_user_name || '-',
          用户账号: item.username || '-',
          用户邮箱: item.email || '-',
          机器人ID: item.bot_id,
          机器人用户名: botInfo?.user_name || '-',
          代理名称: botInfo?.agent_name || '-',
          来源: isBotOriginUser(item) ? '机器人' : 'H5',
          TRX余额: item.trx_balance || 0,
          余额单位: 'TRX',
          创建时间: formatTableDateTime(item.created_at),
          更新时间: formatTableDateTime(item.updated_at)
        }
      },
      successMessage: '用户列表导出成功'
    })
  } catch (error) {
    handleErrorMessage(error, '用户列表导出失败')
  }
}

onMounted(async () => {
  await fetchBotList()
})

// 处理 keep-alive 缓存恢复
onActivated(async () => {
  await fetchBotList()

  if (!searchTableRef.value) return
  const params = getRouteSearchParams()
  if (Object.keys(params).length > 0) {
    searchTableRef.value.setSearchParams(params)
    searchTableRef.value.reload()
  }
})
</script>

<style scoped></style>
