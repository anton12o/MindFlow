export type PomodoroScreen = 'idle' | 'running' | 'pausado' | 'foco_end' | 'pausa_end' | 'livre'

export function canTransition(de: PomodoroScreen, para: PomodoroScreen): boolean {
  const valid: Record<PomodoroScreen, PomodoroScreen[]> = {
    idle: ['running', 'livre'],
    running: ['idle', 'pausado', 'foco_end', 'pausa_end'],
    pausado: ['idle', 'running'],
    livre: ['idle'],
    foco_end: ['idle', 'running'],
    pausa_end: ['idle', 'running'],
  }
  return valid[de]?.includes(para) ?? false
}
