# Management Page Structure

代理端页面目录按主路由归类，目标与运营端保持同构：主路由名、页面目录名、权限名尽量一致。

## 当前状态

- `src/management` 已建立代理端页面目录骨架。
- 当前代理端路由已切到 `src/management` 页面目录。
- 旧页面仍保留在 `src/views` 下，作为迁移验证期间的历史引用兜底。

## 主路由与页面位置

- `BotManage`:
  - `src/management/BotManage/BotList`
  - `src/management/BotManage/ReplyList`
- `Hosted`:
  - `src/management/Hosted/HostedList`
- `Black`:
  - `src/management/Black/BlackList`
- `UserGroup`:
  - `src/management/UserGroup/UserList`
  - `src/management/UserGroup/MessageList`
  - `src/management/UserGroup/InviteList`
  - `src/management/UserGroup/GroupList`
- `OrderManage`:
  - `src/management/OrderManage/RechargeOrder`
  - `src/management/OrderManage/EnergyOrder`
  - `src/management/OrderManage/ExchangeOrder`
  - `src/management/OrderManage/QuickChargeOrder`
- `AccountManage`:
  - `src/management/AccountManage/AccountList`

## 当前路由来源

代理端路由定义在 `src/router/modules/management.ts`。

迁移完成后，路由组件应统一从 `@/management` 引入，例如：

- `@/management/BotManage/BotList/index.vue`
- `@/management/UserGroup/MessageList/index.vue`
- `@/management/OrderManage/QuickChargeOrder/index.vue`

迁移前的旧页面仍在 `src/views` 下，不能直接删除；应先完成页面迁入、导入路径更新、类型检查，再清理旧目录。

## 权限命名

- 代理端菜单权限名来自 `src/router/modules/management.ts` 中每个路由的 `name`。
- 主路由权限名：
  - `BotManage`
  - `Hosted`
  - `Black`
  - `UserGroup`
  - `OrderManage`
  - `AccountManage`
- 子路由权限名：
  - `BotList`
  - `ReplyList`
  - `HostedList`
  - `BlackList`
  - `UserList`
  - `MessageList`
  - `InviteList`
  - `GroupList`
  - `RechargeOrder`
  - `EnergyOrder`
  - `ExchangeOrder`
  - `QuickChargeOrderManage`
  - `AccountList`
- 若后续补充按钮权限，按 `name.buttonCode` 组成，例如：
  - `BotList.edit`
  - `ReplyList.delete`
  - `AccountList.edit`

## 规整规则

- 页面目录使用 PascalCase，并尽量与路由 `name` 一致。
- 页面入口统一命名为 `index.vue`。
- 页面专属组件放在页面自身目录下：
  - `components/`
  - `composables/`
  - `types.ts`
  - `constants.ts`
- 仅多个同主路由页面复用的内容，才放在主路由公共目录：
  - `src/management/<MainRoute>/components`
  - `src/management/<MainRoute>/composables`
- 跨多个主路由复用的代理端页面能力，应优先抽到 `src/components`、`src/hooks` 或明确的公共工具目录，避免塞进某个业务主路由。

## 迁移顺序

1. 先迁移页面文件到 `src/management/<MainRoute>/<PageName>`。
2. 更新页面内部的相对路径和 `@/views/...` 引用。
3. 更新 `src/router/modules/management.ts` 的组件导入路径。
4. 迁移对应接口到 `src/api/management/<MainRoute>/<PageName>`。
5. 更新页面内 `@/api/...` 引用。
6. 运行类型检查，确认路由、页面、接口引用都可解析。
7. 确认无引用后再清理 `src/views` 与旧 `src/api` 中对应文件。

## 当前缺口

- `src/views` 下的旧代理端页面尚未清理，需等类型检查和页面验证稳定后再删除。
- `src/api` 下的旧代理端接口尚未清理，需等所有引用切到 `src/api/management` 后再删除。
