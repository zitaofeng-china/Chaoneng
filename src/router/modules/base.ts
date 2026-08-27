import { Layout } from '@/utils/routerHelper'
import { useI18n } from '@/hooks/web/useI18n'
// 直接导入关键页面，避免懒加载导致首次访问延迟
import Login from '@/views/Login/Login.vue'
import NotFound from '@/views/Error/404.vue'

// Rely on global AppRouteRecordRaw type

const { t } = useI18n()
const isManagement = import.meta.env.VITE_SYSTEM_TYPE === 'Management'

const baseRoutes: AppRouteRecordRaw[] = [
  // Note: Root route ('/') is kept in index.ts
  {
    path: '/redirect',
    component: Layout,
    name: 'RedirectWrap',
    children: [
      {
        path: '/redirect/:path(.*)',
        name: 'Redirect',
        component: () => import('@/views/Redirect/Redirect.vue'),
        meta: {}
      }
    ],
    meta: {
      hidden: true,
      noTagsView: true
    }
  },
  {
    path: '/home',
    component: () => import('@/views/Redirect/Home.vue'),
    name: 'HomeRedirect',
    meta: {
      hidden: true,
      noTagsView: true
    }
  },
  {
    path: '/login',
    component: Login, // 直接使用导入的组件，避免懒加载
    name: 'Login',
    meta: {
      hidden: true,
      title: t('router.login'),
      noTagsView: true
    }
  },
  {
    path: '/reset-password',
    component: () => import('@/views/Login/ResetPassword.vue'),
    name: 'ResetPassword',
    meta: {
      hidden: true,
      title: isManagement ? t('router.resetPassword') : '账号重置',
      noTagsView: true
    }
  },
  ...(!isManagement
    ? [
        {
          path: '/bind-passkey',
          component: () => import('@/views/Login/BindPasskey.vue'),
          name: 'BindPasskey',
          meta: {
            hidden: true,
            title: '绑定通行密钥',
            noTagsView: true
          }
        } as AppRouteRecordRaw
      ]
    : []),
  {
    path: '/personal',
    component: Layout,
    redirect: '/personal/personal-center',
    name: 'Personal',
    meta: {
      title: t('router.personal'),
      hidden: true,
      canTo: true,
      breadcrumb: false
    },
    children: [
      {
        path: 'personal-center',
        component: isManagement
          ? () => import('@/views/Personal/PersonalCenter/PersonalCenter.vue')
          : () => import('@/operation/Personal/index.vue'),
        name: 'PersonalCenter',
        meta: {
          title: t('router.personalCenter'),
          hidden: true,
          canTo: true
        }
      }
    ]
  },
  {
    path: '/404',
    component: NotFound, // 直接使用导入的组件
    name: 'NoFind',
    meta: {
      hidden: true,
      title: '404',
      noTagsView: true
    }
  }
]

export default baseRoutes
