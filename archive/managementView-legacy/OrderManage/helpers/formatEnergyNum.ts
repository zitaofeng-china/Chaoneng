const formatToWan = (num: number | string | null | undefined): string => {
  if (!num) return '-'
  const value = Number(num)
  if (isNaN(value)) return '-'
  const result = (value / 10000).toFixed(1)
  return `${result}W`
}

export default formatToWan
