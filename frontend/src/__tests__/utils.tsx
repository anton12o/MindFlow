import { type ReactElement } from 'react'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'
import { ThemeProvider } from '../store/theme'
import { PomodoroProvider } from '../store/pomodoro'
import { NotificationProvider } from '../store/notification'
import { KeybindingsProvider } from '../store/keybindings'

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

interface ProvidersOptions {
  initialRoute?: string
  queryClient?: QueryClient
  useMemoryRouter?: boolean
}

export function renderWithProviders(
  ui: ReactElement,
  options?: ProvidersOptions & Omit<RenderOptions, 'wrapper'>,
) {
  const {
    initialRoute = '/',
    queryClient = createTestQueryClient(),
    useMemoryRouter = true,
    ...renderOptions
  } = options ?? {}

  function Wrapper({ children }: { children: React.ReactNode }) {
    const Router = useMemoryRouter ? MemoryRouter : BrowserRouter
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <KeybindingsProvider>
            <Router initialEntries={[initialRoute]}>
              <PomodoroProvider>
                <NotificationProvider>
                  {children}
                </NotificationProvider>
              </PomodoroProvider>
            </Router>
          </KeybindingsProvider>
        </ThemeProvider>
      </QueryClientProvider>
    )
  }

  return { ...render(ui, { wrapper: Wrapper, ...renderOptions }), queryClient }
}

export function mockQueryData(queryClient: QueryClient, queryKey: string[], data: unknown) {
  queryClient.setQueryData(queryKey, data)
}
