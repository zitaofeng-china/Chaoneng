# TRX Bot Frontend

TRX 机器人后台前端项目，基于 Vue 3、TypeScript、Element Plus 和 Vite。

项目支持两套系统，在构建时通过 `VITE_SYSTEM_TYPE` 切换：

- `Management`：超能代理端
- `Operation`：超能运营端

当前代码以 `src/management` 承载代理端页面，以 `src/operation` 承载运营端页面。公共页（登录/个人中心等）在 `src/views`。历史实现已归档到 `archive/`，不参与当前业务开发。

## 文档导航

| 文档                                                   | 用途                                 |
| ------------------------------------------------------ | ------------------------------------ |
| [docs/README.md](./docs/README.md)                     | 工程文档总索引                       |
| [docs/refactor/README.md](./docs/refactor/README.md)   | 重构规则 / 批次 / 待办 / 已完成      |
| [src/api/README.md](./src/api/README.md)               | API 目录分区与归属规则               |
| [src/management/README.md](./src/management/README.md) | 代理端页面目录约定                   |
| [src/operation/README.md](./src/operation/README.md)   | 运营端页面目录约定                   |
| [页面快速定位表.md](../页面快速定位表.md)              | 页面/组件/API 快速定位（权威映射表） |
| [页面按钮权限.txt](../页面按钮权限.txt)                | 运营端菜单与按钮权限码               |
| [项目状态权限.txt](../项目状态权限.txt)                | 业务枚举 Kind / Status 等            |
| [项目交接文档.md](../项目交接文档.md)                  | 简要交接与启动说明                   |

路径约定：

- 页面组件：`src/management/**`、`src/operation/**`
- 接口与类型：`src/api/management/**`、`src/api/opertion/**`（运营 API 目录名为历史拼写 `opertion`）
- 列表页主路径：优先使用 `SearchTable` 组件

## 技术栈

- Vue 3
- TypeScript
- Vite 6
- Vue Router 4
- Pinia
- Element Plus
- UnoCSS
- Less
- Axios
- ECharts
- wangEditor
- ESLint + Prettier + Stylelint
- Husky + lint-staged + Commitlint

## 运行环境

- Node.js `>= 18`
- pnpm `>= 8`

项目当前锁定：

- `typescript`: `5.7.3`
- `element-plus`: `2.9.2`
- `vue`: `3.5.13`
- `pnpm`: `9.15.3`

## 安装依赖

```bash
pnpm install
```

## 启动命令

### 通用启动

```bash
pnpm dev
```

说明：

- 默认读取环境变量中的 `VITE_SYSTEM_TYPE`
- 当前 `.env.base` 中默认值是 `Operation`

### 启动代理端

```bash
pnpm dev:m
```

说明：

- 只起本地 Vite，不走 ngrok
- 等价于设置 `VITE_SYSTEM_TYPE=Management`
- 本地端口默认 `4010`

### 启动运营端

```bash
pnpm dev:o
```

说明：

- 只起本地 Vite，不走 ngrok
- 等价于设置 `VITE_SYSTEM_TYPE=Operation`
- 本地端口默认 `4011`

### 用 ngrok 暴露本地开发服务

`pnpm dev:m` / `pnpm dev:o` 始终是本地启动，不走 ngrok。需要公网时用 `pnpm ngrok:m` / `pnpm ngrok:o`（起对应 Vite + 隧道）。

免费账号同一时间只能开一条隧道，公网域名是 `https://sheep-jubilance-haste.ngrok-free.dev`。两端用路径区分，两个 pane 可以同时跑 `ngrok:m` 和 `ngrok:o`：后启动的会复用已有隧道，不再抢本地检查页 `4041`。

| 命令           | 作用            | 地址                                                      |
| -------------- | --------------- | --------------------------------------------------------- |
| `pnpm dev:o`   | 运营端，仅本地  | `http://127.0.0.1:4011/operation`                         |
| `pnpm dev:m`   | 代理端，仅本地  | `http://127.0.0.1:4010/management`                        |
| `pnpm ngrok:o` | 运营端 + ngrok  | `https://sheep-jubilance-haste.ngrok-free.dev/operation`  |
| `pnpm ngrok:m` | 代理端 + ngrok  | `https://sheep-jubilance-haste.ngrok-free.dev/management` |
| `pnpm ngrok`   | 两端 + 一条隧道 | `/operation` 和 `/management`                             |

1. 复制 `ngrok.env.example` 为 `.env.ngrok`，填入 [ngrok authtoken](https://dashboard.ngrok.com/get-started/your-authtoken)
2. 本机需已安装 ngrok CLI（Windows 常见路径：`%LOCALAPPDATA%\ngrok\ngrok.exe`）

对应端口已有 Vite 在跑时，`pnpm ngrok:o` / `ngrok:m` 不会重复启动 Vite。隧道已在跑时只复用，命令会提示后退出（或只看着本端 Vite）。免费版首次用浏览器打开公网地址时，ngrok 会显示一次跳转页，点 Visit Site 即可。不要把 `.env.ngrok` 提交进仓库。本仓库的 ngrok 本地检查页在 `http://127.0.0.1:4041`（`4040` 是其他项目的，不要占用或结束它）。

### 其他开发命令

```bash
pnpm ts:check
pnpm lint:eslint
pnpm lint:format
pnpm lint:style
```

## 构建命令

### 构建代理端

```bash
pnpm build:management
```

输出目录：

- `dist-management/`

### 构建运营端

```bash
pnpm build:operation
```

输出目录：

- `dist-operation/`

### 同时构建两端

```bash
pnpm build:pro
```

### 本地预览构建产物

```bash
pnpm serve:pro
pnpm serve:dev
pnpm serve:test
```

## 环境变量

主要环境文件：

- `.env.base`
- `.env.dev`
- `.env.pro`
- `.env.test`
- `.env.gitee`

常用变量：

```bash
VITE_API_BASE_PATH=http://47.84.135.181:8888
VITE_SYSTEM_TYPE=Operation
VITE_APP_TITLE='机器人后台管理系统'
VITE_APP_TITLE_OPERATION='机器人后台运营系统'
VITE_USE_MOCK=false
VITE_TRONSCAN_URL=https://nile.tronscan.org
```

说明：

- `VITE_SYSTEM_TYPE` 决定路由、标题、端口、构建输出目录和首页菜单。
- 开发代理读取 `VITE_DEV_PROXY_TARGET`，未设置时回退 `VITE_API_BASE_PATH`（见 `.env.example`）。
- `base` 会根据系统类型切换为 `/management` 或 `/operation`。

## 项目结构

```text
bot-frontend/
├─ src/
│  ├─ api/                    # 按业务模块组织的接口定义
│  ├─ assets/                 # 静态资源
│  ├─ axios/                  # axios 封装、拦截器、请求配置
│  ├─ components/             # 全局复用组件
│  ├─ composables/            # 组合式逻辑
│  ├─ constants/              # 常量
│  ├─ directives/             # 自定义指令
│  ├─ hooks/                  # hooks
│  ├─ layout/                 # 布局组件
│  ├─ locales/                # 国际化资源
│  ├─ management/             # 代理端业务页面
│  ├─ modules/                # 通用模块
│  ├─ operation/              # 运营端页面与业务组件
│  ├─ plugins/                # 插件注册
│  ├─ router/                 # 路由定义
│  ├─ store/                  # Pinia 状态管理
│  ├─ styles/                 # 全局样式
│  ├─ utils/                  # 工具函数
│  └─ views/                  # 公共页（登录等）与模板页
├─ mock/                      # Mock 数据
├─ archive/                   # 历史归档代码，不参与当前开发
├─ docs/                      # 项目补充文档
├─ scripts/                   # 构建和辅助脚本
├─ public/                    # 静态公开资源
├─ vite.config.ts             # Vite 配置
├─ uno.config.ts              # UnoCSS 配置
└─ package.json
```

## 双系统说明

### 1. 代理端 Management

主要路由来源：

- `src/router/modules/management.ts`

主要页面目录：

- `src/management/`

当前主要模块：

- 机器人管理
- 托管列表
- 黑名单列表
- 用户群组
- 订单管理
- 账户管理

### 2. 运营端 Operation

主要路由来源：

- `src/router/modules/operation.ts`

主要页面目录：

- `src/operation/`

当前主要模块：

- 数据分析
- 运营中心
- 营销管理
- 理财管理
- 代理管理
- 权限管理
- 客服管理
- 系统配置

## 路由与权限

### 路由入口

- `src/router/index.ts`
- `src/router/modules/base.ts`
- `src/router/modules/management.ts`
- `src/router/modules/operation.ts`

路由模式：

- `createWebHashHistory()`

说明：

- 基础路由始终存在。
- 管理端和运营端路由会根据 `VITE_SYSTEM_TYPE` 选择加载。

### 权限控制

核心文件：

- `src/permission.ts`
- `src/store/modules/permission.ts`
- `src/store/modules/user.ts`

当前权限机制：

- 登录后通过 `userInfo.permissions` 控制可访问路由
- 超级管理员权限为 `*`
- 运营端以路由 `name` 作为菜单权限标识
- 页面按钮权限来自路由 `meta.buttonList`

过滤规则：

- 普通用户仅保留 `permissions` 中存在的路由
- 容器菜单是否显示由其子路由是否可访问决定
- 黑名单路由当前在权限 store 中过滤

## 登录与认证

相关文件：

- `src/api/common/login/index.ts`
- `src/store/modules/user.ts`
- `src/permission.ts`

当前行为：

- token 和用户信息通过 Pinia 持久化到本地
- 路由守卫会同时校验 store 和 localStorage 中的过期时间
- 运营端和代理端统一使用登录接口 `/v1/login`
- 运营端和代理端统一使用退出接口 `/v1/logout`
- 退出登录会清空用户、权限、标签页和本地缓存

## 请求层

核心文件：

- `src/axios/config.ts`
- `src/axios/index.ts`

当前实现特点：

- GET 参数会序列化到 URL
- `multipart/form-data` 支持自动转换
- 响应 `code === SUCCESS_CODE` 时返回业务数据
- 业务错误会统一弹出 `ElMessage`
- `400002` 会触发登出

## Mock

开关：

- `VITE_USE_MOCK=true`

相关目录：

- `mock/`

说明：

- 开发环境和构建环境都支持 mock
- 通过 `vite-plugin-mock` 注入

## 代码规范

提交前建议至少执行：

```bash
pnpm ts:check
pnpm lint:eslint
```

项目已启用：

- Husky
- lint-staged
- commitlint

提交信息需带前缀，例如：

```bash
git commit -m "feat: 新增订单类型统计页面"
git commit -m "fix: 修复发送消息弹窗草稿恢复逻辑"
git commit -m "docs: 更新项目 README"
```

## 当前开发约定

- 当前运营端开发目录使用 `src/operation/`
- `archive/operationView-legacy/` 仅做历史参考，不要继续在其中开发新功能
- 路由和按钮权限变更时，需要同步检查权限说明文档和角色权限树
- 运营端菜单顺序以 `src/router/modules/operation.ts` 为准
- 新增或迁移页面/API 后，同步更新 [页面快速定位表.md](../页面快速定位表.md)

## 常见排查点

### 1. 登录后白屏或菜单缺失

优先检查：

- `src/permission.ts`
- `src/store/modules/permission.ts`
- 当前账号的 `permissions`
- 当前 `VITE_SYSTEM_TYPE`

### 2. 本地接口请求异常

优先检查：

- `.env.*` 中的接口变量
- `vite.config.ts` 中 `/v1`、`/v2`、`/api` 代理
- 本地后端地址是否可达

### 3. 菜单显示和权限不一致

优先检查：

- 路由 `name`
- 路由 `meta.buttonList`
- 角色权限返回值
- 运营端权限过滤逻辑

### 4. 构建产物路径不对

优先检查：

- `VITE_SYSTEM_TYPE`
- `vite.config.ts` 中 `base`
- `outDir`

## 相关文件索引

- 入口：`src/main.ts`
- 路由：`src/router/index.ts`
- 路由守卫：`src/permission.ts`
- 权限 store：`src/store/modules/permission.ts`
- 用户 store：`src/store/modules/user.ts`
- 应用 store：`src/store/modules/app.ts`
- 代理端路由：`src/router/modules/management.ts`
- 运营端路由：`src/router/modules/operation.ts`
- Vite 配置：`vite.config.ts`
- 环境变量：`.env.base`

## 说明

这份 README 仅描述当前仓库内实际生效的代码结构和运行方式。

如果你后续继续调整：

- 系统名称
- 路由结构
- 本地代理地址
- 构建输出目录
- 权限规则

需要同步更新本文件。
