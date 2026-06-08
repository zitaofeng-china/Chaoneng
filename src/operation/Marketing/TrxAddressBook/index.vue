<template>
  <div class="app-container">
    <ContentWrap>
      <SearchTable
        ref="searchTableRef"
        :columns="columns"
        :search-schema="searchSchema"
        :fetch-data-api="getTrxAddressBookList"
        :show-add-button="false"
      >
        <template #searchButtons>
          <BaseButton type="primary" @click="handleExport">
            <Icon icon="ep:download" class="mr-5px" />
            导出
          </BaseButton>
        </template>
      </SearchTable>
    </ContentWrap>
  </div>
</template>

<script setup lang="tsx">
import { ref } from 'vue'
import { BaseButton } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { SearchTable } from '@/components/SearchTable'
import type { SearchTableExpose } from '@/components/SearchTable'
import type { FormSchema } from '@/components/Form'
import type { TableColumn } from '@/components/Table'
import {
  getTrxAddressBookListApi,
  exportTrxAddressBookApi,
  type TrxAddressBookItem,
  type TrxAddressBookQueryParams
} from '@/api/opertion/Marketing/TrxAddressBook'
import { ContentWrap } from '@/components/ContentWrap'
import { handleErrorMessage, handleSuccessMessage } from '@/utils/messageHelper'
import { getSearchFormData } from '@/utils/tableHelpers'

const searchTableRef = ref<SearchTableExpose | null>(null)
type TrxAddressBookSearchParams = TrxAddressBookQueryParams & Recordable

const buildTrxAddressBookParams = (
  params: TrxAddressBookSearchParams = {}
): TrxAddressBookQueryParams => {
  const apiParams: TrxAddressBookQueryParams = {
    current_page: Number(params.current_page) || 1,
    page_size: Number(params.page_size) || 10
  }

  if (params.query) {
    apiParams.query = String(params.query).trim()
  }

  return apiParams
}

const getTrxAddressBookList = async (
  params: TrxAddressBookSearchParams = {}
): Promise<{ list: TrxAddressBookItem[]; total?: number }> => {
  try {
    const res = await getTrxAddressBookListApi(buildTrxAddressBookParams(params))
    return {
      list: res.data.list || [],
      total: res.data.pager?.total || 0
    }
  } catch (error) {
    handleErrorMessage(error, '获取收款地址簿列表失败')
    return {
      list: [],
      total: 0
    }
  }
}

const exportTrxAddressBook = async (params: TrxAddressBookQueryParams) => {
  try {
    await exportTrxAddressBookApi(params)
    handleSuccessMessage('导出成功')
  } catch (error) {
    handleErrorMessage(error, '导出失败')
  }
}

const searchSchema = ref<FormSchema[]>([
  {
    field: 'query',
    component: 'Input',
    label: '关键字',
    componentProps: {
      placeholder: '请输入代理名称/收款地址'
    }
  }
])

const columns = ref<TableColumn[]>([
  {
    field: 'agent_name',
    label: '代理名称',
    minWidth: 120
  },
  {
    field: 'receiving_address',
    label: '收款地址',
    minWidth: 150
  },
  {
    field: 'bot_name',
    label: '机器人',
    minWidth: 100
  },
  {
    field: 'purpose',
    label: '用途',
    minWidth: 100
  },
  {
    field: 'trx_balance',
    label: 'TRX余额',
    minWidth: 100,
    formatter: (row: TrxAddressBookItem) => `${row.trx_balance ?? 0} TRX`
  },
  {
    field: 'usdt_balance',
    label: 'USDT余额',
    minWidth: 100,
    formatter: (row: TrxAddressBookItem) => `${row.usdt_balance ?? 0} USDT`
  }
])

const handleExport = async () => {
  try {
    const params = await getSearchFormData<TrxAddressBookSearchParams>(searchTableRef)
    await exportTrxAddressBook(buildTrxAddressBookParams(params))
  } catch (error) {
    handleErrorMessage(error, '导出失败')
  }
}
</script>

<style scoped>
.app-container {
  padding: 20px;
}
</style>
