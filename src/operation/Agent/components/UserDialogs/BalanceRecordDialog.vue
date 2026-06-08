<template>
  <Dialog v-model="dialogVisible" title="余额日志">
    <Search :schema="searchSchema" @search="handleSearch" @reset="handleReset" class="mb-4" />

    <Table
      :columns="tableColumns"
      :data="recordList"
      :loading="loading"
      :pagination="pagination"
      @update:currentPage="handleCurrentPageChange"
      @update:pageSize="handlePageSizeChange"
      max-height="500px"
    />

    <template #footer>
      <div class="flex justify-end">
        <ElButton @click="closeDialog">关闭</ElButton>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="tsx">
import { computed, h, reactive, ref, watch } from 'vue'
import { ElButton, ElTag } from 'element-plus'
import { Dialog } from '@/components/Dialog'
import { Table, TableColumn } from '@/components/Table'
import { Search } from '@/components/Search'
import type { FormSchema } from '@/components/Form'
import { v1GetUserBillList } from '@/api/opertion/common/tgUser'
import type { UserBillItemV1, UserBillListParamsV1 } from '@/api/opertion/common/tgUser'
import { handleErrorMessage } from '@/utils/messageHelper'
import { formatTableDateTime } from '@/utils/tableHelpers'

interface BalanceRecordSearchParams {
  coin?: string
}

const props = defineProps<{
  visible: boolean
  accountId: number | string
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const loading = ref(false)
const recordList = ref<UserBillItemV1[]>([])
const searchParams = ref<BalanceRecordSearchParams>({})
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

const searchSchema = reactive<FormSchema[]>([
  {
    field: 'coin',
    label: '余额类型',
    component: 'Select',
    componentProps: {
      options: [
        { label: '全部', value: '' },
        { label: 'TRX', value: 'TRX' },
        { label: 'USDT', value: 'USDT' }
      ],
      placeholder: '请选择余额类型'
    }
  }
])

const tableColumns = ref<TableColumn[]>([
  { field: 'coin', label: '余额类型', width: 100 },
  {
    field: 'amount',
    label: '变动金额',
    width: 120,
    formatter: (row: UserBillItemV1) => {
      const amount = Number(row.amount || 0)
      const type = amount >= 0 ? 'success' : 'danger'
      return h(ElTag, { type }, () => row.amount || '0')
    }
  },
  { field: 'balance', label: '剩余金额', width: 150 },
  { field: 'describe', label: '备注', minWidth: 180 },
  {
    field: 'created_at',
    label: '创建时间',
    width: 180,
    formatter: (row: UserBillItemV1) => formatTableDateTime(row.created_at)
  }
])

const closeDialog = () => {
  dialogVisible.value = false
}

const buildQueryParams = (): UserBillListParamsV1 => {
  const params: UserBillListParamsV1 = {
    current_page: pagination.currentPage,
    page_size: pagination.pageSize,
    user_id: Number(props.accountId)
  }

  if (searchParams.value.coin) {
    params.coin = searchParams.value.coin
  }

  return params
}

const fetchData = async () => {
  if (!props.accountId) {
    recordList.value = []
    pagination.total = 0
    return
  }

  loading.value = true
  try {
    const res = await v1GetUserBillList(buildQueryParams())
    recordList.value = res.data?.list || []
    pagination.total = res.data?.pager?.total || 0
  } catch (error) {
    handleErrorMessage(error, '获取余额日志失败')
    recordList.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

const handleSearch = (data: BalanceRecordSearchParams) => {
  searchParams.value = data
  pagination.currentPage = 1
  fetchData()
}

const handleReset = (data: BalanceRecordSearchParams = {}) => {
  searchParams.value = data
  pagination.currentPage = 1
  fetchData()
}

const handleCurrentPageChange = (page: number) => {
  pagination.currentPage = page
  fetchData()
}

const handlePageSizeChange = (size: number) => {
  pagination.pageSize = size
  pagination.currentPage = 1
  fetchData()
}

watch(
  () => props.visible,
  (isVisible, wasVisible) => {
    if (isVisible && !wasVisible) {
      handleReset({})
      return
    }

    if (!isVisible && wasVisible) {
      recordList.value = []
      searchParams.value = {}
      pagination.currentPage = 1
      pagination.pageSize = 10
      pagination.total = 0
    }
  }
)
</script>
