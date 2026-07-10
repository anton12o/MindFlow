import { useState, useCallback, useEffect } from 'react'

interface TabState {
  tabs: number[]
  activeIndex: number
}

const STORAGE_KEY = 'mindflow_tabs'

function loadTabs(): TabState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.tabs) && typeof parsed.activeIndex === 'number') {
        return parsed
      }
    }
  } catch {}
  return { tabs: [], activeIndex: -1 }
}

function saveTabs(state: TabState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tabs: state.tabs, activeIndex: state.activeIndex }))
  } catch {}
}

export function useTabState() {
  const [state, setState] = useState<TabState>(loadTabs)

  useEffect(() => {
    saveTabs(state)
  }, [state])

  const openTab = useCallback((id: number) => {
    setState(prev => {
      const existing = prev.tabs.indexOf(id)
      if (existing >= 0) {
        if (prev.activeIndex === existing) return prev
        return { ...prev, activeIndex: existing }
      }
      return { tabs: [...prev.tabs, id], activeIndex: prev.tabs.length }
    })
  }, [])

  const closeTab = useCallback((id: number) => {
    setState(prev => {
      const idx = prev.tabs.indexOf(id)
      if (idx < 0) return prev
      const newTabs = prev.tabs.filter(t => t !== id)
      let newActive = prev.activeIndex
      if (prev.activeIndex === idx) {
        newActive = Math.min(idx, newTabs.length - 1)
      } else if (prev.activeIndex > idx) {
        newActive = prev.activeIndex - 1
      }
      return { tabs: newTabs, activeIndex: newActive }
    })
  }, [])

  const closeAll = useCallback(() => {
    setState({ tabs: [], activeIndex: -1 })
  }, [])

  const activeId = state.tabs[state.activeIndex] ?? null
  const hasTabs = state.tabs.length > 0

  return { ...state, activeId, hasTabs, openTab, closeTab, closeAll }
}
