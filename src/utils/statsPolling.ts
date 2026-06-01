/**
 * 数据统计异步轮询 - 全局单例
 * 当接口返回 updated_at 为 0/空时，启动后台轮询，
 * 用户可切换页面，计算完成后全局通知。
 */
import { ElNotification } from 'element-plus'
import { v2GetStats } from '@/api/statistics'
import type { V2StatsParams } from '@/api/statistics/types'

type StatsCallback = (data: any) => void

let pollingTimer: ReturnType<typeof setInterval> | null = null
let notifyInstance: any = null
let currentCallback: StatsCallback | null = null
let currentParams: V2StatsParams = {}

/** 是否正在轮询中 */
export const isPolling = () => !!pollingTimer

/** 启动异步轮询 */
export const startStatsPolling = (params: V2StatsParams, onComplete?: StatsCallback) => {
  // 如果已有轮询先停掉
  stopStatsPolling()

  currentParams = { ...params }
  currentCallback = onComplete || null

  // 显示常驻通知
  notifyInstance = ElNotification({
    title: '数据计算中',
    message: '正在实时计算统计数据，请耐心等待...',
    type: 'info',
    duration: 0,
    position: 'top-right'
  })

  // 每 1 秒轮询
  pollingTimer = setInterval(async () => {
    try {
      const res = await v2GetStats(currentParams)
      if (res.code === '000000' && res.data) {
        const data = res.data as any
        if (data.updated_at) {
          // 计算完成
          stopStatsPolling()
          // 回调更新数据（如果页面还在）
          if (currentCallback) {
            currentCallback(data)
          }
          // 全局成功通知
          ElNotification({
            title: '计算完成',
            message: '统计数据已更新，请查看数据统计页',
            type: 'success',
            duration: 5000,
            position: 'top-right'
          })
        }
      }
    } catch {
      // 轮询出错静默忽略
    }
  }, 1000)
}

/** 停止轮询并关闭通知 */
export const stopStatsPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
  if (notifyInstance) {
    notifyInstance.close()
    notifyInstance = null
  }
}

/** 更新回调（页面重新进入时重新绑定） */
export const setStatsPollingCallback = (cb: StatsCallback) => {
  currentCallback = cb
}
