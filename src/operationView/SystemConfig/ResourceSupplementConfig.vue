<template>
  <div class="app-container">
    <ContentWrap>
      <SearchTable
        :columns="columns"
        :search-schema="searchSchema"
        :fetch-data-api="fetchResourceSupplementList"
        :show-add-button="true"
        @add="handleAdd"
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
import { ref, reactive } from 'vue'
import { ContentWrap } from '@/components/ContentWrap'
import { SearchTable } from '@/components/SearchTable'
import type { TableColumn } from '@/components/Table'
import type { FormSchema } from '@/components/Form'
import { formatToDateTime } from '@/utils/dateUtil'
import { handleErrorMessage, handleListMessage } from '@/utils/messageHelper'

const searchTableRef = ref()

// 供给源选项
const sourceOptions = [
  { label: '全部', value: '' },
  { label: '能量池', value: 3 },
  { label: '带宽池', value: 4 },
  { label: '收购带宽池', value: 6 },
  { label: '收购能量池', value: 7 }
]

// 资源类型选项
const resourceTypeOptions = [
  { label: '全部', value: '' },
  { label: '能量', value: 1 },
  { label: '带宽', value: 2 }
]

// 状态选项
const statusOptions = [
  { label: '全部', value: '' },
  { label: '开启', value: 1 },
  { label: '关闭', value: 2 }
]

// 表格列定义
const columns = ref<TableColumn[]>([
  {
    field: 'id',
    label: 'ID',
    width: '80px'
  },
  {
    field: 'source',
    label: '供给源',
    width: '120px',
    formatter: (row) => {
      const sourceMap = { 3: '能量池', 4: '带宽池', 6: '收购带宽池', 7: '收购能量池' }
      return sourceMap[row.source] || '-'
    }
  },
  {
    field: 'resource_type',
    label: '资源类型',
    width: '120px',
    formatter: (row) => {
      const typeMap = { 1: 'TRX', 2: 'USDT', 3: '能量', 4: '带宽' }
      return typeMap[row.resource_type] || '-'
    }
  },
  {
    field: 'threshold',
    label: '补充阈值',
    minWidth: '120px',
    formatter: (row) => row.threshold || '-'
  },
  {
    field: 'supplement_amount',
    label: '补充数量',
    minWidth: '120px',
    formatter: (row) => row.supplement_amount || '-'
  },
  {
    field: 'status',
    label: '状态',
    width: '100px',
    formatter: (row) => {
      const statusMap = { 1: '启用', 2: '禁用' }
      return statusMap[row.status] || '-'
    }
  },
  {
    field: 'created_at',
    label: '创建时间',
    width: '180px',
    formatter: (row) => (row.created_at ? formatToDateTime(new Date(row.created_at * 1000)) : '-')
  },
  {
    field: 'updated_at',
    label: '更新时间',
    width: '180px',
    formatter: (row) => (row.updated_at ? formatToDateTime(new Date(row.updated_at * 1000)) : '-')
  }
])

// 搜索表单配置
const searchSchema = reactive<FormSchema[]>([
  {
    field: 'keyword',
    component: 'Input',
    label: '关键词',
    componentProps: {
      placeholder: '请输入关键词搜索',
      clearable: true
    }
  },
  {
    field: 'source',
    component: 'Select',
    label: '供给源',
    componentProps: {
      placeholder: '请选择供给源',
      clearable: true,
      options: sourceOptions
    }
  },
  {
    field: 'resource_type',
    component: 'Select',
    label: '资源类型',
    componentProps: {
      placeholder: '请选择资源类型',
      clearable: true,
      options: resourceTypeOptions
    }
  },
  {
    field: 'status',
    component: 'Select',
    label: '状态',
    componentProps: {
      placeholder: '请选择状态',
      clearable: true,
      options: statusOptions
    }
  }
])

// 获取资源补充配置列表
const fetchResourceSupplementList = async (params: any = {}) => {
  try {
    const apiParams: any = {
      current_page: params?.current_page || 1,
      page_size: params?.page_size || 10
    }

    // 添加搜索条件
    if (params?.keyword) apiParams.keyword = params.keyword
    if (params?.source) apiParams.source = params.source
    if (params?.resource_type) apiParams.resource_type = params.resource_type
    if (params?.status) apiParams.status = params.status

    // 处理排序参数
    if (params?.order) {
      apiParams.order = params.order
    }

    // TODO: 替换为真实的API调用
    // const response = await getResourceSupplementListApi(apiParams)

    // 临时模拟数据
    const mockData = {
      list: [
        {
          id: 1,
          source: 3,
          resource_type: 3,
          threshold: 1000000,
          supplement_amount: 500000,
          status: 1,
          created_at: Math.floor(Date.now() / 1000),
          updated_at: Math.floor(Date.now() / 1000)
        },
        {
          id: 2,
          source: 7,
          resource_type: 3,
          threshold: 10000,
          supplement_amount: 5000,
          status: 1,
          created_at: Math.floor(Date.now() / 1000),
          updated_at: Math.floor(Date.now() / 1000)
        }
      ],
      total: 2
    }

    const list = mockData.list || []
    const total = mockData.total || 0

    // 添加数据为空提示
    const hasSearchCondition = !!(
      params?.keyword ||
      params?.source ||
      params?.resource_type ||
      params?.status
    )
    handleListMessage(list, hasSearchCondition, '资源补充配置')

    return {
      list,
      total
    }
  } catch (error) {
    handleErrorMessage(error, '获取资源补充配置列表失败')
    return { list: [], total: 0 }
  }
}

// 新增配置
const handleAdd = () => {
  console.log('新增资源补充配置')
  // TODO: 打开新增弹窗
}

// 重新加载表格
const reloadTable = () => {
  searchTableRef.value?.reload()
}
</script>

<style scoped>
.app-container {
  width: 100%;
}
</style>
