# Management API Structure

代理端接口目录按主路由归类，目标与 `src/management` 的页面结构保持一致。

## 当前状态

- `src/api/management` 已建立代理端接口目录骨架。
- 当前代理端页面已开始引用 `src/api/management` 下的接口。
- 旧代理端平铺接口已归档到 `archive/api-managementView-legacy`。

## 主路由与 API 位置

- `BotManage`:
  - `src/api/management/BotManage/BotList`
  - `src/api/management/BotManage/ReplyList`
- `Hosted`:
  - `src/api/management/Hosted/HostedList`
- `Black`:
  - `src/api/management/Black/BlackList`
- `UserGroup`:
  - `src/api/management/UserGroup/UserList`
  - `src/api/management/UserGroup/MessageList`
  - `src/api/management/UserGroup/InviteList`
  - `src/api/management/UserGroup/GroupList`
- `OrderManage`:
  - `src/api/management/OrderManage/RechargeOrder`
  - `src/api/management/OrderManage/EnergyOrder`
  - `src/api/management/OrderManage/ExchangeOrder`
  - `src/api/management/OrderManage/QuickChargeOrder`
- `AccountManage`:
  - `src/api/management/AccountManage/AccountList`

## 旧接口迁移对应

- `src/api/botlist` -> `src/api/management/BotManage/BotList`
- `src/api/reply_list` -> `src/api/management/BotManage/ReplyList`
- `src/api/hosted_list` -> `src/api/management/Hosted/HostedList`
- `src/api/black_list` -> `src/api/management/Black/BlackList`
- `src/api/tgUser` -> 按使用页面拆入 `src/api/management/UserGroup/*` 或 `src/api/management/common`
- `src/api/message` -> `src/api/management/common/message`
- `src/api/menu_list` -> `src/api/management/common/menuList`
- `src/api/agent/invite` -> `src/api/management/UserGroup/InviteList`
- `src/api/recharge_order` -> `src/api/management/OrderManage/RechargeOrder`
- `src/api/energy_order` -> `src/api/management/OrderManage/EnergyOrder`
- `src/api/exchange_order` -> `src/api/management/OrderManage/ExchangeOrder`
- `src/api/quick_charge_order` -> `src/api/management/OrderManage/QuickChargeOrder`
- `src/api/account` -> `src/api/management/AccountManage/AccountList`
- `src/api/site`、`src/api/bot_menu` 等机器人配置相关接口，优先归入 `src/api/management/BotManage/BotList` 或 `src/api/management/BotManage/common`。

## 公共接口归属

公共 API 的统一规则见 `src/api/README.md`。

- 代理端多个主路由复用的接口放到 `src/api/management/common`。
- 仅某个代理端主路由内部复用的接口放到 `src/api/management/<MainRoute>/common`。
- 页面独占接口放到 `src/api/management/<MainRoute>/<PageName>`。

## 文件规则

- 每个页面 API 目录优先保留：
  - `index.ts`
  - `types.ts`
- 若旧文件已经使用单数命名，如 `type.ts`，迁移时优先统一为 `types.ts`。
- API 函数名暂时保留旧命名，避免迁移同时扩大行为变更。
- 不在迁移接口时更改请求路径、请求参数和返回结构。

## 迁移顺序

1. 先迁移页面正在使用的接口文件，不迁未使用接口。
2. 保持导出函数和类型名称不变。
3. 更新页面 import 到 `@/api/management/...`。
4. 使用 `rg "@/api/<oldName>" src` 确认旧路径引用是否清空。
5. 类型检查通过后，再删除旧接口目录。

## 当前缺口

- `src/api/management` 下部分接口仍保留旧文件名，如 `type.ts`、`invite.types.ts`，后续可在独立批次统一为 `types.ts`。
