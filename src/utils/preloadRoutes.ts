/**
 * 路由预加载工具
 * 用于在运营端登录时预加载高频路由资源，提升登录后的页面加载速度
 */

class RoutePreloader {
  private abortController: AbortController | null = null
  private isPreloading = false
  private preloadedChunks = new Set<string>()

  /**
   * 开始预加载运营端路由
   */
  startPreload() {
    // 只在运营端执行预加载
    const systemType = import.meta.env.VITE_SYSTEM_TYPE
    if (systemType === 'Management') {
      return
    }

    if (this.isPreloading) {
      return
    }

    this.isPreloading = true
    this.abortController = new AbortController()

    // 预加载核心路由组件
    this.preloadCoreRoutes()
  }

  /**
   * 暂停预加载
   */
  pausePreload() {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
    this.isPreloading = false
  }

  /**
   * 恢复预加载
   */
  resumePreload() {
    if (!this.isPreloading) {
      this.startPreload()
    }
  }

  /**
   * 预加载核心路由
   */
  private async preloadCoreRoutes() {
    // 运营端核心路由列表（按优先级排序）
    const coreRoutes = [
      // 1. 默认入口和数据看板
      () => import('@/operation/DataStatistics/ExchangeRateIndex/index.vue'),
      () => import('@/operation/DataStatistics/Analysis/index.vue'),

      // 2. 订单管理（高频访问）
      () => import('@/operation/OperationCenter/RechargeOrder/index.vue'),
      () => import('@/operation/OperationCenter/EnergyTransaction/index.vue'),
      () => import('@/operation/OperationCenter/ExchangeTransaction/index.vue'),
      () => import('@/operation/OperationCenter/HostedList/index.vue'),
      () => import('@/operation/OperationCenter/QuickChargeOrder/index.vue'),

      // 3. 代理和用户管理
      () => import('@/operation/Agent/AgentList/index.vue'),
      () => import('@/operation/Agent/BotList/index.vue'),
      () => import('@/operation/Agent/UserList/index.vue')
    ]

    // 使用 requestIdleCallback 在浏览器空闲时预加载
    this.preloadInIdle(coreRoutes)
  }

  /**
   * 在浏览器空闲时预加载
   */
  private async preloadInIdle(routes: Array<() => Promise<any>>) {
    for (const route of routes) {
      // 检查是否被中止
      if (this.abortController?.signal.aborted) {
        break
      }

      // 使用 requestIdleCallback 或 setTimeout
      await this.waitForIdle()

      try {
        await route()
      } catch {
        // 忽略预加载错误，不影响正常流程
      }
    }

    this.isPreloading = false
  }

  /**
   * 等待浏览器空闲
   */
  private waitForIdle(): Promise<void> {
    return new Promise((resolve) => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => resolve(), { timeout: 1000 })
      } else {
        setTimeout(resolve, 100)
      }
    })
  }

  /**
   * 使用 link 标签预加载资源（备用方案）
   */
  private prefetchWithLink(href: string) {
    if (this.preloadedChunks.has(href)) {
      return
    }

    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = href
    link.as = 'script'

    document.head.appendChild(link)
    this.preloadedChunks.add(href)
  }

  /**
   * 清理预加载状态
   */
  cleanup() {
    this.pausePreload()
    this.preloadedChunks.clear()
  }
}

// 导出单例
export const routePreloader = new RoutePreloader()
