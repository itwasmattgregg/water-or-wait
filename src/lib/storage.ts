import { DEFAULT_SETTINGS, type UserSettings } from './types'

const KEY = 'waterorwait.settings.v1'
const LEGACY_KEY = 'soakskip.settings.v1'

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<UserSettings>
    const settings = { ...DEFAULT_SETTINGS, ...parsed }
    // Migrate off the old SoakSkip key when present.
    if (!localStorage.getItem(KEY) && localStorage.getItem(LEGACY_KEY)) {
      localStorage.setItem(KEY, JSON.stringify(settings))
      localStorage.removeItem(LEGACY_KEY)
    }
    return settings
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: UserSettings): void {
  localStorage.setItem(KEY, JSON.stringify(settings))
  localStorage.removeItem(LEGACY_KEY)
}

export function clearSettings(): void {
  localStorage.removeItem(KEY)
  localStorage.removeItem(LEGACY_KEY)
}
