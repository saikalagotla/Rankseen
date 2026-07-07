export const DEFAULT_FETCH_TIMEOUT_MS = 20000

// fetch() with an AbortController deadline so a slow or hung external call
// (SerpAPI, an AI provider, a business website) can't stall a whole scan.
// On timeout the call rejects, and every scan wraps its calls in
// Promise.allSettled — so a single stuck request just becomes "not found".
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  ms = DEFAULT_FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}
