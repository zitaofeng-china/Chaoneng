<template>
  <div class="app-container">
    <ContentWrap>
      <!-- 使用SearchTable组件 -->
      <SearchTable
        ref="searchTableRef"
        :columns="columns"
        :searchSchema="searchSchema"
        :fetchDataApi="getAgentBotList"
        :show-add-button="false"
        :default-params="defaultParams"
        :initial-params="initialSearchParams"
      >
        <template #searchButtons>
          <BaseButton type="primary" @click="handleExport">
            <Icon icon="ep:download" class="mr-5px" />
            导出
          </BaseButton>
        </template>
      </SearchTable>
    </ContentWrap>

    <BotInfoEditDialog ref="botInfoEditDialogRef" @success="handleEditSuccess" />
  </div>
</template>

<script setup lang="tsx">
import { ref } from 'vue'
import { ElMessage, ElMessageBox, ElLink } from 'element-plus'
import { Icon } from '@/components/Icon'
import { SearchTable } from '@/components/SearchTable'
import type { SearchTableExpose } from '@/components/SearchTable'
import type { FormSchema } from '@/components/Form'
import type { TableColumn } from '@/components/Table'
import {
  getAgentBotListApi,
  updateAgentBotApi,
  getAgentBotDetailApi,
  type AgentBotQueryParams,
  AgentBotItem
} from '@/api/opertion/Agent/BotList'
import { ContentWrap } from '@/components/ContentWrap'
import { BaseButton } from '@/components/Button'
import BotInfoEditDialog from '../components/BotInfoEditDialog.vue'
import { useRoute, useRouter } from 'vue-router'
import { handleListMessage, handleErrorMessage, handleSuccessMessage } from '@/utils/messageHelper'
import {
  createPageParams,
  exportTableData,
  formatTableDateTime,
  getStatusLabel,
  hasSearchValue,
  renderStatusTag,
  type TableSlot
} from '@/utils/tableHelpers'
import { BOT_STATUS_MAP, BOT_STATUS_OPTIONS } from '../constants'
import { buildBotUpdatePayload, validateBotUpdatePayload } from '@/utils/botUpdatePayload'
import { getTelegramUserUrl } from '@/utils/telegram'

const route = useRoute()
const router = useRouter()
const searchTableRef = ref<SearchTableExpose | null>(null)
const botInfoEditDialogRef = ref()
const DEFAULT_CREATED_AT_ORDER = 'created_at DESC'

type AgentBotSearchParams = Omit<AgentBotQueryParams, 'status'> & {
  status?: number | ''
}
type AgentBotTableSlot = TableSlot<AgentBotItem>

const defaultParams: AgentBotSearchParams = { status: 1 }
const initialSearchParams: Partial<AgentBotSearchParams> = (() => {
  if (route.query.keyword) {
    return { keyword: String(route.query.keyword), status: '' }
  }
  if (route.query.id) {
    return { keyword: String(route.query.id), status: '' }
  }
  if (route.query.bot_id) {
    return { keyword: String(route.query.bot_id), status: '' }
  }
  return {}
})()

const buildAgentBotParams = (
  params: AgentBotSearchParams = {},
  pageSize?: number
): AgentBotQueryParams => {
  const apiParams: AgentBotQueryParams = {
    ...createPageParams(params, 10, pageSize)
  }

  if (params.keyword) apiParams.keyword = params.keyword
  if (params.status !== undefined && params.status !== '') apiParams.status = Number(params.status)
  apiParams.order = params.order || DEFAULT_CREATED_AT_ORDER

  return apiParams
}

const getAgentBotList = async (
  params: AgentBotSearchParams = {}
): Promise<{ list: AgentBotItem[]; total: number }> => {
  try {
    const res = await getAgentBotListApi(buildAgentBotParams(params))

    const hasSearchCondition = [params.keyword, params.status].some(hasSearchValue)
    handleListMessage(res.data.list || [], hasSearchCondition, '机器人')

    return {
      list: res.data.list || [],
      total: res.data.pager?.total || 0
    }
  } catch (error) {
    handleErrorMessage(error, '获取机器人列表失败')
    return { list: [], total: 0 }
  }
}

const updateBotStatus = async (row: AgentBotItem, status: number) => {
  try {
    const detailRes = await getAgentBotDetailApi(row.id)
    if (detailRes.code !== '000000' || !detailRes.data) {
      handleErrorMessage(detailRes, '获取机器人详情失败')
      return
    }

    const payload = buildBotUpdatePayload(detailRes.data, { status })
    const validationMessage = validateBotUpdatePayload(payload)

    if (validationMessage) {
      handleErrorMessage(validationMessage, '更新机器人状态失败')
      return
    }

    await updateAgentBotApi(payload)
    await searchTableRef.value?.reload()
    handleSuccessMessage(status === 1 ? '启用成功' : '禁用成功')
  } catch (error) {
    handleErrorMessage(error, '更新机器人状态失败')
  }
}

const searchSchema = ref<FormSchema[]>([
  {
    field: 'keyword',
    component: 'Input',
    label: {
      text: '关键字',
      tips: '支持机器人ID/机器人用户名/代理名称'
    },
    colProps: {
      span: 12
    },
    componentProps: {
      placeholder: '请输入关键字搜索',
      style: {
        width: '100%'
      }
    }
  },
  {
    field: 'status',
    component: 'Select',
    label: '状态',
    componentProps: {
      placeholder: '请选择状态',
      clearable: true,
      options: BOT_STATUS_OPTIONS
    }
  }
])

const columns = ref<TableColumn[]>([
  {
    field: 'id',
    label: '机器人ID',
    minWidth: 110
  },
  {
    field: 'user_name',
    label: '机器人用户名',
    minWidth: 110,
    slots: {
      default: ({ row }: AgentBotTableSlot) => {
        if (!row.user_name) return <span>-</span>
        return (
          <ElLink type="primary" href={getTelegramUserUrl(row.user_name)} target="_blank">
            {row.user_name}
          </ElLink>
        )
      }
    }
  },
  {
    field: 'agent_name',
    label: '代理名称',
    minWidth: 100
  },
  {
    field: 'first_name',
    label: '机器人昵称',
    minWidth: 100,
    formatter: (row: AgentBotItem) => {
      return <span>{row.first_name}</span>
    }
  },
  {
    field: 'tg_admin',
    label: '管理员TG号',
    minWidth: 100
  },
  {
    field: 'user_count',
    label: '用户数量',
    minWidth: 130,
    sortable: 'custom',
    slots: {
      default: ({ row }: AgentBotTableSlot) => {
        return (
          <ElLink
            type="primary"
            style="cursor:pointer"
            onClick={() => handleUserCountClick(row.id)}
          >
            {row.user_count}
          </ElLink>
        )
      }
    }
  },
  {
    field: 'order_count',
    label: '交易订单数',
    minWidth: 130,
    sortable: 'custom',
    slots: {
      default: ({ row }: AgentBotTableSlot) => {
        return (
          <ElLink
            type="primary"
            style="cursor:pointer"
            onClick={() =>
              router.push({
                path: '/operation/energy_transaction',
                query: { query: row.agent_name }
              })
            }
          >
            {row.order_count || 0}
          </ElLink>
        )
      }
    }
  },
  {
    field: 'status',
    label: '机器人状态',
    minWidth: 100,
    formatter: (row: AgentBotItem) => renderStatusTag(BOT_STATUS_MAP, row.status, '未知', 'default')
  },
  {
    field: 'deposit_threshold',
    label: '邀请门槛',
    minWidth: 110,
    formatter: (row: AgentBotItem) => row.reward?.deposit_threshold ?? 0
  },
  {
    field: 'created_at',
    label: '创建时间',
    minWidth: 160,
    sortable: 'custom',
    showOverflowTooltip: false,
    formatter: (row: AgentBotItem) => formatTableDateTime(row.created_at)
  },
  {
    field: 'updated_at',
    label: '最后活动时间',
    minWidth: 160,
    sortable: 'custom',
    showOverflowTooltip: false,
    formatter: (row: AgentBotItem) => formatTableDateTime(row.updated_at)
  },
  {
    field: 'action',
    label: '操作',
    width: '170px',
    fixed: 'right',
    formatter: (row: AgentBotItem) => {
      const isEnabled = row.status === 1
      const targetStatus = isEnabled ? 2 : 1
      const buttonText = isEnabled ? '禁用' : '启用'
      const buttonType = isEnabled ? 'danger' : 'success'
      const actionText = isEnabled ? '禁用' : '启用'

      return (
        <>
          <BaseButton type="primary" onClick={() => handleEdit(row)}>
            编辑
          </BaseButton>
          <BaseButton
            type={buttonType}
            onClick={() => handleUpdateStatus(row, targetStatus, actionText)}
          >
            {buttonText}
          </BaseButton>
        </>
      )
    }
  }
])

const handleEdit = (row: AgentBotItem) => {
  botInfoEditDialogRef.value?.open(row)
}

const handleUpdateStatus = (row: AgentBotItem, status: number, actionText: string) => {
  ElMessageBox.confirm(`确定要${actionText}该机器人吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(async () => {
      await updateBotStatus(row, status)
    })
    .catch(() => {
      ElMessage.info('操作已取消')
    })
}

const handleExport = async () => {
  try {
    await exportTableData<AgentBotItem, AgentBotSearchParams, AgentBotQueryParams>({
      searchTableRef,
      fallbackParams: { ...defaultParams, ...initialSearchParams },
      filename: '机器人列表',
      fetchData: getAgentBotListApi,
      buildParams: buildAgentBotParams,
      mapItem: (item) => ({
        机器人ID: item.id,
        机器人用户名: item.user_name,
        代理名称: item.agent_name,
        机器人昵称: item.first_name,
        管理员TG号: item.tg_admin || '-',
        用户数量: item.user_count || 0,
        交易订单数: item.order_count || 0,
        机器人状态: getStatusLabel(BOT_STATUS_MAP, item.status, '未知'),
        邀请门槛: item.reward?.deposit_threshold ?? 0,
        创建时间: formatTableDateTime(item.created_at),
        最后活动时间: formatTableDateTime(item.updated_at)
      })
    })
  } catch (error) {
    handleErrorMessage(error, '导出失败')
  }
}

const handleUserCountClick = (botId: number | string) => {
  router.push({ path: '/agent/user_list', query: { bot_id: botId } })
}

const handleEditSuccess = async () => {
  await searchTableRef.value?.reload()
}
</script>

<style scoped></style>
