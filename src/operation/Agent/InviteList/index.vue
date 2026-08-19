<template>
  <div class="app-container">
    <ContentWrap>
      <SearchTable
        v-if="isBotListLoaded"
        ref="searchTableRef"
        :columns="columns"
        :search-schema="searchSchema"
        :fetch-data-api="fetchInviteList"
        :show-add-button="false"
        @reset="handleBotChange('')"
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
import { ElOption, ElSelect } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { SearchTable } from '@/components/SearchTable'
import type { TableColumn } from '@/components/Table'
import type { FormSchema } from '@/components/Form'
import {
  v1GetInviteList,
  type InviteListQueryParams,
  type InviteRecordItem,
  type BotOption
} from '@/api/opertion/Agent/InviteList'
import {
  v1GetMessageBotList,
  v1GetMessageUserList,
  type MessageBotItem
} from '@/api/opertion/common/message'
import { handleErrorMessage, handleListMessage } from '@/utils/messageHelper'
import {
  createPageParams,
  formatTableDateTime,
  getStatusLabel,
  hasSearchValue,
  renderStatusTag,
  withAllOption,
  type TableSlot
} from '@/utils/tableHelpers'
import { INVITE_REWARD_STATUS_MAP, INVITE_REWARD_STATUS_OPTIONS } from '../constants'

type InviteSearchParams = Omit<InviteListQueryParams, 'status'> & {
  status?: number | string
}
type InviteTableSlot = TableSlot<InviteRecordItem>

const searchTableRef = ref()
const isBotListLoaded = ref(false)
const botOptions = ref<BotOption[]>(withAllOption<string>([]))
const userOptions = ref<BotOption[]>([])
const selectedBotId = ref('')
const DEFAULT_CREATED_AT_ORDER = 'created_at DESC'

const buildInviteListParams = (params: InviteSearchParams = {}): InviteListQueryParams => {
  const apiParams: InviteListQueryParams = {
    ...createPageParams(params)
  }

  if (params.keyword) apiParams.keyword = params.keyword
  if (hasSearchValue(params.bot_id)) apiParams.bot_id = Number(params.bot_id)
  if (hasSearchValue(params.target_id)) apiParams.target_id = Number(params.target_id)
  if (hasSearchValue(params.source_id)) apiParams.source_id = Number(params.source_id)
  if (hasSearchValue(params.status)) apiParams.status = Number(params.status)
  apiParams.order = params.order || DEFAULT_CREATED_AT_ORDER

  return apiParams
}

const applyUserOptions = (options: BotOption[]) => {
  userOptions.value = options
  searchTableRef.value?.searchMethods?.setSchema?.([
    { field: 'target_id', path: 'componentProps.options', value: options },
    { field: 'source_id', path: 'componentProps.options', value: options }
  ])
}

const fetchUserList = async (botId?: number | string) => {
  if (!hasSearchValue(botId)) {
    applyUserOptions([])
    return
  }

  try {
    const res = await v1GetMessageUserList(botId)
    applyUserOptions(
      (res.data || []).map((user) => ({
        label: `${user.tg_user_name || user.tg_first_name || '-'} (${user.tg_user_id})`,
        value: String(user.tg_user_id)
      }))
    )
  } catch (error) {
    applyUserOptions([])
    handleErrorMessage(error, '获取用户列表失败')
  }
}

const handleBotChange = (botId?: string) => {
  selectedBotId.value = hasSearchValue(botId) ? String(botId) : ''
  searchTableRef.value?.searchMethods?.setValues?.({
    target_id: '',
    source_id: ''
  })
  fetchUserList(selectedBotId.value)
}

const renderUserSelect = (formModel: Record<string, any>, field: 'target_id' | 'source_id') => (
  <ElSelect
    modelValue={formModel[field]}
    filterable
    clearable
    placeholder={field === 'target_id' ? '请选择受邀人' : '请选择邀请人'}
    style={{ width: '100%' }}
    onUpdate:modelValue={(value: string) => {
      formModel[field] = value
    }}
  >
    {userOptions.value.map((item) => (
      <ElOption key={`${field}-${item.value}`} label={item.label} value={item.value} />
    ))}
  </ElSelect>
)

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
      default: ({ row }: InviteTableSlot) => {
        const statusLabel = getStatusLabel(INVITE_REWARD_STATUS_MAP, row.status)
        if (statusLabel === '-') return <span>-</span>

        return renderStatusTag(INVITE_REWARD_STATUS_MAP, row.status, '-', 'default')
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
      tips: '受邀人ID/机器人名称/邀请人ID/代理名称'
    },
    componentProps: {
      placeholder: '请输入关键字',
      clearable: true
    }
  },
  {
    field: 'bot_id',
    label: '机器人',
    formItemProps: {
      slots: {
        default: (formModel: Record<string, any>) => (
          <ElSelect
            modelValue={formModel.bot_id}
            clearable
            filterable
            placeholder="请选择机器人"
            style={{ width: '100%' }}
            onUpdate:modelValue={(value: string) => {
              formModel.bot_id = value
              handleBotChange(value)
            }}
          >
            {botOptions.value.map((item) => (
              <ElOption key={`bot-${item.value}`} label={item.label} value={item.value} />
            ))}
          </ElSelect>
        )
      }
    }
  },
  {
    field: 'target_id',
    label: '受邀人',
    remove: !selectedBotId.value,
    formItemProps: {
      slots: {
        default: (formModel: Record<string, any>) => renderUserSelect(formModel, 'target_id')
      }
    }
  },
  {
    field: 'source_id',
    label: '邀请人',
    remove: !selectedBotId.value,
    formItemProps: {
      slots: {
        default: (formModel: Record<string, any>) => renderUserSelect(formModel, 'source_id')
      }
    }
  },
  {
    field: 'status',
    component: 'Select' as const,
    label: '状态',
    componentProps: {
      placeholder: '请选择状态',
      clearable: true,
      options: INVITE_REWARD_STATUS_OPTIONS
    }
  }
])

const fetchInviteList = async (
  params: InviteSearchParams = {}
): Promise<{ list: InviteRecordItem[]; total: number }> => {
  try {
    const response = await v1GetInviteList(buildInviteListParams(params))

    const list = response.data?.list || []
    const total = response.data?.pager?.total || 0

    const hasSearchCondition = [
      params.keyword,
      params.bot_id,
      params.target_id,
      params.source_id,
      params.status
    ].some(hasSearchValue)
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
