import { Layout } from '@/utils/routerHelper'

let operationRoutes: AppRouteRecordRaw[] = []
if (import.meta.env.VITE_SYSTEM_TYPE === 'Operation') {
  operationRoutes = [
    {
      path: '/data_analysis',
      component: Layout,
      name: 'DataStatistics',
      redirect: '/data_analysis/data_statistics',
      meta: {
        title: '数据分析',
        icon: 'vi-mdi:chart-bar',
        alwaysShow: true
      },
      children: [
        {
          path: 'data_statistics',
          alias: '/data_statistics/index',
          component: () => import('@/operation/DataStatistics/Analysis/index.vue'),
          name: 'Analysis',
          meta: {
            title: '数据统计'
          }
        },
        {
          path: 'exchange_rate',
          alias: '/exchange_rate/index',
          component: () => import('@/operation/DataStatistics/ExchangeRateIndex/index.vue'),
          name: 'ExchangeRateIndex',
          meta: {
            title: '实时汇率监听'
          }
        },
        {
          path: 'announcement',
          alias: '/system_config/announcement',
          component: () => import('@/operation/DataStatistics/Announcement/index.vue'),
          name: 'Announcement',
          meta: {
            title: '现金池管理'
          }
        },
        {
          path: 'user_statistics_report',
          alias: '/data_statistics/user_statistics_report',
          component: () => import('@/operation/DataStatistics/UserStatisticsReport/index.vue'),
          name: 'UserStatisticsReport',
          meta: {
            title: '人数统计报表'
          }
        },
        {
          path: 'order_type_statistics',
          alias: '/data_statistics/order_type_statistics',
          component: () => import('@/operation/DataStatistics/OrderTypeStatistics/index.vue'),
          name: 'OrderTypeStatistics',
          meta: {
            title: '订单类型统计'
          }
        },
        {
          path: 'energy_statistics_report',
          alias: '/data_statistics/energy_statistics_report',
          component: () => import('@/operation/DataStatistics/EnergyStatisticsReport/index.vue'),
          name: 'EnergyStatisticsReport',
          meta: {
            title: '能量统计报表'
          }
        },
        {
          path: 'energy_outbound_order',
          alias: '/data_statistics/energy_outbound_order',
          component: () => import('@/operation/DataStatistics/EnergyOutboundOrder/index.vue'),
          name: 'EnergyOutboundOrder',
          meta: {
            title: '能量出账订单'
          }
        },
        {
          path: 'sale_by_time_report',
          alias: '/data_statistics/sale_by_time_report',
          component: () => import('@/operation/DataStatistics/SaleByTimeReport/index.vue'),
          name: 'SaleByTimeReport',
          meta: {
            title: '按时间销售报表'
          }
        },
        {
          path: 'payment_statistics_report',
          alias: '/data_statistics/payment_statistics_report',
          component: () => import('@/operation/DataStatistics/PaymentStatisticsReport/index.vue'),
          name: 'PaymentStatisticsReport',
          meta: {
            title: '支付统计报表'
          }
        }
      ]
    },
    {
      path: '/operation',
      component: Layout,
      name: 'Operation',
      meta: {
        title: '运营中心',
        icon: 'vi-mdi:view-dashboard',
        alwaysShow: true
      },
      children: [
        {
          path: 'recharge_order',
          component: () => import('@/operation/OperationCenter/RechargeOrder/index.vue'),
          name: 'RechargeOrder',
          meta: {
            title: '充值订单'
          }
        },
        {
          path: 'energy_transaction',
          component: () => import('@/operation/OperationCenter/EnergyTransaction/index.vue'),
          name: 'EnergyTransactionList',
          meta: {
            title: '能量订单'
          }
        },
        {
          path: 'flash_exchange',
          component: () => import('@/operation/OperationCenter/ExchangeTransaction/index.vue'),
          name: 'FlashExchange',
          meta: {
            title: '闪兑订单'
          }
        },
        {
          path: 'hosted_list',
          component: () => import('@/operation/OperationCenter/HostedList/index.vue'),
          name: 'CustodyDetails',
          meta: {
            title: '托管列表'
          }
        },
        {
          path: 'quick_charge_order',
          component: () => import('@/operation/OperationCenter/QuickChargeOrder/index.vue'),
          name: 'QuickChargeOrder',
          meta: {
            title: '速充订单'
          }
        }
      ]
    },
    {
      path: '/marketing',
      component: Layout,
      name: 'Marketing',
      meta: {
        title: '营销管理',
        icon: 'vi-mdi:bullhorn',
        alwaysShow: true
      },
      children: [
        {
          path: 'agent_price',
          component: () => import('@/operation/Marketing/AgentPrice/index.vue'),
          name: 'AgentPrice',
          meta: {
            title: '代理价格配置',
            buttonList: ['add', 'edit', 'delete']
          }
        },
        {
          path: 'payment',
          component: () => import('@/operation/Marketing/Payment/index.vue'),
          name: 'Payment',
          meta: {
            title: '地址管理',
            buttonList: ['add', 'edit', 'delete']
          }
        },
        {
          path: 'welfare_config',
          component: () => import('@/operation/Marketing/WelfareConfig/index.vue'),
          name: 'WelfareConfig',
          meta: {
            title: '福利配置',
            buttonList: ['add', 'edit', 'delete']
          }
        },
        {
          path: 'trx_address_book',
          component: () => import('@/operation/Marketing/TrxAddressBook/index.vue'),
          name: 'TrxAddressBook',
          meta: {
            hidden: true,
            title: '收款地址簿',
            buttonList: ['add', 'edit', 'delete']
          }
        },
        {
          path: 'menu_list',
          component: () => import('@/operation/Marketing/MenuList/index.vue'),
          name: 'MarketingMenuList',
          meta: {
            title: '菜单列表',
            buttonList: ['add', 'edit', 'delete']
          }
        },
        {
          path: 'reply_list',
          component: () => import('@/operation/Marketing/ReplyList/index.vue'),
          name: 'MarketingReplyList',
          meta: {
            title: '关键词回复',
            buttonList: ['add', 'edit', 'delete']
          }
        },
        {
          path: 'group_list',
          component: () => import('@/operation/Marketing/GroupList/index.vue'),
          name: 'MarketingGroupList',
          meta: {
            title: '聊天列表'
          }
        }
      ]
    },
    {
      path: '/financial_manage',
      component: Layout,
      name: 'FinancialManage',
      redirect: '/financial_manage/financial_price',
      meta: {
        title: '理财管理',
        icon: 'vi-mdi:cash-multiple',
        alwaysShow: true
      },
      children: [
        {
          path: 'financial_price',
          component: () => import('@/operation/FinancialManage/FinancialPrice/index.vue'),
          name: 'FinancialPrice',
          meta: {
            title: '理财价格配置',
            buttonList: ['edit']
          }
        },
        {
          path: 'resource_order',
          component: () => import('@/operation/FinancialManage/ResourceOrder/index.vue'),
          name: 'ResourceOrder',
          meta: {
            title: '理财订单列表'
          }
        },
        {
          path: 'resource_supplement_config',
          component: () => import('@/operation/FinancialManage/ResourceSupplementConfig/index.vue'),
          name: 'ResourceSupplementConfig',
          meta: {
            title: '资源补充配置',
            buttonList: ['add', 'edit']
          }
        },
        {
          path: 'resource_supplement_order',
          component: () => import('@/operation/FinancialManage/ResourceSupplementOrder/index.vue'),
          name: 'ResourceSupplementOrder',
          meta: {
            title: '资源补充记录'
          }
        }
      ]
    },
    {
      path: '/agent',
      component: Layout,
      name: 'Agent',
      meta: {
        title: '代理管理',
        icon: 'vi-mdi:account-group',
        alwaysShow: true
      },
      children: [
        {
          path: 'agent_list',
          component: () => import('@/operation/Agent/AgentList/index.vue'),
          name: 'AgentList',
          meta: {
            title: '代理信息',
            buttonList: ['add', 'edit', 'delete']
          }
        },
        {
          path: 'ledger',
          component: () => import('@/operation/Agent/Ledger/index.vue'),
          name: 'AgentLedger',
          meta: {
            title: '代理账本'
          }
        },
        {
          path: 'recharge_order',
          component: () => import('@/operation/Agent/RechargeOrder/index.vue'),
          name: 'AgentRechargeOrder',
          meta: {
            title: '代理充值'
          }
        },
        {
          path: 'bot_list',
          component: () => import('@/operation/Agent/BotList/index.vue'),
          name: 'AgentBotList',
          meta: {
            title: '机器人列表',
            buttonList: ['edit']
          }
        },
        {
          path: 'user_list',
          component: () => import('@/operation/Agent/UserList/index.vue'),
          name: 'UserList',
          meta: {
            title: '用户列表'
          }
        },
        {
          path: 'message_list',
          component: () => import('@/operation/Agent/MessageList/index.vue'),
          name: 'AgentMessageList',
          meta: {
            title: '消息列表',
            buttonList: ['add', 'edit', 'delete']
          }
        },
        {
          path: 'invite_list',
          component: () => import('@/operation/Agent/InviteList/index.vue'),
          name: 'InviteList',
          meta: {
            title: '邀请列表'
          }
        }
      ]
    },
    // 系统管理
    {
      path: '/authorization',
      component: Layout,
      redirect: '/authorization/user',
      name: 'Authorization',
      meta: {
        title: '权限管理',
        icon: 'vi-eos-icons:role-binding',
        alwaysShow: true
      },
      children: [
        {
          path: 'user',
          component: () => import('@/operation/Authorization/User/User.vue'),
          name: 'User',
          meta: {
            title: '用户管理',
            buttonList: ['add', 'edit', 'delete']
          }
        },
        {
          path: 'role',
          component: () => import('@/operation/Authorization/Role/Role.vue'),
          name: 'Role',
          meta: {
            title: '角色管理',
            buttonList: ['add', 'edit', 'delete']
          }
        }
      ]
    },
    {
      path: '/customer-service',
      component: Layout,
      redirect: '/customer-service/index',
      name: 'CustomerService',
      meta: {
        title: '客服管理',
        icon: 'ant-design:customer-service-outlined' // Material Design Icons: account-headset
      },
      children: [
        {
          path: 'index',
          name: 'CustomerServicePage',
          component: () => import('@/operation/CustomerService/CustomerServicePage/index.vue'),
          meta: {
            title: '客服管理',
            icon: 'ant-design:customer-service-outlined'
          }
        }
      ]
    },
    {
      path: '/system_config',
      component: Layout,
      name: 'SystemConfig',
      meta: {
        title: '系统配置',
        icon: 'vi-mdi:wrench',
        alwaysShow: true
      },
      children: [
        {
          path: 'resource_pool',
          component: () => import('@/operation/SystemConfig/ResourcePool/index.vue'),
          name: 'ResourcePool',
          meta: {
            title: '资源池账户',
            buttonList: ['add', 'edit', 'delete']
          }
        }
      ]
    }
  ]
} else {
  operationRoutes = []
}

export default operationRoutes
