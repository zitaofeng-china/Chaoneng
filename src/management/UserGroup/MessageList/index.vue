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

    <!-- 重发消息预览弹窗（内联按钮布局与运营端统一） -->
    <MessagePreviewDialog
      v-model="resendPreviewVisible"
      :preview-data="resendPreviewData"
      :submitting="resending"
      confirm-button-text="确认发送"
      @confirm="handleConfirmResend"
      @cancel="resendPreviewVisible = false"
    />
  </ContentWrap>
</template>

<script setup lang="tsx">
import { ref, computed, onMounted } from 'vue'
import { ContentWrap } from '@/components/ContentWrap'
import { SearchTable } from '@/components/SearchTable'
import { BaseButton } from '@/components/Button'
import type { TableColumn } from '@/components/Table'
import type { FormSchema } from '@/components/Form'
import { formatToDateTime } from '@/utils/dateUtil'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  v1GetMassSendList,
  v1DeleteMassSend,
  v1SendGroupMessage
} from '@/api/management/common/tgUser'
import { v1GetMessageBotList } from '@/api/management/common/message'
import type { MassSendListParamsV1 } from '@/api/management/common/tgUser/types'
import MessageDialog from '../UserList/components/MessageDialog/index.vue'
import InlineButtonDialog from './components/InlineButtonDialog.vue'
import AdvancedSettingsDialog from './components/AdvancedSettingsDialog.vue'
import MessagePreviewDialog from '../UserList/components/MessageDialog/components/MessagePreviewDialog.vue'
import type { MessagePreviewData } from '../UserList/components/MessageDialog/components/MessagePreviewDialog.vue'
import { handleErrorMessage } from '@/utils/messageHelper'
import { getReplyContentPreviewText, normalizeReplyContentHtml } from '@/utils/replyContent'
import { getMessageFileType } from '@/components/business/message/MessageDialog/messageFile'

// SearchTable 引用
const searchTableRef = ref<InstanceType<typeof SearchTable> | null>(null)
const DEFAULT_CREATED_AT_ORDER = 'created_at DESC'

// 机器人下拉选项
const botOptions = ref<Array<{ label: string; value: number }>>([{ label: '全部', value: 0 }])

// 消息发送相关
const messageDialogVisible = ref(false)
const messageDialogCustomTitle = ref('')

// 详情弹窗
const detailDialogVisible = ref(false)
const currentDetailRecord = ref<any>({})
const detailPreviewData = ref<MessagePreviewData>({})

const getNormalizedMessageHtml = (content?: string) => normalizeReplyContentHtml(content)
const filePreviewDialogVisible = ref(false)
const filePreviewData = ref<MessagePreviewData>({})

// 内联按钮管理弹窗
const inlineButtonDialogVisible = ref(false)

// 高级设置弹窗
const advancedSettingsDialogVisible = ref(false)
const currentEditRow = ref<any>(null)

// 重发消息预览
const resendPreviewVisible = ref(false)
const resendPreviewData = ref<MessagePreviewData>({})
const resending = ref(false)
const currentResendRow = ref<any>(null)

// 初始化机器人列表
const initBotList = async () => {
  try {
    const res = await v1GetMessageBotList()

    if (res.code === '000000' && res.data && Array.isArray(res.data)) {
      const newOptions = [
        { label: '全部', value: 0 },
        ...res.data.map((bot) => ({
          label: bot.user_name,
          value: bot.id
        }))
      ]
      botOptions.value = newOptions

      // 更新 searchSchema
      updateBotOptions(newOptions)
    }
  } catch (error) {
    handleErrorMessage(error, '获取机器人列表失败')
  }
}

// 为弹窗准备的机器人列表（转换为 string value，过滤掉"全部"选项）
const botsForDialog = computed(() => {
  return botOptions.value
    .filter((bot) => bot.value !== 0) // 过滤掉"全部"选项
    .map((bot) => ({
      label: bot.label,
      value: String(bot.value)
    }))
})

// 打开群发消息弹窗
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

const buildMessagePreviewFiles = (files: string[] = []) => {
  return files.map((fileUrl) => ({
    type: getMessageFileType(fileUrl),
    url: fileUrl,
    name: fileUrl.split('/').pop() || 'file'
  }))
}

const handleFilePreview = (row: any) => {
  filePreviewData.value = {
    botName: row.bot_name || '未知机器人',
    files: buildMessagePreviewFiles(row.files || [])
  }
  filePreviewDialogVisible.value = true
}

// 查看详情
const handleViewDetail = (row: any) => {
  currentDetailRecord.value = { ...row, htmlContent: getNormalizedMessageHtml(row.content) }
  detailPreviewData.value = {
    botName: row.bot_name || '未知机器人',
    content: row.content || '',
    htmlContent: getNormalizedMessageHtml(row.content),
    files: buildMessagePreviewFiles(row.files || []),
    buttons: (row.inner_buttons || []).flat().map((btn: any) => ({
      id: Number(btn.id),
      text: btn.text || btn.name || '按钮',
      url: btn.url
    }))
  }
  detailDialogVisible.value = true
}

// 编辑消息
const handleEdit = (row: any) => {
  currentEditRow.value = row
  advancedSettingsDialogVisible.value = true
}

// 高级设置成功回调
const handleAdvancedSettingsSuccess = async () => {
  await searchTableRef.value?.reload()
}

// 重发消息
const handleResend = async (row: any) => {
  try {
    // 保存当前行数据
    currentResendRow.value = row

    // 构建接收者信息
    const hasUsers = row.tg_user_ids && row.tg_user_ids.length > 0
    const chatIds: (number | string)[] = row.chat_ids || []
    const channelIds = chatIds.filter((id) => String(id).startsWith('-100'))
    const groupIds = chatIds.filter((id) => !String(id).startsWith('-100'))
    const hasChannels = channelIds.length > 0
    const hasGroups = groupIds.length > 0

    let recipientInfo = '全部用户'
    if (hasUsers || hasChannels || hasGroups) {
      const parts: string[] = []

      if (hasUsers) {
        if (row.tg_user_ids.length === 1) {
          parts.push(`用户ID: ${row.tg_user_ids[0]}`)
        } else {
          parts.push(`${row.tg_user_ids.length}个用户`)
        }
      }

      if (hasChannels) {
        if (channelIds.length === 1) {
          parts.push(`频道ID: ${channelIds[0]}`)
        } else {
          parts.push(`${channelIds.length}个频道`)
        }
      }

      if (hasGroups) {
        if (groupIds.length === 1) {
          parts.push(`群组ID: ${groupIds[0]}`)
        } else {
          parts.push(`${groupIds.length}个群组`)
        }
      }

      recipientInfo = parts.join(' + ')
    }

    // 准备预览数据
    const previewData: MessagePreviewData = {
      botName: row.bot_name || '未知机器人',
      recipientInfo,
      content: row.content || '',
      htmlContent: getNormalizedMessageHtml(row.content),
      files: buildMessagePreviewFiles(row.files || []),
      buttons: (row.inner_buttons || []).flat().map((btn: any) => ({
        id: btn.id,
        text: btn.text || btn.name || '按钮',
        url: btn.url
      }))
    }

    resendPreviewData.value = previewData
    resendPreviewVisible.value = true
  } catch (error: any) {
    ElMessage.error('打开预览失败')
  }
}

// 确认重发（使用预览中调整后的内联按钮二维布局）
const handleConfirmResend = async (buttonLayout?: number[][]) => {
  if (!currentResendRow.value) return

  try {
    resending.value = true

    const row = currentResendRow.value

    let innerButtons: number[][] = []
    if (buttonLayout && Array.isArray(buttonLayout) && buttonLayout.length > 0) {
      innerButtons = buttonLayout.filter((r) => Array.isArray(r) && r.length > 0)
    } else {
      innerButtons = (row.inner_buttons || []).map((rowBtns: any[]) =>
        rowBtns.map((btn: any) => btn.id)
      )
    }

    // 调用发送消息接口，只修改 period 为 0 和 send_at 为当前时间
    const res = await v1SendGroupMessage({
      bot_ids: [row.bot_id],
      content: row.content || '',
      delete_sent: row.delete_sent || 2,
      files: row.files || [],
      // 与用户消息一致传二维布局；若后端仅支持一维，由网关/服务端兼容
      inner_buttons: innerButtons as any,
      period: 0, // 重发时周期改为0（只发一次）
      send_at: Math.floor(Date.now() / 1000), // 发送时间改为当前时间
      chat_ids: row.chat_ids || [],
      tg_user_ids: row.tg_user_ids || []
    })

    if (res.code === '000000') {
      resendPreviewVisible.value = false
      await searchTableRef.value?.reload()
      ElMessage.success('重发成功')
    } else {
      ElMessage.error((res as any).msg || '重发失败')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '重发失败')
  } finally {
    resending.value = false
  }
}

// 删除消息
const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除这条群发消息记录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const res = await v1DeleteMassSend(row.id)
    if (res.code === '000000') {
      await searchTableRef.value?.reload()
      ElMessage.success('删除成功')
    } else {
      ElMessage.error((res as any).msg || '删除失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

// 搜索表单配置 - 使用 ref 而不是 computed
const searchSchema = ref<FormSchema[]>([
  {
    field: 'bot_id',
    component: 'Select',
    label: '机器人',
    colProps: { span: 6 },
    componentProps: {
      options: [{ label: '全部', value: 0 }],
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
      options: [
        { label: '全部', value: 0 },
        { label: '只发一次', value: 1 },
        { label: '周期发送', value: 2 }
      ],
      placeholder: '请选择信息类别',
      clearable: true
    }
  }
])

// 动态更新 searchSchema 的函数
const updateBotOptions = (options: Array<{ label: string; value: number }>) => {
  searchSchema.value[0].componentProps.options = options
}

// 表格列配置
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
          parts.push(`用户（${row.tg_user_ids[0]}）`)
        } else {
          parts.push(`${row.tg_user_ids.length}个用户`)
        }
      }

      // 处理频道
      if (hasChannels) {
        if (channelIds.length === 1) {
          parts.push(`频道（${channelIds[0]}）`)
        } else {
          parts.push(`${channelIds.length}个频道`)
        }
      }

      // 处理群组
      if (hasGroups) {
        if (groupIds.length === 1) {
          parts.push(`群组（${groupIds[0]}）`)
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
      default: ({ row }: { row: any }) => {
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
    field: 'files',
    label: '文件',
    align: 'center',
    width: 100,
    slots: {
      default: ({ row }: { row: any }) => {
        if (row.files && row.files.length > 0) {
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
    formatter: (row) => {
      if (!row.send_at) return '—'

      let timestamp: number

      // 处理不同的时间格式
      if (typeof row.send_at === 'number') {
        // 如果是数字，判断是秒还是毫秒
        timestamp = row.send_at < 10000000000 ? row.send_at * 1000 : row.send_at
      } else if (typeof row.send_at === 'string') {
        // 如果是字符串，尝试解析
        timestamp = new Date(row.send_at).getTime()
      } else {
        return '—'
      }

      // 检查时间是否有效
      if (isNaN(timestamp) || timestamp <= 0) return '—'

      return formatToDateTime(timestamp)
    }
  },
  {
    field: 'time_diff',
    label: '距离上次发送',
    minWidth: 130,
    formatter: (row) => {
      if (!row.send_at) return '—'
      const now = Date.now()
      let sentTime: number

      // 处理不同的时间格式
      if (typeof row.send_at === 'number') {
        // 如果是数字，判断是秒还是毫秒
        sentTime = row.send_at < 10000000000 ? row.send_at * 1000 : row.send_at
      } else if (typeof row.send_at === 'string') {
        // 如果是字符串，尝试解析
        sentTime = new Date(row.send_at).getTime()
      } else {
        return '—'
      }

      // 检查时间是否有效
      if (isNaN(sentTime) || sentTime <= 0) return '—'

      const diffMs = now - sentTime
      // 如果是未来时间，显示"未发送"
      if (diffMs < 0) return '未发送'

      const diffMinutes = Math.floor(diffMs / 1000 / 60)
      // 小于1小时，显示分钟
      if (diffMinutes < 60) return `${diffMinutes}分钟`

      const diffHours = Math.floor(diffMinutes / 60)
      // 小于24小时，显示小时
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
      // null、0 和 4294967295 = 只发一次, 其他 = 周期小时数
      if (row.period === null || row.period === 0 || row.period === 4294967295) return '只发一次'
      return `${row.period}小时`
    }
  },
  {
    field: 'created_at',
    label: '创建时间',
    minWidth: 170,
    sortable: 'custom',
    formatter: (row) =>
      row.created_at ? formatToDateTime(new Date(row.created_at).getTime()) : '-'
  },
  {
    field: 'action',
    label: '操作',
    width: 350,
    fixed: 'right',
    slots: {
      default: ({ row }: { row: any }) => {
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

// API 封装 - 获取消息列表
const fetchMessageList = async (params: any) => {
  try {
    const queryParams: MassSendListParamsV1 = {
      current_page: Number(params.current_page) || 1,
      page_size: Number(params.page_size) || 10
    }

    // 添加可选参数
    if (params.bot_id) {
      queryParams.bot_id = Number(params.bot_id)
    }

    // 处理信息类别筛选：0-全部（不传参数），1-只发一次，2-周期发送
    // 只有当 kind 为 1 或 2 时才传递给后端
    if (params.kind && (params.kind === 1 || params.kind === 2)) {
      queryParams.kind = Number(params.kind)
    }

    // 处理排序参数
    queryParams.order = params.order || DEFAULT_CREATED_AT_ORDER

    const response = await v1GetMassSendList(queryParams)

    if (response.code === '000000' && response.data) {
      return {
        list: response.data.list || [],
        total: response.data.pager?.total || 0
      }
    }

    return { list: [], total: 0 }
  } catch (error) {
    ElMessage.error('获取消息列表失败')
    return { list: [], total: 0 }
  }
}

// 组件挂载时初始化机器人列表
onMounted(() => {
  initBotList()
})
</script>
