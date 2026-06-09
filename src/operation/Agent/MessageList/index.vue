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

    <!-- 消息详情弹窗 -->
    <Dialog v-model="detailDialogVisible" title="消息详情" width="800px">
      <div v-if="currentDetailRecord.id" class="detail-content">
        <!-- 基本信息 -->
        <div class="mb-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <span class="font-semibold">消息ID：</span>
              <span>{{ currentDetailRecord.id }}</span>
            </div>
            <div>
              <span class="font-semibold">机器人：</span>
              <span>{{ currentDetailRecord.bot_name }}</span>
            </div>
            <div>
              <span class="font-semibold">成功数：</span>
              <span>{{ currentDetailRecord.ok_num || 0 }} 个</span>
            </div>
            <div>
              <span class="font-semibold">失败数：</span>
              <span>{{ currentDetailRecord.fail_num || 0 }} 个</span>
            </div>
            <div>
              <span class="font-semibold">创建时间：</span>
              <span>{{ formatTableDateTime(currentDetailRecord.created_at) }}</span>
            </div>
            <div v-if="currentDetailRecord.send_at">
              <span class="font-semibold">发送时间：</span>
              <span>{{ formatSentTime(currentDetailRecord.send_at) }}</span>
            </div>
          </div>
        </div>

        <ElDivider />

        <!-- 消息预览 -->
        <div class="mb-4">
          <div class="font-semibold mb-2">消息预览：</div>

          <!-- Telegram 风格的消息卡片 -->
          <div class="message-preview-container">
            <!-- 如果有文件，遍历显示 -->
            <template v-if="currentDetailRecord.files && currentDetailRecord.files.length > 0">
              <div
                v-for="(file, index) in currentDetailRecord.files"
                :key="`file-${index}`"
                class="message-card"
              >
                <!-- 图片/视频 -->
                <div class="media-container">
                  <template v-if="isVideo(file)">
                    <video
                      :src="file"
                      controls
                      disablePictureInPicture
                      controlslist="nodownload noremoteplayback"
                      class="media-content"
                    >
                      您的浏览器不支持视频播放
                    </video>
                  </template>
                  <template v-else>
                    <ElImage
                      :src="file"
                      alt="消息图片"
                      fit="cover"
                      class="media-content cursor-pointer"
                      :preview-src-list="currentDetailRecord.files"
                      :initial-index="Number(index)"
                    />
                  </template>
                </div>

                <!-- 只在最后一个文件上显示文字内容和内联按钮 -->
                <template v-if="index === currentDetailRecord.files.length - 1">
                  <!-- 文字内容 -->
                  <div v-if="currentDetailRecord.content" class="message-text">
                    {{ currentDetailRecord.content }}
                  </div>

                  <!-- 内联按钮 -->
                  <div
                    v-if="
                      currentDetailRecord.inner_buttons &&
                      currentDetailRecord.inner_buttons.length > 0
                    "
                    class="inline-buttons"
                  >
                    <div
                      v-for="(row, rowIndex) in currentDetailRecord.inner_buttons"
                      :key="rowIndex"
                      class="inline-button-row"
                    >
                      <div v-for="(button, btnIndex) in row" :key="btnIndex" class="inline-button">
                        {{ button.text }}
                      </div>
                    </div>
                  </div>
                </template>
              </div>
            </template>

            <!-- 如果没有文件，只显示文字和按钮 -->
            <template v-else>
              <div class="message-card text-only">
                <!-- 文字内容 -->
                <div v-if="currentDetailRecord.content" class="message-text">
                  {{ currentDetailRecord.content }}
                </div>
                <div v-else class="message-text text-gray-400 italic"> 无文字内容 </div>

                <!-- 内联按钮 -->
                <div
                  v-if="
                    currentDetailRecord.inner_buttons &&
                    currentDetailRecord.inner_buttons.length > 0
                  "
                  class="inline-buttons"
                >
                  <div
                    v-for="(row, rowIndex) in currentDetailRecord.inner_buttons"
                    :key="rowIndex"
                    class="inline-button-row"
                  >
                    <div v-for="(button, btnIndex) in row" :key="btnIndex" class="inline-button">
                      {{ button.text }}
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
      <div v-else class="text-center text-gray-500 py-8">
        <p>暂无详情数据</p>
      </div>
      <template #footer>
        <BaseButton @click="detailDialogVisible = false">关闭</BaseButton>
      </template>
    </Dialog>

    <!-- 内联按钮管理弹窗 -->
    <InlineButtonDialog v-model="inlineButtonDialogVisible" />

    <!-- 高级设置弹窗 -->
    <AdvancedSettingsDialog
      v-model="advancedSettingsDialogVisible"
      :row-data="currentEditRow"
      @success="handleAdvancedSettingsSuccess"
    />

    <!-- 文件预览弹窗 - 图片 -->
    <ElImageViewer
      v-if="filePreviewVisible && !isPreviewVideo"
      :url-list="previewFileList"
      :initial-index="previewInitialIndex"
      teleported
      @close="filePreviewVisible = false"
    />

    <!-- 文件预览弹窗 - 视频 -->
    <VideoPreviewDialog
      v-model:visible="filePreviewVisible"
      :video-url="previewFileUrl"
      v-if="isPreviewVideo"
    />
  </ContentWrap>
</template>

<script setup lang="tsx">
import { ref, computed, onMounted } from 'vue'
import { ContentWrap } from '@/components/ContentWrap'
import { SearchTable } from '@/components/SearchTable'
import type { SearchTableExpose } from '@/components/SearchTable'
import { BaseButton } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import type { TableColumn } from '@/components/Table'
import type { FormSchema } from '@/components/Form'
import { ElMessage, ElMessageBox, ElDivider, ElImage, ElImageViewer } from 'element-plus'
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
import VideoPreviewDialog from '@/operation/components/MessageDialog/components/VideoPreviewDialog.vue'
import { getErrorMessage, handleErrorMessage } from '@/utils/messageHelper'
import {
  createPageParams,
  formatTableDateTime,
  hasSearchValue,
  withAllOption,
  type SelectOption
} from '@/utils/tableHelpers'
import { MESSAGE_SEND_KIND_OPTIONS } from '../constants'

type BotOption = SelectOption<number>

type MessageSearchParams = Omit<MassSendListParamsV1, 'bot_id' | 'kind'> & {
  bot_id?: number | string
  kind?: number | string
}

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
  if (params.order) queryParams.order = params.order

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
const currentDetailRecord = ref<Partial<MassSendItemV1>>({})

// 文件预览
const filePreviewVisible = ref(false)
const previewFileUrl = ref('')
const previewFileList = ref<string[]>([])
const previewInitialIndex = ref(0)
const isPreviewVideo = ref(false)

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
const handleMessageSent = () => {
  messageDialogVisible.value = false
  searchTableRef.value?.reload()
}

// 跳转到内联按钮管理页面
const goToInlineButtons = () => {
  inlineButtonDialogVisible.value = true
}

// 判断是否为视频文件
const isVideo = (url: string): boolean => {
  if (!url) return false
  return /\.(mp4|avi|mov|wmv|flv|mkv|webm)$/i.test(url)
}

// 文件预览
const handleFilePreview = (fileUrl: string, allFiles?: string[]) => {
  if (!fileUrl) return

  previewFileUrl.value = fileUrl
  isPreviewVideo.value = isVideo(fileUrl)

  // 如果提供了所有文件列表，过滤出所有图片
  if (allFiles && allFiles.length > 0) {
    const imageFiles = allFiles.filter((file) => !isVideo(file))
    previewFileList.value = imageFiles
    previewInitialIndex.value = imageFiles.indexOf(fileUrl)
  } else {
    previewFileList.value = [fileUrl]
    previewInitialIndex.value = 0
  }

  filePreviewVisible.value = true
}

const handleViewDetail = (row: MassSendItemV1) => {
  currentDetailRecord.value = { ...row }
  detailDialogVisible.value = true
}

const handleEdit = (row: MassSendItemV1) => {
  currentEditRow.value = row
  advancedSettingsDialogVisible.value = true
}

// 高级设置成功回调
const handleAdvancedSettingsSuccess = () => {
  searchTableRef.value?.reload()
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
      files: row.files || [],
      inner_buttons: (row.inner_buttons || []).map((rowBtns) => rowBtns.map((btn) => btn.id)),
      period: 0,
      send_at: Math.floor(Date.now() / 1000),
      chat_ids: toNumberList(row.chat_ids || []),
      tg_user_ids: row.tg_user_ids || []
    }

    const res = await v1SendGroupMessage(resendParams)

    if (res.code === '000000') {
      ElMessage.success('重发成功')
      searchTableRef.value?.reload()
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
      ElMessage.success('删除成功')
      searchTableRef.value?.reload()
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
    formatter: (row) => {
      const content = row.content || ''
      return content.length > 50 ? content.substring(0, 50) + '...' : content || '—'
    }
  },
  {
    field: 'files',
    label: '文件',
    align: 'center',
    width: 100,
    slots: {
      default: ({ row }: { row: MassSendItemV1 }) => {
        if (row.files && row.files.length > 0) {
          return (
            <div
              style="color: #409eff; cursor: pointer; user-select: none;"
              onClick={() => handleFilePreview(row.files[0], row.files)}
            >
              {row.files.length} 个文件
            </div>
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
      default: ({ row }: { row: MassSendItemV1 }) => {
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

<style scoped>
/* Telegram 风格的消息预览样式 */
.message-preview-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.message-card {
  position: relative;
  width: 100%;
  max-width: 500px;
  margin-bottom: 8px;
  overflow: hidden;
  background: #dcf8c6;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 10%);
}

.message-card.text-only {
  width: 100%;
  max-width: 500px;
  padding: 8px 12px;
}

.media-container {
  width: 100%;
  overflow: hidden;
  background: #000;
  border-radius: 8px 8px 0 0;
}

.media-content {
  display: block;
  width: 100%;
  max-width: 500px;
  max-height: 400px;
  object-fit: contain;
}

.message-text {
  padding: 8px 12px;
  font-size: 14px;
  line-height: 1.5;
  color: #000;
  word-break: break-word;
  white-space: pre-wrap;
}

.inline-buttons {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 8px 8px;
}

.inline-button-row {
  display: flex;
  gap: 4px;
}

.inline-button {
  flex: 1;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  color: #08c;
  text-align: center;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  transition: background-color 0.2s;
  user-select: none;
}

.inline-button:hover {
  background: #f5f5f5;
}

.inline-button:active {
  background: #e8e8e8;
}
</style>
