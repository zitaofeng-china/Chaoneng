# Operation API Structure

运营端接口目录按主路由归类，优先与 `src/operation` 的页面结构保持一致。

## 主路由与 API 位置

- `DataStatistics`:
  - `src/api/opertion/DataStatistics/Analysis`
  - `src/api/opertion/DataStatistics/UserStatisticsReport`
  - `src/api/opertion/DataStatistics/ExchangeRateIndex`
  - `src/api/opertion/DataStatistics/Announcement`
- `OperationCenter`:
  - `src/api/opertion/OperationCenter/*`
- `Marketing`:
  - `src/api/opertion/Marketing/*`
- `FinancialManage`:
  - `src/api/opertion/FinancialManage/*`
- `Agent`:
  - `src/api/opertion/Agent/*`
- `Authorization`:
  - `src/api/opertion/Authorization/*`
- `CustomerService`:
  - `src/api/opertion/CustomerService/*`
- `SystemConfig`:
  - `src/api/opertion/SystemConfig/ResourcePool`

## 权限对应

- 运营端 API 目录应与页面权限归属保持一致，而不是沿用旧目录名。
- 当前数据分析主路由对应的权限与 API 归属如下：
  - `Analysis` -> `src/api/opertion/DataStatistics/Analysis`
  - `UserStatisticsReport` -> `src/api/opertion/DataStatistics/UserStatisticsReport`
  - `ExchangeRateIndex` -> `src/api/opertion/DataStatistics/ExchangeRateIndex`
  - `Announcement` -> `src/api/opertion/DataStatistics/Announcement`
- 当前系统配置主路由只保留：
  - `ResourcePool` -> `src/api/opertion/SystemConfig/ResourcePool`

## 公共接口归属

公共 API 的统一规则见 `src/api/README.md`。

- 运营端多个主路由复用的接口放到 `src/api/opertion/common`。
- 仅某个运营端主路由内部复用的接口放到 `src/api/opertion/<MainRoute>/common`。

## 规整规则

- 页面迁到新的主路由后，对应 API 目录也要同步迁移。
- 页面独占接口优先与页面目录同名，如 `ExchangeRateIndex`、`ResourcePool`。
- 不再被当前运营端使用的旧接口，不留在 `src/api/opertion`，统一归档到 `archive/`。
