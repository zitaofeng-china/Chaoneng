<template>
  <div class="app-container">
    <ContentWrap>
      <SearchTable
        v-if="isBotListLoaded"
        :columns="columns"
        :search-schema="searchSchema"
        :fetch-data-api="fetchInviteList"
        :show-add-button="false"
        :table-props="{
          rowKey: 'id',
          highlightCurrentRow: false,
          reserveSelection: false
        }"
        :search-props="{
          layout: 'inline',
          buttonPosition: 'center'
        }"
      />
    </ContentWrap>
  </div>
</template>

<script setup lang="tsx">
import { ref, onMounted, computed } from 'vue'
import { ElTag } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { SearchTable } from '@/components/SearchTable'
import type { TableColumn } from '@/components/Table'
import type { FormSchema } from '@/components/Form'
import {
  getInviteListApi,
  type InviteListQueryParams,
  type InviteRecordItem,
  type BotOption
} from '@/api/opertion/Agent/InviteList'
import { v1GetMessageBotList, type MessageBotItem } from '@/api/opertion/common/message'
import { handleErrorMessage, handleListMessage } from '@/utils/messageHelper'
import {
  createPageParams,
  formatTableDateTime,
  hasSearchValue,
  withAllOption
} from '@/utils/tableHelpers'

type InviteSearchParams = Omit<InviteListQueryParams, 'status'> & {
  status?: number | string
}

const isBotListLoaded = ref(false)
const botOptions = ref<BotOption[]>(withAllOption<string>([]))

const buildInviteListParams = (params: InviteSearchParams = {}): InviteListQueryParams => {
  const apiParams: InviteListQueryParams = {
    ...createPageParams(params)
  }

  if (params.keyword) apiParams.keyword = params.keyword
  if (hasSearchValue(params.bot_id)) apiParams.bot_id = Number(params.bot_id)
  if (hasSearchValue(params.status)) apiParams.status = Number(params.status)
  if (params.order) apiParams.order = params.order

  return apiParams
}

const fetchBotList = async () => {
  isBotListLoaded.value = false
  try {
    const res = await v1GetMessageBotList()
    const bots = (res.data || []).map((bot: MessageBotItem) => {
      return {
        label: bot.user_name,
        value: String(bot.id)
      }
    })

    botOptions.value = withAllOption(bots)
    isBotListLoaded.value = true
  } catch (error) {
    handleErrorMessage(error, '获取机器人列表失败')
    isBotListLoaded.value = true
  }
}

const columns = ref<TableColumn[]>([
  {
    field: 'target_id',
    label: '受邀人ID',
    minWidth: '140px',
    formatter: (row: InviteRecordItem) => row.target_id || '-'
  },
  {
    field: 'target_tg_name',
    label: '受邀人',
    minWidth: '140px',
    formatter: (row: InviteRecordItem) => row.target_tg_name || '-'
  },
  {
    field: 'bot_name',
    label: '机器人名称',
    minWidth: '160px',
    formatter: (row: InviteRecordItem) => row.bot_name || '-'
  },
  {
    field: 'source_id',
    label: '邀请人ID',
    minWidth: '140px',
    formatter: (row: InviteRecordItem) => row.source_id || '-'
  },
  {
    field: 'source_tg_name',
    label: '邀请人',
    minWidth: '140px',
    formatter: (row: InviteRecordItem) => row.source_tg_name || '-'
  },
  {
    field: 'agent_name',
    label: '代理名称',
    minWidth: '160px',
    formatter: (row: InviteRecordItem) => row.agent_name || '-'
  },
  {
    field: 'reward',
    label: '奖励金额',
    minWidth: '120px',
    formatter: (row: InviteRecordItem) => {
      const amount = row.reward
      return amount ? `${amount} TRX` : '-'
    }
  },
  {
    field: 'status',
    label: '状态',
    minWidth: '100px',
    slots: {
      default: ({ row }: { row: InviteRecordItem }) => {
        if (row.status === 1) {
          return <ElTag type="success">已发放</ElTag>
        } else if (row.status === 2) {
          return <ElTag type="danger">未发放</ElTag>
        }
        return <span>-</span>
      }
    }
  },
  {
    field: 'created_at',
    label: '创建时间',
    minWidth: '170px',
    sortable: 'custom',
    formatter: (row: InviteRecordItem) => formatTableDateTime(row.created_at)
  }
])

const searchSchema = computed<FormSchema[]>(() => [
  {
    field: 'keyword',
    component: 'Input',
    label: {
      text: '关键字',
      tips: '受邀人ID/受邀人/邀请人/机器人名称/代理名称'
    },
    componentProps: {
      placeholder: '请输入关键字',
      clearable: true
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
    field: 'status',
    component: 'Select' as const,
    label: '状态',
    componentProps: {
      placeholder: '请选择状态',
      clearable: true,
      options: withAllOption([
        { label: '已发放', value: 1 },
        { label: '未发放', value: 2 }
      ])
    }
  }
])

const fetchInviteList = async (
  params: InviteSearchParams = {}
): Promise<{ list: InviteRecordItem[]; total: number }> => {
  try {
    const response = await getInviteListApi(buildInviteListParams(params))

    const list = response.data?.list || []
    const total = response.data?.pager?.total || 0

    const hasSearchCondition = [params.keyword, params.bot_id, params.status].some(hasSearchValue)
    handleListMessage(list, hasSearchCondition, '邀请记录')

    return {
      list,
      total
    }
  } catch (error) {
    handleErrorMessage(error, '获取邀请列表失败')
    return { list: [], total: 0 }
  }
}

onMounted(async () => {
  await fetchBotList()
})
</script>
