<template>
  <div class="app-container">
    <ContentWrap>
      <SearchTable
        v-if="isBotOptionsLoaded"
        :columns="columns"
        :search-schema="searchSchema"
        :fetch-data-api="fetchAutoManageList"
        :fetch-del-api="deleteAddressAction"
        :show-add-button="false"
        ref="searchTableRef"
      />
      <div v-else v-loading="true" style="min-height: 400px"></div>
    </ContentWrap>
  </div>
</template>

<script setup lang="tsx">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { SearchTable } from '@/components/SearchTable'
import type { SearchTableExpose } from '@/components/SearchTable'
import { BaseButton } from '@/components/Button'
import type { TableColumn } from '@/components/Table'
import type { FormSchema } from '@/components/Form'
import {
  v2GetHostingList,
  v2RemoveHosting,
  v2RecycleOrder,
  type HostingItemV2,
  type HostingListParamsV2
} from '@/api/opertion/OperationCenter/HostedList'
import { v1GetMessageBotList, type MessageBotItem } from '@/api/opertion/common/message'
import { handleListMessage, handleErrorMessage, handleSuccessMessage } from '@/utils/messageHelper'
import { getSourceText, SOURCE_TYPE_OPTIONS } from '@/utils/sourceFilter'
import {
  createPageParams,
  formatTableDateTime,
  hasSearchValue,
  withAllOption,
  type SelectOption
} from '@/utils/tableHelpers'

const searchTableRef = ref<SearchTableExpose | null>(null)
const currentRowForDelete = ref<HostingItemV2 | null>(null)

type BotOption = SelectOption<number | string>

const botOptions = ref<BotOption[]>([])
const isBotOptionsLoaded = ref(false)
type HostingSearchParams = Omit<HostingListParamsV2, 'bot_id' | 'origin'> & {
  bot_id?: number | string
  origin?: number | string
}

const buildHostingListParams = (params: HostingSearchParams = {}): HostingListParamsV2 => {
  const queryParams: HostingListParamsV2 = {
    ...createPageParams(params)
  }

  if (params.bot_id !== undefined && params.bot_id !== '')
    queryParams.bot_id = Number(params.bot_id)
  if (params.keyword && params.keyword.trim()) queryParams.keyword = params.keyword.trim()
  if (params.origin !== undefined && params.origin !== '')
    queryParams.origin = Number(params.origin)
  if (params.order) queryParams.order = params.order

  return queryParams
}

const fetchBotOptions = async () => {
  try {
    const res = await v1GetMessageBotList()
    if (res.code === '000000' && res.data) {
      const bots = (res.data || []).map((bot: MessageBotItem) => ({
        label: bot.user_name,
        value: bot.id
      }))
      botOptions.value = withAllOption(bots)
      isBotOptionsLoaded.value = true
    }
  } catch (error) {
    handleErrorMessage(error, '获取机器人选项失败')
    botOptions.value = withAllOption<number | string>([])
    isBotOptionsLoaded.value = true
  }
}

onMounted(() => {
  fetchBotOptions()
})

const selectedSource = ref<number | string>('')

const columns = computed(() => {
  const allCols: TableColumn[] = [
    {
      field: 'bot_id',
      label: '机器人ID',
      width: 120,
      formatter: (row: HostingItemV2) => row.bot_id || '-'
    },
    {
      field: 'bot_name',
      label: '机器人用户名',
      width: 150,
      formatter: (row: HostingItemV2) => row.bot_name || '-'
    },
    {
      field: 'tg_user_name',
      label: '用户名',
      width: 150,
      hideWhen: 2, // H5时隐藏
      formatter: (row: HostingItemV2) => row.tg_user_name || '-'
    },
    {
      field: 'username',
      label: '用户账号',
      width: 120,
      hideWhen: 1, // 机器人时隐藏
      formatter: (row: HostingItemV2) => row.username || '-'
    },
    {
      field: 'email',
      label: '用户邮箱',
      minWidth: 150,
      hideWhen: 1, // 机器人时隐藏
      formatter: (row: HostingItemV2) => row.email || '-'
    },
    {
      field: 'origin',
      label: '来源',
      width: 100,
      formatter: (row: HostingItemV2) => getSourceText(row.origin, row.tg_user_name, row.username)
    },
    {
      field: 'address',
      label: '托管地址',
      minWidth: 250,
      formatter: (row: HostingItemV2) => row.address || '-'
    },
    {
      field: 'created_at',
      label: '创建时间',
      sortable: 'custom',
      width: 180,
      formatter: (row: HostingItemV2) => formatTableDateTime(row.created_at)
    },
    {
      field: 'updated_at',
      label: '更新时间',
      sortable: 'custom',
      width: 180,
      formatter: (row: HostingItemV2) => formatTableDateTime(row.updated_at)
    },
    {
      field: 'action',
      label: '操作',
      width: 240,
      fixed: 'right',
      slots: {
        default: (data: { row: HostingItemV2 }) => {
          return (
            <div style="display: flex; gap: 8px;">
              <BaseButton type="primary" onClick={() => handleRecycleAndReset(data.row)}>
                回收与重置
              </BaseButton>
              <BaseButton type="danger" onClick={() => handleDeleteConfirmation(data.row)}>
                取消托管
              </BaseButton>
            </div>
          )
        }
      }
    }
  ]

  const filteredCols = allCols.filter((col) => {
    if (!col.hideWhen) return true
    return selectedSource.value !== col.hideWhen
  })

  return filteredCols
})

const searchSchema = computed<FormSchema[]>(() => [
  {
    field: 'bot_id',
    label: '机器人',
    component: 'Select',
    componentProps: {
      placeholder: '请选择机器人',
      options: botOptions.value,
      clearable: true,
      filterable: true
    }
  },
  {
    field: 'keyword',
    label: {
      tips: '托管地址/用户名/用户账号/用户邮箱',
      text: '关键词'
    },
    component: 'Input',
    componentProps: {
      placeholder: '请输入关键词'
    }
  },
  {
    field: 'origin',
    label: '来源',
    component: 'Select',
    componentProps: {
      placeholder: '请选择来源',
      clearable: true,
      options: SOURCE_TYPE_OPTIONS
    }
  }
])

const fetchAutoManageList = async (
  params: HostingSearchParams = {}
): Promise<{ list: HostingItemV2[]; total: number }> => {
  try {
    selectedSource.value = params.origin ?? ''

    const res = await v2GetHostingList(buildHostingListParams(params))

    if (res.code === '000000' && res.data) {
      const list = res.data.list || []

      const hasSearchCondition = [params.bot_id, params.keyword, params.origin].some(hasSearchValue)
      handleListMessage(list, hasSearchCondition, '托管地址')

      return {
        list: list,
        total: res.data.pager?.total || 0
      }
    }

    return { list: [], total: 0 }
  } catch (error) {
    handleErrorMessage(error, '获取托管地址列表失败')
    return { list: [], total: 0 }
  }
}

const deleteAddressAction = async () => {
  if (currentRowForDelete.value && currentRowForDelete.value.address) {
    try {
      await v2RemoveHosting({ address: currentRowForDelete.value.address })
      handleSuccessMessage('取消托管成功')
      return true
    } catch (error) {
      handleErrorMessage(error, '取消托管失败')
      return false
    }
  }
  return false
}

const handleDeleteConfirmation = (row: HostingItemV2) => {
  currentRowForDelete.value = row
  if (searchTableRef.value) {
    searchTableRef.value.delete(row)
  } else {
    ElMessage.error('表格未初始化，无法取消托管')
  }
}

const handleRecycleAndReset = async (row: HostingItemV2) => {
  if (!row.address) {
    ElMessage.warning('托管地址不存在，无法执行回收与重置操作')
    return
  }

  try {
    const res = await v2RecycleOrder({ address: row.address })

    if (res.code === '000000') {
      handleSuccessMessage('回收与重置成功')
      if (searchTableRef.value) {
        searchTableRef.value.reload()
      }
    } else {
      ElMessage.error(res.msg || '回收与重置失败')
    }
  } catch (error) {
    handleErrorMessage(error, '回收与重置失败')
  }
}
</script>

<style scoped></style>
