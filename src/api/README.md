# API Structure

`src/api` 按系统边界和公共能力分层。系统专属接口放到对应系统目录，跨系统或基础能力保留在外层公共目录。

## 系统专属目录

- `src/api/management`:
  - 代理端接口目录。
  - 按 `src/management` 页面结构归类。
  - 详细规则见 `src/api/management/README.md`。
- `src/api/opertion`:
  - 运营端接口目录。
  - 按 `src/operation` 页面结构归类。
  - 详细规则见 `src/api/opertion/README.md`。

## 外层公共 API

以下目录不归属于代理端或运营端的某个业务主路由，统一放到 `src/api/common`：

- `src/api/common`:
  - 字典等全系统通用接口。
- `src/api/common/login`:
  - 登录、验证码、会话等入口级接口。
- `src/api/common/request`:
  - 请求封装或请求示例相关接口。
- `src/api/common/menu`:
  - 基础菜单接口。
- `src/api/common/role`:
  - 基础角色接口。
- `src/api/common/department`:
  - 基础部门接口。
- `src/api/common/table`:
  - 通用表格示例或基础表格接口。
- `src/api/common/dashboard`:
  - 通用仪表盘接口。
- `src/api/common/statistics`:
  - 通用统计接口。
- `src/api/common/customer_service`:
  - 当前仍被公共页面引用的客服接口。
- `src/api/common/ticker`:
  - 行情价格接口（`GET /v1/ticker/price`，域名走项目 baseURL）。
- `src/api/common/exchange_transaction`:
  - 当前仍被公共页面引用的兑换交易接口。

## 系统内公共 API

系统内多个主路由复用，但不跨系统复用的接口，放到系统目录下的 `common`：

- `src/api/management/common`:
  - 代理端多个主路由复用的接口，如消息、菜单、用户、上传等。
- `src/api/opertion/common`:
  - 运营端多个主路由复用的接口，如消息、菜单、用户、上传等。
- `src/api/management/<MainRoute>/common`:
  - 仅代理端某个主路由内部复用的接口。
- `src/api/opertion/<MainRoute>/common`:
  - 仅运营端某个主路由内部复用的接口。

## 归属规则

- 页面独占接口放到对应页面 API 目录，例如：
  - `src/api/management/OrderManage/QuickChargeOrder`
  - `src/api/opertion/SystemConfig/ResourcePool`
- 多个同主路由页面复用的接口放到该主路由下的 `common`。
- 多个主路由复用但只服务某个系统的接口，放到该系统的 `common`。
- 跨系统复用或基础能力接口，才保留在 `src/api/common`。
- `src/api` 外层只保留 `common`、`management`、`opertion` 这类分区目录和总 README。
- 不再被当前源码引用的旧接口，应统一归档到 `archive/`，不要继续留在 `src/api`。

## 当前归档

- 旧代理端平铺 API 已归档到 `archive/api-managementView-legacy`。
- 旧运营端 API 已归档到 `archive/api-operationView-legacy`。
