# 工程文档索引

本目录与仓库内若干 README 共同构成 `bot-frontend` 的工程文档。日常改业务代码时，优先按下面顺序查找。

## 先看这些

| 文档 | 用途 |
|------|------|
| [../README.md](../README.md) | 安装、启动、双端、权限与请求层总览 |
| [refactor/README.md](./refactor/README.md) | 重构规则、批次计划、待办与已完成 |
| [../src/api/README.md](../src/api/README.md) | API 归属规则（common / management / opertion） |
| [../src/management/README.md](../src/management/README.md) | 代理端页面目录约定 |
| [../src/operation/README.md](../src/operation/README.md) | 运营端页面目录约定 |
| [菜单配置系统设计文档.md](./菜单配置系统设计文档.md) | 菜单配置专项设计 |

## 工作区根目录（仓库外一层）

以下文件在 `ChaoNeng/` 根目录，供快速定位与交接：

| 文档 | 用途 |
|------|------|
| [页面快速定位表.md](../../页面快速定位表.md) | **权威** 页面 ↔ 组件 ↔ API 路径表（2026-07-11 已校正 API 路径） |
| [项目页面映射指南.md](../../项目页面映射指南.md) | 映射说明（与快速定位表互补，API 路径已同步校正） |
| [项目深度分析文档.md](../../项目深度分析文档.md) | 大而全索引（路径已校正；日常优先用快速定位表） |
| [页面按钮权限.txt](../../页面按钮权限.txt) | 运营端权限码 |
| [项目状态权限.txt](../../项目状态权限.txt) | 业务状态枚举 |
| [项目交接文档.md](../../项目交接文档.md) | 简要交接 |

## 路径约定（务必遵守）

```text
页面组件     src/management/**/*.vue
             src/operation/**/*.vue

接口 / 类型  src/api/management/**
             src/api/opertion/**      ← 目录名历史拼写，不是 operation
             src/api/common/**

列表页主路径  优先 SearchTable 组件
业务共享      src/components/business/** 、 src/utils/**
```

## 文档维护约定

1. 新增/迁移页面或 API 后，更新 [页面快速定位表.md](../../页面快速定位表.md)。
2. 重构类改动同步更新 [refactor/阶段性已完成改动说明.md](./refactor/阶段性已完成改动说明.md) 与待办勾选状态。
3. 不要在 `archive/`、根目录 `学习/` 中写新的工程 SSOT。
4. 环境变量以 [../.env.example](../.env.example) 为模板，真实 env 不入库。

## 列表页开发约定

1. 业务列表页优先使用 `SearchTable`，不要在页面再直接拼一套 `useSearchTable` 业务封装（特殊页除外）。
2. 首屏条件走 `default-params`；刷新走 `reload()`。
3. 新页面登记到 [页面快速定位表.md](../../页面快速定位表.md)。
4. 重构进度以 [refactor/模块级待办清单与验收标准.md](./refactor/模块级待办清单与验收标准.md) 为准。
