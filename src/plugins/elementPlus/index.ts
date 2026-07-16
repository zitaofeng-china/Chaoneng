import type { App } from 'vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

// 需要全局引入一些组件，如ElScrollbar，不然一些下拉项样式有问题
import { ElScrollbar } from 'element-plus'

const components = [ElScrollbar]

export const setupElementPlus = (app: App<Element>) => {
  // 配置 Element Plus 使用中文语言包
  app.use(ElementPlus, {
    locale: zhCn
  })

  // 开发可用按需样式加速启动；生产必须全量样式。
  // Form/JSX 动态渲染（Select、Table 固定列等）按需引入容易缺 CSS，
  // 线上会出现下拉错位、表格发白/固定列飘到左侧等问题，本地全量样式则正常。
  const useAllStyles =
    import.meta.env.PROD || import.meta.env.VITE_USE_ALL_ELEMENT_PLUS_STYLE === 'true'

  if (useAllStyles) {
    import('element-plus/dist/index.css')
    return
  }

  components.forEach((component) => {
    app.component(component.name!, component)
  })
}
