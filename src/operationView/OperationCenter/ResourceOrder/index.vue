<template>
  <div class="app-container">
    <ContentWrap>
      <SearchTable
        :columns="columns"
        :search-schema="searchSchema"
        :fetch-data-api="fetchResourceOrderList"
        :showAddButton="false"
        ref="searchTableRef"
        @search="onSearch"
      >
        <!-- 添加导出按钮 -->
        <template #searchButtons>
          <BaseButton type="primary" @click="handleExport">
            <Icon icon="ep:download" class="mr-5px" />
            导出订单
          </BaseButton>
        </template>
      </SearchTable>

      <!-- 结算记录弹窗 -->
      <SettlementRecordDialog ref="settlementRecordDialogRef" />
    </ContentWrap>
  </div>
</template>

<script setup lang="tsx">
import { ref, h, onMounted } from 'vue'
import { formatToDateTime } from '@/utils/dateUtil'
import { ElTag, ElMessage } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { SearchTable } from '@/components/SearchTable'
import { BaseButton } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { hasPermi } from '@/components/Permission'
import type { TableColumn } from '@/components/Table'
import { v2GetResourceOrderList } from '@/api/resource_order'
import type { V2ResourceOrderItem } from '@/api/resource_order/types'
import { v2GetAgentBotList } from '@/api/trust_transaction'
import { simpleExportToExcel } from '@/utils/excel'
import { handleErrorMessage, handleSuccessMessage } from '@/utils/messageHelper'
import SettlementRecordDialog from './components/SettlementRecordDialog.vue'

const searchTableRef = ref<InstanceType<typeof SearchTable> | null>(null)
const settlementRecordDialogRef = ref<InstanceType<typeof SettlementRecordDialog> | null>(null)

// 保存当前搜索参数
const currentSearchParams = ref<any>({})

// 资源类型映射
const RESOURCE_TYPE_MAP: Record<number, string> = {
  1: '能量出售',
  2: '带宽出售'
}

// 订单状态映射
const ORDER_STATUS_MAP: Record<number, string> = {
  1: '全部回收',
  2: '进行中',
  3: '提前回收',
  4: '部分回收停止计费'
}

// 获取状态标签类型
const getStatusType = (status: number): string => {
  const typeMap: Record<number, string> = {
    1: 'warning', // 橙色
    2: 'primary', // 蓝色
    3: 'danger', // 粉色/红色
    4: 'info' // 紫色/灰色
  }
  return typeMap[status] || 'info'
}

// 表格列定义
const columns: TableColumn[] = [
  {
    field: 'id',
    label: '订单号',
    width: 180
  },
  {
    field: 'bot_user_name',
    label: '机器人用户名',
    width: 150
  },
  {
    field: 'agent_name',
    label: '代理',
    width: 120
  },
  {
    field: 'send_address',
    label: '用户发送地址',
    width: 200
  },
  {
    field: 'receive_address',
    label: '接收地址',
    width: 200
  },
  {
    field: 'resource_type',
    label: '类型',
    width: 100,
    slots: {
      default: (data: any) => {
        const row = data.row || data
        return h('span', RESOURCE_TYPE_MAP[row.resource_type] || '-')
      }
    }
  },
  {
    field: 'amount',
    label: '数量',
    width: 120,
    slots: {
      default: (data: any) => {
        const row = data.row || data
        const unit = row.resource_type === 1 ? '能量' : row.resource_type === 2 ? '带宽' : ''
        return h('span', `${row.amount || 0} ${unit}`)
      }
    }
  },
  {
    field: 'unit_price',
    label: '单价(sun/天)',
    width: 120,
    slots: {
      default: (data: any) => {
        const row = data.row || data
        return h('span', `${row.unit_price || 0} sun`)
      }
    }
  },
  {
    field: 'total_duration',
    label: '总时长',
    width: 100,
    slots: {
      default: (data: any) => {
        const row = data.row || data
        return h('span', `${row.total_duration || 0} 天`)
      }
    }
  },
  {
    field: 'status',
    label: '订单状态',
    width: 140,
    slots: {
      default: (data: any) => {
        const row = data.row || data
        const tagType = getStatusType(row.status)
        return h(
          ElTag,
          { type: tagType as any, size: 'small' },
          () => ORDER_STATUS_MAP[row.status] || '-'
        )
      }
    }
  },
  {
    field: 'remark',
    label: '备注',
    width: 150
  },
  {
    field: 'start_time',
    label: '开始时间',
    width: 180,
    slots: {
      default: (data: any) => {
        const row = data.row || data
        return h('span', row.start_time ? formatToDateTime(row.start_time) : '-')
      }
    }
  },
  {
    field: 'end_time',
    label: '结束时间',
    width: 180,
    slots: {
      default: (data: any) => {
        const row = data.row || data
        return h('span', row.end_time ? formatToDateTime(row.end_time) : '-')
      }
    }
  },
  {
    field: 'action',
    label: '操作',
    width: 150,
    fixed: 'right',
    slots: {
      default: (data: any) => {
        const row = data.row || data
        return h(
          BaseButton,
          {
            type: 'primary',
            onClick: () => handleViewSettlement(row)
          },
          () => '查看结算记录'
        )
      }
    }
  }
]

// 搜索表单配置
const searchSchema = ref([
  {
    field: 'keyword',
    component: 'Input' as const,
    label: {
      tips: '请输入订单号/机器人用户名/代理/发送地址/接受地址',
      text: '关键词'
    },
    componentProps: {
      placeholder: '请输入关键词',
      clearable: true
    }
  },
  {
    field: 'resource_type',
    component: 'Select' as const,
    label: '类型',
    componentProps: {
      placeholder: '全部',
      options: [
        { label: '全部', value: '' },
        { label: '能量出售', value: 1 },
        { label: '带宽出售', value: 2 }
      ]
    }
  },
  {
    field: 'status',
    component: 'Select' as const,
    label: '状态',
    componentProps: {
      placeholder: '全部',
      options: [
        { label: '全部', value: '' },
        { label: '全部回收', value: 1 },
        { label: '进行中', value: 2 },
        { label: '提前回收', value: 3 },
        { label: '部分回收停止计费', value: 4 }
      ]
    }
  },
  {
    field: 'bot_id',
    component: 'Select' as const,
    label: '机器人',
    componentProps: {
      placeholder: '全部',
      options: [] // 将通过API动态加载
    }
  }
])

// 搜索处理
const onSearch = (params: any) => {
  currentSearchParams.value = params
  console.log('搜索参数:', params)
}

// 获取资源订单列表
const fetchResourceOrderList = async (params: any) => {
  try {
    const apiParams: any = {
      current_page: params.current_page || 1,
      page_size: params.page_size || 10
    }

    // 关键字搜索
    if (params?.keyword) {
      apiParams.keyword = params.keyword
    }

    // 资源类型
    if (params?.resource_type) {
      apiParams.resource_type = params.resource_type
    }

    // 订单状态
    if (params?.status) {
      apiParams.status = params.status
    }

    // 机器人ID
    if (params?.bot_id) {
      apiParams.bot_id = params.bot_id
    }

    console.log('[fetchResourceOrderList] API参数:', apiParams)

    // TODO: 替换为实际的API调用
    // const res = await v2GetResourceOrderList(apiParams)

    // 生成60条模拟数据
    const generateMockData = () => {
      const mockList = []
      const now = Math.floor(Date.now() / 1000)

      const botNames = ['TestBot001', 'TestBot002', 'TestBot003', 'TestBot004', 'TestBot005']
      const agentNames = ['测试代理A', '测试代理B', '测试代理C', '测试代理D', '测试代理E']
      const resourceTypes = [1, 2] // 1-能量出售，2-带宽出售
      const statuses = [1, 2, 3, 4] // 1-全部回收，2-进行中，3-提前回收，4-部分回收停止计费
      const amounts = [32000, 50000, 64000, 100000, 128000]
      const unitPrices = [400, 420, 450, 500, 550]
      const durations = [1, 3, 7, 14, 30]

      for (let i = 1; i <= 60; i++) {
        const botIndex = (i - 1) % botNames.length
        const agentIndex = (i - 1) % agentNames.length
        const resourceType = resourceTypes[(i - 1) % resourceTypes.length]
        const status = statuses[(i - 1) % statuses.length]
        const amount = amounts[(i - 1) % amounts.length]
        const unitPrice = unitPrices[(i - 1) % unitPrices.length]
        const duration = durations[(i - 1) % durations.length]

        const startTime = now - i * 86400 // 每条记录相差1天
        const endTime =
          status === 1 ? startTime + duration * 86400 - 3600 : startTime + duration * 86400

        const addressSuffixes = [
          'KKKKKK',
          'LLLLLL',
          'MMMMMM',
          'NNNNNN',
          'OOOOOO',
          'PPPPPP',
          'QQQQQQ',
          'RRRRRR',
          'SSSSSS',
          'TTTTTT'
        ]
        const addressSuffix = addressSuffixes[(i - 1) % addressSuffixes.length]

        mockList.push({
          id: `RO2026${String(i).padStart(10, '0')}`,
          bot_id: botIndex + 1,
          bot_user_name: botNames[botIndex],
          agent_id: agentIndex + 1,
          agent_name: agentNames[agentIndex],
          send_address: `TXYZoPE5qvTBToDdEktz1Vcx8fyvnyHB${String(i).padStart(2, '0')}`,
          receive_address: `TLPZan8PQGNCwtbetFRm4pDmXzXm${addressSuffix}`,
          system_receive_address: `TYZGr5RUo5okCZ**e+o1r2IJmpqDt${addressSuffix}`,
          recycle_hash_1: `57870a1ad53864e0315b63a577cee67c92add0dcf77c077afcbc18955cd5a${String(i).padStart(2, '0')}`,
          recycle_hash_2: `57870a1ad53864e0315b63a577cee67c92add0dcf77c077afcbc18955cd5b${String(i).padStart(2, '0')}`,
          resource_type: resourceType,
          amount: amount,
          unit_price: unitPrice,
          total_duration: duration,
          status: status,
          remark:
            status === 1
              ? '已完成'
              : status === 2
                ? '正常订单'
                : status === 3
                  ? '提前回收'
                  : '部分回收停止计费',
          start_time: startTime,
          end_time: endTime
        })
      }

      return mockList
    }

    const allMockData = generateMockData()

    // 应用筛选条件
    let filteredData = [...allMockData]

    // 关键词筛选
    if (params?.keyword) {
      const keyword = params.keyword.toLowerCase()
      filteredData = filteredData.filter(
        (item) =>
          item.id.toLowerCase().includes(keyword) ||
          item.bot_user_name.toLowerCase().includes(keyword) ||
          item.agent_name.toLowerCase().includes(keyword) ||
          item.send_address.toLowerCase().includes(keyword) ||
          item.receive_address.toLowerCase().includes(keyword)
      )
    }

    // 资源类型筛选
    if (params?.resource_type) {
      filteredData = filteredData.filter((item) => item.resource_type === params.resource_type)
    }

    // 状态筛选
    if (params?.status) {
      filteredData = filteredData.filter((item) => item.status === params.status)
    }

    // 机器人筛选
    if (params?.bot_id) {
      filteredData = filteredData.filter((item) => item.bot_id === params.bot_id)
    }

    // 分页
    const currentPage = params.current_page || 1
    const pageSize = params.page_size || 10
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedData = filteredData.slice(startIndex, endIndex)

    const mockData = {
      code: '000000',
      data: {
        list: paginatedData,
        pager: {
          current_page: currentPage,
          page_size: pageSize,
          total: filteredData.length
        }
      }
    }

    return {
      list: mockData.data.list || [],
      total: mockData.data.pager?.total || 0
    }
  } catch (error) {
    handleErrorMessage(error, '获取资源订单列表失败')
    return {
      list: [],
      total: 0
    }
  }
}

// 加载机器人列表
const loadBotList = async () => {
  try {
    const res = await v2GetAgentBotList({
      current_page: 1,
      page_size: 1000
    })

    if (res.code === '000000' && res.data?.list) {
      const botOptions = [
        { label: '全部', value: '' },
        ...res.data.list.map((bot: any) => ({
          label: bot.user_name || `机器人${bot.id}`,
          value: bot.id
        }))
      ]

      // 更新搜索表单中的机器人选项
      const botField = searchSchema.value.find((item) => item.field === 'bot_id')
      if (botField && botField.componentProps) {
        botField.componentProps.options = botOptions
      }
    }
  } catch (error) {
    console.error('加载机器人列表失败:', error)
  }
}

onMounted(() => {
  loadBotList()
})

// 查看结算记录
const handleViewSettlement = (row: any) => {
  if (!settlementRecordDialogRef.value) {
    ElMessage.error('结算记录弹窗组件未加载')
    return
  }
  settlementRecordDialogRef.value.open(row)
}

// 导出订单
const handleExport = async () => {
  try {
    let params
    try {
      params = await searchTableRef.value?.searchMethods?.getFormData()
    } catch (e) {
      params = currentSearchParams.value
    }

    const apiParams: any = {
      page_size: -1 // 导出所有数据
    }

    // 关键字搜索
    if (params?.keyword) {
      apiParams.keyword = params.keyword
    }

    // 资源类型
    if (params?.resource_type) {
      apiParams.resource_type = params.resource_type
    }

    // 订单状态
    if (params?.status) {
      apiParams.status = params.status
    }

    // 机器人ID
    if (params?.bot_id) {
      apiParams.bot_id = params.bot_id
    }

    console.log('导出参数:', apiParams)

    // TODO: 替换为实际的API调用
    // const res = await v2GetResourceOrderList(apiParams)

    // 模拟导出数据
    const mockData = {
      code: '000000',
      data: {
        list: [
          {
            id: 'RO2026051200001',
            bot_user_name: 'TestBot001',
            agent_name: '测试代理A',
            send_address: 'TXYZoPE5qvTBToDdEktz1Vcx8fyvnyHBSq',
            receive_address: 'TLPZan8PQGNCwtbetFRm4pDmXzXmKKKKKK',
            resource_type: 1,
            amount: 32000,
            unit_price: 420,
            total_duration: 3,
            status: 2,
            remark: '正常订单',
            start_time: Math.floor(Date.now() / 1000) - 86400,
            end_time: Math.floor(Date.now() / 1000) + 172800
          },
          {
            id: 'RO2026051200002',
            bot_user_name: 'TestBot002',
            agent_name: '测试代理B',
            send_address: 'TABCDoPE5qvTBToDdEktz1Vcx8fyvnyHBSq',
            receive_address: 'TEFGHan8PQGNCwtbetFRm4pDmXzXmLLLLL',
            resource_type: 2,
            amount: 50000,
            unit_price: 1000,
            total_duration: 7,
            status: 1,
            remark: '已完成',
            start_time: Math.floor(Date.now() / 1000) - 604800,
            end_time: Math.floor(Date.now() / 1000) - 86400
          }
        ]
      }
    }

    if (mockData.code === '000000' && mockData.data && mockData.data.list) {
      const list = mockData.data.list.map((item: any) => ({
        订单号: item.id || '-',
        机器人用户名: item.bot_user_name || '-',
        代理: item.agent_name || '-',
        用户发送地址: item.send_address || '-',
        接收地址: item.receive_address || '-',
        类型: RESOURCE_TYPE_MAP[item.resource_type] || '-',
        数量: `${item.amount || 0} ${item.resource_type === 1 ? '能量' : item.resource_type === 2 ? '带宽' : ''}`,
        '单价(sun/天)': `${item.unit_price || 0} sun`,
        总时长: `${item.total_duration || 0} 天`,
        订单状态: ORDER_STATUS_MAP[item.status] || '-',
        备注: item.remark || '-',
        开始时间: item.start_time ? formatToDateTime(item.start_time) : '-',
        结束时间: item.end_time ? formatToDateTime(item.end_time) : '-'
      }))

      simpleExportToExcel(list, '资源订单列表')
      handleSuccessMessage('订单导出成功')
    } else {
      handleErrorMessage('导出失败：数据格式错误')
    }
  } catch (error) {
    handleErrorMessage(error, '订单导出失败')
  }
}
</script>

<style scoped>
.app-container {
  padding: 20px;
}
</style>
