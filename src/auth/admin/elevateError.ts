export const ELEVATE_CANCELLED_NAME = 'ElevateCancelledError'

export const isElevateCancelled = (error: unknown) =>
  Boolean(error) && (error as { name?: string }).name === ELEVATE_CANCELLED_NAME

export const createElevateCancelledError = () => {
  const error = new Error('已取消通行密钥验证')
  error.name = ELEVATE_CANCELLED_NAME
  return error
}
