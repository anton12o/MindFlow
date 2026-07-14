import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react'
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
  } catch { /* silent */ }
}

const ConfigContext = createContext<{
  config: Config
  setConfig: (patch: Partial<Config>) => void
}>({ config: DEFAULTS, setConfig: () => {} })

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<Config>(loadConfig)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()
  const configRef = useRef(config)

  useEffect(() => { configRef.current = config }, [config])
  useEffect(() => () => clearTimeout(saveTimer.current), [])

  const setConfig = useCallback((patch: Partial<Config>) => {
    setConfigState(prev => ({ ...prev, ...patch }))
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveConfig(configRef.current), 200)
  }, [])

  return (
    <ConfigContext.Provider value={{ config, setConfig }}>
      {children}
    </ConfigContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfig() {
  return useContext(ConfigContext)
}
