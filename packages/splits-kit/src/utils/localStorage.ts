export const saveToLocalStorage = <T>(key: string, value: T) => {
  localStorage.setItem(
    key,
    JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? v.toString() : v)),
  )
}

export const readFromLocalStorage = <T>(key: string): T | undefined => {
  const item = localStorage.getItem(key)
  return item ? (JSON.parse(item) as T) : undefined
}
