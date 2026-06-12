<script setup lang="tsx">
import { ref, watch, nextTick, computed } from 'vue'
import type { PropType } from 'vue'
import { Form, FormSchema } from '@/components/Form'
import { useForm } from '@/hooks/web/useForm'
import { useI18n } from '@/hooks/web/useI18n'
import { ElTree, ElMessage, ElCheckbox } from 'element-plus'
import { Dialog } from '@/components/Dialog'
import operationRoutes from '@/router/modules/operation'
import { createRoleApi, updateRoleApiV2 } from '@/api/opertion/Authorization/common/role'
import { getErrorMessage } from '@/utils/messageHelper'
import type { CreateRolePayload, UpdateRolePayload } from '@/api/opertion/Authorization/common/role'

const { t } = useI18n()

interface RoleFormData {
  id?: number
  name?: string
  Name?: string
  status?: number
  permissions?: (string | number)[] | null
}

interface ButtonListItem {
  code: string
  label: string
}

interface MenuTreeNode {
  id: string
  label: string
  children?: MenuTreeNode[]
  buttonList?: ButtonListItem[]
}

type RolePermission = string

const props = defineProps({
  currentRow: Object as PropType<RoleFormData | null | undefined>,
  dialogTitle: String,
  actionType: String,
  formLoading: Boolean
})

const emit = defineEmits(['success'])

const dialogVisible = ref(false)
const saveLoading = ref(false)

const buttonCodeMap: Record<string, string> = {
  add: t('common.add', '新增'),
  edit: t('common.edit', '编辑'),
  delete: t('common.delete', '删除'),
  query: t('common.query', '查询'),
  import: t('common.import', '导入'),
  export: t('common.export', '导出'),
  download: t('common.download', '下载'),
  upload: t('common.upload', '上传')
}

const routeParentMap: Record<string, string | null> = {}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const getRouteName = (route: AppRouteRecordRaw) => {
  return typeof route.name === 'string' ? route.name : ''
}

const getRouteChildren = (route: AppRouteRecordRaw): AppRouteRecordRaw[] => {
  return Array.isArray(route.children) ? (route.children as AppRouteRecordRaw[]) : []
}

const normalizeButtonList = (buttonList: unknown): ButtonListItem[] | undefined => {
  if (!Array.isArray(buttonList)) {
    return undefined
  }

  const buttons = buttonList
    .map((item): ButtonListItem | null => {
      if (typeof item === 'string') {
        return {
          code: item,
          label: buttonCodeMap[item] || item
        }
      }

      if (!isRecord(item)) {
        return null
      }

      const code = typeof item.code === 'string' ? item.code : String(item.code || '')
      if (!code) {
        return null
      }

      const label = typeof item.label === 'string' ? item.label : buttonCodeMap[code] || code
      return { code, label }
    })
    .filter((item): item is ButtonListItem => Boolean(item))

  return buttons.length > 0 ? buttons : undefined
}

function buildRouteParentMap(routes: AppRouteRecordRaw[], parentName: string | null = null) {
  routes.forEach((route) => {
    const routeName = getRouteName(route)
    const children = getRouteChildren(route)

    if (routeName && route.meta?.title) {
      routeParentMap[routeName] = parentName
      if (children.length > 0) {
        buildRouteParentMap(children, routeName)
      }
      return
    }

    if (children.length > 0) {
      buildRouteParentMap(children, parentName)
    }
  })
}

function getAncestorPermissions(permission: string): string[] {
  const ancestors: string[] = []
  let current = routeParentMap[permission]

  while (current) {
    ancestors.unshift(current)
    current = routeParentMap[current]
  }

  return ancestors
}

function expandPermissionsWithParents(permissions: RolePermission[]): RolePermission[] {
  if (permissions.includes('*')) {
    return ['*']
  }

  const expanded: RolePermission[] = []
  const seen = new Set<RolePermission>()

  const append = (permission: RolePermission) => {
    if (!permission || seen.has(permission)) {
      return
    }
    seen.add(permission)
    expanded.push(permission)
  }

  permissions.forEach((permission) => {
    if (permission.includes('.')) {
      const menuPermission = permission.split('.')[0]
      getAncestorPermissions(menuPermission).forEach(append)
      append(menuPermission)
      append(permission)
      return
    }

    getAncestorPermissions(permission).forEach(append)
    append(permission)
  })

  return expanded
}

buildRouteParentMap(operationRoutes)

function buildMenuTree(routes: AppRouteRecordRaw[]): MenuTreeNode[] {
  return routes
    .filter((route) => {
      const routeName = getRouteName(route)
      if (!routeName) {
        return false
      }
      return Boolean(route.meta?.title && !route.meta.hidden)
    })
    .map((route) => {
      const children = buildMenuTree(getRouteChildren(route))
      const routeName = getRouteName(route)

      return {
        id: routeName,
        label: String(route.meta?.title || routeName),
        children: children.length > 0 ? children : undefined,
        buttonList: normalizeButtonList(route.meta?.buttonList)
      }
    })
}
const menuTree = buildMenuTree(operationRoutes)

const treeRef = ref<InstanceType<typeof ElTree>>()
const isApplyingTreeCheck = ref(false)

const selectedNodeId = ref<string | null>(null)
const selectedNodeButtonList = ref<ButtonListItem[]>([])

const currentPermissionsRef = ref<RolePermission[]>([])

const getMenuPermissions = (permissions: RolePermission[]) =>
  permissions.filter((permission) => !permission.includes('.'))

const getButtonPermissions = (permissions: RolePermission[]) =>
  permissions.filter((permission) => permission.includes('.'))

const buildMenuChildrenMap = (nodes: MenuTreeNode[]) => {
  const childrenMap: Record<string, string[]> = {}

  const traverse = (nodeList: MenuTreeNode[]) => {
    nodeList.forEach((node) => {
      childrenMap[node.id] = (node.children || []).map((child) => child.id)
      if (node.children?.length) {
        traverse(node.children)
      }
    })
  }

  traverse(nodes)
  return childrenMap
}

const menuChildrenMap = buildMenuChildrenMap(menuTree)

const getLeafMenuPermissions = (permissions: RolePermission[]) =>
  permissions.filter((permission) => (menuChildrenMap[permission] || []).length === 0)

const setTreeCheckedKeys = async (menuPermissions: RolePermission[]) => {
  const leafMenuPermissions = getLeafMenuPermissions(menuPermissions)
  isApplyingTreeCheck.value = true
  treeRef.value?.setCheckedKeys([], false)
  treeRef.value?.setCheckedKeys(leafMenuPermissions, false)
  await nextTick()
  isApplyingTreeCheck.value = false
  return leafMenuPermissions
}

const syncTreePermissions = async (menuPermissions: RolePermission[]) => {
  await setTreeCheckedKeys(menuPermissions)
  const normalizedMenuPermissions = Array.from(new Set(menuPermissions))
  const buttonPermissions = getButtonPermissions(currentPermissionsRef.value).filter(
    (permission) => {
      const menuId = permission.split('.')[0]
      return normalizedMenuPermissions.includes(menuId)
    }
  )

  await syncFormPermissions([...normalizedMenuPermissions, ...buttonPermissions])
}

const syncFormPermissions = async (permissions: RolePermission[]) => {
  currentPermissionsRef.value = permissions
  setValues({ permissions })

  const elForm = await getElFormExpose()
  elForm?.validateField('permissions')
}

const { formRegister, formMethods } = useForm()
const { setValues, getFormData, getElFormExpose } = formMethods

const renderButtonCheckboxes = () => {
  if (!selectedNodeId.value || selectedNodeButtonList.value.length === 0) {
    return <span>{t('role.selectMenuNodeToSetButtons', '请先选择左侧菜单节点以设置按钮权限')}</span>
  }

  const handleButtonChange = async (checked: boolean, buttonCode: string) => {
    if (!selectedNodeId.value) return

    const buttonPermission = `${selectedNodeId.value}.${buttonCode}`
    let newPermissions = [...currentPermissionsRef.value]

    if (checked) {
      if (!newPermissions.includes(buttonPermission)) {
        newPermissions.push(buttonPermission)
      }
    } else {
      newPermissions = newPermissions.filter((p) => p !== buttonPermission)
    }

    await syncFormPermissions(newPermissions)
  }

  return (
    <div class="button-checkbox-group" style="display: flex; flex-direction: column; gap: 5px;">
      {selectedNodeButtonList.value.map((button) => {
        const permissionId = `${selectedNodeId.value}.${button.code}`
        const isChecked = computed(() => currentPermissionsRef.value.includes(permissionId))

        return (
          <ElCheckbox
            key={permissionId}
            modelValue={isChecked.value}
            onChange={(checkedValue: boolean) => handleButtonChange(checkedValue, button.code)}
            label={permissionId}
          >
            {button.label} <span style="color: #999; font-size: 12px;">({button.code})</span>
          </ElCheckbox>
        )
      })}
    </div>
  )
}

const formSchema = computed<FormSchema[]>(() => [
  {
    field: 'name',
    label: t('role.roleName'),
    component: 'Input',
    componentProps: { placeholder: t('role.roleName') }
  },
  {
    field: 'status',
    label: t('menu.status'),
    component: 'Select',
    componentProps: {
      placeholder: t('menu.status'),
      options: [
        { label: t('userDemo.enable'), value: 1 },
        { label: t('userDemo.disable'), value: 2 }
      ]
    }
  },
  {
    field: 'permissionsDisplay',
    label: t('role.menu'),
    colProps: { span: 24 },
    formItemProps: {
      slots: {
        default: () => (
          <div style="display: flex; gap: 24px; width: 100%;">
            <div style="flex: 1; border: 1px solid #eee; padding: 10px; border-radius: 4px;">
              <div style="margin-bottom: 8px; font-weight: bold;">{t('role.menu', '菜单权限')}</div>
              <ElTree
                ref={treeRef}
                data={menuTree}
                show-checkbox
                node-key="id"
                highlight-current
                default-expand-all
                onCheck={handleCheckChange}
                onNode-click={nodeClick}
                style="max-height: 400px; overflow-y: auto;"
              />
            </div>
            <div style="flex: 1; border: 1px solid #eee; padding: 10px; border-radius: 4px;">
              <div style="margin-bottom: 8px; font-weight: bold;">
                {t('role.buttons', '按钮权限')}
              </div>
              {renderButtonCheckboxes()}
            </div>
          </div>
        )
      }
    }
  },
  {
    field: 'permissions',
    component: 'Input',
    colProps: { span: 0 },
    formItemProps: {
      style: { display: 'none' }
    }
  }
])

const rules = {
  name: [{ required: true, message: t('role.roleName') + '不能为空', trigger: 'blur' }],
  status: [{ required: true, message: t('menu.status') + '不能为空', trigger: 'change' }],
  permissions: [
    {
      required: true,
      validator: (_rule: unknown, value: unknown, callback: (error?: Error) => void) => {
        if (!Array.isArray(value) || value.length === 0) {
          callback(new Error(t('role.assignPermissions', '请至少分配一个菜单或按钮权限')))
        } else {
          callback()
        }
      },
      trigger: ['change', 'blur']
    }
  ]
}

const handleCheckChange = async (
  nodeData: MenuTreeNode,
  treeState: {
    checkedKeys?: Array<string | number>
    halfCheckedKeys?: Array<string | number>
  }
) => {
  if (isApplyingTreeCheck.value) return

  const menuPermissions = Array.from(
    new Set([...(treeState.checkedKeys || []), ...(treeState.halfCheckedKeys || [])].map(String))
  )

  await syncTreePermissions(menuPermissions)
}

const nodeClick = (nodeData: MenuTreeNode) => {
  selectedNodeId.value = nodeData.id || null
  selectedNodeButtonList.value = nodeData.buttonList || []
}

function getAllNodeIds(nodes: MenuTreeNode[]): string[] {
  const ids: string[] = []
  const traverse = (nodeList: MenuTreeNode[]) => {
    nodeList.forEach((node) => {
      if (node.id) {
        ids.push(node.id)
      }
      if (node.children && node.children.length > 0) {
        traverse(node.children)
      }
    })
  }
  traverse(nodes)
  return ids
}

watch(
  () => [props.currentRow, props.actionType],
  ([row, type]) => {
    selectedNodeId.value = null
    selectedNodeButtonList.value = []

    if (type === 'add' || !row || typeof row !== 'object' || row === null) {
      const initialValues = { name: '', status: 1, permissions: [] }
      setValues(initialValues)
      currentPermissionsRef.value = []
      nextTick(() => {
        void setTreeCheckedKeys([])
      })
    } else {
      const validRow = row as RoleFormData
      const currentPermissions = Array.isArray(validRow.permissions)
        ? validRow.permissions.map(String)
        : []

      const isSuperAdmin = currentPermissions.length > 0 && currentPermissions[0] === '*'

      let menuPermissions: string[]

      if (isSuperAdmin) {
        menuPermissions = getAllNodeIds(menuTree)
      } else {
        menuPermissions = currentPermissions.filter((p) => !p.includes('.'))
      }

      const valuesToSet = {
        name: validRow.Name ?? validRow.name ?? '',
        status: validRow.status ?? 1,
        permissions: isSuperAdmin
          ? [...menuPermissions]
          : [...menuPermissions, ...getButtonPermissions(currentPermissions)]
      }
      setValues(valuesToSet)
      currentPermissionsRef.value = isSuperAdmin
        ? [...menuPermissions]
        : [...menuPermissions, ...getButtonPermissions(currentPermissions)]

      nextTick(() => {
        void setTreeCheckedKeys(menuPermissions)
      })
    }
  },
  { immediate: true, deep: true }
)

const open = () => {
  dialogVisible.value = true
  selectedNodeId.value = null
  selectedNodeButtonList.value = []

  nextTick(async () => {
    const elForm = await getElFormExpose()
    elForm?.clearValidate()

    if (!props.currentRow || typeof props.currentRow !== 'object' || props.currentRow === null) {
      const initialValues = { name: '', status: 1, permissions: [] }
      setValues(initialValues)
      currentPermissionsRef.value = []
      await setTreeCheckedKeys([])
    } else {
      const rowData = props.currentRow as RoleFormData
      const currentPermissions = Array.isArray(rowData.permissions)
        ? rowData.permissions.map(String)
        : []
      const menuPermissions = getMenuPermissions(currentPermissions)
      const buttonPermissions = getButtonPermissions(currentPermissions)

      const valuesToSet = {
        name: rowData.Name ?? rowData.name ?? '',
        status: rowData.status ?? 1,
        permissions: [...menuPermissions, ...buttonPermissions]
      }
      setValues(valuesToSet)

      await setTreeCheckedKeys(menuPermissions)
      currentPermissionsRef.value = [...menuPermissions, ...buttonPermissions]
    }
  })
}

const close = () => {
  dialogVisible.value = false
}

const submit = async () => {
  const elForm = await getElFormExpose()
  const valid = await elForm?.validate().catch(() => {
    return false
  })

  if (!valid) {
    ElMessage.error(t('common.formValidateError', '表单校验失败，请检查输入项'))
    return
  }

  saveLoading.value = true
  const formData = await getFormData()

  const flatPermissions = Array.isArray(formData.permissions)
    ? formData.permissions.map(String)
    : []
  const normalizedPermissions = expandPermissionsWithParents(flatPermissions)

  const dataToSave: CreateRolePayload = {
    name: String(formData.name || ''),
    status: Number(formData.status || 1),
    permissions: normalizedPermissions
  }

  try {
    if (props.actionType === 'edit') {
      if (!props.currentRow || typeof props.currentRow !== 'object' || !props.currentRow.id) {
        ElMessage.error('无法编辑角色：缺少角色ID。')
        saveLoading.value = false
        return
      }
      const updateData: UpdateRolePayload = {
        id: props.currentRow.id,
        ...dataToSave
      }
      await updateRoleApiV2(updateData)
      ElMessage.success('编辑成功')
    } else if (props.actionType === 'add') {
      await createRoleApi(dataToSave)
      ElMessage.success('新增成功')
    }
    close()
    emit('success')
  } catch (error: unknown) {
    ElMessage.error(getErrorMessage(error, t('common.apiError')))
  } finally {
    saveLoading.value = false
  }
}

defineExpose({ open, close, submit })
</script>

<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle" :fullscreen="false" width="60%">
    <Form
      :rules="rules"
      @register="formRegister"
      :schema="formSchema"
      :loading="props.formLoading || saveLoading"
      label-position="top"
    />
    <template #footer>
      <slot name="footer"></slot>
    </template>
  </Dialog>
</template>

<style scoped>
.button-checkbox-group .el-checkbox {
  display: block;
  margin-right: 0;
}
</style>
