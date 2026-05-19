<template>
  <div class="app-container">
    <ContentWrap>
      <SearchTable
        :columns="columns"
        :fetch-data-api="fetchMenuList"
        :fetch-del-api="deleteMenu"
        :action-column="actionColumn"
        :table-props="{ pagination: undefined }"
        :search-schema="[]"
        :search-props="{ showSearch: false }"
        :immediate="true"
        @loaded="handleDataLoaded"
        ref="searchTableRef"
        @add="handleAdd"
      >
        <!-- 在工具栏左侧添加刷新按钮 -->
        <template #leftToolbar>
          <BaseButton @click="handleRefresh">刷新</BaseButton>
        </template>
        <!-- 在工具栏右侧添加预览按钮 -->
        <template #rightToolbar>
          <BaseButton type="primary" @click="handlePreview">点我预览</BaseButton>
        </template>
      </SearchTable>

      <!-- 表单弹窗 -->
      <MenuFormDialog
        v-model="dialogVisible"
        :title="dialogTitle"
        :initial-data="currentEditData"
        @submit="handleSubmit"
      />

      <!-- 使用菜单预览组件 -->
      <MenuPreview v-model="previewVisible" @update:modelValue="previewHandleClose" />
    </ContentWrap>
  </div>
</template>

<script setup lang="tsx">
import { ref, onMounted, h, nextTick } from 'vue'
import { ElTag, ElMessage, ElSwitch } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { SearchTable } from '@/components/SearchTable'
import { BaseButton } from '@/components/Button'
import type { TableColumn } from '@/components/Table'
import { getBotMenuList, addBotMenu, deleteBotMenu, batchUpdateBotMenu } from '@/api/menu_list'
import type {
  GetBotMenuListParams,
  AddBotMenuParams,
  BatchUpdateBotMenuParams
} from '@/api/menu_list/types'
import {
  handleListMessage,
  handleErrorMessage,
  handleSuccessMessage,
  handleWarningMessage,
  handleDataFormatError
} from '@/utils/messageHelper'
import MenuPreview from './components/MenuPreview.vue'
import MenuFormDialog from './components/MenuFormDialog.vue'
import { formatToDateTime } from '@/utils/dateUtil'

const searchTableRef = ref<InstanceType<typeof SearchTable> | null>(null)
const previewVisible = ref(false)

const isLoaded = ref(false)

// 当前编辑的菜单数据（用于回填弹窗）
const currentEditData = ref<any>(null)

// 表格列配置（简化版，只显示基本信息）
const columns: TableColumn[] = [
  {
    field: 'menu_name',
    label: '菜单名称',
    minWidth: 150,
    slots: {
      default: (data: any) => {
        return h(
          'span',
          {
            style: { color: '#333', fontWeight: '500' }
          },
          data.row.menu_name
        )
      }
    }
  },
  {
    field: 'order_num',
    label: '排序',
    width: 100,
    slots: {
      default: (data: any) => {
        return h(
          ElTag,
          {
            type: 'info',
            size: 'small'
          },
          () => data.row.order_num
        )
      }
    }
  },
  {
    field: 'status',
    label: '状态',
    width: 100,
    slots: {
      default: (data: any) => {
        return (
          <ElSwitch
            v-model={data.row.status}
            activeValue={1}
            inactiveValue={2}
            onChange={() => handleStatusChange(data.row)}
          />
        )
      }
    }
  },
  {
    field: 'created_at',
    label: '创建时间',
    minWidth: 170,
    sortable: 'custom',
    formatter: (row: any) => {
      return formatToDateTime(row.created_at)
    }
  },
  {
    field: 'updated_at',
    label: '更新时间',
    minWidth: 170,
    sortable: 'custom',
    formatter: (row: any) => {
      return formatToDateTime(row.updated_at)
    }
  }
]

// 操作列配置
const actionColumn = {
  field: 'action',
  label: '操作',
  width: 240,
  fixed: 'right',
  slots: {
    default: (data: any) => {
      const row = data.row
      return (
        <>
          <BaseButton type="primary" onClick={() => handleEdit(row)}>
            编辑
          </BaseButton>
          <BaseButton type="danger" onClick={() => handleDelete(row)}>
            删除
          </BaseButton>
        </>
      )
    }
  }
}

// API 封装
const fetchMenuList = async (params: any) => {
  try {
    const queryParams: GetBotMenuListParams = {
      bot_id: params.bot_id || 0, // 从参数获取 bot_id，默认为 0
      status: params.status || undefined
    }

    const response = await getBotMenuList(queryParams)

    if (response.code === '000000' && response.data) {
      // 新接口返回简单数组，不是分页对象
      const list = Array.isArray(response.data) ? response.data : []

      // 按 order_num 从大到小排序
      list.sort((a, b) => b.order_num - a.order_num)
      const hasSearchCondition = !!(params.menu_name || params.status)
      handleListMessage(list, hasSearchCondition, '菜单')

      return {
        list,
        totalCount: list.length // 简单数组，总数就是数组长度
      }
    }

    handleDataFormatError('菜单列表')
    return { list: [], totalCount: 0 }
  } catch (error) {
    handleErrorMessage(error, '获取菜单列表失败')
    return { list: [], totalCount: 0 }
  }
}

const deleteMenu = async (): Promise<boolean> => {
  const row = searchTableRef.value?.currentRow
  if (row && row.id) {
    try {
      const res = await deleteBotMenu(row.id)
      if (res.code === '000000') {
        handleSuccessMessage('删除成功')
        return true
      }
      handleErrorMessage((res as any).msg || '删除失败', '删除失败')
      return false
    } catch (error) {
      handleErrorMessage(error, '删除菜单失败')
      return false
    }
  } else {
    handleWarningMessage('删除失败：数据不完整')
    return false
  }
}

// 处理删除按钮点击
const handleDelete = (row: any) => {
  // 直接调用tableMethods.delList方法
  if (searchTableRef.value) {
    // 使用useSearchTable的handleDelete方法设置currentRow并调用delList
    searchTableRef.value.delete(row)
  }
}

// 事件处理函数
const handleAdd = () => {
  dialogTitle.value = '新增菜单'
  currentEditData.value = {
    menu_name: '',
    menu_type: 1,
    status: 1,
    visibility: 1,
    agent_ids: []
  }
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  dialogTitle.value = '编辑菜单'
  currentEditData.value = {
    id: row.id,
    menu_name: row.menu_name,
    // 后端暂未提供以下字段，先用默认值
    menu_type: row.menu_type ?? 1,
    status: row.status,
    visibility: row.visibility ?? 1,
    agent_ids: row.agent_ids ?? []
  }
  dialogVisible.value = true
}

const handlePreview = () => {
  previewVisible.value = true
}

const handleRefresh = () => {
  searchTableRef.value?.reload()
  ElMessage.success('刷新成功')
}

const handleSubmit = async (values: any) => {
  try {
    // 判断是添加还是更新
    if (values.id) {
      // 更新操作 - 使用批量更新接口（后端字段未完善前只传现有字段）
      const updateParams: BatchUpdateBotMenuParams = {
        bot_id: 0,
        menus: [
          {
            id: values.id,
            menu_name: values.menu_name,
            order_num: 0,
            status: values.status
          }
        ]
      }

      await batchUpdateBotMenu(updateParams)
      handleSuccessMessage('更新成功')
    } else {
      // 添加操作
      const addParams: AddBotMenuParams = {
        menu_name: values.menu_name,
        order_num: 0,
        status: values.status
      }

      await addBotMenu(addParams)
      handleSuccessMessage('添加成功')
    }

    dialogVisible.value = false
    searchTableRef.value?.reload()
  } catch (error) {
    handleErrorMessage(error, '保存失败')
  }
}

// 弹窗相关
const dialogVisible = ref(false)
const dialogTitle = ref('添加菜单')

const previewHandleClose = () => {
  previewVisible.value = false
  searchTableRef.value?.reload()
}

// 数据加载完成回调
const handleDataLoaded = ({ data, total, success }) => {
  console.log('数据加载完成:', {
    总条数: total,
    成功: success,
    数据: data,
    条数: data?.length || 0
  })
  nextTick(() => {
    isLoaded.value = true
  })
  if (data?.length === 0 && success) {
    ElMessage.info('未查询到符合条件的数据')
  }
}

// 状态切换处理函数
const handleStatusChange = async (row: any) => {
  if (!isLoaded.value) return

  try {
    // 使用批量更新接口更新单个菜单的状态
    const updateParams: BatchUpdateBotMenuParams = {
      bot_id: 0, // 运营端默认 bot_id 为 0
      menus: [
        {
          id: row.id,
          menu_name: row.menu_name,
          order_num: row.order_num,
          status: row.status
        }
      ]
    }

    await batchUpdateBotMenu(updateParams)
    ElMessage.success('状态更新成功')

    // 刷新列表
    searchTableRef.value?.reload()
  } catch (error) {
    console.error('状态更新失败:', error)
    ElMessage.error('状态更新失败')

    // 恢复原状态
    row.status = row.status === 0 ? 1 : 0
  }
}

onMounted(async () => {
  // 接口扩展前无需额外初始化
})
</script>

<style scoped>
/* 移除菜单预览相关样式 */
</style>
