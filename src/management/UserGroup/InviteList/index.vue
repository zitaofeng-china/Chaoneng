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
        ref="searchTableRef"
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
import { formatToDateTime } from '@/utils/dateUtil'
import { getInviteListApi, type InviteRecordItem } from '@/api/management/UserGroup/InviteList'
import { v1GetMessageBotList } from '@/api/management/common/message'
import { handleErrorMessage, handleListMessage } from '@/utils/messageHelper'

const searchTableRef = ref()
const DEFAULT_CREATED_AT_ORDER = 'created_at DESC'

// 机器人列表
const isBotListLoaded = ref(false)
const botOptions = ref<{ label: string; value: string }[]>([{ label: '全部', value: '' }])
const botMap = ref<Map<number, any>>(new Map())

// 获取机器人列表
const fetchBotList = async () => {
  isBotListLoaded.value = false
  try {
    const res = await v1GetMessageBotList()
    if (res.code === '000000' && res.data) {
      const bots = (res.data || []).map((bot: any) => {
        botMap.value.set(bot.id, bot)
        return {
          label: bot.user_name,
          value: String(bot.id)
        }
      })
      botOptions.value = [{ label: '全部', value: '' }, ...bots]
      isBotListLoaded.value = true
    }
  } catch (error) {
    handleErrorMessage(error, '获取机器人列表失败')
    isBotListLoaded.value = false
  }
}

const columns = ref<TableColumn[]>([
  {
    field: 'id',
    label: '邀请记录ID',
    minWidth: '120px',
    formatter: (row: InviteRecordItem) => row.id || '-'
  },
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
    formatter: (row: InviteRecordItem) =>
      row.created_at ? formatToDateTime(new Date(row.created_at * 1000)) : '-'
  }
])

const searchSchema = computed<FormSchema[]>(() => [
  {
    field: 'keyword',
    component: 'Input',
    label: {
      text: '关键词',
      tips: '支持受邀人ID/受邀人/邀请人/机器人用户名查询'
    },
    componentProps: {
      placeholder: '请输入关键词搜索',
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
  }
])

// 获取邀请列表
const fetchInviteList = async (params: any = {}) => {
  try {
    const apiParams: any = {
      current_page: params?.current_page || 1,
      page_size: params?.page_size || 10
    }

    if (params?.keyword) apiParams.keyword = params.keyword

    // 处理排序参数
    apiParams.order = params?.order || DEFAULT_CREATED_AT_ORDER

    const response = await getInviteListApi(apiParams)

    const list = response.data?.list || []
    const total = response.data?.pager?.total || response.data?.total || 0

    // 添加数据为空提示
    const hasSearchCondition = !!params?.keyword
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

// 页面加载时获取机器人列表
onMounted(async () => {
  await fetchBotList()
})
</script>
