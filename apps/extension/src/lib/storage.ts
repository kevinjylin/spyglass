const KEY = "apiBase"
const DEFAULT = "http://localhost:8000"

export async function getApiBase(): Promise<string> {
  const stored = await chrome.storage.sync.get(KEY)
  const v = (stored?.[KEY] as string | undefined)?.trim()
  return v || DEFAULT
}

export async function setApiBase(value: string): Promise<void> {
  await chrome.storage.sync.set({ [KEY]: value.trim() })
}

export const DEFAULT_API_BASE = DEFAULT
