export type BotUpdateSource = Record<string, any>

export type BotUpdatePayload = {
  id: number | string
  auto_renew: number
  avatar: string
  short_description: string
  description: string
  first_name: string
  describe: string
  reward: {
    first_deposit: number
    premium_invite: number
    standard_invite: number
    deposit_threshold: number
  }
  status: number
  tg_admin: string
  invite_reward: number
}

export const BOT_FIRST_NAME_REQUIRED_MESSAGE = '机器人昵称不能为空'

const pickValue = <T>(...values: Array<T | null | undefined>) => {
  return values.find((value) => value !== undefined && value !== null)
}

const toStringValue = (...values: unknown[]) => {
  const value = pickValue(...values)
  return value === undefined ? '' : String(value)
}

const toNumberValue = (defaultValue: number, ...values: unknown[]) => {
  const value = pickValue(...values)
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : defaultValue
}

export const buildBotUpdatePayload = (
  source: BotUpdateSource = {},
  overrides: BotUpdateSource = {}
): BotUpdatePayload => {
  const sourceReward = source.reward || {}
  const overrideReward = overrides.reward || {}
  const standardInvite = toNumberValue(
    0,
    overrideReward.standard_invite,
    overrides.invite_reward,
    sourceReward.standard_invite,
    source.invite_reward
  )

  return {
    id: pickValue(overrides.id, source.id) as number | string,
    auto_renew: toNumberValue(2, overrides.auto_renew, source.auto_renew),
    avatar: toStringValue(overrides.avatar, source.avatar),
    short_description: toStringValue(overrides.short_description, source.short_description),
    description: toStringValue(overrides.description, source.description),
    first_name: toStringValue(
      overrides.first_name,
      overrides.firstname,
      source.first_name,
      source.firstname
    ),
    describe: toStringValue(overrides.describe, source.describe),
    reward: {
      first_deposit: toNumberValue(
        0,
        overrideReward.first_deposit,
        overrides.visit_reward,
        sourceReward.first_deposit,
        source.visit_reward
      ),
      premium_invite: toNumberValue(
        0,
        overrideReward.premium_invite,
        overrides.invite_reward_vip,
        sourceReward.premium_invite,
        source.invite_reward_vip
      ),
      standard_invite: standardInvite,
      deposit_threshold: toNumberValue(
        0,
        overrideReward.deposit_threshold,
        overrides.deposit_threshold,
        sourceReward.deposit_threshold
      )
    },
    status: toNumberValue(2, overrides.status, source.status),
    tg_admin: toStringValue(overrides.tg_admin, source.tg_admin),
    invite_reward: standardInvite
  }
}

export const validateBotUpdatePayload = (payload: BotUpdatePayload) => {
  if (!payload.id) return '机器人ID不能为空'
  if (!payload.first_name.trim()) return BOT_FIRST_NAME_REQUIRED_MESSAGE
  return ''
}
