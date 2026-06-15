import { Layout } from '@/utils/routerHelper'
// import { useI18n } from '@/hooks/web/useI18n' // Assuming t() is not directly used here

// Rely on global AppRouteRecordRaw type

// No longer need userInfo logic here

const managementRoutes: AppRouteRecordRaw[] = [
  {
    path: '/bot_manage',
    component: Layout,
    name: 'BotManage',
    redirect: '/bot_manage/bot_list',
    meta: {
      title: '机器人管理',
      icon: 'lucide:bot',
      alwaysShow: true
    },
    children: [
      {
        path: 'bot_list',
        component: () => import('@/management/BotManage/BotList/index.vue'),
        name: 'BotList',
        meta: {
          title: '机器人列表'
        }
      },
      {
        path: 'reply_list',
        component: () => import('@/management/BotManage/ReplyList/index.vue'),
        name: 'ReplyList',
        meta: {
          title: '关键词回复'
        }
      }
    ]
  },
  {
    path: '/hosted_list',
    component: Layout,
    name: 'Hosted',
    meta: {
      title: '托管列表',
      icon: 'vi-mdi:order-bool-ascending-variant',
      alwaysShow: true
    },
    children: [
      {
        path: 'index',
        component: () => import('@/management/Hosted/HostedList/index.vue'),
        name: 'HostedList',
        meta: {
          title: '托管列表'
        }
      }
    ]
  },
  {
    path: '/black_list',
    component: Layout,
    name: 'Black',
    meta: {
      title: '黑名单列表',
      icon: 'vi-mdi:order-bool-ascending-variant',
      alwaysShow: true
    },
    children: [
      {
        path: 'index',
        component: () => import('@/management/Black/BlackList/index.vue'),
        name: 'BlackList',
        meta: {
          title: '黑名单列表'
        }
      }
    ]
  },
  {
    path: '/user_group',
    component: Layout,
    name: 'UserGroup',
    meta: {
      title: '用户群组',
      icon: 'vi-ph:users-three-fill',
      alwaysShow: true
    },
    children: [
      {
        path: 'user_list',
        component: () => import('@/management/UserGroup/UserList/index.vue'),
        name: 'UserList',
        meta: {
          title: '用户列表'
        }
      },
      {
        path: 'message_list',
        component: () => import('@/management/UserGroup/MessageList/index.vue'),
        name: 'MessageList',
        meta: {
          title: '消息列表'
        }
      },
      {
        path: 'invite_list',
        component: () => import('@/management/UserGroup/InviteList/index.vue'),
        name: 'InviteList',
        meta: {
          title: '邀请列表'
        }
      },
      {
        path: 'group_list',
        component: () => import('@/management/UserGroup/GroupList/index.vue'),
        name: 'GroupList',
        meta: {
          title: '聊天列表'
        }
      }
    ]
  },
  {
    path: '/order_manage',
    component: Layout,
    name: 'OrderManage',
    meta: {
      title: '订单管理',
      icon: 'vi-mdi:order-bool-ascending-variant',
      alwaysShow: true
    },
    children: [
      {
        path: 'recharge_order',
        component: () => import('@/management/OrderManage/RechargeOrder/index.vue'),
        name: 'RechargeOrder',
        meta: {
          title: '充值订单'
        }
      },
      {
        path: 'energy_order',
        component: () => import('@/management/OrderManage/EnergyOrder/index.vue'),
        name: 'EnergyOrder',
        meta: {
          title: '能量订单'
        }
      },
      {
        path: 'exchange_order',
        component: () => import('@/management/OrderManage/ExchangeOrder/index.vue'),
        name: 'ExchangeOrder',
        meta: {
          title: '兑换订单'
        }
      },
      {
        path: 'quick_charge_order',
        component: () => import('@/management/OrderManage/QuickChargeOrder/index.vue'),
        name: 'QuickChargeOrderManage',
        meta: {
          title: '速充订单'
        }
      }
    ]
  },
  {
    path: '/account_manage',
    component: Layout,
    name: 'AccountManage',
    meta: {
      title: '账户管理',
      icon: 'vi-mdi:account-cog',
      alwaysShow: true
    },
    children: [
      {
        path: 'account_list',
        component: () => import('@/management/AccountManage/AccountList/index.vue'),
        name: 'AccountList',
        meta: {
          title: '账户信息'
        }
      }
    ]
  }
]

export default managementRoutes
