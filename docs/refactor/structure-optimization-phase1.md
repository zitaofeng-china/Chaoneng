# Route-oriented folder optimization (phase 1)

## Two main module folders
- `src/modules/management/routes.ts`
- `src/modules/operation/routes.ts`

Router compatibility kept via re-export files:
- `src/router/modules/management.ts`
- `src/router/modules/operation.ts`

## API folder organization
New aggregate entries:
- `src/api/management/index.ts`
- `src/api/operation/index.ts`
- `src/api/shared/index.ts`
- `src/api/index.ts`

## Shared component extraction
Extracted exact duplicates to shared components:
- `src/components/business/energy-details/ActivationDetails.vue`
- `src/components/business/energy-details/ResourceDetails.vue`

Replaced old duplicate files with thin wrappers in:
- `src/views/OrderManage/energy_order/components/details/*`
- `src/operationView/OperationCenter/EnergyTransaction/components/details/*`

## Duplicate component statistics (views vs operationView)
Detected same-name files:
- ActivationDetails.vue
- AdvancedSettingsDialog.vue
- Analysis.vue
- BandwidthCountDetails.vue
- BatchOrderDetails.vue
- ByCountDetails.vue
- ByTimeDetails.vue
- Detail.vue
- FlashRentDetails.vue
- index.vue
- InlineButtonDialog.vue
- MassSendRecordDialog.vue
- PanelGroup.vue
- RechargeDialog.vue
- ResourceDetails.vue
- Role.vue
- User.vue
- Write.vue

Current phase extracted only content-identical components to keep risk low.
