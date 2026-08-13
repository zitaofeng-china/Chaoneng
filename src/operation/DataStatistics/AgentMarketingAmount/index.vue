<template>
  <div class="app-container">
    <ContentWrap>
      <div class="agent-marketing-page" v-loading="loading">
        <div class="report-toolbar">
          <div class="toolbar-filters">
            <div class="filter-item filter-item-keyword">
              <span class="filter-label">关键词：</span>
              <ElInput
                v-model="searchForm.keyword"
                placeholder="代理名称"
                clearable
                @keyup.enter="handleSearch"
              />
            </div>

            <div class="filter-item">
              <span class="filter-label">代理等级：</span>
              <ElSelect v-model="searchForm.priceId" class="level-select">
                <ElOption label="全部" value="" />
                <ElOption label="一级代理" :value="1" />
                <ElOption label="二级代理" :value="2" />
                <ElOption label="三级代理" :value="3" />
                <ElOption label="自营代理" :value="8" />
              </ElSelect>
            </div>

            <ElButton type="primary" @click="handleSearch">
              <Icon icon="ep:search" class="mr-4px" />查询
            </ElButton>
            <ElButton @click="handleReset">重置</ElButton>
          </div>
        </div>

        <div class="summary-grid">
          <div
            v-for="card in summaryCards"
            :key="card.key"
            class="summary-card"
            :class="`summary-card-${card.tone}`"
          >
            <div class="summary-title">{{ card.title }}</div>
            <div class="summary-value">{{ card.value }}</div>
          </div>
        </div>

        <div class="marketing-table-card">
          <div class="marketing-table-scroll">
            <table class="marketing-table">
              <thead>
                <tr>
                  <th v-for="column in tableColumns" :key="column.key" :class="column.className">
                    {{ column.label }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="visibleRows.length === 0">
                  <td :colspan="tableColumns.length" class="empty-cell">暂无数据</td>
                </tr>
                <tr
                  v-for="row in visibleRows"
                  :key="row.key"
                  class="marketing-row"
                  :class="`marketing-row-${row.kind}`"
                >
                  <td v-for="column in tableColumns" :key="column.key" :class="column.className">
                    <template v-if="column.key === 'name'">
                      <div class="name-cell" :class="`name-cell-${row.kind}`">
                        <button
                          v-if="row.hasChildren"
                          type="button"
                          class="expand-icon-button"
                          :disabled="row.childrenLoading"
                          :aria-label="row.expanded ? '收起' : '展开'"
                          @click="toggleRow(row)"
                        >
                          <Icon
                            :icon="
                              row.childrenLoading
                                ? 'ep:loading'
                                : row.expanded
                                  ? 'ep:arrow-down'
                                  : 'ep:arrow-right'
                            "
                            :size="14"
                          />
                        </button>
                        <span v-else class="expand-placeholder"></span>
                        <span class="row-name">{{ row.name }}</span>
                        <span
                          v-if="row.kind !== 'order'"
                          class="row-tag"
                          :class="`row-tag-${row.kind}`"
                        >
                          {{ row.kind === 'agent' ? '代理' : '机器人' }}
                        </span>
                      </div>
                    </template>
                    <ElButton
                      v-else-if="column.key === 'action' && row.hasChildren"
                      size="small"
                      :type="row.kind === 'agent' ? 'success' : 'primary'"
                      :loading="row.childrenLoading"
                      @click="toggleRow(row)"
                    >
                      {{ row.expanded ? '收起' : row.kind === 'agent' ? '查看机器人' : '展开' }}
                    </ElButton>
                    <template v-else-if="column.key !== 'action'">{{
                      column.render(row)
                    }}</template>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="marketing-pagination">
            <div class="pagination-total">
              共 {{ pagination.total }} 条记录 第 {{ pagination.currentPage }} / {{ totalPages }} 页
            </div>

            <ElPagination
              v-model:current-page="pagination.currentPage"
              v-model:page-size="pagination.pageSize"
              background
              layout="prev, pager, next, sizes, jumper"
              :total="pagination.total"
              :page-sizes="[10, 20, 50, 100]"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </div>
      </div>
    </ContentWrap>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElButton, ElInput, ElOption, ElPagination, ElSelect } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { Icon } from '@/components/Icon'
import {
  getAgentMarketingAmountReport,
  getBotExpenseReport,
  getBotOrderExpenseReport,
  type AgentMarketingAgentItem,
  type AgentMarketingAmountData,
  type AgentMarketingAmountParams,
  type AgentMarketingBotItem,
  type AgentMarketingBotExpenseItem,
  type AgentMarketingBotOrderItem,
  type AgentMarketingOrderItem
} from '@/api/opertion/DataStatistics/AgentMarketingAmount'
import { AGENT_BILL_ORDER_TYPE_MAP } from '@/operation/Agent/constants'
import { handleErrorMessage } from '@/utils/messageHelper'

type RowKind = 'agent' | 'bot' | 'order'
type NumericValue = number | string | null | undefined

interface MarketingMetrics {
  totalExpense: number
  botCount: number
  orderCount: number
  averageOrderAmount: number
  todayExpense: number
  yesterdayExpense: number
  monthExpense: number
  lastMonthExpense: number
  userCount: number
  performanceRatio: number
}

interface MarketingOrder extends MarketingMetrics {
  key: string
  name: string
}

interface MarketingBot extends MarketingMetrics {
  key: string
  agentId: string
  botId: string
  name: string
  orders: MarketingOrder[]
  ordersLoaded: boolean
  ordersLoading: boolean
}

interface MarketingAgent extends MarketingMetrics {
  key: string
  agentId: string
  rank: number
  name: string
  priceId: number
  bots: MarketingBot[]
  botsLoaded: boolean
  botsLoading: boolean
}

interface MarketingRow extends MarketingMetrics {
  key: string
  kind: RowKind
  rank: number
  name: string
  hasChildren: boolean
  expanded: boolean
  childrenLoading: boolean
}

interface SummaryState {
  totalExpense: number
  monthExpense: number
  agentCount: number
  botCount: number
}

interface SearchFormState {
  keyword: string
  priceId: number | string
}

const MOCK_AGENT_MARKETING_DATA: AgentMarketingAmountData = {
  summary: {
    total_performance: '128',
    month_performance: '418925',
    agent_count: 186,
    bot_count: 186,
    average_performance: '30629'
  },
  list: [
    {
      id: 1,
      rank: 1,
      price_id: 1,
      agent_name: 'yxxtqgtz',
      total_sales_amount: '526880',
      bot_count: 18,
      order_count: 3642,
      average_order_amount: '144.67',
      today_sales_amount: '12860',
      yesterday_sales_amount: '12860',
      current_month_sales_amount: '176420',
      last_month_sales_amount: '176420',
      user_count: 1205,
      performance_ratio: '40.96',
      bots: [
        {
          id: 101,
          bot_username: 'trxDubot',
          total_sales_amount: '51500',
          order_count: 462,
          average_order_amount: '111.47',
          today_sales_amount: '2860',
          yesterday_sales_amount: '2860',
          current_month_sales_amount: '2860',
          last_month_sales_amount: '2860',
          user_count: 512,
          performance_ratio: '9.78',
          orders: [
            {
              order_type: 'energy',
              order_name: '能量订单',
              total_sales_amount: '226800',
              order_count: 1620,
              performance_ratio: '9.78'
            },
            {
              order_type: 'recharge',
              order_name: '充值订单',
              total_sales_amount: '138',
              order_count: 516,
              performance_ratio: '9.78'
            },
            {
              order_type: 'exchange',
              order_name: '闪兑订单',
              total_sales_amount: '92760',
              order_count: 516,
              performance_ratio: '9.78'
            },
            {
              order_type: 'fund',
              order_name: '理财订单',
              total_sales_amount: '9020',
              order_count: 516,
              performance_ratio: '9.78'
            }
          ]
        },
        {
          id: 102,
          bot_username: 'ip292',
          total_sales_amount: '51500',
          order_count: 462,
          average_order_amount: '111.47',
          today_sales_amount: '2860',
          yesterday_sales_amount: '2860',
          current_month_sales_amount: '2860',
          last_month_sales_amount: '2860',
          user_count: 102,
          performance_ratio: '2.26',
          orders: [
            {
              order_type: 'energy',
              order_name: '能量订单',
              total_sales_amount: '226800',
              order_count: 105,
              performance_ratio: '2.26'
            }
          ]
        }
      ]
    },
    {
      id: 2,
      rank: 2,
      price_id: 2,
      agent_name: 'hashuse',
      total_sales_amount: '408900',
      bot_count: 7,
      order_count: 2816,
      average_order_amount: '111.47',
      today_sales_amount: '0',
      yesterday_sales_amount: '0',
      current_month_sales_amount: '0',
      last_month_sales_amount: '0',
      user_count: 40,
      performance_ratio: '31.78',
      bots: [
        {
          id: 201,
          bot_username: 'trxDubot',
          total_sales_amount: '51500',
          order_count: 462,
          average_order_amount: '111.47',
          today_sales_amount: '2860',
          yesterday_sales_amount: '2860',
          current_month_sales_amount: '2860',
          last_month_sales_amount: '2860',
          user_count: 102,
          performance_ratio: '2.26',
          orders: []
        },
        {
          id: 202,
          bot_username: 'kkbxjua_bot',
          total_sales_amount: '51500',
          order_count: 462,
          average_order_amount: '111.47',
          today_sales_amount: '2860',
          yesterday_sales_amount: '2860',
          current_month_sales_amount: '2860',
          last_month_sales_amount: '2860',
          user_count: 102,
          performance_ratio: '2.26',
          orders: []
        }
      ]
    },
    {
      id: 3,
      rank: 3,
      price_id: 3,
      agent_name: 'nova_energy',
      total_sales_amount: '296420',
      bot_count: 4,
      order_count: 1964,
      average_order_amount: '150.93',
      today_sales_amount: '8420',
      yesterday_sales_amount: '7930',
      current_month_sales_amount: '84200',
      last_month_sales_amount: '76240',
      user_count: 638,
      performance_ratio: '23.04',
      bots: [
        {
          id: 301,
          bot_username: 'nova_energy_bot',
          total_sales_amount: '118900',
          order_count: 788,
          average_order_amount: '150.89',
          today_sales_amount: '3690',
          yesterday_sales_amount: '3310',
          current_month_sales_amount: '36900',
          last_month_sales_amount: '33800',
          user_count: 286,
          performance_ratio: '9.24',
          orders: [
            {
              order_type: 'energy',
              order_name: '能量订单',
              total_sales_amount: '88900',
              order_count: 592,
              performance_ratio: '7.41'
            },
            {
              order_type: 'hosting',
              order_name: '理财订单',
              total_sales_amount: '30000',
              order_count: 196,
              performance_ratio: '1.83'
            }
          ]
        }
      ]
    }
  ]
}

const searchForm = reactive<SearchFormState>({
  keyword: '',
  priceId: ''
})
const appliedSearch = reactive<SearchFormState>({
  keyword: '',
  priceId: ''
})
const useMockData = import.meta.env.DEV && import.meta.env.VITE_AGENT_MARKETING_MOCK === 'true'
const loading = ref(false)
const agents = ref<MarketingAgent[]>([])
const expandedAgents = ref<Set<string>>(new Set())
const expandedBots = ref<Set<string>>(new Set())
const summary = ref<SummaryState>({
  totalExpense: 0,
  monthExpense: 0,
  agentCount: 0,
  botCount: 0
})
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})
const botExpenseCache = ref<AgentMarketingBotExpenseItem[] | null>(null)
let botExpenseRequest: Promise<AgentMarketingBotExpenseItem[]> | null = null

const toNumber = (value: NumericValue | unknown) => {
  const numberValue = Number(value ?? 0)
  return Number.isFinite(numberValue) ? numberValue : 0
}

const formatAmount = (value: NumericValue) => {
  return toNumber(value).toLocaleString('zh-CN', {
    maximumFractionDigits: 2
  })
}

const formatCount = (value: NumericValue) => {
  return toNumber(value).toLocaleString('zh-CN', {
    maximumFractionDigits: 0
  })
}

/** 客单价 = 总支出 / 订单数，接口无此字段。 */
const computeUnitPrice = (totalExpense: number, orderCount: number) => {
  return orderCount > 0 ? totalExpense / orderCount : 0
}

/** 业绩占比 = 该行总支出 / 汇总总支出，接口无此字段。 */
const computePerformanceRatio = (totalExpense: number) => {
  return summary.value.totalExpense > 0 ? (totalExpense / summary.value.totalExpense) * 100 : 0
}

const formatUnitPrice = (row: MarketingMetrics) => {
  return formatAmount(computeUnitPrice(row.totalExpense, row.orderCount))
}

const formatPerformanceRatio = (row: MarketingMetrics) => {
  return `${computePerformanceRatio(row.totalExpense).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}%`
}

const formatBotCount = (row: MarketingRow) => {
  if (row.kind === 'agent') return formatCount(row.botCount)
  if (row.kind === 'bot') return '—'
  return ''
}

const tableColumns = computed(() => [
  {
    key: 'rank',
    label: '排名',
    className: 'rank-column',
    render: (row: MarketingRow) => row.rank || ''
  },
  { key: 'name', label: '名称', className: 'name-column', render: (row: MarketingRow) => row.name },
  {
    key: 'totalExpense',
    label: '总支出',
    className: '',
    render: (row: MarketingRow) => formatAmount(row.totalExpense)
  },
  { key: 'botCount', label: '机器人数', className: '', render: formatBotCount },
  {
    key: 'orderCount',
    label: '订单数',
    className: '',
    render: (row: MarketingRow) => formatCount(row.orderCount)
  },
  {
    key: 'unitPrice',
    label: '客单价',
    className: '',
    render: (row: MarketingRow) => formatUnitPrice(row)
  },
  {
    key: 'todayExpense',
    label: '今日支出',
    className: '',
    render: (row: MarketingRow) => formatAmount(row.todayExpense)
  },
  {
    key: 'yesterdayExpense',
    label: '昨日支出',
    className: '',
    render: (row: MarketingRow) => formatAmount(row.yesterdayExpense)
  },
  {
    key: 'monthExpense',
    label: '本月支出',
    className: '',
    render: (row: MarketingRow) => formatAmount(row.monthExpense)
  },
  {
    key: 'lastMonthExpense',
    label: '上月支出',
    className: '',
    render: (row: MarketingRow) => formatAmount(row.lastMonthExpense)
  },
  {
    key: 'userCount',
    label: '用户数',
    className: '',
    render: (row: MarketingRow) => formatCount(row.userCount)
  },
  {
    key: 'performanceRatio',
    label: '业绩占比',
    className: '',
    render: formatPerformanceRatio
  },
  { key: 'action', label: '操作', className: 'action-column', render: () => '' }
])

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const readValue = (source: Record<string, unknown>, keys: string[]): unknown => {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) return source[key]
  }
  return undefined
}

function readArray<T>(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (Array.isArray(source[key])) return source[key] as T[]
  }
  return [] as T[]
}

const toRecord = (value: unknown) => (isRecord(value) ? value : {})

const hasArrayField = (source: Record<string, unknown>, keys: string[]) => {
  return keys.some((key) => Array.isArray(source[key]))
}

const readResponseList = <T,>(data: unknown): T[] => {
  if (Array.isArray(data)) return data as T[]

  const source = toRecord(data)
  return readArray<T>(source, ['detail', 'list', 'rows', 'data'])
}

const getOrderTypeName = (kind: unknown) => {
  if (kind === undefined || kind === null || kind === '') return undefined

  const numericKind = Number(kind)
  if (Number.isFinite(numericKind)) {
    return AGENT_BILL_ORDER_TYPE_MAP[numericKind] || `订单类型${numericKind}`
  }

  return String(kind)
}

const readMetrics = (source: Record<string, unknown>): MarketingMetrics => {
  const totalExpense = toNumber(
    readValue(source, [
      'total_expense',
      'total_sales_amount',
      'sales_amount',
      'total_performance',
      'total'
    ])
  )
  const orderCount = toNumber(
    readValue(source, ['order_count', 'orderCount', 'orders_count', 'order_num'])
  )

  return {
    totalExpense,
    botCount: toNumber(readValue(source, ['bot_count', 'bots_count', 'robot_count', 'botCount'])),
    orderCount,
    averageOrderAmount: computeUnitPrice(totalExpense, orderCount),
    todayExpense: toNumber(
      readValue(source, ['today_expense', 'today_sales_amount', 'todayExpense', 'sales_today'])
    ),
    yesterdayExpense: toNumber(
      readValue(source, [
        'yesterday_expense',
        'yesterday_sales_amount',
        'yesterdayExpense',
        'sales_yesterday'
      ])
    ),
    monthExpense: toNumber(
      readValue(source, [
        'this_month_expense',
        'month_expense',
        'month_sales_amount',
        'current_month_sales_amount',
        'thisMonthExpense'
      ])
    ),
    lastMonthExpense: toNumber(
      readValue(source, [
        'last_month_expense',
        'last_month_sales_amount',
        'lastMonthExpense',
        'prev_month_expense'
      ])
    ),
    userCount: toNumber(
      readValue(source, ['user_count', 'users_count', 'people_count', 'userCount', 'user_num'])
    ),
    performanceRatio: 0
  }
}

const normalizeOrder = (item: AgentMarketingOrderItem, parentKey: string, index: number) => {
  const source = toRecord(item)
  const orderKind = readValue(source, ['kind', 'order_type', 'type'])
  const orderType = readValue(source, ['order_name', 'name'])
  const metrics = readMetrics(source)

  return {
    key: `${parentKey}-order-${String(readValue(source, ['id', 'kind', 'order_type', 'type']) ?? index)}`,
    name: String(orderType ?? getOrderTypeName(orderKind) ?? `订单类型${index + 1}`),
    ...metrics
  } satisfies MarketingOrder
}

const normalizeBot = (
  item: AgentMarketingBotItem | AgentMarketingBotExpenseItem,
  parentKey: string,
  index: number
) => {
  const source = toRecord(item)
  const botId = String(readValue(source, ['id', 'bot_id']) ?? index)
  const agentId = String(readValue(source, ['agent_id']) ?? '')
  const key = `${parentKey}-bot-${botId}`
  const orderFields = ['orders', 'children', 'order_types']
  const orderItems = readArray<AgentMarketingOrderItem>(source, orderFields)

  return {
    key,
    agentId,
    botId,
    name: String(readValue(source, ['bot_name', 'bot_username', 'name']) ?? `机器人${index + 1}`),
    orders: orderItems.map((order, orderIndex) => normalizeOrder(order, key, orderIndex)),
    ordersLoaded: hasArrayField(source, orderFields),
    ordersLoading: false,
    ...readMetrics(source)
  } satisfies MarketingBot
}

const normalizeAgent = (item: AgentMarketingAgentItem, index: number) => {
  const source = toRecord(item)
  const agentId = String(readValue(source, ['id', 'agent_id']) ?? '')
  const key = `agent-${agentId || index}`
  const botFields = ['bots', 'children', 'bot_list']
  const botItems = readArray<AgentMarketingBotItem>(source, botFields)

  return {
    key,
    agentId,
    rank: toNumber(readValue(source, ['rank', 'ranking', 'index'])) || index + 1,
    name: String(readValue(source, ['agent_name', 'username', 'name']) ?? `代理${index + 1}`),
    priceId: toNumber(readValue(source, ['price_id', 'agent_level', 'level'])),
    bots: botItems.map((bot, botIndex) => normalizeBot(bot, key, botIndex)),
    botsLoaded: hasArrayField(source, botFields),
    botsLoading: false,
    ...readMetrics(source)
  } satisfies MarketingAgent
}

const normalizePager = (pager: AgentMarketingAmountData['pager'], fallbackTotal: number) => {
  const currentPage = toNumber(pager?.current_page)
  const pageSize = toNumber(pager?.page_size)

  return {
    currentPage: currentPage > 0 ? currentPage : pagination.currentPage,
    pageSize: pageSize > 0 ? pageSize : pagination.pageSize,
    total: pager?.total === undefined ? fallbackTotal : toNumber(pager.total)
  }
}

const normalizeData = (data?: AgentMarketingAmountData | null) => {
  const root = toRecord(data)
  const nested = isRecord(root.data) ? root.data : root
  const summarySource = toRecord(readValue(nested, ['summary', 'statistics', 'total']))
  const agentItems = readArray<AgentMarketingAgentItem>(nested, [
    'list',
    'agents',
    'detail',
    'rows'
  ])
  const normalizedAgents = agentItems.map(normalizeAgent)

  const totalExpense =
    toNumber(
      readValue(summarySource, ['total_expense', 'total_sales_amount', 'total_sales', 'total'])
    ) || normalizedAgents.reduce((total, agent) => total + agent.totalExpense, 0)
  const agentCount =
    toNumber(readValue(summarySource, ['agent_count', 'total_agents', 'agents_count'])) ||
    normalizedAgents.length
  const botCount =
    toNumber(readValue(summarySource, ['bot_count', 'total_bots', 'bots_count'])) ||
    normalizedAgents.reduce((total, agent) => total + (agent.botCount || agent.bots.length), 0)

  return {
    agents: normalizedAgents,
    summary: {
      totalExpense,
      monthExpense:
        toNumber(
          readValue(summarySource, [
            'this_month_total_expense',
            'month_sales_amount',
            'current_month_sales_amount',
            'sales_this_month'
          ])
        ) || normalizedAgents.reduce((total, agent) => total + agent.monthExpense, 0),
      agentCount,
      botCount
    },
    pager: normalizePager(
      isRecord(readValue(nested, ['pager']))
        ? (readValue(nested, ['pager']) as AgentMarketingAmountData['pager'])
        : undefined,
      normalizedAgents.length
    )
  }
}

const summaryCards = computed(() => [
  {
    key: 'total-expense',
    title: '总支出',
    value: formatAmount(summary.value.totalExpense),
    tone: 'neutral'
  },
  {
    key: 'month-expense',
    title: '本月总支出',
    value: formatAmount(summary.value.monthExpense),
    tone: 'positive'
  },
  {
    key: 'agent-count',
    title: '代理数',
    value: formatCount(summary.value.agentCount),
    tone: 'primary'
  },
  {
    key: 'bot-count',
    title: '机器人总数',
    value: formatCount(summary.value.botCount),
    tone: 'positive'
  }
])

const filteredAgents = computed(() => {
  if (!useMockData) return agents.value

  const keyword = appliedSearch.keyword.trim().toLowerCase()
  const priceId = Number(appliedSearch.priceId)

  return agents.value.filter((agent) => {
    if (priceId > 0 && agent.priceId !== priceId) return false
    if (agent.name.toLowerCase().includes(keyword)) return true
    if (!keyword) return true
    return agent.bots.some((bot) => bot.name.toLowerCase().includes(keyword))
  })
})

const visibleRows = computed<MarketingRow[]>(() => {
  const rows: MarketingRow[] = []

  for (const agent of filteredAgents.value) {
    const agentExpanded = expandedAgents.value.has(agent.key)
    rows.push({
      ...agent,
      kind: 'agent',
      hasChildren: agent.bots.length > 0 || agent.botCount > 0,
      expanded: agentExpanded,
      childrenLoading: agent.botsLoading
    })

    if (!agentExpanded) continue

    for (const bot of agent.bots) {
      const botExpanded = expandedBots.value.has(bot.key)
      rows.push({
        ...bot,
        kind: 'bot',
        rank: 0,
        hasChildren: bot.orders.length > 0 || bot.orderCount > 0,
        expanded: botExpanded,
        childrenLoading: bot.ordersLoading
      })

      if (!botExpanded) continue

      for (const order of bot.orders) {
        rows.push({
          ...order,
          kind: 'order',
          rank: 0,
          hasChildren: false,
          expanded: false,
          childrenLoading: false
        })
      }
    }
  }

  return rows
})

const loadBotExpenseItems = async () => {
  if (botExpenseCache.value) return botExpenseCache.value
  if (botExpenseRequest) return botExpenseRequest

  const request = (async () => {
    const response = await getBotExpenseReport({
      current_page: 1,
      page_size: -1
    })

    if (response.code !== '000000' || !response.data) {
      throw new Error(response.msg || '机器人支出接口返回异常')
    }

    const items = readResponseList<AgentMarketingBotExpenseItem>(response.data)
    botExpenseCache.value = items
    return items
  })()

  botExpenseRequest = request
  try {
    return await request
  } finally {
    if (botExpenseRequest === request) botExpenseRequest = null
  }
}

const loadAgentBots = async (agent: MarketingAgent) => {
  if (agent.botsLoaded || agent.botsLoading) return

  agent.botsLoading = true
  try {
    const botItems = await loadBotExpenseItems()
    const agentId = agent.agentId
    const matchingBots = botItems.filter((item) => {
      const source = toRecord(item)
      const itemAgentId = readValue(source, ['agent_id'])
      if (agentId && itemAgentId !== undefined && itemAgentId !== null) {
        return String(itemAgentId) === agentId
      }

      return readValue(source, ['agent_name']) === agent.name
    })

    agent.bots = matchingBots.map((bot, index) => normalizeBot(bot, agent.key, index))
    agent.botsLoaded = true
  } catch (error) {
    handleErrorMessage(error, '获取机器人支出失败')
  } finally {
    agent.botsLoading = false
  }
}

const loadBotOrders = async (bot: MarketingBot) => {
  if (bot.ordersLoaded || bot.ordersLoading) return
  if (!bot.botId) {
    handleErrorMessage(new Error('机器人ID不能为空'), '获取订单类型失败')
    return
  }

  bot.ordersLoading = true
  try {
    const response = await getBotOrderExpenseReport({ bot_id: bot.botId })
    if (response.code !== '000000' || !response.data) {
      throw new Error(response.msg || '机器人订单支出接口返回异常')
    }

    const orderItems = readResponseList<AgentMarketingBotOrderItem>(response.data)
    bot.orders = orderItems.map((order, index) => normalizeOrder(order, bot.key, index))
    bot.ordersLoaded = true
  } catch (error) {
    handleErrorMessage(error, '获取订单类型支出失败')
  } finally {
    bot.ordersLoading = false
  }
}

const toggleRow = async (row: MarketingRow) => {
  if (row.kind === 'agent') {
    const agent = agents.value.find((item) => item.key === row.key)
    if (!agent) return

    if (!agent.botsLoaded) {
      await loadAgentBots(agent)
      if (!agent.botsLoaded) return
    }

    const next = new Set(expandedAgents.value)
    next.has(row.key) ? next.delete(row.key) : next.add(row.key)
    expandedAgents.value = next
    return
  }

  if (row.kind === 'bot') {
    const bot = agents.value.flatMap((agent) => agent.bots).find((item) => item.key === row.key)
    if (!bot) return

    if (!bot.ordersLoaded) {
      await loadBotOrders(bot)
      if (!bot.ordersLoaded) return
    }

    const next = new Set(expandedBots.value)
    next.has(row.key) ? next.delete(row.key) : next.add(row.key)
    expandedBots.value = next
  }
}

const buildParams = (): AgentMarketingAmountParams => {
  const params: AgentMarketingAmountParams = {
    current_page: pagination.currentPage,
    page_size: pagination.pageSize
  }

  if (appliedSearch.keyword) params.keyword = appliedSearch.keyword
  if (appliedSearch.priceId) params.price_id = appliedSearch.priceId

  return params
}

const applyData = (data: AgentMarketingAmountData) => {
  const normalized = normalizeData(data)
  agents.value = normalized.agents
  summary.value = normalized.summary
  pagination.currentPage = normalized.pager.currentPage
  pagination.pageSize = normalized.pager.pageSize
  pagination.total = normalized.pager.total
  expandedAgents.value = new Set()
  expandedBots.value = new Set()
}

const resetData = () => {
  agents.value = []
  summary.value = {
    totalExpense: 0,
    monthExpense: 0,
    agentCount: 0,
    botCount: 0
  }
  pagination.total = 0
  expandedAgents.value = new Set()
  expandedBots.value = new Set()
}

const loadData = async () => {
  loading.value = true
  appliedSearch.keyword = searchForm.keyword
  appliedSearch.priceId = searchForm.priceId

  try {
    if (useMockData) {
      applyData(MOCK_AGENT_MARKETING_DATA)
      return
    }

    const response = await getAgentMarketingAmountReport(buildParams())
    if (response.code !== '000000' || !response.data) {
      resetData()
      handleErrorMessage(new Error(response.msg || '接口返回异常'), '获取代理营销额失败')
      return
    }

    applyData(response.data)
  } catch (error) {
    resetData()
    handleErrorMessage(error, '获取代理营销额失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = async () => {
  pagination.currentPage = 1
  await loadData()
}

const handleReset = async () => {
  searchForm.keyword = ''
  searchForm.priceId = ''
  pagination.currentPage = 1
  pagination.pageSize = 10
  await loadData()
}

const handleCurrentChange = async (page: number) => {
  pagination.currentPage = page
  await loadData()
}

const handleSizeChange = async (size: number) => {
  pagination.pageSize = size
  pagination.currentPage = 1
  await loadData()
}

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
})

onMounted(async () => {
  await loadData()
})
</script>

<style scoped>
@media (width <= 1100px) {
  .summary-grid {
    grid-template-columns: repeat(3, minmax(150px, 1fr));
  }

  .marketing-pagination {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (width <= 700px) {
  .toolbar-filters {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
  }

  .filter-item-keyword :deep(.el-input) {
    width: min(272px, calc(100vw - 88px));
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(140px, 1fr));
    gap: 12px;
  }
}

.agent-marketing-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.report-toolbar {
  display: flex;
  align-items: center;
}

.toolbar-filters,
.filter-item {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-filters {
  width: 100%;
  gap: 30px;
}

.filter-item-keyword :deep(.el-input) {
  width: 272px;
}

.level-select {
  width: 122px;
}

.filter-label {
  font-size: 14px;
  color: #303133;
  flex-shrink: 0;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  gap: 36px;
}

.summary-card {
  min-height: 72px;
  padding: 12px 16px;
  background: #fafafa;
  border: 1px solid #e4e7ed;
}

.summary-title {
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  color: #303133;
}

.summary-value {
  margin-top: 3px;
  font-size: 15px;
  font-weight: 600;
  line-height: 24px;
  color: #1f2937;
}

.summary-card-positive .summary-value {
  color: #67c23a;
}

.summary-card-primary .summary-value {
  color: #1d4ed8;
}

.marketing-table-card {
  overflow: hidden;
  background: #fff;
  border: 1px solid #ebeef5;
}

.marketing-table-scroll {
  overflow-x: auto;
}

.marketing-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
}

.pagination-total {
  font-size: 13px;
  color: #606266;
  flex-shrink: 0;
}

.marketing-table {
  width: max-content;
  min-width: 100%;
  border-collapse: collapse;
  table-layout: auto;
}

.marketing-table th,
.marketing-table td {
  height: 40px;
  padding: 0 10px;
  font-size: 12px;
  color: #1f2937;
  text-align: center;
  white-space: nowrap;
  vertical-align: middle;
  border: 1px solid #ebeef5;
}

.marketing-table thead th {
  height: 40px;
  font-weight: 600;
  color: #303133;
  background: #f7f7f7;
}

.marketing-row-agent {
  background: #fff;
}

.marketing-row-bot {
  background: #f2faff;
}

.marketing-row-order {
  background: #fafafa;
}

.rank-column {
  width: 70px;
}

.name-column {
  min-width: 170px;
}

.marketing-table th.name-column {
  text-align: center;
}

.marketing-table td.name-column {
  text-align: left;
}

.action-column {
  width: 110px;
}

.name-cell {
  display: flex;
  width: 100%;
  min-height: 38px;
  text-align: left;
  box-sizing: border-box;
  align-items: center;
  gap: 7px;
}

/* Use three fixed levels to distinguish agents, bots, and order types. */
.name-cell-agent {
  padding-left: 8px;
}

.name-cell-bot {
  padding-left: 32px;
}

.name-cell-order {
  padding-left: 56px;
}

.expand-icon-button {
  display: inline-flex;
  width: 18px;
  height: 18px;
  padding: 0;
  color: #409eff;
  cursor: pointer;
  background: transparent;
  border: 0;
  align-items: center;
  justify-content: center;
  flex: 0 0 18px;
}

.expand-icon-button:hover {
  color: #1d4ed8;
}

.expand-placeholder {
  display: inline-block;
  flex: 0 0 18px;
  width: 18px;
}

.row-name {
  max-width: 180px;
  overflow: hidden;
  color: #1476c9;
  text-overflow: ellipsis;
}

.marketing-row-agent .row-name {
  color: #303133;
}

.marketing-row-order .row-name {
  color: #303133;
}

.row-tag {
  display: inline-flex;
  height: 23px;
  min-width: 50px;
  padding: 0 8px;
  font-size: 12px;
  line-height: 21px;
  color: #409eff;
  border: 1px solid #409eff;
  border-radius: 4px;
  align-items: center;
  justify-content: center;
}

.row-tag-agent {
  color: #67c23a;
  border-color: #67c23a;
}

.row-tag-bot {
  color: #409eff;
  border-color: #409eff;
}

.empty-cell {
  height: 120px !important;
  color: #909399 !important;
}

.action-column :deep(.el-button) {
  min-width: 58px;
  padding: 5px 10px;
}
</style>
