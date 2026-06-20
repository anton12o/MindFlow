import { useNotify } from '../store/notification'

export function useMutateNotify(context: string) {
  const notify = useNotify()
  return {
    onError: (e: unknown) => {
      console.error(`[${context}]`, e)
      notify(`Erro ao ${context}`)
    },
  }
}
