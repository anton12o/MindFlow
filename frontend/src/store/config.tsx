import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Config } from '../types'

const CONFIG_KEY = 'mindflow_config'

const DEFAULTS: Config = {
  tema: 'sistema',
  fonteTamanho: 14,
  fonteFamilia: 'Inter',
  zoom: 100,
  autoSaveInterval: 2,
  hiddenSections: [],
  somAmbiente: true,
}

function loadConfig(): Config {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return DEFAULTS
  }
}

function saveConfig(config: Config) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
  } catch { }
}

const ConfigContext = createContext<{
  config: Config
  setConfig: (patch: Partial<Config>) => void
}>({ config: DEFAULTS, setConfig: () => {} })

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<Config>(loadConfig)

  const setConfig = useCallback((patch: Partial<Config>) => {
    setConfigState(prev => {
      const next = { ...prev, ...patch }
      saveConfig(next)
      return next
    })
  }, [])

  return (
    <ConfigContext.Provider value={{ config, setConfig }}>
      {children}
    </ConfigContext.Provider>
  )
}

export function useConfig() {
  return useContext(ConfigContext)
}
