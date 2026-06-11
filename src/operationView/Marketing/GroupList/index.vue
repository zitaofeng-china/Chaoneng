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
import { BaseButton } from '@/components/Button'
import type { TableColumn } from '@/components/Table'
import type { FormSchema } from '@/components/Form'
import { formatToDateTime } from '@/utils/dateUtil'
import {
  v1GetMessageBotList,
  v1GetChatList,
  v1UpdateBotChat,
  type ChatListParams
} from '@/api/message'
import GroupMessageDialog from './components/GroupMessageDialog.vue'

const searchTableRef = ref()
const broadcastUpdatingMap = reactive<Record<string, boolean>>({})

// 机器人列表
const botList = ref<Array<{ label: string; value: number }>>([])

// 消息弹窗相关
const messageDialogVisible = ref(false)
const currentGroup = ref<any>(null)

const fetchBotList = async () => {
  try {
    const res = await v1GetMessageBotList()
    if (res.code === '000000' && res.data) {
      botList.value = (res.data || []).map((bot: any) => ({
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

// 搜索表单
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
      options: [
        { label: '全部', value: '' },
        { label: '群组', value: 'group' },
        { label: '超级群组', value: 'supergroup' },
        { label: '频道', value: 'channel' }
      ]
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
    formatter: (row: any) => row.name || '-'
  },
  {
    field: 'type',
    label: '类型',
    width: 110,
    formatter: (row: any) => {
      const map: Record<string, string> = {
        group: '群组',
        supergroup: '超级群组',
        channel: '频道'
      }
      return map[row.type] || row.type || '-'
    }
  },
  {
    field: 'broadcast',
    label: '是否启用播报',
    width: 110,
    slots: {
      default: ({ row }: any) => {
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
      default: (data: any) => {
        const username = data.row.bot_user_name
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
    formatter: (row: any) => row.bot_first_name || '-'
  },
  {
    field: 'agent_name',
    label: '代理名称',
    width: 140,
    formatter: (row: any) => row.agent_name || '-'
  },
  {
    field: 'size',
    label: '人数',
    width: 100,
    slots: {
      default: (data: any) => {
        return (
          <ElTag type="info" size="small">
            {data.row.size || 0}
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
      default: (data: any) => {
        const link = data.row.link
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
    formatter: (row: any) =>
      row.created_at ? formatToDateTime(Number(row.created_at) * 1000) : '-'
  },
  {
    field: 'updated_at',
    label: '更新时间',
    width: 180,
    sortable: 'custom',
    formatter: (row: any) =>
      row.updated_at ? formatToDateTime(Number(row.updated_at) * 1000) : '-'
  }
]

// 操作列
const actionColumn = {
  field: 'action',
  label: '操作',
  width: 120,
  fixed: 'right',
  slots: {
    default: (data: any) => {
      return (
        <BaseButton type="success" onClick={() => handleViewDetail(data.row)}>
          发送消息
        </BaseButton>
      )
    }
  }
}

// 获取聊天列表
const fetchGroupList = async (params: any) => {
  try {
    const apiParams: ChatListParams = {
      current_page: params.current_page || 1,
      page_size: params.page_size || 10
    }

    if (params.keyword) apiParams.keyword = params.keyword
    if (params.bot_id) apiParams.bot_id = Number(params.bot_id)
    if (params.type) apiParams.type = params.type

    if (params.date_range && params.date_range.length === 2) {
      apiParams.start_time = String(Math.floor(Number(params.date_range[0]) / 1000))
      apiParams.end_time = String(Math.floor(Number(params.date_range[1]) / 1000))
    }

    if (params.order) apiParams.order = params.order

    const response = await v1GetChatList(apiParams)

    if (response.code === '000000' && response.data) {
      const list = (response.data.list || []).map((item: any) => ({
        ...item,
        broadcast: Number(item.broadcast || 2)
      }))
      return {
        list,
        total: response.data.pager?.total || 0
      }
    } else {
      ElMessage.error((response as any).msg || '获取聊天列表失败')
      return { list: [], total: 0 }
    }
  } catch (error) {
    console.error('获取聊天列表失败:', error)
    ElMessage.error('获取聊天列表失败')
    return { list: [], total: 0 }
  }
}

const handleViewDetail = (row: any) => {
  currentGroup.value = row
  messageDialogVisible.value = true
}

const handleBroadcastChange = async (row: any, value: number) => {
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
  } catch (error: any) {
    row.broadcast = previousValue
    ElMessage.error(error?.msg || error?.message || '更新启用状态失败')
  } finally {
    broadcastUpdatingMap[id] = false
  }
}

// 消息发送成功回调
const handleMessageSuccess = () => {
  ElMessage.success('消息发送成功')
  searchTableRef.value?.reload()
}

onMounted(() => {
  fetchBotList()
})
</script>

<style scoped></style>
