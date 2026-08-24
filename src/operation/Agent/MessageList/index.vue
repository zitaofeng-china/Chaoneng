<template>
  <ContentWrap>
    <SearchTable
      :columns="tableColumns"
      :search-schema="searchSchema"
      :fetch-data-api="fetchMessageList"
      :show-add-button="false"
      ref="searchTableRef"
    >
      <template #searchButtons>
        <BaseButton type="primary" @click="openMassSendDialog()">发送消息</BaseButton>
        <BaseButton type="success" @click="goToInlineButtons()">内联按钮</BaseButton>
      </template>
    </SearchTable>

    <!-- 发送消息弹窗 -->
    <MessageDialog
      v-model="messageDialogVisible"
      type="mass"
      :bot-list="botsForDialog"
      :custom-title="messageDialogCustomTitle"
      :is-single-user="false"
      @success="handleMessageSent"
    />

    <MessagePreviewDialog
      v-model="detailDialogVisible"
      :preview-data="detailPreviewData"
      title="消息详情"
      :submitting="false"
      :readonly="true"
      @confirm="detailDialogVisible = false"
      @cancel="detailDialogVisible = false"
    />

    <MessagePreviewDialog
      v-model="filePreviewDialogVisible"
      :preview-data="filePreviewData"
      title="文件预览"
      :submitting="false"
      :readonly="true"
      @confirm="filePreviewDialogVisible = false"
      @cancel="filePreviewDialogVisible = false"
    />

    <!-- 内联按钮管理弹窗 -->
    <InlineButtonDialog v-model="inlineButtonDialogVisible" />

    <!-- 高级设置弹窗 -->
    <AdvancedSettingsDialog
      v-model="advancedSettingsDialogVisible"
      :row-data="currentEditRow"
      @success="handleAdvancedSettingsSuccess"
    />
  </ContentWrap>
</template>

<script setup lang="tsx">
import { ref, computed, onMounted } from 'vue'
import { ContentWrap } from '@/components/ContentWrap'
import { SearchTable } from '@/components/SearchTable'
import type { SearchTableExpose } from '@/components/SearchTable'
import { BaseButton } from '@/components/Button'
import type { TableColumn } from '@/components/Table'
import type { FormSchema } from '@/components/Form'
import { ElMessage, ElMessageBox, ElImageViewer } from 'element-plus'
import {
  v1GetMassSendList,
  v1SendGroupMessage,
  v1DeleteMassSend
} from '@/api/opertion/common/tgUser'
import { v1GetMessageBotList, type MessageBotItem } from '@/api/opertion/common/message'
import type {
  MassSendListParamsV1,
  MassSendItemV1,
  SendGroupMessageParamsV1
} from '@/api/opertion/common/tgUser'
import MessageDialog from '../components/MessageDialog.vue'
import InlineButtonDialog from '@/operation/components/InlineButtonDialog.vue'
import AdvancedSettingsDialog from './components/AdvancedSettingsDialog.vue'
import MessagePreviewDialog from '@/operation/components/MessageDialog/components/MessagePreviewDialog.vue'
import type { MessagePreviewData } from '@/operation/components/MessageDialog/components/MessagePreviewDialog.vue'
import { getErrorMessage, handleErrorMessage, handleListMessage } from '@/utils/messageHelper'
import { getReplyContentPreviewText, normalizeReplyContentHtml } from '@/utils/replyContent'
import { buildSinglePreviewFile, toSingleFileUrl } from '@/operation/components/MessageDialog/utils'
import {
  createPageParams,
  formatTableDateTime,
  hasSearchValue,
  withAllOption,
  type SelectOption,
  type TableSlot
} from '@/utils/tableHelpers'
import { MESSAGE_SEND_KIND_OPTIONS } from '../constants'

type BotOption = SelectOption<number>
type MessageTableSlot = TableSlot<MassSendItemV1>
type MessageDetailRecord = Partial<MassSendItemV1> & {
  htmlContent?: string
}

type MessageSearchParams = Omit<MassSendListParamsV1, 'bot_id' | 'kind'> & {
  bot_id?: number | string
  kind?: number | string
}
const DEFAULT_CREATED_AT_ORDER = 'created_at DESC'

const buildMessageListParams = (params: MessageSearchParams = {}): MassSendListParamsV1 => {
  const queryParams: MassSendListParamsV1 = {
    ...createPageParams(params)
  }

  if (hasSearchValue(params.bot_id) && Number(params.bot_id) !== 0) {
    queryParams.bot_id = Number(params.bot_id)
  }
  if (hasSearchValue(params.kind) && (Number(params.kind) === 1 || Number(params.kind) === 2)) {
    queryParams.kind = Number(params.kind)
  }
  queryParams.order = params.order || DEFAULT_CREATED_AT_ORDER

  return queryParams
}

const toNumberList = (list: Array<number | string> = []) => {
  return list.map((id) => Number(id)).filter((id) => !Number.isNaN(id))
}

const formatSentTime = (sentAt: string | number): string => {
  return formatTableDateTime(sentAt, '—')
}

const searchTableRef = ref<SearchTableExpose | null>(null)

const botOptions = ref<BotOption[]>(withAllOption([], 0))

// 消息发送相关
const messageDialogVisible = ref(false)
const messageDialogCustomTitle = ref('')

const detailDialogVisible = ref(false)
const currentDetailRecord = ref<MessageDetailRecord>({})
const detailPreviewData = ref<MessagePreviewData>({})

const filePreviewDialogVisible = ref(false)
const filePreviewData = ref<MessagePreviewData>({})

// 内联按钮管理弹窗
const inlineButtonDialogVisible = ref(false)

const advancedSettingsDialogVisible = ref(false)
const currentEditRow = ref<MassSendItemV1 | null>(null)

// 初始化机器人列表
const initBotList = async () => {
  try {
    const res = await v1GetMessageBotList()

    if (res.code === '000000' && res.data && Array.isArray(res.data)) {
      const newOptions = withAllOption(
        res.data.map((bot: MessageBotItem) => ({
          label: bot.user_name,
          value: bot.id
        })),
        0
      )
      botOptions.value = newOptions

      updateBotOptions(newOptions)
    }
  } catch (error) {
    handleErrorMessage(error, '获取机器人列表失败')
  }
}

// 为弹窗准备的机器人列表（转换为 string value，过滤掉"全部"选项）
const botsForDialog = computed(() => {
  return botOptions.value
    .filter((bot) => bot.value !== 0)
    .map((bot) => ({
      label: bot.label,
      value: String(bot.value)
    }))
})

// 打开发送消息弹窗
const openMassSendDialog = () => {
  messageDialogCustomTitle.value = '发送消息'
  messageDialogVisible.value = true
}

// 消息发送成功处理
const handleMessageSent = async () => {
  messageDialogVisible.value = false
  await searchTableRef.value?.reload()
}

// 跳转到内联按钮管理页面
const goToInlineButtons = () => {
  inlineButtonDialogVisible.value = true
}

const getNormalizedMessageHtml = (content?: string) => normalizeReplyContentHtml(content)

const handleFilePreview = (row: MassSendItemV1) => {
  filePreviewData.value = {
    botName: row.bot_name || (row.bot_id ? `机器人 ID: ${row.bot_id}` : ''),
    files: buildSinglePreviewFile(row.file ?? row.files)
  }
  filePreviewDialogVisible.value = true
}

const handleViewDetail = (row: MassSendItemV1) => {
  currentDetailRecord.value = { ...row, htmlContent: getNormalizedMessageHtml(row.content) }
  detailPreviewData.value = {
    botName: row.bot_name || (row.bot_id ? `机器人 ID: ${row.bot_id}` : ''),
    content: row.content || '',
    files: buildSinglePreviewFile(row.file ?? row.files),
    buttons: (row.inner_buttons || []).flatMap((buttonRow) =>
      buttonRow.map((button) => ({
        id: Number(button.id),
        text: button.text || ''
      }))
    )
  }
  detailDialogVisible.value = true
}

const handleEdit = (row: MassSendItemV1) => {
  currentEditRow.value = row
  advancedSettingsDialogVisible.value = true
}

// 高级设置成功回调
const handleAdvancedSettingsSuccess = async () => {
  await searchTableRef.value?.reload()
}

const handleResend = async (row: MassSendItemV1) => {
  try {
    await ElMessageBox.confirm('确定要立即重发这条消息吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const resendParams: SendGroupMessageParamsV1 = {
      bot_ids: [row.bot_id],
      content: row.content || '',
      delete_sent: row.delete_sent || 2,
      file: toSingleFileUrl(row.file ?? row.files),
      inner_buttons: (row.inner_buttons || []).map((rowBtns) => rowBtns.map((btn) => btn.id)),
      period: 0,
      send_at: Math.floor(Date.now() / 1000),
      chat_ids: toNumberList(row.chat_ids || []),
      tg_user_ids: row.tg_user_ids || []
    }

    const res = await v1SendGroupMessage(resendParams)

    if (res.code === '000000') {
      await searchTableRef.value?.reload()
      ElMessage.success('重发成功')
    } else {
      ElMessage.error(res.msg || '重发失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(getErrorMessage(error, '重发失败'))
    }
  }
}

const handleDelete = async (row: MassSendItemV1) => {
  try {
    await ElMessageBox.confirm('确定要删除这条发送消息记录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const res = await v1DeleteMassSend(row.id)
    if (res.code === '000000') {
      await searchTableRef.value?.reload()
      ElMessage.success('删除成功')
    } else {
      ElMessage.error(res.msg || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(getErrorMessage(error, '删除失败'))
    }
  }
}

const searchSchema = ref<FormSchema[]>([
  {
    field: 'bot_id',
    component: 'Select',
    label: '机器人',
    colProps: { span: 6 },
    componentProps: {
      options: botOptions.value,
      placeholder: '请选择机器人',
      clearable: true
    }
  },
  {
    field: 'kind',
    component: 'Select',
    label: '信息类别',
    colProps: { span: 6 },
    componentProps: {
      options: MESSAGE_SEND_KIND_OPTIONS,
      placeholder: '请选择信息类别',
      clearable: true
    }
  }
])

// 动态更新 searchSchema 的函数
const updateBotOptions = (options: BotOption[]) => {
  searchSchema.value[0].componentProps.options = options
}

const tableColumns: TableColumn[] = [
  {
    field: 'bot_id',
    label: '机器人ID',
    minWidth: 110
  },
  {
    field: 'bot_name',
    label: '发送目标',
    minWidth: 120,
    formatter: (row) => row.bot_name || '-'
  },
  {
    field: 'tg_user_ids',
    label: '发送对象',
    minWidth: 180,
    formatter: (row) => {
      const hasUsers = row.tg_user_ids && row.tg_user_ids.length > 0
      const chatIds: (number | string)[] = row.chat_ids || []
      const channelIds = chatIds.filter((id) => String(id).startsWith('-100'))
      const groupIds = chatIds.filter((id) => !String(id).startsWith('-100'))
      const hasChannels = channelIds.length > 0
      const hasGroups = groupIds.length > 0

      // 如果都没有，表示全部用户
      if (!hasUsers && !hasChannels && !hasGroups) {
        return '全部用户'
      }

      const parts: string[] = []

      // 处理用户
      if (hasUsers) {
        if (row.tg_user_ids.length === 1) {
          parts.push(`用户${row.tg_user_ids[0]}`)
        } else {
          parts.push(`${row.tg_user_ids.length}个用户`)
        }
      }

      // 处理频道
      if (hasChannels) {
        if (channelIds.length === 1) {
          parts.push(`频道${channelIds[0]}`)
        } else {
          parts.push(`${channelIds.length}个频道`)
        }
      }

      // 处理群组
      if (hasGroups) {
        if (groupIds.length === 1) {
          parts.push(`群组${groupIds[0]}`)
        } else {
          parts.push(`${groupIds.length}个群组`)
        }
      }

      return parts.join(' + ')
    }
  },
  {
    field: 'content',
    label: '消息内容',
    minWidth: 200,
    showOverflowTooltip: false,
    slots: {
      default: ({ row }: MessageTableSlot) => {
        const htmlContent = getNormalizedMessageHtml(row.content)
        const previewText = getReplyContentPreviewText(row.content)
        if (!htmlContent) return <span>—</span>

        return (
          <ElTooltip
            effect="light"
            placement="bottom-start"
            popperClass="message-content-tooltip"
            showAfter={150}
          >
            {{
              default: () => (
                <div
                  style={{
                    display: 'block',
                    width: '100%',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    lineHeight: '20px',
                    height: '20px',
                    maxHeight: '20px'
                  }}
                >
                  {previewText}
                </div>
              ),
              content: () => (
                <div
                  class="message-content-tooltip__content"
                  style={{
                    display: 'inline-block',
                    width: 'fit-content',
                    maxWidth: 'calc(100vw - 280px)',
                    maxHeight: 'min(320px, calc(100vh - 220px))',
                    overflowX: 'hidden',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.5',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    boxSizing: 'border-box'
                  }}
                  innerHTML={htmlContent}
                ></div>
              )
            }}
          </ElTooltip>
        )
      }
    }
  },
  {
    field: 'file',
    label: '文件',
    align: 'center',
    width: 100,
    slots: {
      default: ({ row }: MessageTableSlot) => {
        if (toSingleFileUrl(row.file ?? row.files)) {
          return (
            <a
              style="color: var(--el-color-primary); cursor: pointer; text-decoration: none;"
              onClick={() => handleFilePreview(row)}
            >
              查看
            </a>
          )
        }
        return <div style="text-align: center;">—</div>
      }
    }
  },
  {
    field: 'send_at',
    label: '发送时间',
    minWidth: 170,
    formatter: (row) => formatSentTime(row.send_at)
  },
  {
    field: 'time_diff',
    label: '距离上次发送',
    minWidth: 130,
    formatter: (row) => {
      if (!row.send_at) return '—'
      const now = Date.now()
      let sentTime: number

      if (typeof row.send_at === 'number') {
        sentTime = row.send_at < 10000000000 ? row.send_at * 1000 : row.send_at
      } else if (typeof row.send_at === 'string') {
        sentTime = new Date(row.send_at).getTime()
      } else {
        return '—'
      }

      if (isNaN(sentTime) || sentTime <= 0) return '—'

      const diffMs = now - sentTime
      if (diffMs < 0) return '未发送'

      const diffMinutes = Math.floor(diffMs / 1000 / 60)
      if (diffMinutes < 60) return `${diffMinutes}分钟`

      const diffHours = Math.floor(diffMinutes / 60)
      if (diffHours < 24) return `${diffHours}小时`

      const diffDays = Math.floor(diffHours / 24)
      return `${diffDays}天`
    }
  },
  {
    field: 'delete_sent',
    label: '删除上次',
    width: 100,
    formatter: (row) => {
      return row.delete_sent === 1 ? '是' : '否'
    }
  },
  {
    field: 'period',
    label: '信息类别',
    minWidth: 120,
    formatter: (row) => {
      if (row.period === null || row.period === 0 || row.period === 4294967295) return '只发一次'
      return `${row.period}小时`
    }
  },
  {
    field: 'created_at',
    label: '创建时间',
    minWidth: 170,
    sortable: 'custom',
    formatter: (row) => formatTableDateTime(row.created_at)
  },
  {
    field: 'action',
    label: '操作',
    width: 300,
    fixed: 'right',
    slots: {
      default: ({ row }: MessageTableSlot) => {
        return (
          <div style="display: flex; gap: 4px; justify-content: center;">
            <BaseButton type="primary" onClick={() => handleEdit(row)} style="margin: 0;">
              高级设置
            </BaseButton>
            <BaseButton type="success" onClick={() => handleResend(row)} style="margin: 0;">
              重发
            </BaseButton>
            <BaseButton type="default" onClick={() => handleViewDetail(row)} style="margin: 0;">
              详情
            </BaseButton>
            <BaseButton type="danger" onClick={() => handleDelete(row)} style="margin: 0;">
              删除
            </BaseButton>
          </div>
        )
      }
    }
  }
]

const fetchMessageList = async (
  params: MessageSearchParams = {}
): Promise<{ list: MassSendItemV1[]; total: number }> => {
  try {
    const response = await v1GetMassSendList(buildMessageListParams(params))

    if (response.code === '000000' && response.data) {
      const list = response.data.list || []
      const hasSearchCondition = [params.bot_id, params.kind].some(hasSearchValue)
      handleListMessage(list, hasSearchCondition, '消息记录')
      return {
        list,
        total: response.data.pager?.total || 0
      }
    }

    return { list: [], total: 0 }
  } catch (error) {
    handleErrorMessage(error, '获取消息列表失败')
    return { list: [], total: 0 }
  }
}

// 组件挂载时初始化机器人列表
onMounted(() => {
  initBotList()
})
</script>
