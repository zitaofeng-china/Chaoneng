<script setup lang="tsx">
import { ref, h, nextTick, onMounted, computed } from 'vue'
import type { VNode } from 'vue'
import {
  getRoleListApi,
  getRoleDetailApi,
  deleteRoleApiV2
} from '@/api/opertion/Authorization/common/role'
import type { RoleItem } from '@/api/opertion/Authorization/common/role'
import { useI18n } from '@/hooks/web/useI18n'
import { ContentWrap } from '@/components/ContentWrap'
import { BaseButton } from '@/components/Button'
import { ElMessageBox } from 'element-plus'
import { Table, TableColumn } from '@/components/Table'
import Write from './components/Write.vue'
import { useTable } from '@/hooks/web/useTable'
import { handleErrorMessage, handleSuccessMessage } from '@/utils/messageHelper'
import { useUserStore } from '@/store/modules/user'
import { formatTableDateTime, renderStatusTag, type TableSlot } from '@/utils/tableHelpers'
import { AUTH_ENABLE_STATUS_MAP } from '../constants'

const { t } = useI18n()
const userStore = useUserStore()
const userPermissions = computed(() => (userStore.userInfo?.permissions || []).map(String))

const hasPermission = (permission: string) => {
  if (userStore.isSuperAdmin) {
    return true
  }
  return userPermissions.value.includes(permission)
}

type RoleTableSlot = TableSlot<RoleItem>
type RoleFormRow = RoleItem & {
  Name?: string
}

const columns: TableColumn[] = [
  {
    field: 'name',
    label: t('role.roleName')
  },
  {
    field: 'status',
    label: t('menu.status'),
    slots: {
      default: ({ row }: RoleTableSlot) =>
        renderStatusTag(AUTH_ENABLE_STATUS_MAP, row.status, '-', 'default')
    }
  },
  {
    field: 'created_at',
    label: t('tableDemo.displayTime'),
    sortable: true,
    formatter: (row: RoleItem) => formatTableDateTime(row.created_at)
  },
  {
    field: 'action',
    label: t('userDemo.action'),
    width: 240,
    slots: {
      default: ({ row }: RoleTableSlot) => {
        const isSuperAdmin = row.id === 1
        const actions: VNode[] = []

        if (hasPermission('Role.edit')) {
          actions.push(
            h(
              BaseButton,
              {
                type: 'primary',
                disabled: isSuperAdmin,
                onClick: () => handleAction(row, 'edit'),
                style: { marginRight: '8px' }
              },
              () => t('exampleDemo.edit')
            )
          )
        }

        if (hasPermission('Role.delete')) {
          actions.push(
            h(
              BaseButton,
              {
                type: 'danger',
                disabled: isSuperAdmin,
                onClick: () => handleDelete(row)
              },
              () => t('exampleDemo.del')
            )
          )
        }

        return actions
      }
    }
  }
]

const { tableRegister, tableMethods, tableState } = useTable({
  fetchDataApi: async () => {
    try {
      const res = await getRoleListApi()
      return {
        list: res.data.list || [],
        total: res.data.pager.total || 0
      }
    } catch (error) {
      handleErrorMessage(error, '获取角色列表失败')
      return { list: [], total: 0 }
    }
  },
  immediate: true
})

const { getList, setProps } = tableMethods
const { dataList, loading, currentPage, pageSize } = tableState

const dialogTitle = ref('')
const actionType = ref<'add' | 'edit' | 'detail' | ''>('')
const writeRef = ref<InstanceType<typeof Write> | null>(null)
const formLoading = ref(false)
const currentRow = ref<RoleFormRow | null>(null)

const handleAction = async (row: RoleItem, type: 'edit' | 'detail') => {
  dialogTitle.value = t(type === 'edit' ? 'exampleDemo.edit' : 'exampleDemo.detail')
  actionType.value = type
  if (type === 'detail') {
    currentRow.value = row
  } else {
    try {
      formLoading.value = true
      const res = await getRoleDetailApi(row.id)
      const roleDetail = res?.data || {}
      currentRow.value = { ...row, ...roleDetail }
      nextTick(() => {
        writeRef.value?.open()
      })
    } catch (error) {
      handleErrorMessage(error, '获取角色详情失败')
    } finally {
      formLoading.value = false
    }
  }
}

const handleAdd = () => {
  dialogTitle.value = t('exampleDemo.add')
  actionType.value = 'add'
  currentRow.value = null
  nextTick(() => writeRef.value?.open())
}

const handleSaveSuccess = async () => {
  await getList()
}

const handleDelete = (row: RoleItem) => {
  ElMessageBox.confirm('确定删除该角色吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(async () => {
      try {
        await deleteRoleApiV2(row.id)
        await getList()
        handleSuccessMessage('删除成功')
      } catch (error) {
        handleErrorMessage(error, '删除失败')
      }
    })
    .catch(() => {})
}

const handleCurrentChange = (newPage: number) => {
  currentPage.value = newPage
}
const handleSizeChange = (newSize: number) => {
  pageSize.value = newSize
}

onMounted(() => {
  setProps({ columns: columns })
})
</script>

<template>
  <ContentWrap>
    <div v-if="hasPermission('Role.add')" class="mb-4">
      <BaseButton type="primary" @click="handleAdd">{{ t('exampleDemo.add') }}</BaseButton>
    </div>

    <Table
      :data="dataList"
      :loading="loading"
      :selection="false"
      :border="true"
      stripe
      @update:currentPage="handleCurrentChange"
      @update:pageSize="handleSizeChange"
      @register="tableRegister"
    />
  </ContentWrap>

  <Write
    ref="writeRef"
    :current-row="currentRow"
    :dialog-title="dialogTitle"
    :action-type="actionType"
    :form-loading="formLoading"
    @success="handleSaveSuccess"
  >
    <template #footer>
      <BaseButton
        v-if="actionType === 'add' || actionType === 'edit'"
        type="primary"
        @click="writeRef?.submit()"
      >
        {{ t('exampleDemo.save') }}
      </BaseButton>
      <BaseButton @click="writeRef?.close()">{{ t('dialogDemo.close') }}</BaseButton>
    </template>
  </Write>
</template>
