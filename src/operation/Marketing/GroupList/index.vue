<template>
  <div class="app-container">
    <ContentWrap>
      <SearchTable
        :columns="columns"
        :search-schema="searchSchema"
        :fetch-data-api="fetchGroupList"
        :show-add-button="false"
        :action-column="actionColumn"
        ref="searchTableRef"
      />
    </ContentWrap>

    <!-- 发送消息弹窗 -->
    <GroupMessageDialog
      v-model="messageDialogVisible"
      :current-group="currentGroup"
      :bot-list="botList"
      @success="handleMessageSuccess"
    />
  </div>
</template>

<script setup lang="tsx">
import { ref, reactive, onMounted } from 'vue'
import { ElTag, ElLink, ElMessage, ElSwitch } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { SearchTable } from '@/components/SearchTable'
import type { SearchTableExpose } from '@/components/SearchTable'
import { BaseButton } from '@/components/Button'
import type { TableColumn } from '@/components/Table'
import type { FormSchema } from '@/components/Form'
import {
  dateRangeToSeconds,
  formatTableDateTime,
  hasSearchValue,
  withAllOption
} from '@/utils/tableHelpers'
import { getErrorMessage } from '@/utils/messageHelper'
import {
  v1GetMessageBotList,
  v1GetChatList,
  v1UpdateBotChat,
  type ChatListParams,
  type MessageBotItem,
  type MessageChatItem
} from '@/api/opertion/common/message'
import GroupMessageDialog from './components/GroupMessageDialog.vue'
import { CHAT_TYPE_OPTIONS, getChatTypeText } from '@/operation/utils/chat'

type ChatRow = Omit<MessageChatItem, 'broadcast'> & {
  broadcast: number
}

type ChatTableSlot = { row: ChatRow }
type ChatSearchParams = ChatListParams & {
  date_range?: [string | number, string | number]
}
type BotOption = { label: string; value: number }

const searchTableRef = ref<SearchTableExpose | null>(null)
const broadcastUpdatingMap = reactive<Record<string, boolean>>({})

const botList = ref<BotOption[]>([])

const messageDialogVisible = ref(false)
const currentGroup = ref<ChatRow | null>(null)

const formatChatTime = (value?: string | number) => {
  return formatTableDateTime(value)
}

const fetchBotList = async () => {
  try {
    const res = await v1GetMessageBotList()
    if (res.code === '000000' && res.data) {
      botList.value = (res.data || []).map((bot: MessageBotItem) => ({
        label: bot.user_name,
        value: bot.id
      }))
    } else {
      botList.value = []
    }
  } catch (error) {
    botList.value = []
  }
}

const searchSchema = reactive<FormSchema[]>([
  {
    field: 'keyword',
    component: 'Input',
    label: '关键字',
    componentProps: {
      placeholder: '请输入聊天ID/聊天名称搜索',
      clearable: true
    }
  },
  {
    field: 'bot_id',
    component: 'Select',
    label: '机器人',
    componentProps: {
      options: botList,
      placeholder: '请选择机器人',
      clearable: true
    }
  },
  {
    field: 'type',
    component: 'Select',
    label: '类型',
    componentProps: {
      placeholder: '请选择类型',
      clearable: true,
      options: withAllOption(CHAT_TYPE_OPTIONS)
    }
  },
  {
    field: 'date_range',
    component: 'DatePicker',
    label: '时间范围',
    componentProps: {
      type: 'datetimerange',
      startPlaceholder: '开始日期',
      endPlaceholder: '结束日期',
      format: 'YYYY-MM-DD HH:mm:ss',
      valueFormat: 'x',
      style: { width: '240px' },
      defaultTime: [new Date(2000, 1, 1, 0, 0, 0), new Date(2000, 1, 1, 23, 59, 59)]
    }
  }
])

const columns: TableColumn[] = [
  {
    field: 'id',
    label: 'ID',
    width: 150
  },
  {
    field: 'name',
    label: '名称',
    minWidth: 180,
    formatter: (row: ChatRow) => row.name || '-'
  },
  {
    field: 'type',
    label: '类型',
    width: 110,
    formatter: (row: ChatRow) => getChatTypeText(row.type)
  },
  {
    field: 'broadcast',
    label: '是否启用',
    width: 110,
    slots: {
      default: ({ row }: ChatTableSlot) => {
        return (
          <ElSwitch
            v-model={row.broadcast}
            activeValue={1}
            inactiveValue={2}
            active-text="启用"
            inactive-text="禁用"
            inline-prompt
            loading={!!broadcastUpdatingMap[String(row.id)]}
            onChange={(value: number) => handleBroadcastChange(row, value)}
          />
        )
      }
    }
  },
  {
    field: 'bot_user_name',
    label: '机器人用户名',
    width: 150,
    slots: {
      default: ({ row }: ChatTableSlot) => {
        const username = row.bot_user_name
        if (!username) return <span>-</span>
        return (
          <ElLink type="primary" onClick={() => window.open(`https://t.me/${username}`, '_blank')}>
            {username}
          </ElLink>
        )
      }
    }
  },
  {
    field: 'bot_id',
    label: '机器人ID',
    width: 120
  },
  {
    field: 'bot_first_name',
    label: '机器人昵称',
    width: 150,
    formatter: (row: ChatRow) => row.bot_first_name || '-'
  },
  {
    field: 'agent_name',
    label: '代理名称',
    width: 140,
    formatter: (row: ChatRow) => row.agent_name || '-'
  },
  {
    field: 'size',
    label: '人数',
    width: 100,
    slots: {
      default: ({ row }: ChatTableSlot) => {
        return (
          <ElTag type="info" size="small">
            {row.size || 0}
          </ElTag>
        )
      }
    }
  },
  {
    field: 'link',
    label: '链接',
    width: 200,
    slots: {
      default: ({ row }: ChatTableSlot) => {
        const link = row.link
        if (!link) return <span>-</span>
        return (
          <ElLink type="primary" onClick={() => window.open(link, '_blank')}>
            {link}
          </ElLink>
        )
      }
    }
  },
  {
    field: 'created_at',
    label: '创建时间',
    width: 180,
    sortable: 'custom',
    formatter: (row: ChatRow) => formatChatTime(row.created_at)
  },
  {
    field: 'updated_at',
    label: '更新时间',
    width: 180,
    sortable: 'custom',
    formatter: (row: ChatRow) => formatChatTime(row.updated_at)
  }
]

const actionColumn = {
  field: 'action',
  label: '操作',
  width: 120,
  fixed: 'right',
  slots: {
    default: ({ row }: ChatTableSlot) => {
      return (
        <BaseButton type="success" onClick={() => handleViewDetail(row)}>
          发送消息
        </BaseButton>
      )
    }
  }
}

const buildChatListParams = (params: ChatSearchParams = {}): ChatListParams => {
  const apiParams: ChatListParams = {
    current_page: Number(params.current_page) || 1,
    page_size: Number(params.page_size) || 10
  }

  if (hasSearchValue(params.keyword)) apiParams.keyword = String(params.keyword).trim()
  if (hasSearchValue(params.bot_id)) apiParams.bot_id = Number(params.bot_id)
  if (hasSearchValue(params.type)) apiParams.type = String(params.type)

  Object.assign(apiParams, dateRangeToSeconds(params.date_range))

  if (hasSearchValue(params.order)) apiParams.order = String(params.order)

  return apiParams
}

const fetchGroupList = async (params: ChatSearchParams = {}) => {
  try {
    const apiParams = buildChatListParams(params)
    const response = await v1GetChatList(apiParams)

    if (response.code === '000000' && response.data) {
      const list: ChatRow[] = (response.data.list || []).map((item: MessageChatItem) => ({
        ...item,
        broadcast: Number(item.broadcast || 2)
      }))
      return {
        list,
        total: response.data.pager?.total || 0
      }
    } else {
      ElMessage.error(response.msg || '获取聊天列表失败')
      return { list: [], total: 0 }
    }
  } catch (error: unknown) {
    ElMessage.error(getErrorMessage(error, '获取聊天列表失败'))
    return { list: [], total: 0 }
  }
}

const handleViewDetail = (row: ChatRow) => {
  currentGroup.value = row
  messageDialogVisible.value = true
}

const handleBroadcastChange = async (row: ChatRow, value: number) => {
  const id = String(row.id)
  const previousValue = value === 1 ? 2 : 1
  broadcastUpdatingMap[id] = true
  try {
    await v1UpdateBotChat({
      id: row.id,
      bot_id: row.bot_id,
      broadcast: value
    })
    ElMessage.success(value === 1 ? '已启用' : '已禁用')
  } catch (error: unknown) {
    row.broadcast = previousValue
    ElMessage.error(getErrorMessage(error, '更新启用状态失败'))
  } finally {
    broadcastUpdatingMap[id] = false
  }
}

const handleMessageSuccess = () => {
  ElMessage.success('消息发送成功')
  searchTableRef.value?.reload()
}

onMounted(() => {
  fetchBotList()
})
</script>

<style scoped></style>
