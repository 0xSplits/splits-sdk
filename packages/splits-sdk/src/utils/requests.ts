/**
 * Retries a function n number of times with exponential backoff before giving up
 */
export async function retryExponentialBackoff<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends (...arg0: any[]) => any,
>(
  fn: T,
  args: Parameters<T>,
  maxTry: number,
  retryCount = 1,
): Promise<ReturnType<T>> {
  const currRetry = typeof retryCount === 'number' ? retryCount : 1
  try {
    const result = await fn(...args)
    return result
  } catch (e) {
    if (currRetry >= maxTry) {
      throw e
    }

    await delay(1000 * Math.pow(2, retryCount - 1))
    return retryExponentialBackoff(fn, args, maxTry, currRetry + 1)
  }
}

const delay: (timeoutMs: number) => void = async (timeoutMs) => {
  await new Promise((resolve) =>
    // Add a random 0 - 100 ms to timeout to avoid requests syncing up
    setTimeout(resolve, timeoutMs + getRandomTimeMs(100)),
  )
}

const getRandomTimeMs: (maxMs: number) => number = (maxMs) => {
  return Math.random() * maxMs
}
