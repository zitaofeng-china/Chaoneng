<script lang="tsx">
import { defineComponent, computed, ref } from 'vue'
import { Collapse } from '@/components/Collapse'
import { LocaleDropdown } from '@/components/LocaleDropdown'
import { SizeDropdown } from '@/components/SizeDropdown'
import { UserInfo } from '@/components/UserInfo'
import { Screenfull } from '@/components/Screenfull'
import { Breadcrumb } from '@/components/Breadcrumb'
import { useAppStore } from '@/store/modules/app'
import { useDesign } from '@/hooks/web/useDesign'
import { Icon } from '@/components/Icon'
import WebhookFormModal from './WebhookFormModal.vue'
import NotifyBotDialog from '@/operation/Agent/components/NotifyBotDialog.vue'
import { getUserCustomerServiceListApi } from '@/api/common/customer_service'
import { getAccountListApi } from '@/api/management/AccountManage/AccountList'
import NotificationConfig from '@/management/AccountManage/AccountList/components/NotificationConfig.vue'
import { BaseButton } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import { ElMessage, ElSkeleton, ElTooltip } from 'element-plus'
import { isManagementSystem } from '@/utils/system'

const { getPrefixCls, variables } = useDesign()

const prefixCls = getPrefixCls('tool-header')

const appStore = useAppStore()
const AgentNotifyDialog = Dialog as any

// 面包屑
const breadcrumb = computed(() => appStore.getBreadcrumb)

// 折叠图标
const hamburger = computed(() => appStore.getHamburger)

// 全屏图标
const screenfull = computed(() => appStore.getScreenfull)

// 尺寸图标
const size = computed(() => appStore.getSize)

// 布局
const layout = computed(() => appStore.getLayout)

// 多语言图标
const locale = computed(() => appStore.getLocale)

const VITE_NODE_ENV = import.meta.env.VITE_NODE_ENV === 'development' ? 'dev' : 'prod'

const notifyEntryLabel = computed(() => (isManagementSystem() ? '消息通知' : '通知机器人'))

export default defineComponent({
  name: 'ToolHeader',
  components: { WebhookFormModal, NotifyBotDialog, Dialog, NotificationConfig },
  setup() {
    // 使用 ref 创建本地响应式状态来控制模态框的可见性
    const isWebhookFormVisible = ref(false)
    const notifyBotDialogVisible = ref(false)
    const agentNotifyDialogVisible = ref(false)
    const agentNotifyLoading = ref(false)
    const agentAccountInfo = ref<Record<string, any>>({})

    // 处理打开 Webhook 表单的点击事件
    const handleOpenWebhookForm = () => {
      isWebhookFormVisible.value = true
      console.log('打开 Webhook 表单（本地状态）')
    }

    // 处理关闭模态框的事件
    const handleCloseWebhookForm = () => {
      isWebhookFormVisible.value = false
    }

    const loadAgentNotifyConfig = async () => {
      agentNotifyLoading.value = true
      try {
        const response = await getAccountListApi()
        agentAccountInfo.value = response.data || {}
      } catch (error) {
        console.error('获取账户通知配置失败:', error)
        ElMessage.error('获取账户通知配置失败')
      } finally {
        agentNotifyLoading.value = false
      }
    }

    const handleOpenNotifyBotDialog = async () => {
      if (isManagementSystem()) {
        agentNotifyDialogVisible.value = true
        await loadAgentNotifyConfig()
        return
      }

      notifyBotDialogVisible.value = true
    }

    const handleContactCustomerService = async () => {
      try {
        const res = await getUserCustomerServiceListApi({
          current_page: 1,
          page_size: 1,
          status: 1
        })

        if (res.data.list && res.data.list.length > 0) {
          const firstCustomerService = res.data.list[0]
          let tgName = firstCustomerService.tg_name

          if (tgName.startsWith('@')) {
            tgName = tgName.substring(1)
          }

          window.open(`https://t.me/${tgName}`, '_blank')
        } else {
          ElMessage.warning('暂无可用客服')
        }
      } catch (error) {
        console.error('获取客服信息失败:', error)
        ElMessage.error('获取客服信息失败')
      }
    }

    return () => (
      <div
        id={`${variables.namespace}-tool-header`}
        class={[
          prefixCls,
          'h-[var(--top-tool-height)] relative px-[var(--top-tool-p-x)] flex items-center justify-between'
        ]}
      >
        {layout.value !== 'top' ? (
          <div class="h-full flex items-center">
            {hamburger.value && layout.value !== 'cutMenu' ? (
              <Collapse class="custom-hover" color="var(--top-header-text-color)"></Collapse>
            ) : undefined}
            {breadcrumb.value ? <Breadcrumb class="<md:hidden"></Breadcrumb> : undefined}
          </div>
        ) : undefined}
        <div class="h-full flex items-center tool-header-actions">
          {isManagementSystem() ? (
            <BaseButton type="primary" onClick={handleContactCustomerService}>
              联系客服
            </BaseButton>
          ) : undefined}
          {VITE_NODE_ENV === 'dev' ? (
            <div
              class="custom-hover top-tool-action"
              onClick={handleOpenWebhookForm}
            >
              <Icon
                icon="ant-design:form-outlined"
                size={18}
                color="var(--top-header-text-color)"
              ></Icon>
              <span class="top-tool-action__label">接口配置</span>
            </div>
          ) : undefined}
          <ElTooltip content={notifyEntryLabel.value} placement="bottom">
            <div
              class="custom-hover top-tool-action"
              onClick={handleOpenNotifyBotDialog}
            >
              <Icon
                icon="ant-design:notification-outlined"
                size={18}
                color="var(--top-header-text-color)"
              ></Icon>
              <span class="top-tool-action__label">{notifyEntryLabel.value}</span>
            </div>
          </ElTooltip>
          {screenfull.value ? (
            <Screenfull
              class="custom-hover"
              color="var(--top-header-text-color)"
              label="全屏"
            ></Screenfull>
          ) : undefined}
          {size.value ? (
            <SizeDropdown
              class="custom-hover"
              color="var(--top-header-text-color)"
              label="字号"
            ></SizeDropdown>
          ) : undefined}
          {locale.value ? (
            <LocaleDropdown
              class="custom-hover"
              color="var(--top-header-text-color)"
              label="语言"
            ></LocaleDropdown>
          ) : undefined}
          <UserInfo></UserInfo>
        </div>

        <WebhookFormModal visible={isWebhookFormVisible.value} onClose={handleCloseWebhookForm} />
        {isManagementSystem() ? (
          <AgentNotifyDialog
            modelValue={agentNotifyDialogVisible.value}
            title="消息通知"
            width="820px"
            maxHeight="auto"
            onUpdate:modelValue={(value: boolean) => (agentNotifyDialogVisible.value = value)}
          >
            <div class="agent-notify-dialog-content">
              {agentNotifyLoading.value ? (
                <ElSkeleton rows={6} animated />
              ) : (
                <NotificationConfig
                  accountId={agentAccountInfo.value.id}
                  notifyThreshold={agentAccountInfo.value.notify_threshold}
                  chatId={agentAccountInfo.value.notify_chat_id}
                  orderNotifyTypes={
                    agentAccountInfo.value.order_notify_types ?? agentAccountInfo.value.order_types
                  }
                  orderNotifyEnabled={
                    agentAccountInfo.value.order_notify_enabled ??
                    agentAccountInfo.value.order_enabled
                  }
                  onSaved={loadAgentNotifyConfig}
                />
              )}
            </div>
          </AgentNotifyDialog>
        ) : (
          <NotifyBotDialog
            visible={notifyBotDialogVisible.value}
            title="通知机器人"
            showModeSelect
            onUpdate:visible={(value: boolean) => (notifyBotDialogVisible.value = value)}
          />
        )}
      </div>
    )
  }
})
</script>

<style lang="less" scoped>
@prefix-cls: ~'@{adminNamespace}-tool-header';

.@{prefix-cls} {
  transition: left var(--transition-time-02);
}

.tool-header-actions {
  gap: 12px;
}

.top-tool-action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.top-tool-action__label {
  font-size: 13px;
  line-height: 18px;
  color: var(--top-header-text-color);
  white-space: nowrap;
}

.agent-notify-dialog-content {
  padding: 4px 0 0;

  :deep(.notification-config-section) {
    padding: 0;
    margin-top: 0;
    border: 0;
    box-shadow: none;
  }

  :deep(.notification-config-header) {
    display: block;
    min-height: auto;
    margin-bottom: 12px;
  }

  :deep(.notification-config-header h3) {
    display: none;
  }

  :deep(.official-bot-tip) {
    position: static;
    display: block;
    margin: 0 auto;
    font-size: 14px;
    line-height: 22px;
    text-align: center;
    white-space: normal;
    transform: none;
  }

  :deep(.notification-config-section > .flex.justify-center) {
    justify-content: center;
  }

  :deep(.el-form) {
    width: 100%;
    max-width: 100%;
  }

  :deep(.el-form-item) {
    margin-bottom: 20px;
  }

  :deep(.el-form-item__label) {
    padding-right: 14px;
    font-weight: 500;
    color: #303133;
  }

  :deep(.el-form-item__content) {
    display: block;
    min-width: 0;
  }

  :deep(.el-form-item__content > .flex.items-center.gap-4) {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr) 36px;
    gap: 14px;
    align-items: center;
    width: 100%;
  }

  :deep(.el-form-item__content > .flex.items-center.gap-4 .el-input-number) {
    width: 100%;
  }

  :deep(.el-form-item__content > .flex.items-center.gap-4 .text-gray-500) {
    margin-left: 0;
  }

  :deep(.el-form-item__content > .text-sm) {
    margin-top: 8px;
    line-height: 20px;
    color: #606266;
  }

  :deep(.order-type-group) {
    grid-template-columns: repeat(4, minmax(84px, 1fr));
    gap: 14px 28px;
    width: 100%;
    margin-top: 0;
    padding: 2px 0;
  }

  :deep(.order-type-group .el-checkbox) {
    height: 24px;
    margin-right: 0;
  }

  :deep(.el-form-item:last-child) {
    margin-top: 22px;
    margin-bottom: 0;
  }

  :deep(.el-form-item:last-child .el-form-item__content > .flex) {
    justify-content: flex-end;
  }
}
</style>
