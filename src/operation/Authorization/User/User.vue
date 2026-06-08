<script setup lang="tsx">
import { ContentWrap } from '@/components/ContentWrap'
import { useI18n } from '@/hooks/web/useI18n'
import { ref, nextTick, h, onMounted } from 'vue'
import {
  getManageUserListApiV2,
  addManageUserApiV2,
  updateManageUserApiV2,
  deleteManageUserApiV2,
  type ManageUserItem,
  type AddManageUserPayload,
  type UpdateManageUserPayload,
  type DeleteManageUserPayload
} from '@/api/opertion/Authorization/User'
import { getRoleListApi } from '@/api/opertion/Authorization/common/role'
import type { RoleItem } from '@/api/opertion/Authorization/common/role'
import { Table, type TableColumn } from '@/components/Table'
import { useTable } from '@/hooks/web/useTable'
import { ElTag, ElMessageBox, ElMessage } from 'element-plus'
import Write from './components/Write.vue'
import type { ManageUserFormData } from './components/Write.vue'
import { BaseButton } from '@/components/Button'
import { UnixTime } from '@/components/UnixTime'
import { handleErrorMessage, handleSuccessMessage } from '@/utils/messageHelper'

const { t } = useI18n()

type UserActionType = 'add' | 'edit'
type ManageUserTableSlot = { row: ManageUserItem }
interface ManageUserWriteExpose {
  open: () => void
  close: () => void
  submit: () => Promise<ManageUserFormData | null>
}

const roleList = ref<RoleItem[]>([])

const fetchRoleList = async () => {
  try {
    const res = await getRoleListApi()
    roleList.value = res.data.list || []
  } catch (error) {
    handleErrorMessage(error, '获取角色列表失败')
    roleList.value = []
  }
}

const getRoleName = (roleId: number) => {
  const role = roleList.value.find((r) => r.id === roleId)
  return role ? role.name : `角色ID: ${roleId}`
}

const columns: TableColumn[] = [
  {
    field: 'username',
    label: t('userDemo.username')
  },
  {
    field: 'role_name',
    label: t('userDemo.role'),
    formatter: (row: ManageUserItem) => getRoleName(row.role_id)
  },
  {
    field: 'status',
    label: t('userDemo.status'),
    slots: {
      default: ({ row }: ManageUserTableSlot) =>
        h(ElTag, { type: row.status === 1 ? 'success' : 'danger' }, () =>
          row.status === 1 ? t('userDemo.enable') : t('userDemo.disable')
        )
    }
  },
  {
    field: 'created_at',
    label: t('tableDemo.displayTime'),
    sortable: true,
    formatter: (row: ManageUserItem) =>
      row.created_at ? h(UnixTime, { timestamp: row.created_at }) : '-'
  },
  {
    field: 'updated_at',
    label: '更新时间',
    sortable: true,
    formatter: (row: ManageUserItem) =>
      row.updated_at ? h(UnixTime, { timestamp: row.updated_at }) : '-'
  },
  {
    field: 'action',
    label: t('userDemo.action'),
    width: 240,
    slots: {
      default: ({ row }: ManageUserTableSlot) => [
        <BaseButton type="primary" onClick={() => action(row, 'edit')}>
          {t('exampleDemo.edit')}
        </BaseButton>,
        <BaseButton type="danger" onClick={() => delData(row)}>
          {t('exampleDemo.del')}
        </BaseButton>
      ]
    }
  }
]

const { tableRegister, tableMethods, tableState } = useTable({
  fetchDataApi: async () => {
    const page = tableState.currentPage.value
    const size = tableState.pageSize.value
    try {
      const res = await getManageUserListApiV2({ current_page: page, page_size: size })
      return {
        list: res.data.list || [],
        total: res.data.pager?.total || 0
      }
    } catch (error) {
      handleErrorMessage(error, '获取用户列表失败')
      return { list: [], total: 0 }
    }
  },
  immediate: true
})

const { getList, setProps } = tableMethods
const { dataList, loading, total, currentPage, pageSize } = tableState

const dialogTitle = ref('')
const currentRow = ref<ManageUserItem | undefined>()
const actionType = ref<UserActionType>('add')
const writeRef = ref<ManageUserWriteExpose | null>(null)

const AddAction = () => {
  dialogTitle.value = t('exampleDemo.add')
  currentRow.value = undefined
  actionType.value = 'add'
  nextTick(() => writeRef.value?.open())
}

const delLoading = ref(false)

const delData = async (row?: ManageUserItem) => {
  if (!row) return
  try {
    await ElMessageBox.confirm(
      t('userDemo.confirmDeleteMessage', `确定要删除用户 ${row.username} 吗？`),
      t('userDemo.confirmTitle', '确认删除'),
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    delLoading.value = true
    try {
      const payload: DeleteManageUserPayload = {
        id: Number(row.id)
      }
      await deleteManageUserApiV2(payload)
      handleSuccessMessage('删除成功')
      getList()
    } catch (error) {
      handleErrorMessage(error, '删除失败')
    } finally {
      delLoading.value = false
    }
  } catch {
    ElMessage.info('取消操作')
  }
}

const action = (row: ManageUserItem, type: UserActionType) => {
  dialogTitle.value = t('exampleDemo.edit')
  actionType.value = type
  currentRow.value = { ...row }
  nextTick(() => writeRef.value?.open())
}

const saveLoading = ref(false)

const save = async () => {
  const write = writeRef.value
  const formData = await write?.submit()
  if (formData) {
    saveLoading.value = true
    try {
      if (actionType.value === 'edit') {
        const payload: UpdateManageUserPayload = {
          id: Number(formData.id),
          username: formData.username,
          password: formData.password || undefined,
          role_id: formData.role_id,
          status: formData.status
        }
        await updateManageUserApiV2(payload)
      } else {
        const payload: AddManageUserPayload = {
          username: formData.username,
          password: formData.password || '',
          role_id: formData.role_id,
          status: formData.status
        }
        await addManageUserApiV2(payload)
      }
      handleSuccessMessage(actionType.value === 'edit' ? '编辑成功' : '添加成功')
      writeRef.value?.close()
    } catch (error) {
      handleErrorMessage(error, actionType.value === 'edit' ? '编辑失败' : '添加失败')
    } finally {
      saveLoading.value = false
    }
  }
}

const handleCurrentChange = (newPage: number) => {
  currentPage.value = newPage
}
const handleSizeChange = (newSize: number) => {
  pageSize.value = newSize
}

onMounted(async () => {
  setProps({ columns: columns })
  await fetchRoleList()
})
</script>

<template>
  <div class="flex flex-col w-100% h-100%">
    <ContentWrap class="flex-1 mb-4">
      <div class="mb-4">
        <BaseButton type="primary" @click="AddAction">{{ t('exampleDemo.add') }}</BaseButton>
      </div>

      <Table
        :data="dataList"
        :loading="loading"
        :selection="false"
        :border="true"
        stripe
        :pagination="{
          total: total,
          currentPage: currentPage,
          pageSize: pageSize,
          pageSizes: [10, 20, 50, 100],
          layout: 'total, sizes, prev, pager, next, jumper',
          background: true
        }"
        @update:currentPage="handleCurrentChange"
        @update:pageSize="handleSizeChange"
        @register="tableRegister"
      />
    </ContentWrap>

    <Write
      ref="writeRef"
      :current-row="currentRow"
      :dialog-title="dialogTitle"
      :save-loading="saveLoading"
      :action-type="actionType"
      @closed="getList"
    >
      <template #footer>
        <BaseButton type="primary" :loading="saveLoading" @click="save">
          {{ t('exampleDemo.save') }}
        </BaseButton>
        <BaseButton @click="writeRef?.close()">{{ t('dialogDemo.close') }}</BaseButton>
      </template>
    </Write>
  </div>
</template>
