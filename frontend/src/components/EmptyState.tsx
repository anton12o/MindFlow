import type { ReactNode } from 'react'

interface Props {
  icon?: string
  mensagem: string
  children?: ReactNode
}

export default function EmptyState({ icon, mensagem, children }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      {icon && <span className="text-2xl mb-2 opacity-50">{icon}</span>}
      <p className="text-sm text-text-muted">{mensagem}</p>
      {children && <div className="mt-3">{children}</div>}
    </div>
  )
}
