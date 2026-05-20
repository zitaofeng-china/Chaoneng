import type { App } from 'vue'
import { setupPermissionDirective } from './utils'

/**
 * 导出指令：v-xxx
 * @methods hasPermi 按钮权限，用法: v-hasPermi
 * @methods loading element-plus 自带，用法: v-loading
 */
export const setupDirectives = (app: App<Element>) => {
  setupPermissionDirective(app)
}
