import type { Tarefa } from '../types'
import type { EIScore } from '../components/matriz/types'

export interface QuadranteEI {
  key: string; titulo: string; desc: string; cor: string; bg: string;
  badge: string; badgeText: string; labelCor: string;
  acao: { label: string; icone: string; cor: string }
}

export interface QuadranteEisenhower {
  key: string; titulo: string; desc: string; cor: string; bg: string;
  badge: string; badgeText: string; vies: string; destaque?: boolean
}

export const QUADRANTES: QuadranteEI[] = [
  {
    key: 'quickwin', titulo: 'Quick Win', desc: 'Baixo esfor\u00e7o, alto impacto',
    cor: 'border-accent/60', bg: 'bg-accent/12',
    badge: 'bg-accent', badgeText: 'text-accent-foreground', labelCor: 'text-accent',
    acao: { label: 'Fa\u00e7a agora!', icone: '\u26A1', cor: 'text-accent bg-accent/12' },
  },
  {
    key: 'grandeprojeto', titulo: 'Grande Projeto', desc: 'Alto esfor\u00e7o, alto impacto',
    cor: 'border-quadrant-2/50', bg: 'bg-quadrant-2/10',
    badge: 'bg-quadrant-2', badgeText: 'text-accent-foreground', labelCor: 'text-quadrant-2',
    acao: { label: 'Planeje', icone: '\uD83D\uDCD0', cor: 'text-quadrant-2 bg-quadrant-2/10' },
  },
  {
    key: 'preenchimento', titulo: 'Preenchimento', desc: 'Baixo esfor\u00e7o, baixo impacto',
    cor: 'border-border', bg: 'bg-bg-secondary',
    badge: 'bg-bg-tertiary', badgeText: 'text-text-muted', labelCor: 'text-text-muted',
    acao: { label: 'Delegue', icone: '\u2197', cor: 'text-text-muted bg-bg-secondary' },
  },
  {
    key: 'ingrata', titulo: 'Ingrata', desc: 'Alto esfor\u00e7o, baixo impacto',
    cor: 'border-quadrant-4/50 border-dashed', bg: 'bg-quadrant-4/8',
    badge: 'bg-quadrant-4', badgeText: 'text-accent-foreground', labelCor: 'text-quadrant-4',
    acao: { label: 'Evite', icone: '\u2715', cor: 'text-quadrant-4 bg-quadrant-4/8' },
  },
]

export const QUADRANTES_EISENHOWER: QuadranteEisenhower[] = [
  { key: 'fazer', titulo: 'Fazer', desc: 'Urgente e Importante', cor: 'border-accent/60', bg: 'bg-accent/12', badge: 'bg-accent', badgeText: 'text-accent-foreground', vies: 'Agora ou nunca' },
  { key: 'agendar', titulo: 'Agendar', desc: 'Não Urgente e Importante', cor: 'border-quadrant-2/50', bg: 'bg-quadrant-2/10', badge: 'bg-quadrant-2', badgeText: 'text-accent-foreground', vies: 'Constrói o futuro — seu plano', destaque: true },
  { key: 'delegar', titulo: 'Delegar', desc: 'Urgente e Não Importante', cor: 'border-border', bg: 'bg-bg-secondary', badge: 'bg-bg-tertiary', badgeText: 'text-text-muted', vies: 'Não é seu' },
  { key: 'eliminar', titulo: 'Eliminar', desc: 'Não Urgente e Não Importante', cor: 'border-quadrant-4/50 border-dashed', bg: 'bg-quadrant-4/8', badge: 'bg-quadrant-4', badgeText: 'text-accent-foreground', vies: 'Ruído' },
]

export function getEI(tarefa: Tarefa): EIScore | null {
  const p = tarefa.propriedades?.matriz_ei
  if (p && typeof p === 'object' && 'esforco' in p && 'impacto' in p) {
    const e = (p as Record<string, unknown>).esforco
    const i = (p as Record<string, unknown>).impacto
    if (typeof e !== 'number' || typeof i !== 'number') return null
    return { esforco: e, impacto: i } as EIScore
  }
  return null
}

export function classificar(esforco: number, impacto: number): string {
  if (esforco < 3 && impacto >= 3) return 'quickwin'
  if (esforco >= 3 && impacto >= 3) return 'grandeprojeto'
  if (esforco < 3 && impacto < 3) return 'preenchimento'
  return 'ingrata'
}
