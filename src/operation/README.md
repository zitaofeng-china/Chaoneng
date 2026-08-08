# Operation Page Structure

运营端页面目录按主路由归类，优先保持“路由名 = 页面目录名”。

## 主路由与页面位置

- `DataStatistics`:
  - `src/operation/DataStatistics/Analysis`
  - `src/operation/DataStatistics/OrderTypeStatistics`
  - `src/operation/DataStatistics/UserStatisticsReport`
  - `src/operation/DataStatistics/EnergyStatisticsReport`
  - `src/operation/DataStatistics/SaleByTimeReport`
  - `src/operation/DataStatistics/ExchangeRateIndex`
  - `src/operation/DataStatistics/Announcement`
  - `src/operation/DataStatistics/AgentMarketingAmount`
- `OperationCenter`:
  - `src/operation/OperationCenter/*`
- `Marketing`:
  - `src/operation/Marketing/*`
- `FinancialManage`:
  - `src/operation/FinancialManage/*`
- `Agent`:
  - `src/operation/Agent/*`
- `Authorization`:
  - `src/operation/Authorization/*`
- `CustomerService`:
  - `src/operation/CustomerService/*`
- `SystemConfig`:
  - `src/operation/SystemConfig/ResourcePool`

## 权限命名

- 运营端菜单权限名来自 `src/router/modules/operation.ts` 中每个路由的 `name`。
- `DataStatistics` 主路由对应权限名仍为 `DataStatistics`，展示名为“数据分析”。
- `DataStatistics` 子路由权限名：
  - `Analysis`
  - `OrderTypeStatistics`
  - `UserStatisticsReport`
  - `EnergyStatisticsReport`
  - `SaleByTimeReport`
  - `ExchangeRateIndex`
  - `Announcement`
  - `AgentMarketingAmount`
- `SystemConfig` 主路由当前只对应一个子路由权限：
  - `ResourcePool`
- 按钮权限由 `name.buttonCode` 组成，例如：
  - `ResourcePool.add`
  - `AgentList.edit`
  - `Role.delete`

## 规整规则

- 某页面已挂到新的主路由下时，其页面目录应同步迁入该主路由目录。
- 页面专属组件优先放在页面自身子目录下，如 `components/`、`composables/`。
- 仅多个同主路由页面复用的内容，才保留在主路由公共目录。
